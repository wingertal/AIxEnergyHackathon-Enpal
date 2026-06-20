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
    # Optional prior turns for multi-turn context.
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
