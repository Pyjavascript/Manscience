"""Prompt construction for Mansi AI.

Pure transformation: (user_message, history, ...) -> messages[] in the
OpenAI chat format. Performs no I/O and calls no LLM.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.rag.models import AssembledContext

logger = logging.getLogger(__name__)

DEFAULT_SYSTEM_PROMPT = (
    "You are Mansi, a knowledgeable, empathetic, and professional AI assistant "
    "specialising in mental health conditions and therapies offered by Manscience. "
    "You help users understand conditions, therapies, and how they relate to each other.\n\n"
    "GROUNDING RULES:\n"
    "- When website content is provided below, use it as your primary source of truth.\n"
    "- Do not contradict information in the provided content.\n"
    "- If the content does not answer the question, say so honestly rather than guessing.\n"
    "- Never invent conditions, therapy names, or statistics not present in the context.\n\n"
    "TONE: Warm, clear, and non-clinical. Avoid jargon where possible. If a user appears "
    "distressed, acknowledge their feelings before providing information.\n\n"
    "SAFETY: Never provide medical diagnoses or replace professional advice. Always recommend "
    "speaking to a qualified practitioner for personal concerns."
)


def build_messages(
    user_message: str,
    history: list[dict],
    system_prompt_override: str | None = None,
    context: "AssembledContext | None" = None,
) -> list[dict]:
    """Build the final `messages` list to send to an LLM client.

    Args:
        user_message: The current raw text from the user.
        history: Prior conversation messages, each `{"role": ..., "content": ...}`.
        system_prompt_override: Optional replacement for `DEFAULT_SYSTEM_PROMPT`.
        context: Optional assembled knowledge context from the RAG pipeline.

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

    if context is not None:
        rendered = _render_context(context)
        if rendered:
            system_prompt = system_prompt + "\n\n" + rendered

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": stripped_message})

    logger.debug("Built %d messages (%d history entries)", len(messages), len(history))

    return messages


def _render_context(context: "AssembledContext") -> str:
    """Render an AssembledContext into the LLM injection block.

    Returns an empty string when retrieval_quality is EMPTY so the caller
    can skip appending entirely.
    """
    from app.rag.models import RetrievalQuality

    if context.retrieval_quality == RetrievalQuality.EMPTY:
        return ""

    confidence_line = (
        "The following information directly answers this query."
        if context.retrieval_quality == RetrievalQuality.GOOD
        else "The following information may partially address this query."
    )

    lines: list[str] = [
        "--- MANSI WEBSITE CONTENT ---",
        confidence_line,
    ]

    if context.primary_content:
        lines.append("[PRIMARY CONTENT]")
        for section in context.primary_content:
            lines.append(f"Title: {section.title}")
            lines.append(f"Source: {section.source_url}")
            if section.summary:
                lines.append(section.summary)
            for bullet in section.bullets:
                lines.append(f"• {bullet}")

    if context.supporting_content:
        lines.append("[SUPPORTING CONTENT]")
        for section in context.supporting_content:
            lines.append(f"Title: {section.title}")
            lines.append(f"Source: {section.source_url}")
            if section.summary:
                lines.append(section.summary)
            for bullet in section.bullets:
                lines.append(f"• {bullet}")

    lines.append("--- END OF MANSI WEBSITE CONTENT ---")
    return "\n".join(lines)
