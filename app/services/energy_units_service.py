"""Requirement 3 — per-unit condition, weekly detail, feedback."""

from __future__ import annotations

from statistics import mean

from app.data import dataset
from app.schemas.common import EnergyUnitType, LightStatus
from app.schemas.energy_units import (
    DailyPoint,
    UnitCondition,
    UnitConditionList,
    UnitWeeklyDetail,
)
from app.services.analytics import (
    UNIT_LABELS,
    daily_sum,
    evaluate_light,
    units_for_household,
)


def _condition_metrics(unit: EnergyUnitType, rec: dict, day_records: list[dict]) -> dict:
    """Live, unit-specific numbers for the condition card."""
    if unit is EnergyUnitType.SOLAR:
        return {
            "production_kw": round(rec["pv_production_kw"], 3),
            "today_kwh": round(daily_sum(day_records, "pv_production_kw"), 1),
        }
    if unit is EnergyUnitType.BATTERY:
        return {
            "soc_pct": round(rec["battery_soc_pct"], 1),
            "soc_kwh": round(rec["battery_soc_kwh"], 2),
            "charge_kw": round(rec["battery_charge_kw"], 3),
            "discharge_kw": round(rec["battery_discharge_kw"], 3),
        }
    if unit is EnergyUnitType.HEAT_PUMP:
        return {
            "power_kw": round(rec["heatpump_kw"], 3),
            "today_kwh": round(daily_sum(day_records, "heatpump_kw"), 1),
            "outdoor_temp_c": round(rec["outdoor_temp_c"], 1),
        }
    if unit is EnergyUnitType.EV_CHARGER:
        return {
            "charging_kw": round(rec["ev_charging_kw"], 3),
            "today_kwh": round(daily_sum(day_records, "ev_charging_kw"), 1),
        }
    if unit is EnergyUnitType.GRID:
        return {
            "import_kw": round(rec["grid_import_kw"], 3),
            "export_kw": round(rec["grid_export_kw"], 3),
            "price_eur_per_kwh": round(rec["price_eur_per_kwh"], 4),
        }
    return {  # HOME
        "consumption_kw": round(rec["total_consumption_kw"], 3),
        "today_kwh": round(daily_sum(day_records, "total_consumption_kw"), 1),
    }


# Per-unit weekly series definition: (kW field to sum into daily kWh) or a custom
# aggregator. ``None`` value-field means a custom function is used.
def _daily_value(unit: EnergyUnitType, records: list[dict]) -> float:
    if unit is EnergyUnitType.SOLAR:
        return round(daily_sum(records, "pv_production_kw"), 2)
    if unit is EnergyUnitType.BATTERY:
        return round(mean(r["battery_soc_pct"] for r in records), 1)
    if unit is EnergyUnitType.HEAT_PUMP:
        return round(daily_sum(records, "heatpump_kw"), 2)
    if unit is EnergyUnitType.EV_CHARGER:
        return round(daily_sum(records, "ev_charging_kw"), 2)
    if unit is EnergyUnitType.GRID:
        return round(daily_sum(records, "grid_import_kw"), 2)
    return round(daily_sum(records, "total_consumption_kw"), 2)  # HOME


_UNIT_OF_MEASURE: dict[EnergyUnitType, str] = {
    EnergyUnitType.SOLAR: "kWh",
    EnergyUnitType.BATTERY: "%",
    EnergyUnitType.HEAT_PUMP: "kWh",
    EnergyUnitType.EV_CHARGER: "kWh",
    EnergyUnitType.GRID: "kWh",
    EnergyUnitType.HOME: "kWh",
}


class EnergyUnitsService:
    async def get_conditions(self, household_id: str) -> UnitConditionList:
        """Current condition card for every energy unit."""
        if dataset.get_household(household_id) is None:
            raise KeyError(household_id)
        rec = dataset.current_record(household_id)
        day_records = dataset.records_by_date(household_id)[rec["_date"]]

        units: list[UnitCondition] = []
        for unit in units_for_household(household_id):
            status, _power, message = evaluate_light(unit, household_id, rec, day_records)
            units.append(
                UnitCondition(
                    unit=unit,
                    label=UNIT_LABELS[unit],
                    status=status,
                    headline=message,
                    metrics=_condition_metrics(unit, rec, day_records),
                )
            )
        return UnitConditionList(household_id=household_id, units=units)

    async def get_weekly_detail(
        self, household_id: str, unit: EnergyUnitType
    ) -> UnitWeeklyDetail:
        """One week of data for a single unit, plus improvement feedback."""
        if unit not in units_for_household(household_id):
            raise KeyError(f"{household_id} has no {unit.value}")

        by_date = dataset.records_by_date(household_id)
        dates = dataset.last_n_dates(household_id, 7)
        series = [DailyPoint(date=d, value=_daily_value(unit, by_date[d])) for d in dates]

        return UnitWeeklyDetail(
            household_id=household_id,
            unit=unit,
            label=UNIT_LABELS[unit],
            unit_of_measure=_UNIT_OF_MEASURE[unit],
            series=series,
            feedback=_feedback(unit, series),
        )


def _feedback(unit: EnergyUnitType, series: list[DailyPoint]) -> list[str]:
    """Plain-language, data-driven tips for the unit's detail page."""
    values = [p.value for p in series]
    if not values:
        return []
    avg = mean(values)
    last = values[-1]
    tips: list[str] = []

    if unit is EnergyUnitType.SOLAR:
        tips.append(f"Averaged {avg:.1f} kWh/day this week, {last:.1f} kWh on the last day.")
        tips.append("Run flexible loads (dishwasher, laundry, EV) around midday to use solar directly.")
    elif unit is EnergyUnitType.BATTERY:
        tips.append(f"State of charge averaged {avg:.0f}% this week.")
        if min(values) < 20:
            tips.append("It dipped below 20% on some days — consider reserving capacity for the evening peak.")
        else:
            tips.append("Healthy charge levels — it's covering evenings well.")
    elif unit is EnergyUnitType.HEAT_PUMP:
        tips.append(f"Used {avg:.1f} kWh/day on average; {last:.1f} kWh on the last day.")
        if last > 1.3 * avg and avg > 0:
            tips.append("The last day ran well above average — check the schedule or book a service.")
        else:
            tips.append("Lowering the flow temperature by 1–2°C can cut heat-pump use noticeably.")
    elif unit is EnergyUnitType.EV_CHARGER:
        tips.append(f"Charged {sum(values):.1f} kWh over the week.")
        tips.append("Schedule charging for the cheapest hours (often midday solar or overnight).")
    elif unit is EnergyUnitType.GRID:
        tips.append(f"Imported {sum(values):.1f} kWh from the grid this week ({avg:.1f} kWh/day).")
        tips.append("Shift usage into sunny or cheap-price windows to import less.")
    else:  # HOME
        tips.append(f"Whole-home use averaged {avg:.1f} kWh/day this week.")
        tips.append("Tackle standby/baseload at night to bring the daily total down.")
    return tips


energy_units_service = EnergyUnitsService()
