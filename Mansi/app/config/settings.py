"""Centralized application configuration for Mansi AI.

Loads and validates environment variables from `.env` (via python-dotenv)
and exposes a single immutable `settings` object. No other module should
read `os.environ` / `os.getenv` directly.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

_VALID_LOG_LEVELS = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
_VALID_ENVIRONMENTS = {"development", "staging", "production"}


class ConfigurationError(Exception):
    """Raised when required configuration is missing or invalid."""


@dataclass(frozen=True)
class Settings:
    openai_api_key: str
    model_name: str
    debug: bool
    log_level: str
    environment: str
    openai_api_base: str | None
    openai_timeout_seconds: int
    openai_max_retries: int
    memory_max_messages: int
    max_tokens_response: int
    temperature: float

    def __repr__(self) -> str:
        key = self.openai_api_key
        masked_key = f"{key[:3]}***{key[-4:]}" if len(key) > 7 else "***"
        return (
            "Settings("
            f"model_name={self.model_name!r}, "
            f"environment={self.environment!r}, "
            f"debug={self.debug!r}, "
            f"log_level={self.log_level!r}, "
            f"openai_api_key={masked_key!r}, "
            f"openai_api_base={self.openai_api_base!r}, "
            f"openai_timeout_seconds={self.openai_timeout_seconds!r}, "
            f"openai_max_retries={self.openai_max_retries!r}, "
            f"memory_max_messages={self.memory_max_messages!r}, "
            f"max_tokens_response={self.max_tokens_response!r}, "
            f"temperature={self.temperature!r})"
        )


def _parse_bool(raw: str | None, default: bool, name: str) -> bool:
    if raw is None or raw.strip() == "":
        return default
    normalized = raw.strip().lower()
    if normalized == "true":
        return True
    if normalized == "false":
        return False
    logger.warning("Invalid value for %s=%r; using default %r.", name, raw, default)
    return default


def _parse_int(
    raw: str | None, default: int, name: str, errors: list[str], positive: bool = True
) -> int:
    if raw is None or raw.strip() == "":
        return default
    try:
        value = int(raw)
    except ValueError:
        errors.append(f"{name} must be an integer (got {raw!r}).")
        return default
    if positive and value <= 0:
        errors.append(f"{name} must be a positive integer (got {value}).")
        return default
    return value


def _parse_float(
    raw: str | None,
    default: float,
    name: str,
    errors: list[str],
    minimum: float,
    maximum: float,
) -> float:
    if raw is None or raw.strip() == "":
        return default
    try:
        value = float(raw)
    except ValueError:
        errors.append(f"{name} must be a number (got {raw!r}).")
        return default
    if not (minimum <= value <= maximum):
        errors.append(f"{name} must be between {minimum} and {maximum} (got {value}).")
        return default
    return value


def _load_settings() -> Settings:
    errors: list[str] = []

    openai_api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not openai_api_key or not openai_api_key.startswith("sk-"):
        errors.append("OPENAI_API_KEY is missing or invalid (must start with 'sk-').")

    model_name = os.getenv("MODEL_NAME", "").strip()
    if not model_name:
        errors.append("MODEL_NAME is required.")
    elif not model_name.startswith("gpt-"):
        logger.warning("MODEL_NAME=%r does not match the expected 'gpt-*' pattern.", model_name)

    debug = _parse_bool(os.getenv("DEBUG"), default=False, name="DEBUG")

    log_level = os.getenv("LOG_LEVEL", "INFO").strip().upper()
    if log_level not in _VALID_LOG_LEVELS:
        logger.warning("Invalid LOG_LEVEL=%r; using default 'INFO'.", log_level)
        log_level = "INFO"

    environment = os.getenv("ENVIRONMENT", "development").strip().lower()
    if environment not in _VALID_ENVIRONMENTS:
        logger.warning("Invalid ENVIRONMENT=%r; using default 'development'.", environment)
        environment = "development"

    openai_api_base = os.getenv("OPENAI_API_BASE", "").strip() or None

    openai_timeout_seconds = _parse_int(
        os.getenv("OPENAI_TIMEOUT_SECONDS"), default=30, name="OPENAI_TIMEOUT_SECONDS", errors=errors
    )
    openai_max_retries = _parse_int(
        os.getenv("OPENAI_MAX_RETRIES"), default=3, name="OPENAI_MAX_RETRIES", errors=errors
    )
    memory_max_messages = _parse_int(
        os.getenv("MEMORY_MAX_MESSAGES"), default=20, name="MEMORY_MAX_MESSAGES", errors=errors
    )
    max_tokens_response = _parse_int(
        os.getenv("MAX_TOKENS_RESPONSE"), default=512, name="MAX_TOKENS_RESPONSE", errors=errors
    )
    temperature = _parse_float(
        os.getenv("TEMPERATURE"),
        default=0.7,
        name="TEMPERATURE",
        errors=errors,
        minimum=0.0,
        maximum=2.0,
    )

    if errors:
        raise ConfigurationError(
            "Invalid configuration:\n" + "\n".join(f" - {e}" for e in errors)
        )

    return Settings(
        openai_api_key=openai_api_key,
        model_name=model_name,
        debug=debug,
        log_level=log_level,
        environment=environment,
        openai_api_base=openai_api_base,
        openai_timeout_seconds=openai_timeout_seconds,
        openai_max_retries=openai_max_retries,
        memory_max_messages=memory_max_messages,
        max_tokens_response=max_tokens_response,
        temperature=temperature,
    )


settings = _load_settings()

if settings.debug:
    logger.debug(
        "Configuration loaded: environment=%s, model_name=%s, log_level=%s",
        settings.environment,
        settings.model_name,
        settings.log_level,
    )
