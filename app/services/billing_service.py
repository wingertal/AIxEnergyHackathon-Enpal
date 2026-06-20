"""Requirement 2 — savings, current bill, 2-month comparison."""

from __future__ import annotations

from app.schemas.billing import BillingComparison


class BillingService:
    async def get_comparison(self, household_id: str) -> BillingComparison:
        """This month's bill + savings vs. the previous two months.

        TODO(team): compute the bill from tariff + consumption, savings vs. a
        standard-tariff baseline, and derive the trend/verdict.
        """
        raise NotImplementedError("billing comparison not implemented yet")


billing_service = BillingService()
