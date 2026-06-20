"""Requirement 5 — weekly money reduced + energy consumed, with daily breakdown."""

from __future__ import annotations

from pydantic import BaseModel

from app.schemas.common import Money


class DailyBreakdown(BaseModel):
    date: str  # ISO "YYYY-MM-DD"
    energy_consumed_kwh: float
    money_saved: Money


class WeeklyConsumption(BaseModel):
    """Week totals plus the per-day breakdown that powers the chart."""

    household_id: str
    week_start: str  # ISO "YYYY-MM-DD" (Monday)
    total_energy_consumed_kwh: float
    total_money_saved: Money
    daily: list[DailyBreakdown]
