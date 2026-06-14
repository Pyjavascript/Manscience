"""OpenAI provider client.

This is the only module permitted to import and use the `openai` SDK
directly. It implements `LLMClient` so the rest of the application depends
only on `app.llm.base` (`LLMClient`, `LLMResponse`, `LLMProviderError`).
"""

from __future__ import annotations

import logging
import random
import time

from openai import (
    APIConnectionError,
    APITimeoutError,
    AuthenticationError,
    BadRequestError,
    InternalServerError,
    OpenAI,
    RateLimitError,
)

from app.config.settings import settings
from app.llm.base import LLMClient, LLMProviderError, LLMResponse

logger = logging.getLogger(__name__)

_RETRYABLE_EXCEPTIONS = (RateLimitError, APITimeoutError, APIConnectionError, InternalServerError)


class OpenAIClient(LLMClient):
    """`LLMClient` implementation backed by the OpenAI Chat Completions API."""

    def __init__(self) -> None:
        self._client = OpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_api_base,
            timeout=settings.openai_timeout_seconds,
        )

    def generate_response(
        self,
        messages: list[dict],
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        effective_model = settings.model_name if model is None else model
        effective_temperature = settings.temperature if temperature is None else temperature
        effective_max_tokens = settings.max_tokens_response if max_tokens is None else max_tokens

        if settings.debug:
            logger.debug(
                "OpenAI request: model=%s, temperature=%s, max_tokens=%s, messages=%r",
                effective_model,
                effective_temperature,
                effective_max_tokens,
                messages,
            )
        else:
            logger.debug(
                "OpenAI request: model=%s, temperature=%s, max_tokens=%s, message_count=%d",
                effective_model,
                effective_temperature,
                effective_max_tokens,
                len(messages),
            )

        max_attempts = settings.openai_max_retries
        for attempt in range(1, max_attempts + 1):
            start = time.monotonic()
            try:
                completion = self._client.chat.completions.create(
                    model=effective_model,
                    messages=messages,
                    temperature=effective_temperature,
                    max_tokens=effective_max_tokens,
                )
            except AuthenticationError as exc:
                logger.error("OpenAI authentication failed: %s", exc)
                raise LLMProviderError(
                    "Authentication with the AI provider failed. Check API key configuration."
                ) from exc
            except BadRequestError as exc:
                logger.error("OpenAI request was invalid: %s", exc)
                raise LLMProviderError("The request to the AI provider was invalid.") from exc
            except _RETRYABLE_EXCEPTIONS as exc:
                if attempt < max_attempts:
                    delay = _backoff_delay(attempt)
                    logger.warning(
                        "OpenAI request failed (attempt %d/%d): %s. Retrying in %.2fs.",
                        attempt,
                        max_attempts,
                        exc,
                        delay,
                    )
                    time.sleep(delay)
                    continue
                logger.error("OpenAI request failed after %d attempt(s): %s", max_attempts, exc)
                raise LLMProviderError(_retry_exhausted_message(exc)) from exc
            except Exception as exc:
                logger.error("Unexpected error calling OpenAI: %s", exc)
                raise LLMProviderError(
                    "An unexpected error occurred while contacting the AI provider."
                ) from exc
            else:
                latency_ms = (time.monotonic() - start) * 1000
                response = _to_llm_response(completion)
                logger.info(
                    "OpenAI request succeeded: model=%s, total_tokens=%d, finish_reason=%s, latency_ms=%.1f",
                    response.model,
                    response.total_tokens,
                    response.finish_reason,
                    latency_ms,
                )
                return response

        raise LLMProviderError("An unexpected error occurred while contacting the AI provider.")


def _backoff_delay(attempt: int) -> float:
    """Exponential backoff with jitter: ~1s, ~2s, ~4s, ... plus up to 0.5s jitter."""
    base = 2 ** (attempt - 1)
    jitter = random.uniform(0, 0.5)
    return base + jitter


def _retry_exhausted_message(exc: Exception) -> str:
    if isinstance(exc, RateLimitError):
        return "The AI provider is rate-limiting requests. Please try again shortly."
    return "Could not reach the AI provider. Please check your connection and try again."


def _to_llm_response(completion) -> LLMResponse:
    choice = completion.choices[0]
    usage = completion.usage
    return LLMResponse(
        content=choice.message.content or "",
        model=completion.model,
        finish_reason=choice.finish_reason or "stop",
        prompt_tokens=usage.prompt_tokens if usage else 0,
        completion_tokens=usage.completion_tokens if usage else 0,
        total_tokens=usage.total_tokens if usage else 0,
    )
