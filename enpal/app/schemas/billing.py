"""Requirement 2 — savings this month, current bill, and 2-month comparison."""

from __future__ import annotations

from pydantic import BaseModel

from app.schemas.common import Money, Trend


class MonthSummary(BaseModel):
    """Headline figures for a single billing month."""

    month: str  # ISO "YYYY-MM"
    bill: Money  # what they'll pay
    saved: Money  # vs. a standard tariff / no-solar baseline


class BillingComparison(BaseModel):
    """Current month vs. the previous two, with a doing-good/bad verdict."""

    household_id: str
    current: MonthSummary
    previous_months: list[MonthSummary]  # most recent first, up to 2
    savings_trend: Trend
    verdict: str | None = None  # plain-language "you're doing better than..."
