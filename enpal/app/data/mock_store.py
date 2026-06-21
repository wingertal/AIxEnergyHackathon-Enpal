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

# Placeholder containers — fill these from the sample dataset.
HOUSEHOLD_PROFILE: dict = {
    "household_id": DEFAULT_HOUSEHOLD_ID,
    "name": "Demo Household",
    "location": "Berlin",
    "solar_capacity_kw": 7.2,
    "battery_capacity_kwh": 10.4,
    "has_heat_pump": True,
    "has_ev_charger": True,
    "tariff": {
        "type": "dynamic",
        "currency": "EUR",
        "standing_charge_eur_per_month": 9.90,
        "peak_rate_eur_per_kwh": 0.45,
        "off_peak_rate_eur_per_kwh": 0.18,
    },
    "average_daily_consumption_kwh": 14.0,
    "last_30d_solar_generation_kwh": 195.0,
    "last_30d_consumption_kwh": 420.0,
}

ENERGY_UNITS: list[dict] = [
    {"id": "solar", "label": "Solar panels", "capacity_kw": 7.2},
    {"id": "battery", "label": "Battery storage", "capacity_kwh": 10.4},
    {"id": "heat_pump", "label": "Heat pump", "type": "air-source"},
    {"id": "ev_charger", "label": "EV charger", "capacity_kw": 7.0},
    {"id": "grid", "label": "Grid connection", "impedance": "low"},
]

TARIFF: dict = {
    "type": "dynamic",
    "currency": "EUR",
    "standing_charge_eur_per_month": 9.90,
    "peak_rate_eur_per_kwh": 0.45,
    "off_peak_rate_eur_per_kwh": 0.18,
}


def get_household_profile(household_id: str) -> dict | None:
    """Return the merged household + contract profile, or None if unknown."""
    household = dataset.get_household(household_id)
    if household is None:
        return None
    contract = dataset.get_contract(household_id)
    tariff = dataset.get_tariff_for_household(household_id)
    return {**household, "contract": contract, "tariff": tariff}
