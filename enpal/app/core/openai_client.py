"""OpenAI Chat client wrapper (merged-in chatbot transport).

Thin shared entry point for the OpenAI-powered conversational companion. Prompt
building and grounding live in the chat service — this module only owns the
transport, mirroring :mod:`app.core.llm` (Anthropic).
"""

from __future__ import annotations

from functools import lru_cache

from app.config import settings

# The SDK is optional at boot so the server still runs without a key configured.
try:
    from openai import OpenAI
except ImportError:  # pragma: no cover - dependency not installed yet
    OpenAI = None  # type: ignore[assignment]


class OpenAIClient:
    """Synchronous wrapper around the OpenAI Chat Completions API."""

    def __init__(self, api_key: str, model: str) -> None:
        self._api_key = api_key
        self._model = model
        self._client = None

    @property
    def enabled(self) -> bool:
        """True when an API key and the SDK are both available."""
        return bool(self._api_key) and OpenAI is not None

    def _get_client(self):
        if OpenAI is None:
            raise RuntimeError("openai SDK is not installed. Run `pip install -r requirements.txt`.")
        if not self._api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured (see .env.example).")
        if self._client is None:
            self._client = OpenAI(api_key=self._api_key)
        return self._client

    def complete(
        self,
        *,
        system: str,
        messages: list[dict],
        max_tokens: int = 600,
        temperature: float = 0.2,
    ) -> str:
        """Single-shot completion. Returns the assistant's text.

        ``messages`` is the standard chat format:
            [{"role": "user", "content": "..."}, ...]
        The ``system`` prompt is prepended automatically.
        """
        client = self._get_client()
        resp = client.chat.completions.create(
            model=self._model,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[{"role": "system", "content": system}, *messages],
        )
        return (resp.choices[0].message.content or "").strip()


@lru_cache
def get_openai_client() -> OpenAIClient:
    return OpenAIClient(api_key=settings.openai_api_key, model=settings.openai_model)


openai_client = get_openai_client()
