"""Requirement 5 — weekly money reduced + energy consumed, daily breakdown."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_household_id
from app.schemas.consumption import WeeklyConsumption
from app.services.consumption_service import consumption_service

router = APIRouter(prefix="/consumption", tags=["consumption"])


@router.get("/weekly", response_model=WeeklyConsumption)
async def get_weekly_consumption(
    household_id: str = Depends(get_household_id),
) -> WeeklyConsumption:
    """Week totals (energy + savings) with a per-day breakdown."""
    return await consumption_service.get_weekly(household_id)
