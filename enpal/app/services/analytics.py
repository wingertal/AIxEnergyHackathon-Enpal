"""Energy analytics — the calculations shared across features.

Pure functions over the dataset (no FastAPI, no I/O beyond the cached loaders in
:mod:`app.data.dataset`). Kept in one place so the lights, energy-unit, billing
and consumption services compute things the same way.

Conventions
-----------
* Power fields are kW averaged over a 15-minute step; energy = kW * 0.25 kWh.
* "Now" is the latest 15-minute reading; "this month" is the latest billed month.
* Savings are measured against a counterfactual: the same household consumption
  bought entirely from the grid at ``baseline_grid_rate_eur_per_kwh`` with no PV,
  no battery and no feed-in credit.
"""

from __future__ import annotations

from app.config import settings
from app.data import dataset
from app.data.dataset import STEP_HOURS
from app.schemas.common import EnergyUnitType, LightStatus, Trend

# Human-readable labels for each unit.
UNIT_LABELS: dict[EnergyUnitType, str] = {
    EnergyUnitType.SOLAR: "Solar panels",
    EnergyUnitType.BATTERY: "Home battery",
    EnergyUnitType.HEAT_PUMP: "Heat pump",
    EnergyUnitType.EV_CHARGER: "EV charger",
    EnergyUnitType.GRID: "Grid",
    EnergyUnitType.HOME: "Whole home",
}


def units_for_household(household_id: str) -> list[EnergyUnitType]:
    """Which units a household actually has (grid + home always present)."""
    hh = dataset.get_household(household_id) or {}
    units: list[EnergyUnitType] = []
    if hh.get("pv_kwp", 0) > 0:
        units.append(EnergyUnitType.SOLAR)
    if hh.get("battery_kwh", 0) > 0:
        units.append(EnergyUnitType.BATTERY)
    if hh.get("heat_pump"):
        units.append(EnergyUnitType.HEAT_PUMP)
    if hh.get("ev_charger"):
        units.append(EnergyUnitType.EV_CHARGER)
    units.append(EnergyUnitType.GRID)
    units.append(EnergyUnitType.HOME)
    return units


# --- small helpers ---------------------------------------------------------


def _safe_ratio(num: float, den: float) -> float:
    return num / den if den else 0.0


def daily_sum(records: list[dict], field: str) -> float:
    """kWh total of a kW field over a set of 15-minute records."""
    return sum(r[field] for r in records) * STEP_HOURS


