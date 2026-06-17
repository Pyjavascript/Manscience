"""Unit tests for `app.services.prompt_builder`."""

from __future__ import annotations

import pytest

from app.rag.models import AssembledContext, ContentSection, RetrievalQuality
from app.services.prompt_builder import DEFAULT_SYSTEM_PROMPT, build_messages


def test_empty_history_returns_system_and_user_messages():
    messages = build_messages(user_message="Hello", history=[])

    assert messages == [
        {"role": "system", "content": DEFAULT_SYSTEM_PROMPT},
        {"role": "user", "content": "Hello"},
    ]


def test_history_is_preserved_between_system_and_current_message():
    history = [
        {"role": "user", "content": "Hi, my name is Sam."},
        {"role": "assistant", "content": "Hello Sam!"},
    ]

    messages = build_messages(user_message="What's my name?", history=history)

    assert messages[0] == {"role": "system", "content": DEFAULT_SYSTEM_PROMPT}
    assert messages[1:3] == history
    assert messages[3] == {"role": "user", "content": "What's my name?"}


def test_user_message_is_stripped():
    messages = build_messages(user_message="  Hello  ", history=[])

    assert messages[-1] == {"role": "user", "content": "Hello"}


def test_empty_user_message_raises_value_error():
    with pytest.raises(ValueError):
        build_messages(user_message="   ", history=[])


def test_system_prompt_override_replaces_default():
    messages = build_messages(
        user_message="Hi",
        history=[],
        system_prompt_override="Custom system prompt",
    )

    assert messages[0] == {"role": "system", "content": "Custom system prompt"}


def test_malformed_history_entry_missing_role_raises():
    with pytest.raises(ValueError):
        build_messages(user_message="Hi", history=[{"content": "missing role"}])


def test_malformed_history_entry_missing_content_raises():
    with pytest.raises(ValueError):
        build_messages(user_message="Hi", history=[{"role": "user"}])


# --- Context injection tests ---

def _make_section(slug: str = "adhd", score: float = 1.0) -> ContentSection:
    return ContentSection(
        title=f"{slug.title()} — Mansi",
        source_url=f"https://example.com/conditions/{slug}",
        summary=f"{slug.title()} is a condition.",
        bullets=["Symptom A", "Symptom B"],
        relevance_score=score,
        slug=slug,
    )


def _make_context(quality: RetrievalQuality, with_primary: bool = True) -> AssembledContext:
    primary = (_make_section("adhd"),) if with_primary else ()
    return AssembledContext(
        primary_content=primary,
        supporting_content=(),
        history_context=(),
        metadata={"retrieval_quality": quality.value},
        retrieval_quality=quality,
    )


def test_context_none_produces_same_output_as_no_context():
    messages_without = build_messages(user_message="Hello", history=[])
    messages_with_none = build_messages(user_message="Hello", history=[], context=None)
    assert messages_without == messages_with_none


def test_empty_quality_context_does_not_inject_block():
    ctx = _make_context(RetrievalQuality.EMPTY)
    messages = build_messages(user_message="Hello", history=[], context=ctx)
    system_content = messages[0]["content"]
    # The base prompt's history instruction legitimately names the
    # "MANSI WEBSITE CONTENT" section by name — only the rendered block
    # marker indicates whether content was actually injected.
    assert "--- MANSI WEBSITE CONTENT ---" not in system_content


def test_good_quality_context_injects_primary_content():
    ctx = _make_context(RetrievalQuality.GOOD)
    messages = build_messages(user_message="What is ADHD?", history=[], context=ctx)
    system_content = messages[0]["content"]
    assert "MANSI WEBSITE CONTENT" in system_content
    assert "Adhd — Mansi" in system_content or "ADHD" in system_content
    assert "https://example.com/conditions/adhd" in system_content


def test_partial_quality_context_injects_with_partial_note():
    ctx = _make_context(RetrievalQuality.PARTIAL)
    messages = build_messages(user_message="Hello", history=[], context=ctx)
    system_content = messages[0]["content"]
    assert "MANSI WEBSITE CONTENT" in system_content
    assert "partially" in system_content.lower()


def test_injected_content_is_in_system_message_not_user_message():
    ctx = _make_context(RetrievalQuality.GOOD)
    messages = build_messages(user_message="Hello", history=[], context=ctx)
    assert messages[0]["role"] == "system"
    assert "MANSI WEBSITE CONTENT" in messages[0]["content"]
    assert "MANSI WEBSITE CONTENT" not in messages[-1]["content"]


def test_supporting_content_appears_when_present():
    section = _make_section("cbt")
    ctx = AssembledContext(
        primary_content=(_make_section("adhd"),),
        supporting_content=(section,),
        history_context=(),
        metadata={"retrieval_quality": RetrievalQuality.GOOD.value},
        retrieval_quality=RetrievalQuality.GOOD,
    )
    messages = build_messages(user_message="Hello", history=[], context=ctx)
    system_content = messages[0]["content"]
    assert "SUPPORTING CONTENT" in system_content
    assert "Cbt" in system_content or "cbt" in system_content.lower()
