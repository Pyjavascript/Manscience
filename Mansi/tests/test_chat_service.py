"""Unit tests for `app.services.chat_service.ChatService`.

All dependencies (memory, LLM client, prompt builder) are injected as
fakes/mocks — no real network calls or settings-dependent defaults are
exercised here.
"""

from __future__ import annotations

import pytest

from app.llm.base import LLMProviderError, LLMResponse
from app.services.chat_service import ChatService, ChatServiceError


class FakeMemory:
    def __init__(self, history=None):
        self._history = history or []
        self.appended: list[tuple[str, str]] = []

    def get_history(self):
        return list(self._history)

    def append(self, role, content):
        self.appended.append((role, content))


class FakeLLMClient:
    def __init__(self, response=None, error=None):
        self._response = response
        self._error = error
        self.calls: list[list[dict]] = []

    def generate_response(self, messages, **kwargs):
        self.calls.append(messages)
        if self._error is not None:
            raise self._error
        return self._response


def _fake_response(content="Hello there!"):
    return LLMResponse(
        content=content,
        model="gpt-4o-mini",
        finish_reason="stop",
        prompt_tokens=10,
        completion_tokens=5,
        total_tokens=15,
    )


def test_happy_path_returns_reply_and_updates_memory():
    memory = FakeMemory(history=[{"role": "user", "content": "hi"}])
    llm = FakeLLMClient(response=_fake_response("Hello there!"))

    chat = ChatService(memory=memory, llm_client=llm)
    reply = chat.handle_message("How are you?")

    assert reply == "Hello there!"
    assert memory.appended == [
        ("user", "How are you?"),
        ("assistant", "Hello there!"),
    ]
    assert len(llm.calls) == 1


def test_empty_message_raises_without_calling_llm_or_memory():
    memory = FakeMemory()
    llm = FakeLLMClient(response=_fake_response())

    chat = ChatService(memory=memory, llm_client=llm)

    with pytest.raises(ChatServiceError):
        chat.handle_message("   ")

    assert llm.calls == []
    assert memory.appended == []


def test_prompt_builder_value_error_is_wrapped_and_memory_untouched():
    memory = FakeMemory()
    llm = FakeLLMClient(response=_fake_response())

    def failing_builder(user_message, history, **kwargs):
        raise ValueError("bad history")

    chat = ChatService(memory=memory, llm_client=llm, prompt_builder=failing_builder)

    with pytest.raises(ChatServiceError, match="bad history"):
        chat.handle_message("hello")

    assert llm.calls == []
    assert memory.appended == []


def test_llm_provider_error_is_wrapped_and_memory_untouched():
    memory = FakeMemory()
    llm = FakeLLMClient(error=LLMProviderError("provider down"))

    chat = ChatService(memory=memory, llm_client=llm)

    with pytest.raises(ChatServiceError, match="try again"):
        chat.handle_message("hello")

    assert memory.appended == []


def test_unexpected_llm_exception_is_wrapped_and_memory_untouched():
    memory = FakeMemory()
    llm = FakeLLMClient(error=RuntimeError("boom"))

    chat = ChatService(memory=memory, llm_client=llm)

    with pytest.raises(ChatServiceError, match="unexpected error"):
        chat.handle_message("hello")

    assert memory.appended == []


def test_messages_sent_to_llm_include_history_and_current_message():
    memory = FakeMemory(history=[{"role": "user", "content": "earlier message"}])
    llm = FakeLLMClient(response=_fake_response())

    chat = ChatService(memory=memory, llm_client=llm)
    chat.handle_message("new message")

    sent_messages = llm.calls[0]
    assert {"role": "user", "content": "earlier message"} in sent_messages
    assert sent_messages[-1] == {"role": "user", "content": "new message"}
