"""Requirement 1 — light indications per household item + change notifications."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_household_id
from app.schemas.lights import LightChangeEvent, LightsOverview
from app.services.lights_service import lights_service

router = APIRouter(prefix="/lights", tags=["lights"])


@router.get("", response_model=LightsOverview)
async def get_lights(household_id: str = Depends(get_household_id)) -> LightsOverview:
    """All item lights + live consumption — the main at-a-glance screen."""
    return await lights_service.get_overview(household_id)


@router.post("/evaluate", response_model=list[LightChangeEvent])
async def evaluate_lights(
    household_id: str = Depends(get_household_id),
) -> list[LightChangeEvent]:
    """Recompute lights and push notifications for any that changed."""
    return await lights_service.evaluate_and_notify(household_id)
