"""Chat orchestration layer for Mansi AI.

`ChatService.handle_message` is the stable contract between callers
(terminal `main.py` today, a FastAPI route in the future) and the
memory / prompt-building / LLM layers underneath.
"""

from __future__ import annotations

import logging
from typing import Callable

from app.config.settings import settings
from app.llm.base import LLMClient, LLMProviderError
from app.llm.openai_client import OpenAIClient
from app.services.memory_service import MemoryService
from app.services.prompt_builder import build_messages

logger = logging.getLogger(__name__)


class ChatServiceError(Exception):
    """User-safe error raised by `ChatService`. Never wraps raw provider details."""


class ChatService:
    """Coordinates memory, prompt building, and the LLM client for one chat turn."""

    def __init__(
        self,
        memory: MemoryService | None = None,
        llm_client: LLMClient | None = None,
        prompt_builder: Callable[..., list[dict]] = build_messages,
    ) -> None:
        self.memory = memory if memory is not None else MemoryService()
        self.llm_client = llm_client if llm_client is not None else OpenAIClient()
        self._build_messages = prompt_builder

    def handle_message(self, user_message: str) -> str:
        if not user_message.strip():
            raise ChatServiceError("Message cannot be empty.")

        logger.info("Processing message (length=%d)", len(user_message))

        history = self.memory.get_history()

        try:
            messages = self._build_messages(user_message=user_message, history=history)
        except ValueError as exc:
            logger.warning("Prompt validation failed: %s", exc)
            raise ChatServiceError(str(exc)) from exc

        if settings.debug:
            logger.debug("Messages sent to LLM: %r", messages)

        try:
            llm_response = self.llm_client.generate_response(messages=messages)
        except LLMProviderError as exc:
            logger.error("LLM provider error: %s", exc)
            raise ChatServiceError(
                "Sorry, I couldn't process that right now. Please try again."
            ) from exc
        except Exception as exc:
            logger.exception("Unexpected error during LLM call")
            raise ChatServiceError("An unexpected error occurred.") from exc

        try:
            self.memory.append("user", user_message)
            self.memory.append("assistant", llm_response.content)
        except Exception as exc:
            logger.exception("Unexpected error updating memory")
            raise ChatServiceError("An unexpected error occurred.") from exc

        logger.info(
            "Turn completed: response_length=%d, total_tokens=%d",
            len(llm_response.content),
            llm_response.total_tokens,
        )

        return llm_response.content
