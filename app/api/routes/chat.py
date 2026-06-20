"""Requirement 6 — conversational assistant + suggested questions."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_household_id
from app.schemas.chat import ChatRequest, ChatResponse, SuggestedQuestions
from app.services.chat_service import chat_service

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
