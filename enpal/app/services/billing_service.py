"""Requirement 2 — savings, current bill, 2-month comparison."""

from __future__ import annotations

from app.config import settings
from app.data import dataset
from app.schemas.billing import BillingComparison, MonthSummary
from app.schemas.common import Money, Trend
from app.services.analytics import trend_of


def _month_savings(bill: dict) -> float:
    """Savings for a billed month vs. a no-solar standard-tariff baseline.

    Baseline = all consumption bought from the grid at the standard rate plus the
    monthly base fee. Savings = baseline total − the actual total bill, i.e. the
    combined value of PV self-consumption, battery and feed-in credit.
    """
    baseline_energy = bill["consumption_kwh"] * settings.baseline_grid_rate_eur_per_kwh
    baseline_total = baseline_energy + bill["base_fee_eur"]
    return round(baseline_total - bill["total_bill_eur"], 2)


def _summary(bill: dict) -> MonthSummary:
    return MonthSummary(
        month=bill["month"],
        bill=Money(amount=round(bill["total_bill_eur"], 2)),
        saved=Money(amount=_month_savings(bill)),
    )


class BillingService:
    async def get_comparison(self, household_id: str) -> BillingComparison:
        """This month's bill + savings vs. the previous two months."""
        bills = dataset.get_bills(household_id)
        if not bills:
            raise KeyError(household_id)

        current = bills[-1]
        previous = list(reversed(bills[-3:-1]))  # up to 2, most recent first

        current_summary = _summary(current)
        previous_summaries = [_summary(b) for b in previous]

        # Trend of *savings*: are we saving more than last month?
        if previous_summaries:
            savings_trend = trend_of(
                current_summary.saved.amount, previous_summaries[0].saved.amount
            )
        else:
            savings_trend = Trend.FLAT

        return BillingComparison(
            household_id=household_id,
            current=current_summary,
            previous_months=previous_summaries,
            savings_trend=savings_trend,
            verdict=self._verdict(current_summary, previous_summaries, savings_trend),
        )

    @staticmethod
    def _verdict(
        current: MonthSummary,
        previous: list[MonthSummary],
        trend: Trend,
    ) -> str:
        saved = current.saved.amount
        bill = current.bill.amount
        if not previous:
            return f"In {current.month} you saved €{saved:.0f}, paying €{bill:.0f}."

        avg_prev_bill = sum(p.bill.amount for p in previous) / len(previous)
        diff = bill - avg_prev_bill
        if trend is Trend.UP:
            mood = f"You're doing better — saving €{saved:.0f} this month, more than last month."
        elif trend is Trend.DOWN:
            mood = f"Savings dipped to €{saved:.0f} this month, below last month."
        else:
            mood = f"Savings held steady at about €{saved:.0f} this month."

        if diff <= -1:
            compare = f"Your €{bill:.0f} bill is €{abs(diff):.0f} lower than the last 2 months' average."
        elif diff >= 1:
            compare = f"Your €{bill:.0f} bill is €{diff:.0f} higher than the last 2 months' average."
        else:
            compare = f"Your €{bill:.0f} bill is in line with the last 2 months."
        return f"{mood} {compare}"


billing_service = BillingService()
