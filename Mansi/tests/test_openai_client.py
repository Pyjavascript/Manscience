"""Unit tests for `app.llm.openai_client.OpenAIClient`.

The `openai.OpenAI` client is mocked throughout — no real network calls are
made. `time.sleep` is patched wherever a retry path is exercised so tests
run instantly.
"""

from __future__ import annotations

from unittest.mock import Mock

import pytest
from openai import AuthenticationError, BadRequestError, InternalServerError, RateLimitError

from app.llm.base import LLMProviderError
from app.llm.openai_client import OpenAIClient


def _api_status_error(cls, message="error"):
    """Build a real `openai` `APIStatusError` subclass instance for testing."""
    response = Mock()
    response.request = Mock()
    response.headers = {}
    return cls(message, response=response, body=None)


class _Usage:
    def __init__(self, prompt_tokens, completion_tokens, total_tokens):
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens
        self.total_tokens = total_tokens


class _Message:
    def __init__(self, content):
        self.content = content


class _Choice:
    def __init__(self, content, finish_reason="stop"):
        self.message = _Message(content)
        self.finish_reason = finish_reason


class _Completion:
    def __init__(self, content, model="gpt-4o-mini", finish_reason="stop", usage=(5, 10, 15)):
        self.choices = [_Choice(content, finish_reason)]
        self.model = model
        self.usage = _Usage(*usage)


@pytest.fixture
def mock_openai(mocker):
    mock_client_cls = mocker.patch("app.llm.openai_client.OpenAI")
    return mock_client_cls.return_value


def test_generate_response_success(mock_openai):
    mock_openai.chat.completions.create.return_value = _Completion("Hello there")

    client = OpenAIClient()
    response = client.generate_response(messages=[{"role": "user", "content": "hi"}])

    assert response.content == "Hello there"
    assert response.model == "gpt-4o-mini"
    assert response.finish_reason == "stop"
    assert response.total_tokens == 15
    mock_openai.chat.completions.create.assert_called_once()


def test_retry_then_success(mock_openai, mocker):
    mocker.patch("app.llm.openai_client.time.sleep")
    mock_openai.chat.completions.create.side_effect = [
        _api_status_error(RateLimitError, "rate limited"),
        _Completion("Recovered"),
    ]

    client = OpenAIClient()
    response = client.generate_response(messages=[{"role": "user", "content": "hi"}])

    assert response.content == "Recovered"
    assert mock_openai.chat.completions.create.call_count == 2


def test_retries_exhausted_raises_llm_provider_error(mock_openai, mocker):
    mocker.patch("app.llm.openai_client.time.sleep")
    mock_openai.chat.completions.create.side_effect = _api_status_error(
        RateLimitError, "rate limited"
    )

    client = OpenAIClient()

    with pytest.raises(LLMProviderError):
        client.generate_response(messages=[{"role": "user", "content": "hi"}])

    from app.config.settings import settings

    assert mock_openai.chat.completions.create.call_count == settings.openai_max_retries


def test_internal_server_error_retries_then_raises(mock_openai, mocker):
    mocker.patch("app.llm.openai_client.time.sleep")
    mock_openai.chat.completions.create.side_effect = _api_status_error(
        InternalServerError, "server error"
    )

    client = OpenAIClient()

    with pytest.raises(LLMProviderError):
        client.generate_response(messages=[{"role": "user", "content": "hi"}])


def test_authentication_error_does_not_retry(mock_openai):
    mock_openai.chat.completions.create.side_effect = _api_status_error(
        AuthenticationError, "invalid api key"
    )

    client = OpenAIClient()

    with pytest.raises(LLMProviderError):
        client.generate_response(messages=[{"role": "user", "content": "hi"}])

    assert mock_openai.chat.completions.create.call_count == 1


def test_bad_request_error_does_not_retry(mock_openai):
    mock_openai.chat.completions.create.side_effect = _api_status_error(
        BadRequestError, "bad request"
    )

    client = OpenAIClient()

    with pytest.raises(LLMProviderError):
        client.generate_response(messages=[{"role": "user", "content": "hi"}])

    assert mock_openai.chat.completions.create.call_count == 1


def test_overrides_are_passed_through(mock_openai):
    mock_openai.chat.completions.create.return_value = _Completion("ok")

    client = OpenAIClient()
    client.generate_response(
        messages=[{"role": "user", "content": "hi"}],
        model="gpt-4o",
        temperature=0.2,
        max_tokens=100,
    )

    _, kwargs = mock_openai.chat.completions.create.call_args
    assert kwargs["model"] == "gpt-4o"
    assert kwargs["temperature"] == 0.2
    assert kwargs["max_tokens"] == 100


def test_missing_usage_defaults_to_zero(mock_openai):
    completion = _Completion("ok")
    completion.usage = None
    mock_openai.chat.completions.create.return_value = completion

    client = OpenAIClient()
    response = client.generate_response(messages=[{"role": "user", "content": "hi"}])

    assert response.prompt_tokens == 0
    assert response.completion_tokens == 0
    assert response.total_tokens == 0
