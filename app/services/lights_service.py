"""Requirement 1 — light indications + push on change."""

from __future__ import annotations

from app.schemas.lights import LightChangeEvent, LightsOverview


class LightsService:
    async def get_overview(self, household_id: str) -> LightsOverview:
        """Current traffic-light + consumption for every household item."""
        raise NotImplementedError("lights overview not implemented yet")

    async def evaluate_and_notify(self, household_id: str) -> list[LightChangeEvent]:
        """Recompute lights, and push a notification for any that changed.

        TODO(team): compare new lights to the last-known state, emit
        LightChangeEvent for changes, and call notification_service.send(...).
        """
        raise NotImplementedError("light change detection not implemented yet")


lights_service = LightsService()
