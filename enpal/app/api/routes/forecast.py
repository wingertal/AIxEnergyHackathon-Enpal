"""Requirement 4 — weekly weather-based forecast."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_household_id
from app.schemas.forecast import WeeklyForecast
from app.services.forecast_service import forecast_service

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.get("/weekly", response_model=WeeklyForecast)
async def get_weekly_forecast(
    household_id: str = Depends(get_household_id),
) -> WeeklyForecast:
    """Seven-day outlook for the household's overall energy condition."""
    return await forecast_service.get_weekly(household_id)
