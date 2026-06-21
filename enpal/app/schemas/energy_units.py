"""Requirement 3 — per-unit condition, weekly detail, and improvement feedback."""

from __future__ import annotations

from pydantic import BaseModel

from app.schemas.common import EnergyUnitType, LightStatus


class UnitCondition(BaseModel):
    """Current health/condition of one energy unit (overview card)."""

    unit: EnergyUnitType
    label: str
    status: LightStatus
    headline: str | None = None  # e.g. "Battery 82% — charging from solar"
    metrics: dict[str, float] = {}  # unit-specific live values


class UnitConditionList(BaseModel):
    household_id: str
    units: list[UnitCondition]


class DailyPoint(BaseModel):
    date: str  # ISO "YYYY-MM-DD"
    value: float  # unit-specific (kWh produced/consumed, avg SoC, ...)


class UnitWeeklyDetail(BaseModel):
    """Detail page: a week of data for one unit + actionable feedback."""

    household_id: str
    unit: EnergyUnitType
    label: str
    unit_of_measure: str  # e.g. "kWh", "%"
    series: list[DailyPoint]
    feedback: list[str] = []  # plain-language tips for betterment
