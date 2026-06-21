"""Aggregate router — mounts every feature router under /api/v1."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import (
    billing,
    chat,
    consumption,
    data,
    energy_units,
    forecast,
    health,
    lights,
)

api_router = APIRouter()

# Health is unprefixed-friendly; feature routers carry their own prefixes.
api_router.include_router(health.router)
api_router.include_router(lights.router)
api_router.include_router(billing.router)
api_router.include_router(energy_units.router)
api_router.include_router(forecast.router)
api_router.include_router(consumption.router)
api_router.include_router(chat.router)
# Raw dataset access — lets the frontend source all its data from the server.
api_router.include_router(data.router)
