"""Requirement 2 — savings, current bill, comparison vs. last 2 months."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_household_id
from app.schemas.billing import BillingComparison
from app.services.billing_service import billing_service

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/comparison", response_model=BillingComparison)
async def get_billing_comparison(
    household_id: str = Depends(get_household_id),
) -> BillingComparison:
    """This month's bill + savings, compared with the previous two months."""
    return await billing_service.get_comparison(household_id)
