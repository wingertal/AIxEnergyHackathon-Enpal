"""Requirement 5 — weekly money reduced + energy consumed, daily breakdown."""

from __future__ import annotations

from app.schemas.consumption import WeeklyConsumption


class ConsumptionService:
    async def get_weekly(self, household_id: str) -> WeeklyConsumption:
        """Week totals (energy + savings) with a per-day breakdown."""
        raise NotImplementedError("weekly consumption not implemented yet")


consumption_service = ConsumptionService()
