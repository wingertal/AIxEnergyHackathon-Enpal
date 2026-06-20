"""Requirement 4 — weekly forecast driven by weather."""

from __future__ import annotations

from pydantic import BaseModel

from app.schemas.common import LightStatus


class DailyForecast(BaseModel):
    date: str  # ISO "YYYY-MM-DD"
    weather_summary: str  # e.g. "Sunny", "Overcast"
    expected_solar_kwh: float | None = None
    outlook: LightStatus  # good/average/poor day for self-supply
    note: str | None = None


class WeeklyForecast(BaseModel):
    """Seven-day outlook for the household's overall energy condition."""

    household_id: str
    days: list[DailyForecast]
    summary: str | None = None  # plain-language week ahead
