"""SQLAlchemy setup for chatbot conversation persistence.

Merged in from the standalone chatbot service so the unified server keeps a
single place for the database engine/session. Defaults to a local SQLite file
(``settings.database_url``); swap the URL for Postgres in production.
"""

from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

_connect_args = (
    {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
)

engine = create_engine(settings.database_url, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db() -> None:
    """Create tables for all registered models (idempotent)."""
    # Import models so they register on Base before create_all.
    from app.models import chat  # noqa: F401

    Base.metadata.create_all(bind=engine)
