"""Requirement 3 — per-unit condition, weekly detail, feedback."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_household_id
from app.schemas.common import EnergyUnitType
from app.schemas.energy_units import UnitConditionList, UnitWeeklyDetail
from app.services.energy_units_service import energy_units_service

router = APIRouter(prefix="/energy-units", tags=["energy-units"])


@router.get("", response_model=UnitConditionList)
async def get_unit_conditions(
    household_id: str = Depends(get_household_id),
) -> UnitConditionList:
    """Current condition of every energy unit (overview cards)."""
    return await energy_units_service.get_conditions(household_id)


@router.get("/{unit}/weekly", response_model=UnitWeeklyDetail)
async def get_unit_weekly_detail(
    unit: EnergyUnitType,
    household_id: str = Depends(get_household_id),
) -> UnitWeeklyDetail:
    """Detail page: a week of data for one unit + improvement feedback."""
    return await energy_units_service.get_weekly_detail(household_id, unit)
