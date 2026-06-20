"""Shared schema building blocks used across features."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel


class EnergyUnitType(str, Enum):
    """The household devices/flows the app tracks."""

    SOLAR = "solar"
    BATTERY = "battery"
    HEAT_PUMP = "heat_pump"
    EV_CHARGER = "ev_charger"
    GRID = "grid"
    HOME = "home"


class Trend(str, Enum):
    """Direction of a metric vs. the comparison period."""

    UP = "up"
    DOWN = "down"
    FLAT = "flat"


class LightStatus(str, Enum):
    """Traffic-light indicator used across the UI (Requirement 1)."""

    GREEN = "green"  # all good / cheap / surplus
    AMBER = "amber"  # caution / average
    RED = "red"  # attention / expensive / fault


class Money(BaseModel):
    amount: float
    currency: str = "EUR"
