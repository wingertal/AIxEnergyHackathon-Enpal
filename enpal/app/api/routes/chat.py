"""Requirement 6 — conversational assistant + suggested questions.

The standalone chatbot is merged in here: profile-grounded answers, profile-based
suggested questions, and persisted conversation history — all on the one server.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_household_id
from app.db import SessionLocal
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ConversationSummary,
    StoredMessage,
    SuggestedQuestions,
)
from app.services.chat_service import chat_service
from app.services.conversation_store import conversation_store

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/suggested-questions", response_model=SuggestedQuestions)
async def get_suggested_questions(
    household_id: str = Depends(get_household_id),
) -> SuggestedQuestions:
    """Pre-defined prompts: profile-based + commonly asked."""
    return await chat_service.get_suggested_questions(household_id)


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Answer a question grounded in the household's own energy data."""
    return await chat_service.answer(request)


@router.get("/conversations", response_model=list[ConversationSummary])
async def list_conversations(
    household_id: str = Depends(get_household_id),
) -> list[ConversationSummary]:
    """Past conversations for a household (most recent first)."""
    db = SessionLocal()
    try:
        return [
            ConversationSummary(
                id=c.id,
                household_id=c.household_id or "",
                title=c.title or "",
                created_at=c.created_at.isoformat(),
            )
            for c in conversation_store.list_conversations(db, household_id)
        ]
    finally:
        db.close()


@router.get("/conversations/{conversation_id}/messages", response_model=list[StoredMessage])
async def get_conversation_messages(conversation_id: int) -> list[StoredMessage]:
    """Full message history for one conversation."""
    db = SessionLocal()
    try:
        if conversation_store.get(db, conversation_id) is None:
            raise HTTPException(status_code=404, detail=f"Unknown conversation {conversation_id}")
        return [
            StoredMessage(
                id=m.id,
                role=m.role,
                content=m.content,
                created_at=m.created_at.isoformat(),
            )
            for m in conversation_store.get_messages(db, conversation_id)
        ]
    finally:
        db.close()
