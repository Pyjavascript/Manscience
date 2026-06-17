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
from app.rag.context_builder import ContextBuilder
from app.rag.models import Intent
from app.rag.query_understanding import QueryUnderstanding
from app.rag.retriever import FileSystemRetriever, KnowledgeRetriever
from app.services.memory_service import MemoryService
from app.services.prompt_builder import build_messages

logger = logging.getLogger(__name__)

CLARIFICATION_MESSAGE = (
    "Could you let me know which condition or therapy you'd like to find out about? "
    "I want to make sure I give you the right information."
)


class ChatServiceError(Exception):
    """User-safe error raised by `ChatService`. Never wraps raw provider details."""


class ChatService:
    """Coordinates memory, prompt building, and the LLM client for one chat turn."""

    def __init__(
        self,
        memory: MemoryService | None = None,
        llm_client: LLMClient | None = None,
        prompt_builder: Callable[..., list[dict]] = build_messages,
        query_understanding: QueryUnderstanding | None = None,
        retriever: KnowledgeRetriever | None = None,
        context_builder: ContextBuilder | None = None,
    ) -> None:
        self.memory = memory if memory is not None else MemoryService()
        self.llm_client = llm_client if llm_client is not None else OpenAIClient()
        self._build_messages = prompt_builder
        self._query_understanding = query_understanding if query_understanding is not None else QueryUnderstanding()
        self._retriever = retriever if retriever is not None else FileSystemRetriever()
        self._context_builder = context_builder if context_builder is not None else ContextBuilder()

    def handle_message(self, user_message: str) -> str:
        if not user_message.strip():
            raise ChatServiceError("Message cannot be empty.")

        logger.info("Processing message (length=%d)", len(user_message))

        try:
            history = self.memory.get_history()
        except Exception:
            logger.exception("Memory unavailable; treating message as a standalone question")
            history = []

        query_context = self._query_understanding.analyse(user_message, history)

        if query_context.intent is Intent.UNKNOWN and query_context.is_follow_up:
            # Unresolvable follow-up — ask for clarification without retrieval
            # or an LLM call (spec §5.5, AC-6-07).
            return self._respond_with_clarification(user_message)

        # RAG pipeline — guarded entirely; degrades to no-context on any error
        assembled_context = None
        if query_context.intent is not Intent.UNKNOWN:
            try:
                results = self._retriever.retrieve(query_context)
                assembled_context = self._context_builder.assemble(results, query_context, history)
            except Exception:
                logger.exception("RAG pipeline failed; proceeding without context")

        try:
            messages = self._build_messages(
                user_message=user_message,
                history=history,
                context=assembled_context,
            )
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

        # Memory is written only after a successful response. A write failure
        # here must never become a user-visible error — the response has
        # already been generated successfully (spec §3.4, §4.7).
        try:
            self.memory.append("user", user_message)
            self.memory.append("assistant", llm_response.content)
        except Exception:
            logger.exception("Memory write failed after successful response; turn not persisted")

        logger.info(
            "Turn completed: response_length=%d, total_tokens=%d",
            len(llm_response.content),
            llm_response.total_tokens,
        )

        return llm_response.content

    def _respond_with_clarification(self, user_message: str) -> str:
        logger.info("Unresolvable follow-up; returning clarification without retrieval or LLM call")
        try:
            self.memory.append("user", user_message)
            self.memory.append("assistant", CLARIFICATION_MESSAGE)
        except Exception:
            logger.exception("Memory write failed after clarification response; turn not persisted")
        return CLARIFICATION_MESSAGE