def _price_bands(records: list[dict]) -> tuple[float, float]:
    """Lower/upper price terciles for a day — cheap < low <= mid <= high < dear."""
    prices = sorted(r["price_eur_per_kwh"] for r in records)
    if not prices:
        return 0.0, 0.0
    n = len(prices)
    return prices[n // 3], prices[(2 * n) // 3]


def _price_band_status(price: float, bands: tuple[float, float]) -> LightStatus:
    low, high = bands
    if price <= low:
        return LightStatus.GREEN
    if price <= high:
        return LightStatus.AMBER
    return LightStatus.RED


def trend_of(current: float, previous: float, *, rel_tol: float = 0.03) -> Trend:
    """Direction of ``current`` vs ``previous`` with a small flat band."""
    if previous == 0:
        return Trend.FLAT if current == 0 else Trend.UP
    change = (current - previous) / abs(previous)
    if change > rel_tol:
        return Trend.UP
    if change < -rel_tol:
        return Trend.DOWN
    return Trend.FLAT


# --- daily cost / savings --------------------------------------------------


def day_cost_breakdown(household_id: str, records: list[dict]) -> dict[str, float]:
    """Actual energy cost, baseline cost and savings for one day's records.

    * ``actual``   — grid import priced at the live tariff price, minus feed-in
      credit for exports (energy charges only; base fee is monthly, excluded).
    * ``baseline`` — every kWh consumed bought from the grid at the standard rate.
    * ``saved``    — baseline minus actual (value of PV + battery + smart use).
    """
    contract = dataset.get_contract(household_id) or {}
    feed_in = contract.get("feed_in_eur_per_kwh", 0.081)
    baseline_rate = settings.baseline_grid_rate_eur_per_kwh

    import_cost = sum(
        r["grid_import_kw"] * r["price_eur_per_kwh"] for r in records
    ) * STEP_HOURS
    export_credit = sum(r["grid_export_kw"] for r in records) * STEP_HOURS * feed_in
    actual = import_cost - export_credit

    consumption_kwh = daily_sum(records, "total_consumption_kw")
    baseline = consumption_kwh * baseline_rate

    return {
        "consumption_kwh": consumption_kwh,
        "actual": actual,
        "baseline": baseline,
        "saved": baseline - actual,
    }


# --- live light evaluation -------------------------------------------------


def evaluate_light(
    unit: EnergyUnitType,
    household_id: str,
    rec: dict,
    day_records: list[dict],
) -> tuple[LightStatus, float, str]:
    """Traffic-light status, instantaneous power (W) and a message for one unit.

    ``rec`` is the reading being evaluated; ``day_records`` are that day's records
    (used for price banding and heat-pump baselining).
    """
    hh = dataset.get_household(household_id) or {}

    if unit is EnergyUnitType.SOLAR:
        prod = rec["pv_production_kw"]
        kwp = hh.get("pv_kwp", 0) or 1
        hour = rec["_dt"].hour
        daytime = 9 <= hour <= 16
        if prod >= 0.15 * kwp:
            return LightStatus.GREEN, prod * 1000, f"Producing {prod:.1f} kW from sunshine"
        if prod > 0.05:
            return LightStatus.AMBER, prod * 1000, "Producing, but below par for the array"
        if daytime:
            return LightStatus.RED, 0.0, "Daylight but no output — check for shading/fault"
        return LightStatus.AMBER, 0.0, "No production (no sunlight right now)"

    if unit is EnergyUnitType.BATTERY:
        soc = rec["battery_soc_pct"]
        charge = rec["battery_charge_kw"]
        discharge = rec["battery_discharge_kw"]
        net_w = (charge - discharge) * 1000
        if charge > 0:
            action = f"charging at {charge:.1f} kW"
        elif discharge > 0:
            action = f"discharging at {discharge:.1f} kW"
        else:
            action = "idle"
        status = (
            LightStatus.GREEN if soc >= 50
            else LightStatus.AMBER if soc >= 20
            else LightStatus.RED
        )
        return status, net_w, f"{soc:.0f}% charged — {action}"

    if unit is EnergyUnitType.HEAT_PUMP:
        power = rec["heatpump_kw"]
        today_kwh = daily_sum(day_records, "heatpump_kw")
        avg = _heatpump_trailing_avg(household_id, rec["_date"])
        ratio = _safe_ratio(today_kwh, avg)
        if avg > 0 and ratio > 1.5:
            return LightStatus.RED, power * 1000, "Using far more than usual — worth a service check"
        if avg > 0 and ratio > 1.2:
            return LightStatus.AMBER, power * 1000, "Running a little high for the conditions"
        return LightStatus.GREEN, power * 1000, "Running normally"

    if unit is EnergyUnitType.EV_CHARGER:
        power = rec["ev_charging_kw"]
        if power <= 0.05:
            return LightStatus.GREEN, 0.0, "Idle — not charging"
        status = _price_band_status(rec["price_eur_per_kwh"], _price_bands(day_records))
        when = {
            LightStatus.GREEN: "at a cheap price — good time",
            LightStatus.AMBER: "at an average price",
            LightStatus.RED: "at an expensive price — consider delaying",
        }[status]
        return status, power * 1000, f"Charging at {power:.1f} kW {when}"

    if unit is EnergyUnitType.GRID:
        imp = rec["grid_import_kw"]
        exp = rec["grid_export_kw"]
        net_w = (imp - exp) * 1000
        if exp > imp:
            return LightStatus.GREEN, net_w, f"Exporting {exp:.1f} kW surplus to the grid"
        if imp <= 0.05:
            return LightStatus.GREEN, net_w, "Off-grid right now — running on your own energy"
        status = _price_band_status(rec["price_eur_per_kwh"], _price_bands(day_records))
        price = rec["price_eur_per_kwh"]
        return status, net_w, f"Importing {imp:.1f} kW at €{price:.2f}/kWh"

    # HOME — overall self-sufficiency right now.
    total = rec["total_consumption_kw"]
    imp = rec["grid_import_kw"]
    self_suff = _safe_ratio(total - imp, total) if total else 1.0
    status = (
        LightStatus.GREEN if self_suff >= 0.6
        else LightStatus.AMBER if self_suff >= 0.3
        else LightStatus.RED
    )
    return status, total * 1000, f"{self_suff * 100:.0f}% of your demand is self-supplied"


def _heatpump_trailing_avg(household_id: str, date: str, n: int = 7) -> float:
    """Average daily heat-pump kWh over the ``n`` days *before* ``date``."""
    by_date = dataset.records_by_date(household_id)
    dates = [d for d in by_date if d < date][-n:]
    if not dates:
        return 0.0
    totals = [daily_sum(by_date[d], "heatpump_kw") for d in dates]
    return sum(totals) / len(totals)
