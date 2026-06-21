"""Liveness / readiness checks."""

from __future__ import annotations

from fastapi import APIRouter

from app import __version__
from app.config import settings
from app.core.llm import llm_client

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    """Basic liveness + feature-availability snapshot."""
    return {
        "status": "ok",
        "version": __version__,
        "env": settings.app_env,
        "llm_enabled": llm_client.enabled,
    }
