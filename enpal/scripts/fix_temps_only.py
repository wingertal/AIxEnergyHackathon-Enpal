"""
Patch outdoor_temp_c for the original 4 households using a German climate model.
Only the temperature column is touched — all energy fields (grid_import_kw,
heatpump_kw, etc.) are left exactly as-is so bills don't change.
"""

import json
import math
import random
from pathlib import Path

DATASET_DIR = Path(__file__).parent.parent / "enpal dataset"

# German climate: annual mean 10°C, amplitude 10.5°C, peak ~July 15 (doy 196)
def german_temp(doy: int, hour: int, rng: random.Random) -> float:
    seasonal = 10.0 - 10.5 * math.cos(2 * math.pi * (doy - 14) / 365)
    diurnal = 3.0 * math.cos(2 * math.pi * (hour - 14) / 24)
    noise = rng.gauss(0, 0.8)
    return round(seasonal + diurnal + noise, 1)

for hh_id in ["HH-1001", "HH-1002", "HH-1003", "HH-1004"]:
    path = DATASET_DIR / f"energy_timeseries_{hh_id}.json"
    with open(path) as f:
        data = json.load(f)

    # Seed per household for reproducibility
    rng = random.Random(hash(hh_id))

    for rec in data["records"]:
        ts = rec["timestamp"]
        # Parse day-of-year and hour from timestamp
        from datetime import datetime
        dt = datetime.fromisoformat(ts)
        doy = dt.timetuple().tm_yday
        hour = dt.hour
        rec["outdoor_temp_c"] = german_temp(doy, hour, rng)

    with open(path, "w") as f:
        json.dump(data, f, separators=(",", ":"))

    # Spot-check reference snapshot
    snap = next(r for r in data["records"] if r["timestamp"] == "2025-06-20T13:00:00")
    print(f"{hh_id}: ref temp={snap['outdoor_temp_c']}°C  load={snap['total_consumption_kw']}kW  import={snap['grid_import_kw']}kW")

print("Done.")
