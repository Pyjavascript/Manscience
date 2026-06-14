"""Provider-agnostic contracts for LLM clients.

Every LLM provider client (OpenAI, Claude, Gemini, ...) implements the
`LLMClient` interface and returns the same `LLMResponse` shape, so that
`app/services/chat_service.py` never depends on a specific provider's SDK
types.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


class LLMProviderError(Exception):
    """Raised when an LLM provider request fails after any applicable retries.

    Carries a user-safe message; provider-specific details are logged, not
    included here.
    """


@dataclass(frozen=True)
class LLMResponse:
    """Normalized result of an LLM chat completion call."""

    content: str
    model: str
    finish_reason: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class LLMClient(ABC):
    """Interface implemented by every LLM provider client."""

    @abstractmethod
    def generate_response(
        self,
        messages: list[dict],
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        """Send `messages` to the provider and return a normalized response.

        Raises:
            LLMProviderError: if the request fails after any applicable retries.
        """
        raise NotImplementedError
