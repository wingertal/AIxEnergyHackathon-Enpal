"""
Fix inverted temperatures and heat pump usage in all household timeseries.

Original dataset has Southern-Hemisphere-style temperatures (coldest in June/July,
warmest in December/January) and heat pumps running all summer. This script
replaces outdoor_temp_c with a realistic German climate model and recalculates
heatpump_kw so it only runs during the heating season (temp < 15°C).

Derived fields (total_consumption_kw, grid_import_kw, grid_export_kw) are
recomputed to keep the energy balance consistent. Battery fields are left
unchanged.
"""

import json
import math
import random
from datetime import datetime
from pathlib import Path

DATASET_DIR = Path(__file__).parent.parent / "enpal dataset"

# Maximum heat pump power per household (kW). 0 = no heat pump.
HP_MAX = {
    "HH-1001": 2.4,  # Familie Becker
    "HH-1002": 2.0,  # Familie Schmidt
    "HH-1003": 2.2,  # Familie Yilmaz
    "HH-1004": 0.0,  # WG Sonnenallee — no heat pump
    "HH-1005": 2.8,  # Familie Wagner
    "HH-1006": 3.2,  # Familie Hoffmann
}

# Heating setpoint temperature (°C). Heat pump is off above this.
HEATING_THRESHOLD = 15.0


def german_temp(doy: int, hour: int, noise: float) -> float:
    """
    Realistic German outdoor temperature.

    Seasonal: annual mean 10°C, amplitude 10.5°C.
    Trough ~Jan 14 (day 14), peak ~Jul 15 (day 196).
    Daily: amplitude 3°C, peak at 14:00, trough at 04:00.
    Noise: ±1.5°C random variation passed in from caller.
    """
    seasonal = 10.0 - 10.5 * math.cos(2 * math.pi * (doy - 14) / 365)
    daily = 3.0 * math.cos(2 * math.pi * (hour - 14) / 24)
    return round(seasonal + daily + noise, 1)


def calc_heatpump(temp: float, hour: int, hp_max: float, rng: random.Random) -> float:
    """
    Heat pump power when outdoor temp is below the heating threshold.

    Power scales linearly with how cold it is (demand increases as temp drops).
    A time-of-day factor reflects that heat pumps typically run harder at night
    when the house has cooled down. Random on/off cycling is included so the
    pump isn't running at a constant level.
    """
    if hp_max == 0 or temp >= HEATING_THRESHOLD:
        return 0.0

    demand = min(1.0, (HEATING_THRESHOLD - temp) / 18.0)  # 0 at 15°C → 1 at -3°C

    # Slightly more active at night/early morning (off-peak + house cooling)
    time_factor = 0.85 + 0.30 * math.cos(2 * math.pi * (hour - 3) / 24)

    # Simulate on/off cycling: on ~70% of intervals during heating season
    if rng.random() > 0.70 * demand + 0.15:
        return 0.0

    power = hp_max * demand * time_factor * rng.uniform(0.80, 1.05)
    return round(max(0.0, power), 3)


def fix_household(hh_id: str) -> None:
    path = DATASET_DIR / f"energy_timeseries_{hh_id}.json"
    with open(path) as f:
        data = json.load(f)

    hp_max = HP_MAX[hh_id]
    rng = random.Random(hash(hh_id))  # deterministic per household

    for rec in data["records"]:
        ts = rec["timestamp"]
        dt = datetime.fromisoformat(ts)
        doy = dt.timetuple().tm_yday
        hour = dt.hour

        noise = (rng.random() - 0.5) * 3.0  # ±1.5°C

        temp = german_temp(doy, hour, noise)
        rec["outdoor_temp_c"] = temp

        hp = calc_heatpump(temp, hour, hp_max, rng)
        rec["heatpump_kw"] = hp

        # Recompute total consumption
        total = rec["house_load_kw"] + hp + rec["ev_charging_kw"]
        rec["total_consumption_kw"] = round(total, 3)

        # Recompute grid import/export to keep energy balance
        # Balance: pv + battery_discharge + grid_import = total + battery_charge + grid_export
        surplus = (
            rec["pv_production_kw"]
            + rec["battery_discharge_kw"]
            - total
            - rec["battery_charge_kw"]
        )
        if surplus >= 0:
            rec["grid_export_kw"] = round(surplus, 3)
            rec["grid_import_kw"] = 0.0
        else:
            rec["grid_import_kw"] = round(-surplus, 3)
            rec["grid_export_kw"] = 0.0

    with open(path, "w") as f:
        json.dump(data, f, separators=(",", ":"))

    print(f"Fixed {hh_id}: {len(data['records'])} records written")


if __name__ == "__main__":
    for hh_id in sorted(HP_MAX.keys()):
        fix_household(hh_id)
    print("Done.")
