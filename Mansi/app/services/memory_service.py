"""In-memory conversation history for a single chat session."""

from __future__ import annotations

import logging

from app.config.settings import settings

logger = logging.getLogger(__name__)

_VALID_ROLES = ("user", "assistant")


class MemoryService:
    """Stores and trims the conversation history for a single session.

    Public interface (`append`, `get_history`, `clear`) is deliberately
    minimal so a future persistent/multi-session store can be substituted
    without changing callers.
    """

    def __init__(self, max_messages: int | None = None) -> None:
        self._messages: list[dict] = []
        self._max_messages = max_messages if max_messages is not None else settings.memory_max_messages

    def append(self, role: str, content: str) -> None:
        if role not in _VALID_ROLES:
            raise ValueError(f"Invalid role: {role!r} (expected one of {_VALID_ROLES})")
        if not content.strip():
            raise ValueError("content cannot be empty")

        self._messages.append({"role": role, "content": content})
        self._trim()
        logger.debug("Memory: %d/%d messages", len(self._messages), self._max_messages)

    def get_history(self) -> list[dict]:
        return list(self._messages)

    def clear(self) -> None:
        self._messages.clear()

    def _trim(self) -> None:
        if len(self._messages) > self._max_messages:
            overflow = len(self._messages) - self._max_messages
            self._messages = self._messages[overflow:]
            logger.info(
                "Memory trimmed: removed %d oldest message(s) to stay within limit of %d",
                overflow,
                self._max_messages,
            )
