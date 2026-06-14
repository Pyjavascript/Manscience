"""Unit tests for `app.config.settings`.

Tests call `_load_settings()` directly with `monkeypatch`-controlled
environment variables, leaving the module-level `settings` singleton
(loaded once at import time from `.env`) untouched.
"""

from __future__ import annotations

import pytest

from app.config.settings import ConfigurationError, _load_settings

_OPTIONAL_VARS = (
    "DEBUG",
    "LOG_LEVEL",
    "ENVIRONMENT",
    "OPENAI_API_BASE",
    "OPENAI_TIMEOUT_SECONDS",
    "OPENAI_MAX_RETRIES",
    "MEMORY_MAX_MESSAGES",
    "MAX_TOKENS_RESPONSE",
    "TEMPERATURE",
)


@pytest.fixture(autouse=True)
def _base_env(monkeypatch):
    """A minimal valid configuration; individual tests override as needed."""
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test1234567890")
    monkeypatch.setenv("MODEL_NAME", "gpt-4o-mini")
    for var in _OPTIONAL_VARS:
        monkeypatch.delenv(var, raising=False)


def test_valid_configuration_loads_with_defaults():
    settings = _load_settings()

    assert settings.openai_api_key == "sk-test1234567890"
    assert settings.model_name == "gpt-4o-mini"
    assert settings.debug is False
    assert settings.log_level == "INFO"
    assert settings.environment == "development"
    assert settings.openai_api_base is None
    assert settings.openai_timeout_seconds == 30
    assert settings.openai_max_retries == 3
    assert settings.memory_max_messages == 20
    assert settings.max_tokens_response == 512
    assert settings.temperature == 0.7


def test_missing_api_key_raises(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    with pytest.raises(ConfigurationError, match="OPENAI_API_KEY"):
        _load_settings()


def test_invalid_api_key_format_raises(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "not-a-valid-key")

    with pytest.raises(ConfigurationError, match="OPENAI_API_KEY"):
        _load_settings()


def test_missing_model_name_raises(monkeypatch):
    monkeypatch.delenv("MODEL_NAME", raising=False)

    with pytest.raises(ConfigurationError, match="MODEL_NAME"):
        _load_settings()


def test_model_name_not_gpt_prefixed_warns_but_loads(monkeypatch, caplog):
    monkeypatch.setenv("MODEL_NAME", "custom-model")

    with caplog.at_level("WARNING"):
        settings = _load_settings()

    assert settings.model_name == "custom-model"
    assert any("MODEL_NAME" in record.message for record in caplog.records)


def test_invalid_debug_value_defaults_to_false(monkeypatch):
    monkeypatch.setenv("DEBUG", "yes")

    settings = _load_settings()

    assert settings.debug is False


def test_debug_true_is_parsed(monkeypatch):
    monkeypatch.setenv("DEBUG", "true")

    settings = _load_settings()

    assert settings.debug is True


def test_invalid_log_level_defaults_to_info(monkeypatch):
    monkeypatch.setenv("LOG_LEVEL", "VERBOSE")

    settings = _load_settings()

    assert settings.log_level == "INFO"


def test_invalid_environment_defaults_to_development(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "test")

    settings = _load_settings()

    assert settings.environment == "development"


def test_invalid_temperature_raises(monkeypatch):
    monkeypatch.setenv("TEMPERATURE", "abc")

    with pytest.raises(ConfigurationError, match="TEMPERATURE"):
        _load_settings()


def test_temperature_out_of_range_raises(monkeypatch):
    monkeypatch.setenv("TEMPERATURE", "3.5")

    with pytest.raises(ConfigurationError, match="TEMPERATURE"):
        _load_settings()


def test_invalid_memory_max_messages_raises(monkeypatch):
    monkeypatch.setenv("MEMORY_MAX_MESSAGES", "not-a-number")

    with pytest.raises(ConfigurationError, match="MEMORY_MAX_MESSAGES"):
        _load_settings()


def test_non_positive_max_tokens_raises(monkeypatch):
    monkeypatch.setenv("MAX_TOKENS_RESPONSE", "0")

    with pytest.raises(ConfigurationError, match="MAX_TOKENS_RESPONSE"):
        _load_settings()


def test_multiple_errors_are_collected_in_one_exception(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("TEMPERATURE", "abc")

    with pytest.raises(ConfigurationError) as exc_info:
        _load_settings()

    message = str(exc_info.value)
    assert "OPENAI_API_KEY" in message
    assert "TEMPERATURE" in message


def test_repr_masks_api_key():
    settings = _load_settings()

    text = repr(settings)

    assert "sk-test1234567890" not in text
    assert "***" in text
