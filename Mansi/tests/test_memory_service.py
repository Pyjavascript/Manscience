"""Unit tests for `app.services.memory_service.MemoryService`."""

from __future__ import annotations

import pytest

from app.services.memory_service import MemoryService


def test_append_and_get_history():
    memory = MemoryService()

    memory.append("user", "hello")
    memory.append("assistant", "hi there")

    assert memory.get_history() == [
        {"role": "user", "content": "hello"},
        {"role": "assistant", "content": "hi there"},
    ]


def test_get_history_returns_a_copy():
    memory = MemoryService()
    memory.append("user", "hello")

    history = memory.get_history()
    history.append({"role": "user", "content": "mutated"})

    assert memory.get_history() == [{"role": "user", "content": "hello"}]


def test_append_invalid_role_raises():
    memory = MemoryService()

    with pytest.raises(ValueError):
        memory.append("system", "hello")


def test_append_empty_content_raises():
    memory = MemoryService()

    with pytest.raises(ValueError):
        memory.append("user", "   ")


def test_trimming_keeps_only_most_recent_messages():
    memory = MemoryService(max_messages=3)

    for i in range(5):
        memory.append("user", f"message {i}")

    history = memory.get_history()

    assert len(history) == 3
    assert [m["content"] for m in history] == ["message 2", "message 3", "message 4"]


def test_clear_empties_history():
    memory = MemoryService()
    memory.append("user", "hello")

    memory.clear()

    assert memory.get_history() == []


def test_clear_is_idempotent():
    memory = MemoryService()

    memory.clear()
    memory.clear()

    assert memory.get_history() == []


def test_default_max_messages_comes_from_settings():
    from app.config.settings import settings

    memory = MemoryService()

    for i in range(settings.memory_max_messages + 5):
        memory.append("user", f"message {i}")

    assert len(memory.get_history()) == settings.memory_max_messages
