"""In-memory sample data store.

A single place to stash the synthetic household data Enpal provides
(production, consumption, tariffs, contract terms). Services read from here so
that swapping in a real database later touches only this file.

TODO(team): load the provided sample dataset (CSV/JSON) into these structures.
"""

from __future__ import annotations

# Default household used while there is no auth/multi-tenant layer yet.
DEFAULT_HOUSEHOLD_ID = "demo-household"


# Placeholder containers — fill these from the sample dataset.
HOUSEHOLD_PROFILE: dict = {
    "household_id": DEFAULT_HOUSEHOLD_ID,
    "name": "Demo Household",
    # e.g. location, system specs (solar kWp, battery kWh), tariff id, contract terms
}

ENERGY_UNITS: list[dict] = [
    # e.g. {"id": "solar", "label": "Solar panels", ...},
    #      {"id": "battery", ...}, {"id": "heat_pump", ...},
    #      {"id": "ev_charger", ...}, {"id": "grid", ...}
]

TARIFF: dict = {
    # e.g. {"type": "dynamic", "currency": "EUR", "standing_charge": ..., "rates": [...]}
}


def get_household_profile(household_id: str) -> dict | None:
    """Return the stored profile for a household, or None if unknown."""
    if household_id == HOUSEHOLD_PROFILE.get("household_id"):
        return HOUSEHOLD_PROFILE
    return None
