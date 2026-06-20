"""Shared FastAPI dependencies.

While there's no auth yet, household selection is centralized here so every
endpoint takes the same `household_id` and we can swap in real auth later
without touching the routes.
"""

from __future__ import annotations

from fastapi import Query

from app.data.mock_store import DEFAULT_HOUSEHOLD_ID


def get_household_id(
    household_id: str = Query(
        default=DEFAULT_HOUSEHOLD_ID,
        description="Household identifier (defaults to the demo household).",
    ),
) -> str:
    """Resolve the active household for a request.

    TODO(team): replace with the authenticated user's household once auth lands.
    """
    return household_id
