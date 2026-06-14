"""Prompt construction for Mansi AI.

Pure transformation: (user_message, history, ...) -> messages[] in the
OpenAI chat format. Performs no I/O and calls no LLM.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

DEFAULT_SYSTEM_PROMPT = (
    "You are Mansi, a helpful, friendly, and professional AI assistant. "
    "Answer clearly and concisely. If you don't know something, say so honestly."
)


def build_messages(
    user_message: str,
    history: list[dict],
    system_prompt_override: str | None = None,
) -> list[dict]:
    """Build the final `messages` list to send to an LLM client.

    Args:
        user_message: The current raw text from the user.
        history: Prior conversation messages, each `{"role": ..., "content": ...}`.
        system_prompt_override: Optional replacement for `DEFAULT_SYSTEM_PROMPT`.

    Returns:
        `[system, *history, current_user_message]`.

    Raises:
        ValueError: if `user_message` is empty/whitespace, or if any entry in
            `history` is missing a `role` or `content` key.
    """
    stripped_message = user_message.strip()
    if not stripped_message:
        raise ValueError("user_message cannot be empty")

    for entry in history:
        if "role" not in entry or "content" not in entry:
            raise ValueError(f"Malformed history entry, missing 'role' or 'content': {entry!r}")

    system_prompt = system_prompt_override or DEFAULT_SYSTEM_PROMPT

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": stripped_message})

    logger.debug("Built %d messages (%d history entries)", len(messages), len(history))

    return messages
