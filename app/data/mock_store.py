"""Compatibility shim over the real dataset loader.

Earlier this held placeholder data. Now the synthetic dataset is loaded by
:mod:`app.data.dataset`; this module just keeps the small surface the rest of
the app imported (the default household + a profile accessor) so nothing else
had to change.
"""

from __future__ import annotations

from app.data import dataset

# The demo defaults to the richest household (PV + battery + heat pump + EV).
DEFAULT_HOUSEHOLD_ID = "HH-1001"


def get_household_profile(household_id: str) -> dict | None:
    """Return the merged household + contract profile, or None if unknown."""
    household = dataset.get_household(household_id)
    if household is None:
        return None
    contract = dataset.get_contract(household_id)
    tariff = dataset.get_tariff_for_household(household_id)
    return {**household, "contract": contract, "tariff": tariff}
