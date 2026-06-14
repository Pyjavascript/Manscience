"""Unit tests for `app.services.prompt_builder`."""

from __future__ import annotations

import pytest

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
