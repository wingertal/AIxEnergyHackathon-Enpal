"""Raw dataset access — serves the underlying JSON to the frontend.

The web/mobile client computes its rich "coach" views (recommendations, traffic
light, savings, forecast, …) from the same synthetic dataset this backend owns.
Rather than duplicate that logic, these endpoints make the server the single
source of truth for the *data*: the frontend fetches the raw JSON from here
instead of bundling its own copy.

Files are streamed straight from disk (``FileResponse``) so the shapes are
exactly the dataset's — no re-serialisation, and the large per-household
timeseries files stream efficiently.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.data import dataset

router = APIRouter(prefix="/data", tags=["data"])

# Small static reference files, exposed by a stable name.
_STATIC_FILES: dict[str, str] = {
    "households": "households.json",
    "tariffs": "tariffs.json",
    "contracts": "contracts.json",
    "monthly_bills": "monthly_bills.json",
    "insight_events": "insight_events.json",
    "dynamic_prices": "dynamic_prices.json",
}


def _file_response(path) -> FileResponse:
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Dataset file missing: {path.name}")
    return FileResponse(path, media_type="application/json")


@router.get("/timeseries/{household_id}")
def get_timeseries(household_id: str) -> FileResponse:
    """The full year of 15-minute readings for one household (~19 MB)."""
    try:
        path = dataset.timeseries_file(household_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown household: {household_id}")
    return _file_response(path)


@router.get("/{name}")
def get_static(name: str) -> FileResponse:
    """A static reference dataset (households, tariffs, bills, prices, …)."""
    filename = _STATIC_FILES.get(name)
    if filename is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown dataset '{name}'. Available: {', '.join(_STATIC_FILES)}.",
        )
    return _file_response(dataset.dataset_file(filename))
