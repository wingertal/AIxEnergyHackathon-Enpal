"""Requirement 1 — traffic-light indicators per household item + change events."""

from __future__ import annotations

from pydantic import BaseModel

from app.schemas.common import EnergyUnitType, LightStatus


class ItemLight(BaseModel):
    """The headline light for a single household item, plus its live consumption."""

    unit: EnergyUnitType
    label: str
    status: LightStatus
    consumption_w: float | None = None  # instantaneous draw/feed in watts
    message: str | None = None  # short, plain-language explanation


class LightsOverview(BaseModel):
    """All item lights for a household — the primary at-a-glance screen."""

    household_id: str
    items: list[ItemLight]


class LightChangeEvent(BaseModel):
    """Emitted when an item's light changes — drives the push notification."""

    household_id: str
    unit: EnergyUnitType
    previous: LightStatus
    current: LightStatus
    message: str
