"""Generate two demo households whose energy status lands in Warning / High alert.

We clone existing households (so the full year of data + bills + contract stay
realistic and schema-correct), then:
  * inject an ACTIVE device anomaly over the demo window (2025-06-16..22), which
    drives the energy-health read (any anomaly -> Warning; high severity -> High
    alert), and
  * raise heat-pump / total consumption / grid import in that window so the
    elevated, grid-heavy usage shows up in the numbers too.

Idempotent: re-running regenerates HH-1005 / HH-1006 cleanly.

Run:  python scripts/gen_demo_households.py
"""

from __future__ import annotations

import json
from pathlib import Path

DS = Path(__file__).resolve().parents[1] / "enpal dataset"

# Demo window (covers the app's fixed "now" of 2025-06-20T13:00).
WINDOW = {f"2025-06-{d:02d}" for d in range(16, 23)}

# (source, new_id, name, city, severity, extra_kw, factor)
# HH-1005 stays a light "Warning" (medium anomaly, gentle bump so it doesn't trip
# the load-based High-alert rule); HH-1006 is "High alert" (high-severity anomaly).
SPECS = [
    ("HH-1002", "HH-1005", "Familie Wagner", "Stuttgart", "medium", 0.0, 1.25),
    ("HH-1001", "HH-1006", "Familie Hoffmann", "Frankfurt", "high", 1.6, 2.2),
]


def load(name: str):
    return json.loads((DS / name).read_text(encoding="utf-8"))


def save_pretty(name: str, obj) -> None:
    (DS / name).write_text(json.dumps(obj, indent=2), encoding="utf-8")


def save_compact(name: str, obj) -> None:
    (DS / name).write_text(json.dumps(obj, separators=(",", ":")), encoding="utf-8")


def find(items, key, val):
    return next(x for x in items if x[key] == val)


def main() -> None:
    households = load("households.json")
    contracts = load("contracts.json")
    bills = load("monthly_bills.json")
    insights = load("insight_events.json")

    new_ids = {s[1] for s in SPECS}
    # Drop any prior generated copies so re-runs are clean.
    households = [h for h in households if h["household_id"] not in new_ids]
    contracts = [c for c in contracts if c["household_id"] not in new_ids]
    bills = [b for b in bills if b["household_id"] not in new_ids]
    insights = [e for e in insights if e["household_id"] not in new_ids]

    src_households = load("households.json")
    src_contracts = load("contracts.json")
    src_bills = load("monthly_bills.json")

    for src, new, name, city, severity, extra_kw, factor in SPECS:
        ts_file = f"energy_timeseries_{new}.json"

        # --- household ---
        h = dict(find(src_households, "household_id", src))
        h.update(household_id=new, name=name, city=city, timeseries_file=ts_file)
        households.append(h)

        # --- contract ---
        c = json.loads(json.dumps(find(src_contracts, "household_id", src)))
        c["household_id"] = new
        c["customer_name"] = name
        if isinstance(c.get("supply_address"), dict):
            c["supply_address"]["city"] = city
        contracts.append(c)

        # --- monthly bills ---
        for b in [x for x in src_bills if x["household_id"] == src]:
            nb = dict(b)
            nb["household_id"] = new
            bills.append(nb)

        # --- active anomaly that drives the status ---
        pct = 75 if severity == "high" else 35
        insights.append(
            {
                "household_id": new,
                "type": "anomaly",
                "severity": severity,
                "period": "2025-06-16..2025-06-22",
                "title": f"Heat pump consumed ~{pct}% more than usual",
                "detail": (
                    "Sustained elevated heat-pump electricity use over several days, "
                    "beyond what the mild June weather explains. Possible defrost fault, "
                    "low refrigerant, or a thermostat left too high."
                ),
                "suggested_action": "Check heat pump settings / book a service inspection.",
            }
        )

        # --- timeseries: clone + perturb the demo window ---
        ts = load(f"energy_timeseries_{src}.json")
        ts["household_id"] = new
        bumped = 0
        for r in ts["records"]:
            if r["timestamp"][:10] not in WINDOW:
                continue
            delta = round(r["heatpump_kw"] * (factor - 1) + extra_kw, 3)
            r["heatpump_kw"] = round(r["heatpump_kw"] + delta, 3)
            r["total_consumption_kw"] = round(r["total_consumption_kw"] + delta, 3)
            r["grid_import_kw"] = round(r["grid_import_kw"] + delta, 3)
            bumped += 1
        save_compact(ts_file, ts)
        print(f"  {new}: {name} ({city}) — severity={severity}, perturbed {bumped} records -> {ts_file}")

    save_pretty("households.json", households)
    save_pretty("contracts.json", contracts)
    save_pretty("monthly_bills.json", bills)
    save_pretty("insight_events.json", insights)
    print(f"Done. Households now: {[h['household_id'] for h in households]}")


if __name__ == "__main__":
    main()
