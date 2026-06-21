"""Liveness / readiness checks."""

from __future__ import annotations

from fastapi import APIRouter

from app import __version__
from app.config import settings
from app.core.openai_client import openai_client

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    """Basic liveness + feature-availability snapshot."""
    return {
        "status": "ok",
        "version": __version__,
        "env": settings.app_env,
        # True when an OpenAI key is configured; chat falls back to a
        # deterministic, data-grounded engine when this is False.
        "ai_enabled": openai_client.enabled,
    }
