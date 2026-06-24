"""
Add summer AC consumption to selected households.

Sonnenallee (HH-1004) is a WG — many people, many portable ACs, no battery
to buffer. Heavy AC makes them grid-heavy on hot afternoons and creates the
red alert status for the demo.

Wagner (HH-1005) and Hoffmann (HH-1006) get lighter AC so their June bills
show non-trivial numbers (previously ~€0 after solar credits).

After adding AC load, total_consumption_kw, grid_import_kw, and
grid_export_kw are recomputed to keep the energy balance.
"""

import json
import math
from datetime import datetime
from pathlib import Path

DATASET_DIR = Path(__file__).parent.parent / "enpal dataset"

# Max AC power per household (kW). 0 = no AC added.
AC_MAX = {
    "HH-1001": 0.0,  # Becker — leave as-is
    "HH-1002": 0.0,  # Schmidt — leave as-is
    "HH-1003": 0.0,  # Yilmaz — leave as-is
    "HH-1004": 6.0,  # Sonnenallee WG — many portable ACs, no battery
    "HH-1005": 2.0,  # Wagner — modest AC
    "HH-1006": 3.5,  # Hoffmann Frankfurt — multi-room, gets hot
}


def ac_kw(temp: float, hour: int, max_ac: float) -> float:
    """
    AC power as a function of outdoor temperature and time of day.
    Turns on above 20°C, ramps up linearly to max at 32°C.
    Active 8:00–23:00; peaks in the late afternoon (16:00–19:00).
    """
    if max_ac == 0 or temp < 20 or hour < 8 or hour >= 23:
        return 0.0
    demand = min(1.0, (temp - 20) / 12.0)           # 0 at 20°C → 1 at 32°C
    time_factor = 0.55 + 0.9 * max(0.0, math.sin(math.pi * (hour - 8) / 15))
    return round(max_ac * demand * time_factor, 3)


def fix_household(hh_id: str) -> None:
    ac_max = AC_MAX[hh_id]
    if ac_max == 0:
        return

    path = DATASET_DIR / f"energy_timeseries_{hh_id}.json"
    with open(path) as f:
        data = json.load(f)

    for rec in data["records"]:
        ts = rec["timestamp"]
        hour = int(ts[11:13])
        temp = rec["outdoor_temp_c"]

        ac = ac_kw(temp, hour, ac_max)
        rec["house_load_kw"] = round(rec["house_load_kw"] + ac, 3)

        total = rec["house_load_kw"] + rec["heatpump_kw"] + rec["ev_charging_kw"]
        rec["total_consumption_kw"] = round(total, 3)

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

    # Spot-check reference snapshot
    snap = next(r for r in data["records"] if r["timestamp"] == "2025-06-20T13:00:00")
    print(
        f"{hh_id}: ref snap → load={snap['total_consumption_kw']:.2f}kW "
        f"pv={snap['pv_production_kw']:.2f}kW "
        f"import={snap['grid_import_kw']:.2f}kW "
        f"self_suff={((snap['total_consumption_kw']-snap['grid_import_kw'])/max(snap['total_consumption_kw'],0.01)):.2f}"
    )


if __name__ == "__main__":
    for hh_id in sorted(AC_MAX):
        fix_household(hh_id)
    print("Done.")
