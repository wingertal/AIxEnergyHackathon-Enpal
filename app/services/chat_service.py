"""Requirement 6 — conversational assistant grounded in household data.

Builds prompts/context here and delegates transport to `app.core.llm`.
"""

from __future__ import annotations

from app.core.llm import llm_client
from app.schemas.chat import ChatRequest, ChatResponse, SuggestedQuestions


class ChatService:
    def __init__(self) -> None:
        self._llm = llm_client

    async def get_suggested_questions(self, household_id: str) -> SuggestedQuestions:
        """Pre-defined prompts: from the household profile + commonly asked.

        TODO(team): derive profile-based questions from the household's setup,
        and mix in a curated list of popular questions.
        """
        raise NotImplementedError("suggested questions not implemented yet")

    async def answer(self, request: ChatRequest) -> ChatResponse:
        """Answer a user question grounded in their own energy data.

        TODO(team):
          1. Load the household's profile/metrics for grounding context.
          2. Build a system prompt + messages (request.history + request.message).
          3. Call `self._llm.complete(...)` and return the reply.
        """
        raise NotImplementedError("chat answering not implemented yet")


chat_service = ChatService()
