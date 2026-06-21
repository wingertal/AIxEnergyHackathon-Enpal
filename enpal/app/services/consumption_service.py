"""Requirement 5 — weekly money reduced + energy consumed, daily breakdown."""

from __future__ import annotations

from app.data import dataset
from app.schemas.common import Money
from app.schemas.consumption import DailyBreakdown, WeeklyConsumption
from app.services.analytics import day_cost_breakdown


class ConsumptionService:
    async def get_weekly(self, household_id: str) -> WeeklyConsumption:
        """Week totals (energy + savings) with a per-day breakdown.

        Covers the most recent 7 days of data. "Money saved" per day is the
        baseline (no-solar, standard-tariff) energy cost minus the actual cost.
        """
        if dataset.get_household(household_id) is None:
            raise KeyError(household_id)

        by_date = dataset.records_by_date(household_id)
        dates = dataset.last_n_dates(household_id, 7)

        daily: list[DailyBreakdown] = []
        total_kwh = 0.0
        total_saved = 0.0
        for d in dates:
            breakdown = day_cost_breakdown(household_id, by_date[d])
            total_kwh += breakdown["consumption_kwh"]
            total_saved += breakdown["saved"]
            daily.append(
                DailyBreakdown(
                    date=d,
                    energy_consumed_kwh=round(breakdown["consumption_kwh"], 2),
                    money_saved=Money(amount=round(breakdown["saved"], 2)),
                )
            )

        return WeeklyConsumption(
            household_id=household_id,
            week_start=dates[0] if dates else "",
            total_energy_consumed_kwh=round(total_kwh, 2),
            total_money_saved=Money(amount=round(total_saved, 2)),
            daily=daily,
        )


consumption_service = ConsumptionService()
