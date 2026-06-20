"""FastAPI application entrypoint.

Run locally:
    uvicorn app.main:app --reload

Interactive docs at http://localhost:8000/docs
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__
from app.api.router import api_router
from app.config import settings

logging.basicConfig(level=settings.log_level)

app = FastAPI(
    title=settings.app_name,
    version=__version__,
    summary="One clear, intuitive view of a household's energy reality.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(NotImplementedError)
async def not_implemented_handler(_: Request, exc: NotImplementedError) -> JSONResponse:
    """Map unbuilt service methods to a clear 501 instead of a 500.

    Lets the whole API surface be reachable and self-documenting while features
    are still being built.
    """
    detail = str(exc) or "This feature is not implemented yet."
    return JSONResponse(status_code=501, content={"detail": detail})


@app.exception_handler(KeyError)
async def not_found_handler(_: Request, exc: KeyError) -> JSONResponse:
    """Unknown household / resource -> 404 instead of a 500."""
    return JSONResponse(
        status_code=404, content={"detail": f"Not found: {exc.args[0] if exc.args else exc}"}
    )


# All feature endpoints live under /api/v1.
app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["root"])
async def root() -> dict:
    return {"app": settings.app_name, "version": __version__, "docs": "/docs"}
