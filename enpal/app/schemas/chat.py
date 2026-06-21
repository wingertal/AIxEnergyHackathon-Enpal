"""Requirement 6 — conversational assistant grounded in the household's data."""

from __future__ import annotations

from pydantic import BaseModel


class SuggestedQuestion(BaseModel):
    """A pre-defined prompt shown to the user as a tappable chip."""

    id: str
    text: str
    # Why it's suggested: from the household profile, or commonly-asked.
    source: str  # "profile" | "popular"


class SuggestedQuestions(BaseModel):
    household_id: str
    questions: list[SuggestedQuestion]


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    household_id: str
    message: str
    # Optional prior turns for multi-turn context (stateless clients).
    history: list[ChatMessage] = []
    # Optional server-side conversation to append to (enables persistence).
    conversation_id: int | None = None


class ChatResponse(BaseModel):
    reply: str
    # Set when the turn was persisted; reuse it to continue the conversation.
    conversation_id: int | None = None


class ConversationSummary(BaseModel):
    id: int
    household_id: str
    title: str
    created_at: str


class StoredMessage(BaseModel):
    id: int
    role: str
    content: str
    created_at: str
