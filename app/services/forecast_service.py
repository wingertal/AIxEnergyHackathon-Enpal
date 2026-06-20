"""Requirement 4 — weekly weather-based forecast."""

from __future__ import annotations

from app.schemas.forecast import WeeklyForecast


class ForecastService:
    async def get_weekly(self, household_id: str) -> WeeklyForecast:
        """Seven-day outlook from the weather feed + system specs.

        TODO(team): fetch weather (see settings.weather_api_*), map to expected
        solar yield and an overall daily outlook.
        """
        raise NotImplementedError("weekly forecast not implemented yet")


forecast_service = ForecastService()
