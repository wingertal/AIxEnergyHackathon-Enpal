"""Dataset access layer.

Loads the synthetic Enpal JSON dataset (households, contracts, tariffs, monthly
bills, insight events, dynamic prices, and the per-household 15-minute timeseries)
and exposes typed, cached accessors. Services read the world *only* through this
module, so swapping the JSON files for a real database later touches one place.

All data is for the year 2025 at 15-minute resolution. Each timeseries record is
in kW averaged over the step — multiply by ``STEP_HOURS`` (0.25) to get kWh.
"""

from __future__ import annotations

import json
from datetime import datetime
from functools import lru_cache
from pathlib import Path

from app.config import settings

# A 15-minute step expressed in hours: kWh = kW * STEP_HOURS.
STEP_HOURS = 0.25

# Repo root is two levels up from app/data/.
_REPO_ROOT = Path(__file__).resolve().parents[2]


def _dataset_dir() -> Path:
    p = Path(settings.dataset_dir)
    return p if p.is_absolute() else _REPO_ROOT / p


def _load_json(filename: str):
    path = _dataset_dir() / filename
    with path.open(encoding="utf-8") as f:
        return json.load(f)


# --- Static reference data (small, loaded once) ----------------------------


@lru_cache(maxsize=1)
def load_households() -> list[dict]:
    return _load_json("households.json")


@lru_cache(maxsize=1)
def load_contracts() -> list[dict]:
    return _load_json("contracts.json")


@lru_cache(maxsize=1)
def load_tariffs() -> list[dict]:
    return _load_json("tariffs.json")


@lru_cache(maxsize=1)
def load_monthly_bills() -> list[dict]:
    return _load_json("monthly_bills.json")


@lru_cache(maxsize=1)
def load_insight_events() -> list[dict]:
    return _load_json("insight_events.json")


# --- Per-household timeseries (large: ~35k records, ~19 MB each) ------------


@lru_cache(maxsize=8)
def load_timeseries(household_id: str) -> list[dict]:
    """Return the full year of 15-minute records for one household.

    Cached after first access. Each record additionally gets a parsed ``_dt``
    (datetime) and ``_date`` (``YYYY-MM-DD``) for convenient grouping.
    """
    hh = get_household(household_id)
    if hh is None:
        raise KeyError(household_id)
    payload = _load_json(hh["timeseries_file"])
    records = payload["records"]
    for r in records:
        ts = r["timestamp"]
        r["_dt"] = datetime.fromisoformat(ts)
        r["_date"] = ts[:10]
    return records


# --- Accessors -------------------------------------------------------------


def known_household_ids() -> list[str]:
    return [h["household_id"] for h in load_households()]


def get_household(household_id: str) -> dict | None:
    return next(
        (h for h in load_households() if h["household_id"] == household_id), None
    )


def get_contract(household_id: str) -> dict | None:
    return next(
        (c for c in load_contracts() if c["household_id"] == household_id), None
    )


def get_tariff(tariff_id: str) -> dict | None:
    return next((t for t in load_tariffs() if t["tariff_id"] == tariff_id), None)


def get_tariff_for_household(household_id: str) -> dict | None:
    hh = get_household(household_id)
    return get_tariff(hh["tariff_id"]) if hh else None


def get_bills(household_id: str) -> list[dict]:
    """Monthly bills for a household, sorted ascending by month."""
    bills = [b for b in load_monthly_bills() if b["household_id"] == household_id]
    return sorted(bills, key=lambda b: b["month"])


def get_insights(household_id: str) -> list[dict]:
    return [e for e in load_insight_events() if e["household_id"] == household_id]


# --- "Now" helpers ---------------------------------------------------------
# The dataset is a fixed historical year, so "current" means the latest record /
# latest billed month available rather than the wall clock.


def current_record(household_id: str) -> dict:
    """The most recent 15-minute reading — the app's notion of "right now"."""
    return load_timeseries(household_id)[-1]


def latest_month(household_id: str) -> str:
    return get_bills(household_id)[-1]["month"]


def records_by_date(household_id: str) -> dict[str, list[dict]]:
    """All records grouped by ``YYYY-MM-DD`` (insertion order = chronological)."""
    grouped: dict[str, list[dict]] = {}
    for r in load_timeseries(household_id):
        grouped.setdefault(r["_date"], []).append(r)
    return grouped


def last_n_dates(household_id: str, n: int) -> list[str]:
    """The last ``n`` calendar dates present in the timeseries (chronological)."""
    dates = list(records_by_date(household_id).keys())
    return dates[-n:]
