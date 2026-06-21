"""Anthropic Claude client wrapper.

Thin, shared entry point for the AI layer. The chatbot service (Requirement 6)
and any proactive-insight features build on top of this. Keep prompt-building and
business logic in the services — this module only owns the transport.

Usage:
    from app.core.llm import llm_client

    text = await llm_client.complete(
        system="You are a friendly home-energy assistant.",
        messages=[{"role": "user", "content": "Why is my bill high?"}],
    )
"""

from __future__ import annotations

from functools import lru_cache

from app.config import settings

# The SDK is optional at boot so the server still runs without a key configured.
try:
    from anthropic import AsyncAnthropic
except ImportError:  # pragma: no cover - dependency not installed yet
    AsyncAnthropic = None  # type: ignore[assignment]


class LLMClient:
    """Async wrapper around the Anthropic Messages API."""

    def __init__(self, api_key: str, model: str) -> None:
        self._model = model
        self._api_key = api_key
        self._client: "AsyncAnthropic | None" = None

    @property
    def enabled(self) -> bool:
        """True when an API key and the SDK are both available."""
        return bool(self._api_key) and AsyncAnthropic is not None

    def _get_client(self) -> "AsyncAnthropic":
        if AsyncAnthropic is None:
            raise RuntimeError(
                "anthropic SDK is not installed. Run `pip install -r requirements.txt`."
            )
        if not self._api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not configured (see .env.example).")
        if self._client is None:
            self._client = AsyncAnthropic(api_key=self._api_key)
        return self._client

    async def complete(
        self,
        *,
        system: str,
        messages: list[dict],
        max_tokens: int = 1024,
    ) -> str:
        """Single-shot completion. Returns the concatenated text response.

        `messages` is the standard Anthropic format:
            [{"role": "user", "content": "..."}, ...]

        TODO(team): add streaming, tool-use, and prompt caching as the chatbot grows.
        """
        client = self._get_client()
        response = await client.messages.create(
            model=self._model,
            max_tokens=max_tokens,
            thinking={"type": "adaptive"},
            system=system,
            messages=messages,
        )
        return "".join(
            block.text for block in response.content if getattr(block, "type", None) == "text"
        )


@lru_cache
def get_llm_client() -> LLMClient:
    return LLMClient(api_key=settings.anthropic_api_key, model=settings.anthropic_model)


llm_client = get_llm_client()
