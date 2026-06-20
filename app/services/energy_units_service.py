"""Requirement 3 — per-unit condition, weekly detail, feedback."""

from __future__ import annotations

from app.schemas.common import EnergyUnitType
from app.schemas.energy_units import UnitConditionList, UnitWeeklyDetail


class EnergyUnitsService:
    async def get_conditions(self, household_id: str) -> UnitConditionList:
        """Current condition card for every energy unit."""
        raise NotImplementedError("unit conditions not implemented yet")

    async def get_weekly_detail(
        self, household_id: str, unit: EnergyUnitType
    ) -> UnitWeeklyDetail:
        """One week of data for a single unit, plus improvement feedback."""
        raise NotImplementedError("unit weekly detail not implemented yet")


energy_units_service = EnergyUnitsService()
