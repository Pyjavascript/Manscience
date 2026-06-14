# Mansi AI Chatbot — Software Specification Document

## Steps 3–8: Configuration, LLM Integration, Prompt Building, Memory, and Chat Orchestration

| Field | Value |
|---|---|
| Document Type | Software Specification |
| Project | Mansi AI Chatbot |
| Phase | Terminal Chatbot (Phase 1) — Foundation for Future Expansion |
| Audience | Software Engineers, Architects, QA |
| Status | Draft — Ready for Implementation |

---

## 1. Purpose of This Document

This specification defines the design, responsibilities, interfaces, and quality requirements for the core configuration and chat-pipeline components of the Mansi AI chatbot:

1. `.env` — environment configuration and secrets
2. `requirements.txt` — dependency management
3. `app/config/settings.py` — centralized configuration loader
4. `app/llm/openai_client.py` — LLM provider client (OpenAI)
5. `app/services/prompt_builder.py` — prompt construction service
6. `app/services/memory_service.py` — conversation memory management
7. `app/services/chat_service.py` — orchestration layer

The goal is to allow an engineer to implement each file **independently and correctly**, while guaranteeing that the components compose into a working terminal chatbot today, and can be extended into a multi-channel, multi-provider, RAG-enabled, production system later — without rewrites.

---

## 2. Project Overview

Mansi is an AI-powered chatbot. In **Phase 1**, it runs entirely in the **terminal** and connects to **OpenAI GPT** to validate the end-to-end AI integration pipeline.

The architecture is **modular and layered** so that future phases can add:

- Webflow frontend (web chat widget)
- FastAPI backend (REST API layer)
- RAG (Retrieval-Augmented Generation) with vector databases
- Rule Engine (deterministic business logic / guardrails)
- Persistent conversation memory (database-backed)
- Authentication & multi-tenant users
- External API integrations (CRMs, healthcare systems, etc.)
- Multiple LLM providers (OpenAI, Claude, Gemini) via a provider abstraction

**Design principle:** every component built in Phase 1 must depend only on **abstractions** (interfaces/contracts), never on concrete implementation details of another layer, so later phases can swap implementations without touching unrelated code.

---

## 3. Repository Structure (Relevant Portions)

```
mansi/
├── .env                          # Environment variables & secrets (gitignored)
├── .env.example                  # Template committed to git
├── .gitignore
├── requirements.txt              # Python dependencies
├── main.py                       # Terminal entry point
├── README.md
└── app/
    ├── __init__.py
    ├── config/
    │   ├── __init__.py
    │   └── settings.py           # Centralized configuration (Step 5)
    ├── llm/
    │   ├── __init__.py
    │   ├── base.py                # LLM provider interface (abstract base)
    │   ├── openai_client.py       # OpenAI provider implementation (Step 6)
    │   └── claude_client.py       # Future: Claude provider implementation
    ├── services/
    │   ├── __init__.py
    │   ├── prompt_builder.py      # Prompt construction (Step 7)
    │   ├── memory_service.py      # Conversation memory (Step 8)
    │   └── chat_service.py        # Orchestration (Step 9)
    ├── rules/                     # Future: Rule Engine
    │   └── __init__.py
    ├── rag/                       # Future: RAG / vector retrieval
    │   └── __init__.py
    ├── api/                       # Future: FastAPI routers
    │   └── __init__.py
    └── integrations/              # Future: external API clients
        └── __init__.py
```

---

## 4. Architecture Diagrams

### 4.1 Phase 1 — Terminal Chatbot (Current)

```
┌──────────┐
│   User   │  (types a message in the terminal)
└────┬─────┘
     │
     ▼
┌─────────────────────┐
│   Terminal (main.py) │  Reads input, prints output, runs the REPL loop
└────┬─────────────────┘
     │  user_message
     ▼
┌─────────────────────────┐
│      Chat Service        │  Orchestrates the full conversation turn
│ (chat_service.py)         │
└────┬─────────────────────┘
     │
     │ 1. get_history()
     ▼
┌─────────────────────────┐
│      Memory Service       │  Returns conversation history for this session
│ (memory_service.py)       │
└────┬─────────────────────┘
     │ history
     ▼
┌─────────────────────────┐
│     Prompt Builder        │  Builds system + user + history into final prompt
│ (prompt_builder.py)       │
└────┬─────────────────────┘
     │ messages[]
     ▼
┌─────────────────────────┐
│      OpenAI Client        │  Sends request to OpenAI API
│ (openai_client.py)        │
└────┬─────────────────────┘
     │ HTTPS request
     ▼
┌─────────────────────────┐
│        OpenAI GPT          │  Generates completion
└────┬─────────────────────┘
     │ response
     ▼
┌─────────────────────────┐
│      OpenAI Client        │  Parses & validates response
└────┬─────────────────────┘
     │ assistant_message
     ▼
┌─────────────────────────┐
│      Memory Service       │  append(user_message), append(assistant_message)
└────┬─────────────────────┘
     │
     ▼
┌─────────────────────────┐
│      Chat Service          │  Returns final response to caller
└────┬─────────────────────┘
     │ assistant_message
     ▼
┌─────────────────────────┐
│   Terminal (main.py)      │  Displays response to user
└────┬─────────────────────┘
     │
     ▼
┌──────────┐
│   User   │
└──────────┘
```

### 4.2 Future Evolution — Web / API-Driven Architecture

```
┌──────────┐
│   User   │
└────┬─────┘
     ▼
┌────────────────────┐
│      Webflow         │  Chat widget / embedded UI, calls REST API
└────┬────────────────┘
     ▼
┌────────────────────┐
│      FastAPI          │  app/api/* — REST endpoints, auth, validation
└────┬────────────────┘
     ▼
┌────────────────────┐
│     Chat Service       │  Same orchestration contract as Phase 1
└────┬────────────────┘
     ▼
┌──────────────────────────────────────────┐
│  Rule Engine  +  RAG  +  Memory Service     │
│  (app/rules)    (app/rag)   (app/services)  │
└────┬─────────────────────────────────────┘
     ▼
┌────────────────────┐
│         LLM           │  Provider-agnostic via app/llm/base.py
│ (OpenAI / Claude /     │
│  Gemini)               │
└────┬────────────────┘
     ▼
┌────────────────────┐
│      Response          │
└────────────────────┘
```

**Key insight:** `chat_service.py` is the **stable contract**. In Phase 1 it's called from `main.py`. In Phase 2 it's called from a FastAPI route handler. Its internal logic (memory → prompt → LLM → memory update) does not change — only the caller and the implementations behind `MemoryService`, `PromptBuilder`, and the LLM client evolve.

---

## 5. Documentation Format

Each component below is documented using the following 15-section template:

1. Overview
2. Purpose
3. Responsibilities
4. Inputs
5. Outputs
6. Internal Workflow
7. Dependencies
8. Security Considerations
9. Error Handling
10. Logging Strategy
11. Example Usage
12. Testing Strategy
13. Future Enhancements
14. Risks if Misimplemented
15. Best Practices

---

# 6. Component: `.env`

## 6.1 Overview

The `.env` file is a plain-text key-value file that stores **environment-specific configuration and secrets** outside of source code. It is loaded at application startup by `app/config/settings.py` using `python-dotenv`.

## 6.2 Purpose

- Decouple configuration from code (12-factor app principle).
- Keep secrets (API keys) out of version control.
- Allow different configurations per environment (development, staging, production) without code changes.
- Provide a single, predictable location for all runtime configuration.

## 6.3 Responsibilities

- Store the OpenAI API key and any other provider credentials.
- Store environment metadata (`ENVIRONMENT`, `DEBUG`, `LOG_LEVEL`).
- Store model selection defaults (`MODEL_NAME`).
- Provide values that `settings.py` reads, validates, and exposes to the rest of the application.

The `.env` file itself has **no logic** — it is pure data.

## 6.4 Why Secrets Belong Here (Not in Code)

- **Version control safety**: Code is committed to git and may be shared, forked, or pushed to public repos. Secrets embedded in code become permanently part of git history (even after deletion) and are a top cause of credential leaks.
- **Environment portability**: The same codebase can run in dev, staging, and production by simply swapping `.env` files — no code edits, no redeploy of source.
- **Principle of least exposure**: Only the process that needs the secret (the running application) has access to it, not every developer who reads the source.
- **Rotation without redeploy**: API keys can be rotated by updating `.env` and restarting the process, without a code change/PR/review cycle.

## 6.5 Required Environment Variables

| Variable | Type | Required | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | string | **Yes** | Secret key used to authenticate with the OpenAI API. Must start with `sk-`. |
| `MODEL_NAME` | string | **Yes** | Default OpenAI model identifier used for chat completions (e.g., `gpt-4o-mini`). |

## 6.6 Optional Environment Variables

| Variable | Type | Required | Default | Description |
|---|---|---|---|---|
| `DEBUG` | boolean (`true`/`false`) | No | `false` | Enables verbose debug output (raw prompts, raw API responses, stack traces). |
| `LOG_LEVEL` | string (`DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`) | No | `INFO` | Controls verbosity of the logging subsystem. |
| `ENVIRONMENT` | string (`development`, `staging`, `production`) | No | `development` | Identifies the runtime environment; used to toggle environment-specific behavior. |
| `OPENAI_API_BASE` | string (URL) | No | OpenAI default | Override for custom OpenAI-compatible endpoints (e.g., Azure OpenAI, proxies). |
| `OPENAI_TIMEOUT_SECONDS` | integer | No | `30` | Per-request timeout for OpenAI API calls. |
| `OPENAI_MAX_RETRIES` | integer | No | `3` | Number of retry attempts for transient OpenAI API failures. |
| `MEMORY_MAX_MESSAGES` | integer | No | `20` | Maximum number of messages retained in conversation memory before trimming. |
| `MAX_TOKENS_RESPONSE` | integer | No | `512` | Maximum tokens requested in the LLM completion response. |
| `TEMPERATURE` | float (0.0–2.0) | No | `0.7` | Sampling temperature for the LLM. |

## 6.7 Example `.env` File

```dotenv
# ---------------------------------------------------------------
# Mansi AI — Environment Configuration
# Copy this file's structure into a local .env (never commit .env)
# ---------------------------------------------------------------

# --- LLM Provider: OpenAI ---
OPENAI_API_KEY=sk-REPLACE_WITH_YOUR_REAL_KEY
MODEL_NAME=gpt-4o-mini
OPENAI_API_BASE=
OPENAI_TIMEOUT_SECONDS=30
OPENAI_MAX_RETRIES=3

# --- Application Behavior ---
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=DEBUG

# --- Conversation / Memory ---
MEMORY_MAX_MESSAGES=20
MAX_TOKENS_RESPONSE=512
TEMPERATURE=0.7
```

A corresponding `.env.example` (with placeholder/non-secret values) **must** be committed to the repository so new developers know which variables to set:

```dotenv
OPENAI_API_KEY=your_openai_api_key_here
MODEL_NAME=gpt-4o-mini
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=INFO
MEMORY_MAX_MESSAGES=20
MAX_TOKENS_RESPONSE=512
TEMPERATURE=0.7
```

## 6.8 Validation Rules

Validation is performed by `settings.py` at startup (fail-fast):

| Variable | Rule |
|---|---|
| `OPENAI_API_KEY` | Must be present and non-empty. Must start with `sk-`. If missing, raise `ConfigurationError` and exit before any LLM call is attempted. |
| `MODEL_NAME` | Must be present and non-empty. Should match a known model naming pattern (e.g., `gpt-*`); unknown values produce a warning, not a hard failure (to allow new models). |
| `DEBUG` | Must parse as boolean (`true`/`false`, case-insensitive). Invalid values default to `false` with a warning. |
| `LOG_LEVEL` | Must be one of the standard Python logging levels. Invalid values default to `INFO` with a warning. |
| `ENVIRONMENT` | Must be one of `development`, `staging`, `production`. Invalid values default to `development` with a warning. |
| `OPENAI_TIMEOUT_SECONDS`, `OPENAI_MAX_RETRIES`, `MEMORY_MAX_MESSAGES`, `MAX_TOKENS_RESPONSE` | Must parse as positive integers. |
| `TEMPERATURE` | Must parse as float in range `[0.0, 2.0]`. |

## 6.9 Security Best Practices

1. **Never commit `.env`** — add it to `.gitignore` on day one.
2. **Always commit `.env.example`** with safe placeholder values so the required configuration shape is documented.
3. **Never log the raw value** of `OPENAI_API_KEY` or any secret. If logging configuration at startup, mask secrets (e.g., `sk-***...c4f2`).
4. **Restrict file permissions** in production (`chmod 600 .env`) so only the application's OS user can read it.
5. **Use a secrets manager in production** (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, HashiCorp Vault) instead of a flat `.env` file once deployed — `.env` is acceptable for local development only.
6. **One key per environment** — never share a single OpenAI API key across development, staging, and production. This limits blast radius if a key leaks and allows independent usage tracking/rate limiting.
7. **Audit `.env` usage** — periodically grep the codebase to ensure secrets are only ever accessed via `settings.py`, never via `os.environ` directly in business logic.

## 6.10 `.gitignore` Recommendations

```gitignore
# Environment & secrets
.env
.env.local
.env.*.local

# Virtual environment
venv/
.venv/

# Python artifacts
__pycache__/
*.pyc

# Logs
*.log
```

## 6.11 Development vs Production Usage

| Aspect | Development | Production |
|---|---|---|
| Storage | Local `.env` file, gitignored | Secrets manager injected as environment variables at deploy time |
| `DEBUG` | `true` — verbose output for debugging | `false` — never leak internal state |
| `LOG_LEVEL` | `DEBUG` or `INFO` | `INFO` or `WARNING` |
| `OPENAI_API_KEY` | Personal/dev key with low rate limits and spend caps | Dedicated production key with monitoring and alerting |
| `ENVIRONMENT` | `development` | `production` |
| Reload behavior | `.env` may be reloaded on each app restart during development | Configuration is immutable per deployed instance; changes require redeploy or secret-manager rotation + restart |

## 6.12 API Key Rotation Strategy

1. Generate a new API key in the OpenAI dashboard **without** revoking the old one.
2. Update the secret in the secrets manager (or `.env` for local dev).
3. Restart/redeploy the application so `settings.py` picks up the new value (configuration is loaded once at startup — see §8.6).
4. Verify the application functions correctly with the new key (smoke test a chat request).
5. Revoke the old key in the OpenAI dashboard.
6. Log the rotation event (date, performed by, reason) in an internal ops log — **never log the key value itself**.

Recommended cadence: rotate production keys at least every 90 days, or immediately if a leak is suspected.

## 6.13 Future Configuration Options

As the project grows, `.env` will need to support:

| Future Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude provider credentials |
| `GOOGLE_API_KEY` | Gemini provider credentials |
| `LLM_PROVIDER` | Selects active provider (`openai`, `claude`, `gemini`) |
| `DATABASE_URL` | Connection string for persistent storage (e.g., Postgres via Supabase) |
| `VECTOR_DB_URL` / `VECTOR_DB_API_KEY` | Vector database connection for RAG (e.g., ChromaDB, Pinecone) |
| `JWT_SECRET_KEY` | Signing key for authentication tokens (FastAPI phase) |
| `CORS_ALLOWED_ORIGINS` | Allowed origins for the FastAPI/Webflow integration |
| `RATE_LIMIT_PER_MINUTE` | API rate limiting configuration |
| `SENTRY_DSN` | Error tracking/observability integration |

---

# 7. Component: `requirements.txt`

## 7.1 Overview

`requirements.txt` declares the exact set of Python packages required to run Mansi AI, enabling **reproducible installations** across developer machines, CI pipelines, and production servers.

## 7.2 Purpose

- Define a single source of truth for project dependencies.
- Ensure every environment (dev, CI, staging, production) installs the **same** package versions.
- Document, implicitly, which third-party libraries the project relies on.

## 7.3 Dependency Management Strategy

- Use **pinned versions** (`==`) for all direct dependencies to guarantee reproducibility.
- Separate **runtime** dependencies (`requirements.txt`) from **development/test** dependencies (`requirements-dev.txt`), to keep production installs minimal.
- Regenerate/audit the lock file whenever a new dependency is added or an existing one is upgraded.
- Group dependencies by category with comments for maintainability.

## 7.4 Version Pinning Recommendations

| Strategy | When to Use |
|---|---|
| Exact pin (`openai==1.40.0`) | Always, for production reproducibility. Prevents an unannounced upstream major version bump from breaking the app. |
| Compatible release (`openai~=1.40`) | Acceptable for libraries with strong semver discipline, if the team wants automatic patch updates. |
| Unpinned | Never in committed `requirements.txt`. Acceptable only in exploratory/local scratch environments. |

## 7.5 Reproducible Environments

- Always install inside a **virtual environment** (`python -m venv venv`) — never globally.
- Commit `requirements.txt` (and optionally a `requirements.lock` / `pip freeze` snapshot for full transitive-dependency pinning).
- Document the required Python version (e.g., Python 3.12) in `README.md` and optionally enforce via `runtime.txt` or `pyproject.toml`.

## 7.6 Installation Process

```bash
# 1. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Linux/macOS
# venv\Scripts\activate         # Windows

# 2. Upgrade pip
pip install --upgrade pip

# 3. Install dependencies
pip install -r requirements.txt

# 4. (Optional) Install development dependencies
pip install -r requirements-dev.txt
```

## 7.7 Upgrade Policy

- **Patch versions** (e.g., `1.40.0` → `1.40.1`): may be applied routinely; review changelog for security fixes.
- **Minor versions** (e.g., `1.40.0` → `1.41.0`): apply during a scheduled maintenance window; run full test suite.
- **Major versions** (e.g., `1.x` → `2.x`): require a dedicated upgrade task — review breaking changes, update affected code (especially `app/llm/openai_client.py`), and re-run the full test suite before merging.
- Use tools like `pip-audit` or `safety` to scan for known vulnerabilities in dependencies on a recurring (e.g., weekly/CI) basis.

## 7.8 Security Considerations

- Pin versions to avoid supply-chain surprises (a dependency silently changing behavior or being compromised in a new release).
- Run `pip-audit` in CI to detect known CVEs in dependencies.
- Avoid unnecessary dependencies — every package is additional attack surface.
- Verify package provenance (prefer well-known, actively maintained packages with high download counts and transparent maintainers).

## 7.9 Maintenance Strategy

- Review dependencies quarterly for: (a) security advisories, (b) deprecation notices, (c) unused packages that can be removed.
- When adding a new dependency, document in the PR description: why it's needed, what alternatives were considered, and which module(s) will use it.
- Keep `requirements.txt` sorted and grouped by category with comments (see below).

## 7.10 Current Dependencies (Phase 1)

| Package | Version (example) | Why It's Needed | Used By | Runtime/Dev |
|---|---|---|---|---|
| `openai` | `==1.40.0` | Official OpenAI Python SDK — provides the client for chat completions, authentication, and error types. | `app/llm/openai_client.py` | Runtime |
| `python-dotenv` | `==1.0.1` | Loads key-value pairs from `.env` into `os.environ` at startup. | `app/config/settings.py` | Runtime |

### Example `requirements.txt` (Phase 1)

```text
# --- LLM Provider SDKs ---
openai==1.40.0

# --- Configuration ---
python-dotenv==1.0.1
```

### Example `requirements-dev.txt` (Phase 1)

```text
-r requirements.txt

# --- Testing ---
pytest==8.3.2
pytest-mock==3.14.0
```

## 7.11 Future Dependencies

| Package | Purpose | Phase Introduced |
|---|---|---|
| `fastapi` | Web framework for the REST API layer | Phase 2 (API) |
| `uvicorn` | ASGI server to run FastAPI | Phase 2 (API) |
| `pydantic` | Request/response schema validation (ships with FastAPI 2.x but pinned explicitly for settings models too) | Phase 2 (API), also useful in `settings.py` for typed config |
| `chromadb` | Vector database for RAG embeddings storage/retrieval | Phase 3 (RAG) |
| `langchain` | Optional orchestration helpers for RAG pipelines (evaluate necessity vs. custom code) | Phase 3 (RAG) |
| `supabase` | Hosted Postgres + auth backend client | Phase 4 (Persistence/Auth) |
| `sqlalchemy` | ORM for relational database access (conversation history, users) | Phase 4 (Persistence) |
| `psycopg2` (or `psycopg2-binary`) | PostgreSQL driver used by SQLAlchemy | Phase 4 (Persistence) |
| `pytest` | Test runner | Dev, from Phase 1 onward |
| `anthropic` | Claude provider SDK | Phase 5 (Multi-provider) |
| `google-generativeai` | Gemini provider SDK | Phase 5 (Multi-provider) |

---

# 8. Component: `app/config/settings.py`

## 8.1 Overview

`settings.py` is the **single source of truth** for application configuration. It loads environment variables (via `.env` and `python-dotenv`), validates them, applies defaults, and exposes a typed configuration object that every other module imports — no other module should call `os.environ` or `os.getenv` directly.

## 8.2 Purpose

- Centralize all configuration access behind one well-tested module.
- Fail fast at startup if required configuration is missing or invalid, rather than failing deep inside a request handler.
- Provide typed, validated values (booleans, integers, floats, enums) instead of raw strings.
- Support multiple environments (`development`, `staging`, `production`) from the same codebase.

## 8.3 Responsibilities

1. Load `.env` into the process environment (only once, idempotently).
2. Read each configuration variable, applying defaults for optional values.
3. Validate types and constraints (see §6.8).
4. Mask/never expose secret values in `repr()`, logs, or error messages.
5. Expose a single immutable configuration object (e.g., `settings`) for import across the app.
6. Raise a clear, actionable `ConfigurationError` if required values are missing/invalid.

## 8.4 Inputs

- The process environment (`os.environ`), populated from:
  - The `.env` file (loaded via `python-dotenv`'s `load_dotenv()`).
  - Real OS-level environment variables (which **take precedence** over `.env`, matching standard `python-dotenv` behavior — important for production where secrets are injected as real env vars, not files).

## 8.5 Outputs

- A `Settings` object (e.g., a `dataclass`, `pydantic.BaseModel`, or simple class with class-level attributes) exposing **typed, validated** attributes:

```python
settings.openai_api_key       # str
settings.model_name           # str
settings.debug                # bool
settings.log_level            # str
settings.environment          # str  ("development" | "staging" | "production")
settings.openai_api_base       # Optional[str]
settings.openai_timeout_seconds # int
settings.openai_max_retries    # int
settings.memory_max_messages   # int
settings.max_tokens_response   # int
settings.temperature           # float
```

## 8.6 Internal Workflow

```
1. Module import time:
   a. Call load_dotenv() to populate os.environ from .env (if present).
   b. Read each variable via os.getenv(name, default).
   c. Cast to the correct type (int(), float(), bool parsing).
   d. Validate constraints (non-empty, ranges, enums).
   e. Collect all validation errors (don't stop at the first one) so the
      developer sees the full list of misconfigurations at once.
   f. If any required variable is missing/invalid -> raise ConfigurationError
      with a message listing every problem found.
   g. Construct the immutable `settings` instance.

2. Application startup (main.py):
   a. `from app.config.settings import settings`
   b. If this raises ConfigurationError, print a user-friendly message and
      exit(1) — before attempting any network call.
```

Configuration is loaded **once** at process startup and treated as **immutable** for the lifetime of the process. Changing `.env` requires a restart — this is intentional (predictability over dynamic reconfiguration) for Phase 1–2. Dynamic reconfiguration (e.g., via a feature-flag service) is a Future Enhancement.

## 8.7 Dependencies

- `python-dotenv` (`load_dotenv`)
- Standard library: `os`, `dataclasses` (or `pydantic` once adopted)

## 8.8 Example Configuration Flow

```python
# app/config/settings.py (illustrative)

from dataclasses import dataclass
from dotenv import load_dotenv
import os

load_dotenv()

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
        masked_key = f"{self.openai_api_key[:3]}***{self.openai_api_key[-4:]}"
        return f"Settings(model_name={self.model_name!r}, environment={self.environment!r}, openai_api_key={masked_key!r}, ...)"


def _load_settings() -> Settings:
    errors: list[str] = []

    openai_api_key = os.getenv("OPENAI_API_KEY", "")
    if not openai_api_key or not openai_api_key.startswith("sk-"):
        errors.append("OPENAI_API_KEY is missing or invalid (must start with 'sk-').")

    model_name = os.getenv("MODEL_NAME", "")
    if not model_name:
        errors.append("MODEL_NAME is required.")

    # ... validate remaining fields, collecting errors ...

    if errors:
        raise ConfigurationError(
            "Invalid configuration:\n" + "\n".join(f" - {e}" for e in errors)
        )

    return Settings(
        openai_api_key=openai_api_key,
        model_name=model_name,
        # ... remaining fields with defaults applied ...
    )


settings = _load_settings()
```

## 8.9 Security Considerations

- `__repr__`/`__str__` on the settings object must **mask** `openai_api_key` (and any future secrets).
- Never write `settings` (or `os.environ`) to logs in full.
- Do not expose a way to mutate `settings` at runtime from user input (e.g., never let a chat message change `settings.model_name`).

## 8.10 Error Handling

- All validation errors are collected and raised together as a single `ConfigurationError` with a clear, itemized message — this avoids the "fix one, restart, find the next" loop.
- `main.py` catches `ConfigurationError` at startup, prints a human-readable message to the terminal (e.g., "Configuration error: OPENAI_API_KEY is missing. Please set it in your .env file."), and exits with a non-zero status code.
- No part of the application should catch `ConfigurationError` and continue — configuration problems are not recoverable at runtime.

## 8.11 Logging Strategy

- On successful load (when `DEBUG=true`), log a single `INFO`/`DEBUG` line summarizing the **non-secret** configuration (model name, environment, log level) — never the API key, even masked, in routine logs (masked display is acceptable only in interactive `repr()` for debugging, not written to log files by default).

## 8.12 Example Usage

```python
from app.config.settings import settings

print(f"Running in {settings.environment} mode using model {settings.model_name}")
```

## 8.13 Testing Strategy

- Unit tests should **not** depend on a real `.env` file. Use `monkeypatch.setenv(...)` (pytest) to set environment variables per test.
- Test cases:
  - All required variables present and valid → `settings` loads successfully with expected values.
  - Missing `OPENAI_API_KEY` → `ConfigurationError` raised with a message mentioning `OPENAI_API_KEY`.
  - Invalid `OPENAI_API_KEY` format (doesn't start with `sk-`) → `ConfigurationError`.
  - Invalid `DEBUG` value (e.g., `"yes"`) → defaults to `False` with no crash (since it's optional with a default).
  - Invalid `TEMPERATURE` (e.g., `"abc"` or `3.5`) → `ConfigurationError` (out of range) or default applied, per the rule defined for that variable.
  - `repr(settings)` does not contain the full API key.

## 8.14 Future Enhancements

- Migrate to `pydantic.BaseSettings` (or `pydantic-settings`) for declarative validation, automatic type coercion, and `.env` file support built-in.
- Support multiple `.env` files per environment (`.env.development`, `.env.production`) selected via `ENVIRONMENT`.
- Support a `LLM_PROVIDER` switch (`openai` | `claude` | `gemini`) feeding into the provider factory (see §10.14).
- Support hot-reload of non-secret configuration via a feature-flag service (e.g., LaunchDarkly) without process restart.
- Add a `validate()` CLI command (`python -m app.config.settings --check`) for ops/CI to verify configuration without starting the full app.

## 8.15 Risks if Misimplemented

| Risk | Consequence |
|---|---|
| Modules call `os.getenv` directly instead of `settings` | Configuration drift, inconsistent defaults, hard-to-find bugs when `.env` changes |
| No validation at startup | App starts successfully but crashes on first chat message with a confusing OpenAI auth error |
| Logging the raw API key | Credential leak via log files/aggregators (e.g., Datadog, CloudWatch) — major security incident |
| Settings object is mutable | A bug elsewhere could silently change the model or API key mid-run, causing inconsistent behavior |
| `.env` loaded multiple times / non-idempotently | Unexpected precedence issues between real env vars and `.env` file values |

## 8.16 Best Practices

- Treat `settings` as **read-only** after startup (`@dataclass(frozen=True)` or `pydantic` with immutability).
- One import path: `from app.config.settings import settings` — never re-implement config loading elsewhere.
- Co-locate all defaults and validation rules in this file so they're auditable in one place.
- Keep `Settings` provider-agnostic where possible (e.g., generic `llm_api_key` / `llm_model_name` concepts) to ease the future multi-provider transition — or, for Phase 1 clarity, keep `openai_*` naming but plan the renaming/aliasing strategy now (see §10.14).

---

# 9. Component: `app/llm/openai_client.py`

## 9.1 Overview

`openai_client.py` encapsulates **all direct interaction with the OpenAI API**. It is the only module in the codebase permitted to import and use the `openai` SDK directly. Every other module talks to the LLM only through this client's interface (or, in the future, through `app/llm/base.py`'s abstract interface).

## 9.2 Purpose

- Isolate third-party SDK usage to one module (provider isolation / adapter pattern).
- Provide a simple, stable method signature (`generate_response(messages, ...)`) that the rest of the app depends on.
- Centralize authentication, model selection, retries, timeouts, and error translation for OpenAI.

## 9.3 Responsibilities

1. **Authenticate** with OpenAI using `settings.openai_api_key`.
2. **Select the model** from `settings.model_name` (with optional per-call override).
3. **Submit prompts** (a list of chat messages) to the OpenAI Chat Completions API.
4. **Parse responses**, extracting the assistant's reply text and relevant metadata (token usage, finish reason).
5. **Handle errors** from the OpenAI SDK (auth errors, rate limits, timeouts, server errors) and translate them into application-level exceptions.
6. **Retry** transient failures with backoff.
7. **Log** request/response metadata (never raw secrets, and only full prompt/response bodies when `DEBUG=true`).

## 9.4 Inputs

| Parameter | Type | Required | Description |
|---|---|---|---|
| `messages` | `list[dict]` | Yes | OpenAI-style chat messages: `[{"role": "system"/"user"/"assistant", "content": str}, ...]`. Produced by `prompt_builder.py`. |
| `model` | `str` | No | Overrides `settings.model_name` for this call. |
| `temperature` | `float` | No | Overrides `settings.temperature`. |
| `max_tokens` | `int` | No | Overrides `settings.max_tokens_response`. |

## 9.5 Outputs

A simple return contract — e.g., a dataclass `LLMResponse`:

```python
@dataclass(frozen=True)
class LLMResponse:
    content: str               # The assistant's reply text
    model: str                  # Model actually used
    finish_reason: str          # "stop", "length", "content_filter", etc.
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
```

Returning a structured object (rather than a raw string or raw SDK object) decouples the rest of the app from the OpenAI SDK's response shape — critical for the future multi-provider abstraction (§9.13).

## 9.6 Internal Workflow

```
1. Initialize OpenAI client (once, at module load or first use):
     client = OpenAI(api_key=settings.openai_api_key, base_url=settings.openai_api_base, timeout=settings.openai_timeout_seconds)

2. generate_response(messages, model=None, temperature=None, max_tokens=None):
     a. Resolve effective model/temperature/max_tokens (param override > settings default).
     b. Log (DEBUG level) the outgoing request metadata (model, message count, token settings) —
        and full message content only if settings.debug is True.
     c. Call client.chat.completions.create(...) wrapped in a retry loop:
          - Retry on: RateLimitError, APITimeoutError, APIConnectionError, transient 5xx
          - Do NOT retry on: AuthenticationError, BadRequestError (4xx, except 429)
          - Backoff: exponential with jitter, up to settings.openai_max_retries attempts
     d. On success:
          - Extract choices[0].message.content -> content
          - Extract choices[0].finish_reason -> finish_reason
          - Extract usage.* -> token counts
          - Construct and return LLMResponse
     e. On failure after retries exhausted:
          - Raise a domain-specific exception (e.g., LLMProviderError) with a
            user-safe message and the original exception chained (`raise ... from e`)
     f. Log (INFO) the outcome: model used, total_tokens, finish_reason, latency.
```

### 9.6.1 Sequence Diagram — Successful Request

```
ChatService          OpenAIClient              OpenAI API
    |                      |                        |
    | generate_response(   |                        |
    |   messages)          |                        |
    |--------------------->|                        |
    |                      | chat.completions.create|
    |                      |----------------------->|
    |                      |                        |
    |                      |   200 OK + completion  |
    |                      |<-----------------------|
    |                      | parse -> LLMResponse   |
    |  LLMResponse         |                        |
    |<---------------------|                        |
```

### 9.6.2 Sequence Diagram — Retry on Rate Limit

```
ChatService          OpenAIClient              OpenAI API
    |                      |                        |
    | generate_response()  |                        |
    |--------------------->|                        |
    |                      | attempt 1               |
    |                      |----------------------->|
    |                      |   429 RateLimitError    |
    |                      |<-----------------------|
    |                      | wait (backoff)          |
    |                      | attempt 2               |
    |                      |----------------------->|
    |                      |   200 OK                |
    |                      |<-----------------------|
    |  LLMResponse          |                        |
    |<---------------------|                        |
```

## 9.7 Dependencies

- `openai` SDK (the only module permitted to import this directly)
- `app/config/settings.py` (for API key, model, timeouts, retries)
- Standard library: `time` (backoff), `logging`

## 9.8 Security Considerations

- The OpenAI API key is read **only** from `settings.openai_api_key` — never hardcoded, never accepted as a function parameter from user input.
- Never include the API key in error messages or logs.
- Sanitize/limit what's logged from user messages in production (`DEBUG=false`): log message **counts** and **token counts**, not full content, to avoid logging potentially sensitive user data (especially important given the project's stated future healthcare use case).
- Validate `max_tokens` and `temperature` overrides are within sane bounds before sending to the API (defense against misuse if these ever become exposed via an API layer in the future).

## 9.9 Error Handling

| OpenAI SDK Exception | Application Handling |
|---|---|
| `AuthenticationError` | Do not retry. Raise `LLMProviderError("Authentication with the AI provider failed. Check API key configuration.")`. Log at `ERROR`. This should ideally be caught at startup via a health check, not per-request. |
| `RateLimitError` | Retry with exponential backoff up to `settings.openai_max_retries`. If exhausted, raise `LLMProviderError("The AI provider is rate-limiting requests. Please try again shortly.")`. |
| `APITimeoutError` / `APIConnectionError` | Retry with backoff. If exhausted, raise `LLMProviderError("Could not reach the AI provider. Please check your connection and try again.")`. |
| `BadRequestError` (4xx, not 429) | Do not retry (it will fail again identically). Raise `LLMProviderError("The request to the AI provider was invalid.")`, log full details at `ERROR` for debugging (this indicates a bug in prompt construction). |
| `InternalServerError` (5xx) | Retry with backoff; raise `LLMProviderError` if exhausted. |
| Any other unexpected exception | Catch, log at `ERROR` with stack trace, raise `LLMProviderError("An unexpected error occurred while contacting the AI provider.")`. |

All raised exceptions should be a single custom type (e.g., `LLMProviderError`) so `chat_service.py` has one exception type to handle, regardless of the underlying provider — this is essential groundwork for the multi-provider abstraction.

## 9.10 Logging Strategy

| Level | What's Logged |
|---|---|
| `DEBUG` | Full request payload (messages) and full response payload — **only** when `settings.debug is True`. Useful for local development; must never be enabled in production given potential sensitive content. |
| `INFO` | Per-request summary: model used, message count, prompt/completion/total tokens, finish reason, latency (ms). |
| `WARNING` | Retries occurring (attempt N of M, reason). |
| `ERROR` | Final failures after retries exhausted, with exception type and (sanitized) message. |

## 9.11 Example Usage

```python
from app.llm.openai_client import OpenAIClient

client = OpenAIClient()

response = client.generate_response(
    messages=[
        {"role": "system", "content": "You are Mansi, a helpful assistant."},
        {"role": "user", "content": "What is the capital of France?"},
    ]
)

print(response.content)          # "The capital of France is Paris."
print(response.total_tokens)     # 27
```

## 9.12 Testing Strategy

- **Unit tests** mock the `openai` SDK client entirely (e.g., via `unittest.mock` or `pytest-mock`) — tests must never make real network calls.
- Test cases:
  - Successful response → `LLMResponse` fields correctly populated from a mocked SDK response.
  - `RateLimitError` followed by success on retry → returns successfully, and retry was logged.
  - `RateLimitError` on all attempts → raises `LLMProviderError` after `settings.openai_max_retries` attempts.
  - `AuthenticationError` → raises `LLMProviderError` immediately, **no retry attempted** (assert call count == 1).
  - `BadRequestError` → raises `LLMProviderError` immediately, no retry.
  - Parameter overrides (`model`, `temperature`, `max_tokens`) are passed through to the SDK call correctly.
  - `DEBUG=false` → full message content is not present in captured log output.
- **Integration test** (optional, marked `@pytest.mark.integration`, excluded from default CI run, requires a real key): one real call to confirm end-to-end wiring works against the live API — run manually or in a separate, gated pipeline.

## 9.13 Future Provider Abstraction

`app/llm/base.py` should define an abstract interface that `OpenAIClient`, `ClaudeClient`, and future `GeminiClient` all implement:

```python
class LLMClient(ABC):
    @abstractmethod
    def generate_response(
        self,
        messages: list[dict],
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        ...
```

A factory function (e.g., `get_llm_client()` in `app/llm/__init__.py`) reads `settings.llm_provider` (`"openai"` | `"claude"` | `"gemini"`) and returns the appropriate client instance. `chat_service.py` depends only on `LLMClient` (the abstract type), never on `OpenAIClient` directly — this is the **Dependency Inversion** that allows provider swapping with zero changes to orchestration logic.

`LLMResponse` is already provider-agnostic (§9.5), so this abstraction requires **no changes to the response contract** — only the construction of the client.

## 9.14 Risks if Misimplemented

| Risk | Consequence |
|---|---|
| API key hardcoded or read from multiple places | Credential leakage, inconsistent config |
| No retry logic | Transient network blips cause user-facing failures |
| Retrying on `AuthenticationError`/`BadRequestError` | Wastes time/quota retrying requests that can never succeed |
| Raw OpenAI exceptions leak to `chat_service`/`main.py` | Tight coupling to OpenAI SDK; breaks multi-provider goal; user sees ugly SDK error messages |
| Full prompts logged in production | Sensitive user data (especially future healthcare data) ends up in log aggregation systems — compliance risk |
| No timeout configured | A hung request blocks the terminal indefinitely |

## 9.15 Best Practices

- Single Responsibility: this module's only job is "talk to OpenAI and return a normalized result."
- Never let SDK-specific types (exceptions, response objects) escape this module.
- Make the client instantiable and injectable (constructor takes optional `settings` override) to ease testing.
- Keep retry/backoff configuration in `settings.py`, not hardcoded constants.

---

# 10. Component: `app/services/prompt_builder.py`

## 10.1 Overview

`prompt_builder.py` is responsible for **constructing the final list of messages** sent to the LLM, given the current user input and conversation history. It centralizes prompt engineering so that system prompts, formatting rules, and future domain-specific instructions live in one maintainable place.

## 10.2 Purpose

- Decouple "what we say to the model" (prompt engineering) from "how we talk to the model" (`openai_client.py`) and "how we manage conversation state" (`memory_service.py`).
- Provide a single, testable place to define and evolve Mansi's persona, tone, and behavioral instructions.
- Enable future prompt templates (healthcare-specific instructions, multilingual support, RAG context injection) without touching the orchestration or LLM layers.

## 10.3 Responsibilities

1. Define the **system prompt** (Mansi's persona, behavioral guidelines, constraints).
2. Format the **user's current message** into the appropriate message structure.
3. **Combine** system prompt + conversation history + current user message into the final `messages` list expected by `app/llm/base.py` / `openai_client.py`.
4. (Future) Inject **retrieved context** (RAG) and **rule engine** directives into the prompt.
5. (Future) Select prompt templates based on **language** or **domain** (e.g., healthcare).

`prompt_builder.py` does **not** call the LLM and does **not** manage memory storage — it is a pure transformation: `(history, user_input, context?) -> messages[]`.

## 10.4 Inputs

| Parameter | Type | Required | Description |
|---|---|---|---|
| `user_message` | `str` | Yes | The raw text the user just typed. |
| `history` | `list[dict]` | Yes | Prior conversation messages from `memory_service.py`, in `{"role": ..., "content": ...}` format. |
| `system_prompt_override` | `str` | No | Allows overriding the default system prompt (future: per-tenant/domain prompts). |
| `context` | `list[str]` | No (Future) | Retrieved RAG snippets to inject as additional context. |

## 10.5 Outputs

```python
messages: list[dict]  # e.g.:
[
    {"role": "system", "content": "<system prompt>"},
    {"role": "user", "content": "<earlier user message>"},
    {"role": "assistant", "content": "<earlier assistant reply>"},
    ...
    {"role": "user", "content": "<current user_message>"},
]
```

This is the exact shape required by `openai_client.generate_response(messages=...)`.

## 10.6 Internal Workflow

```
1. build_messages(user_message, history, system_prompt_override=None, context=None):
     a. system_prompt = system_prompt_override or DEFAULT_SYSTEM_PROMPT
     b. if context (future/RAG):
          system_prompt += "\n\nRelevant context:\n" + "\n".join(context)
     c. messages = [{"role": "system", "content": system_prompt}]
     d. messages.extend(history)         # prior turns, already trimmed by memory_service
     e. messages.append({"role": "user", "content": user_message.strip()})
     f. return messages
```

### 10.6.1 Prompt Templates

Define the default system prompt as a constant/template, separate from the assembly logic:

```python
DEFAULT_SYSTEM_PROMPT = (
    "You are Mansi, a helpful, friendly, and professional AI assistant. "
    "Answer clearly and concisely. If you don't know something, say so honestly."
)
```

For maintainability, store templates as constants (or, later, as files under `app/prompts/*.txt` / a `templates/` directory) rather than inline strings scattered through code — this makes prompt iteration a content change, not a code change.

## 10.7 Dependencies

- None on external services. Pure Python string/list manipulation.
- Depends conceptually on the message-format contract shared with `app/llm/base.py`.

## 10.8 Security Considerations

- **Prompt injection awareness**: the user's message is appended as `user` role content, never concatenated into the `system` prompt — this prevents a user from trivially overriding system-level instructions by crafting input that looks like a system message.
- Strip/normalize user input (e.g., `.strip()`) but do **not** silently truncate or rewrite user content in ways that change meaning — truncation for token-limit reasons is `memory_service`'s job (on history), not `prompt_builder`'s job on the current message.
- When (future) injecting RAG context or external data into the prompt, clearly delimit it (e.g., within an explicit "Context:" section) and instruct the model not to treat retrieved content as instructions — mitigates indirect prompt injection from untrusted retrieved documents.

## 10.9 Error Handling

- `user_message` must be a non-empty string after stripping; if empty, raise `ValueError("user_message cannot be empty")` — this should be caught by `chat_service.py` and surfaced as a friendly terminal message ("Please enter a message.") rather than calling the LLM with empty input.
- `history` is expected to already be well-formed (validated by `memory_service.py`); `prompt_builder` should not need to defensively re-validate each entry, but a malformed entry (missing `role`/`content`) should raise a clear `ValueError` rather than silently producing a bad API call.

## 10.10 Logging Strategy

- `DEBUG` level only: log the final `messages` list (or its length and total character count) before returning — full content logging gated by `settings.debug`, consistent with `openai_client.py`.
- No `INFO`/`WARNING`/`ERROR` logging expected in normal operation — this is a pure function with few failure modes.

## 10.11 Example Usage

```python
from app.services.prompt_builder import build_messages

history = [
    {"role": "user", "content": "Hi, my name is Sam."},
    {"role": "assistant", "content": "Hello Sam! How can I help you today?"},
]

messages = build_messages(
    user_message="What's my name?",
    history=history,
)

# messages = [
#   {"role": "system", "content": "You are Mansi, ..."},
#   {"role": "user", "content": "Hi, my name is Sam."},
#   {"role": "assistant", "content": "Hello Sam! How can I help you today?"},
#   {"role": "user", "content": "What's my name?"},
# ]
```

## 10.12 Testing Strategy

- Pure unit tests, no mocking required (no I/O).
- Test cases:
  - Empty history + simple message → returns `[system, user]`.
  - Non-empty history → history messages preserved in order between system and current user message.
  - Empty/whitespace-only `user_message` → raises `ValueError`.
  - `system_prompt_override` provided → used instead of `DEFAULT_SYSTEM_PROMPT`.
  - (Future) `context` provided → appears appended to the system prompt, clearly delimited.
  - Malformed `history` entry (missing `role` key) → raises `ValueError` with a clear message.

## 10.13 Future Healthcare Prompts

- Introduce a `prompts/` registry keyed by domain, e.g.:
  ```python
  SYSTEM_PROMPTS = {
      "default": DEFAULT_SYSTEM_PROMPT,
      "healthcare": HEALTHCARE_SYSTEM_PROMPT,  # includes disclaimers, scope limitations,
                                                 # "not a substitute for professional medical advice", etc.
  }
  ```
- `build_messages(..., domain="healthcare")` selects the appropriate template.
- Healthcare prompts must include: explicit non-diagnostic disclaimers, instructions to recommend professional consultation for medical concerns, and constraints aligned with relevant regulations (e.g., HIPAA-aware handling — noting that prompt content itself should never include PHI unless the whole pipeline is compliance-reviewed).

## 10.14 Future Multilingual Support

- Accept a `language` parameter (e.g., ISO 639-1 code) and select/compose a system prompt instructing the model to respond in that language: `"Respond in {language}. ..."`.
- Longer term, templates themselves may be translated/localized, but instructing the model in English to respond in the target language is typically sufficient and simpler to maintain.

## 10.15 Risks if Misimplemented

| Risk | Consequence |
|---|---|
| System prompt hardcoded inline in `chat_service.py` | Prompt changes require touching orchestration code; hard to test in isolation |
| User input concatenated into system prompt | Prompt injection vulnerability — user can override Mansi's instructions |
| No validation of empty input | Wasted LLM calls on empty messages, confusing empty responses |
| History not preserved in order | Model loses conversational context, gives incoherent replies |

## 10.16 Best Practices

- Keep this module a **pure function** (no side effects, no I/O) — maximizes testability.
- Separate "prompt content" (templates/constants) from "prompt assembly" (the function logic).
- Document the message-format contract (`role`/`content` keys) clearly since it's shared across `memory_service`, `prompt_builder`, and `openai_client`.

---

# 11. Component: `app/services/memory_service.py`

## 11.1 Overview

`memory_service.py` manages **conversation history** for a chat session — the sequence of user and assistant messages exchanged so far. In Phase 1, this is **in-memory, single-session** storage appropriate for a terminal application. The interface is designed so that the storage backend can later become persistent (database) and multi-session (per-user) without changing the interface consumed by `chat_service.py`.

## 11.2 Purpose

- Give the LLM conversational context ("memory") across multiple turns within a session.
- Provide a clean abstraction (`get_history`, `append`, `clear`) that hides the storage implementation from `chat_service.py`.
- Manage memory growth (token/message limits) so prompts don't grow unbounded and exceed model context limits or blow up cost.

## 11.3 Responsibilities

1. **Store** messages (`role`, `content`, optional `timestamp`) for the current session, in order.
2. **Retrieve** the current history for prompt construction.
3. **Append** new messages (user and assistant) after each turn.
4. **Trim/manage** history to stay within `settings.memory_max_messages` (or, in the future, a token budget).
5. **Clear/reset** the session (e.g., a `/reset` terminal command).
6. (Future) **Persist** history to a database keyed by session/user ID.

## 11.4 Inputs

| Method | Parameter | Type | Description |
|---|---|---|---|
| `append(role, content)` | `role` | `str` (`"user"` \| `"assistant"`) | Who sent the message |
| | `content` | `str` | The message text |
| `get_history()` | — | — | No input; returns current history |
| `clear()` | — | — | No input; resets the session |

## 11.5 Outputs

```python
get_history() -> list[dict]
# [
#   {"role": "user", "content": "..."},
#   {"role": "assistant", "content": "..."},
#   ...
# ]
```

`append()` and `clear()` return `None` (mutate internal state).

## 11.6 Internal Workflow (Phase 1: In-Memory)

```
class MemoryService:
    def __init__(self, max_messages: int = settings.memory_max_messages):
        self._messages: list[dict] = []
        self._max_messages = max_messages

    def append(self, role: str, content: str) -> None:
        if role not in ("user", "assistant"):
            raise ValueError(f"Invalid role: {role}")
        self._messages.append({"role": role, "content": content})
        self._trim()

    def get_history(self) -> list[dict]:
        return list(self._messages)   # return a copy — caller must not mutate internal state

    def clear(self) -> None:
        self._messages.clear()

    def _trim(self) -> None:
        # Keep the most recent N messages (simple sliding window for Phase 1)
        if len(self._messages) > self._max_messages:
            overflow = len(self._messages) - self._max_messages
            self._messages = self._messages[overflow:]
```

### 11.6.1 Trimming Strategy

- **Phase 1**: simple sliding window by **message count** (`settings.memory_max_messages`). Simple, predictable, sufficient for a terminal demo.
- **Phase 2+**: token-aware trimming — estimate tokens per message (e.g., via `tiktoken`) and trim to stay under a token budget that leaves room for the system prompt and response (`max_tokens_response`).
- **Phase 3+**: summarization — when history exceeds the budget, summarize older turns into a condensed system-message-style note instead of dropping them entirely, preserving long-term context cheaply.

## 11.7 Dependencies

- `app/config/settings.py` (for `memory_max_messages`)
- (Future) database client (`sqlalchemy`/`supabase`) for persistence
- (Future) `tiktoken` for token counting

## 11.8 Security Considerations

- Conversation history may contain sensitive user data (especially relevant for the stated future healthcare use case). In Phase 1 (in-memory, ephemeral, single-process), exposure is limited to process memory and terminal output.
- When persistence is introduced (Future), conversation data **must** be encrypted at rest and access-controlled per user/session — this is a hard requirement before any healthcare-adjacent data is stored.
- `clear()` must genuinely remove data (not just mark as inactive) to support user-requested deletion ("right to be forgotten" / data minimization).

## 11.9 Error Handling

- `append(role, content)`: raise `ValueError` for invalid `role` or empty `content` — these indicate a bug in the calling code (`chat_service.py`), not a user-facing condition, so a clear exception (not a silent no-op) is correct.
- `get_history()`: never raises under normal conditions; returns `[]` for a fresh session.
- `clear()`: idempotent — calling it on an already-empty session is a no-op, not an error.

## 11.10 Logging Strategy

- `DEBUG`: log message count after each `append`/`trim` (e.g., `"Memory: 14/20 messages"`).
- `INFO`: log when trimming actually removes messages (e.g., `"Memory trimmed: removed 2 oldest messages to stay within limit of 20"`).
- Never log full message **content** at `INFO` or above (same rationale as `openai_client.py` — potential sensitive data).

## 11.11 Example Usage

```python
from app.services.memory_service import MemoryService

memory = MemoryService()

memory.append("user", "Hi, my name is Sam.")
memory.append("assistant", "Hello Sam! How can I help you today?")

history = memory.get_history()
# [{"role": "user", "content": "Hi, my name is Sam."},
#  {"role": "assistant", "content": "Hello Sam! How can I help you today?"}]

memory.clear()
memory.get_history()  # []
```

## 11.12 Interaction with Chat Service

```
ChatService.handle_turn(user_message):
    1. history = memory.get_history()              <- read BEFORE adding current turn
    2. messages = prompt_builder.build_messages(user_message, history)
    3. response = llm_client.generate_response(messages)
    4. memory.append("user", user_message)         <- write AFTER successful LLM call
    5. memory.append("assistant", response.content)
    6. return response.content
```

**Critical ordering note**: `memory.append("user", ...)` happens **after** the LLM call succeeds (step 4, not before step 2). This ensures that if the LLM call fails (step 3 raises), the failed user message is not persisted into history as an "orphaned" entry without a corresponding assistant reply — keeping history consistent. (Alternative designs that append before calling the LLM must handle rollback on failure; the after-success ordering avoids that complexity entirely.)

## 11.13 Testing Strategy

- Unit tests, no I/O (Phase 1 is pure in-memory).
- Test cases:
  - `append` then `get_history` returns the appended message.
  - `append` with invalid role raises `ValueError`.
  - `get_history()` returns a **copy** — mutating the returned list does not affect internal state.
  - Trimming: appending more than `max_messages` results in `len(get_history()) == max_messages`, and the **oldest** messages are dropped (FIFO).
  - `clear()` empties history; subsequent `get_history()` returns `[]`.
  - `clear()` on empty history does not raise.

## 11.14 Future Persistent Storage

- Introduce a `MemoryStore` interface (analogous to `LLMClient`):
  ```python
  class MemoryStore(ABC):
      @abstractmethod
      def get_history(self, session_id: str) -> list[dict]: ...
      @abstractmethod
      def append(self, session_id: str, role: str, content: str) -> None: ...
      @abstractmethod
      def clear(self, session_id: str) -> None: ...
  ```
- `InMemoryStore` (Phase 1, current design, keyed implicitly by single process) and `DatabaseStore` (Phase 4, backed by `sqlalchemy`/Postgres, keyed by `session_id`/`user_id`) both implement `MemoryStore`.
- `MemoryService` becomes a thin wrapper that delegates to the configured `MemoryStore`, adding trimming/summarization logic on top — orchestration code (`chat_service.py`) is unaffected by the storage swap.
- Schema sketch for `DatabaseStore` (Phase 4):
  ```
  conversations(id, user_id, session_id, created_at)
  messages(id, conversation_id, role, content, token_count, created_at)
  ```

## 11.15 Database Abstraction

- Even in Phase 1, design `MemoryService`'s constructor to accept an injected store (`MemoryService(store: MemoryStore | None = None)`, defaulting to `InMemoryStore()`), so Phase 4 only needs to provide a new `store` implementation and update the dependency-injection wiring (likely in `main.py` / a future app factory) — zero changes to `MemoryService`'s public methods or `chat_service.py`.

## 11.16 Risks if Misimplemented

| Risk | Consequence |
|---|---|
| `get_history()` returns internal list reference (not a copy) | External mutation corrupts memory state in hard-to-debug ways |
| No trimming | Unbounded growth → eventually exceeds model context window → API errors; also increases per-request cost over time |
| Appending user message before LLM call, without rollback on failure | Inconsistent history (user message with no assistant reply) confuses future prompts |
| Logging full message content at INFO+ | Sensitive data in logs |
| No `clear()` capability | No way to start a fresh conversation without restarting the process |

## 11.17 Best Practices

- Keep the public interface minimal: `append`, `get_history`, `clear` — resist adding ad-hoc methods that leak storage details.
- Design for dependency injection from day one (constructor-injected store), even though Phase 1 only has one implementation.
- Keep trimming logic encapsulated here — `chat_service.py` and `prompt_builder.py` should never need to know about message limits.

---

# 12. Component: `app/services/chat_service.py`

## 12.1 Overview

`chat_service.py` is the **orchestration layer** — the only component that knows about *all* of `MemoryService`, `PromptBuilder`, and the LLM client, and coordinates them to handle a single conversational turn. It is the stable contract between "how the user's message arrives" (terminal today, FastAPI tomorrow) and "how a response is produced."

## 12.2 Purpose

- Provide one function/method — e.g., `ChatService.handle_message(user_message: str) -> str` — that fully encapsulates "processing a chat turn," so `main.py` (and later, FastAPI route handlers) stay thin.
- Coordinate memory retrieval, prompt construction, LLM invocation, and memory update in the correct order with correct error handling.
- Serve as the **single integration point** for future additions: Rule Engine checks, RAG retrieval, logging/analytics, and multi-turn validation all plug in here without changing `main.py` or the lower-level services.

## 12.3 Responsibilities

1. Accept raw user input (a string) from the caller.
2. Validate input (delegate to/coordinate with `prompt_builder`'s validation).
3. Retrieve conversation history from `MemoryService`.
4. Call `PromptBuilder` to construct the `messages` payload.
5. Invoke the LLM client to generate a response.
6. Update `MemoryService` with both the user message and the assistant's response (on success).
7. Return the assistant's response text to the caller.
8. Handle and translate errors from any layer into a single, caller-friendly exception or sentinel result.
9. Log the lifecycle of each turn for observability.

## 12.4 Inputs

| Parameter | Type | Required | Description |
|---|---|---|---|
| `user_message` | `str` | Yes | Raw text from the user (terminal input today; HTTP request body field in the future). |

Constructor-level dependencies (injected, for testability):

| Dependency | Type | Default |
|---|---|---|
| `memory` | `MemoryService` | `MemoryService()` |
| `llm_client` | `LLMClient` (e.g., `OpenAIClient`) | `OpenAIClient()` |
| `prompt_builder` | module/function `build_messages` | `prompt_builder.build_messages` |

## 12.5 Outputs

- Success: `str` — the assistant's reply text, ready to display.
- Failure: raises a single application-level exception (e.g., `ChatServiceError`), wrapping the underlying cause (`ValueError` from prompt validation, `LLMProviderError` from the LLM client), with a user-safe message.

## 12.6 Internal Workflow

```
ChatService.handle_message(user_message: str) -> str:

    1. ACCEPT INPUT
       - Receive user_message (string) from caller (main.py terminal loop)

    2. VALIDATE
       - If user_message.strip() == "":
           raise ChatServiceError("Message cannot be empty.")
           (No memory/LLM calls made for empty input)

    3. RETRIEVE MEMORY
       - history = self.memory.get_history()

    4. BUILD PROMPT
       - messages = self.prompt_builder.build_messages(
             user_message=user_message,
             history=history,
         )
         (raises ValueError on malformed input -> caught and wrapped, step 8)

    5. INVOKE LLM
       - llm_response = self.llm_client.generate_response(messages=messages)
         (raises LLMProviderError on failure -> caught and wrapped, step 8)

    6. UPDATE MEMORY (only on success)
       - self.memory.append("user", user_message)
       - self.memory.append("assistant", llm_response.content)

    7. RETURN RESPONSE
       - return llm_response.content

    8. ERROR HANDLING (wraps steps 2, 4, 5)
       - except ValueError as e:
             log WARNING; raise ChatServiceError(str(e)) from e
       - except LLMProviderError as e:
             log ERROR; raise ChatServiceError(
                 "Sorry, I couldn't process that right now. Please try again."
             ) from e
       - except Exception as e:   # unexpected
             log ERROR with stack trace
             raise ChatServiceError(
                 "An unexpected error occurred."
             ) from e
```

## 12.7 ASCII Flow Diagram

```
                         ┌─────────────────────────┐
                         │   ChatService.handle_     │
                         │   message(user_message)   │
                         └────────────┬─────────────┘
                                       │
                          ┌────────────▼─────────────┐
                          │  user_message empty?       │
                          └─────┬───────────────┬─────┘
                            yes │               │ no
                                ▼               ▼
                  ┌──────────────────┐   ┌────────────────────────┐
                  │ raise              │   │ history =                │
                  │ ChatServiceError   │   │ memory.get_history()      │
                  │ ("empty message")  │   └────────────┬────────────┘
                  └──────────────────┘                  │
                                                          ▼
                                          ┌────────────────────────────┐
                                          │ messages =                    │
                                          │ prompt_builder.build_messages( │
                                          │    user_message, history)      │
                                          └────────────┬───────────────┘
                                          ValueError?   │  ok
                                    ┌──────────────────┤
                                    ▼                  ▼
                       ┌──────────────────────┐  ┌─────────────────────────┐
                       │ raise ChatServiceError │  │ llm_response =             │
                       │ (validation message)   │  │ llm_client.generate_       │
                       └──────────────────────┘  │ response(messages)         │
                                                   └────────────┬───────────┘
                                          LLMProviderError?     │  ok
                                    ┌──────────────────────────┤
                                    ▼                            ▼
                       ┌──────────────────────────┐  ┌─────────────────────────┐
                       │ log ERROR;                  │  │ memory.append("user",    │
                       │ raise ChatServiceError       │  │   user_message)          │
                       │ ("try again later")          │  │ memory.append("assistant"│
                       └──────────────────────────┘  │   , llm_response.content) │
                                                       └────────────┬───────────┘
                                                                     │
                                                                     ▼
                                                       ┌─────────────────────────┐
                                                       │ return                    │
                                                       │ llm_response.content       │
                                                       └─────────────────────────┘
```

## 12.8 Dependencies

- `app.services.memory_service.MemoryService`
- `app.services.prompt_builder.build_messages`
- `app.llm.openai_client.OpenAIClient` (Phase 1) / `app.llm.base.LLMClient` (Future, via factory)
- `logging`

`chat_service.py` does **not** import `app.config.settings` directly for its own logic (settings are consumed by the lower layers it depends on) — though it may read `settings.debug`/`settings.log_level` indirectly for its own logging configuration if needed.

## 12.9 Security Considerations

- `ChatServiceError` messages returned to the caller (and potentially, in the future, to an HTTP client) must **never** include raw exception details, stack traces, or provider error text — only safe, generic, user-facing messages. Full details go to logs only.
- This is the layer where, in the future, a **Rule Engine** would intercept messages for content policy checks (e.g., PII detection, prohibited topics) **before** they reach the LLM — designing the workflow as a clear linear sequence (validate → retrieve → build → [rule check] → invoke → update → return) makes inserting this step straightforward later.

## 12.10 Error Handling

| Failure Point | Exception Caught | Wrapped As | User Message |
|---|---|---|---|
| Empty input | (validation, no exception — direct check) | `ChatServiceError` | "Message cannot be empty." |
| Prompt building | `ValueError` | `ChatServiceError` | The validation message (safe, since it originates from our own code) |
| LLM call | `LLMProviderError` | `ChatServiceError` | "Sorry, I couldn't process that right now. Please try again." |
| Memory operations | `ValueError` (e.g., invalid role — should not occur in normal flow since roles are hardcoded) | `ChatServiceError` | "An unexpected error occurred." |
| Anything else | `Exception` | `ChatServiceError` | "An unexpected error occurred." |

**Important**: memory is only updated on the success path (after step 5 succeeds). If the LLM call fails, `memory.append` is **not** called — history remains exactly as it was before this turn, so the user can simply retry without corrupted state.

## 12.11 Logging Strategy

| Level | Event |
|---|---|
| `DEBUG` | Full `messages` payload sent to LLM (only if `settings.debug`) |
| `INFO` | Turn start (`"Processing message"`, with message length, not content), turn end (`"Turn completed"`, with response length and token usage from `llm_response`) |
| `WARNING` | Validation failures (empty input, malformed history) |
| `ERROR` | LLM provider errors, unexpected exceptions (with stack trace via `logger.exception`) |

Each turn should ideally be logged with a correlation identifier (even if just an incrementing counter in Phase 1) to make multi-turn debugging easier — formalized as a `session_id`/`request_id` in Phase 2 (FastAPI).

## 12.12 Example Usage

```python
from app.services.chat_service import ChatService, ChatServiceError

chat = ChatService()

try:
    reply = chat.handle_message("Hello, who are you?")
    print(f"Mansi: {reply}")
except ChatServiceError as e:
    print(f"Error: {e}")
```

### 12.12.1 `main.py` Terminal Loop (illustrative)

```python
from app.services.chat_service import ChatService, ChatServiceError

def main():
    chat = ChatService()
    print("Mansi AI — type 'exit' to quit, '/reset' to clear memory.")
    while True:
        user_input = input("You: ").strip()
        if user_input.lower() == "exit":
            break
        if user_input == "/reset":
            chat.memory.clear()
            print("Memory cleared.")
            continue
        try:
            reply = chat.handle_message(user_input)
            print(f"Mansi: {reply}")
        except ChatServiceError as e:
            print(f"Mansi: {e}")

if __name__ == "__main__":
    main()
```

## 12.13 Testing Strategy

- Unit tests with **mocked** `memory`, `llm_client`, and `prompt_builder` (constructor injection makes this straightforward).
- Test cases:
  - Happy path: given mocked history and a mocked `LLMResponse`, `handle_message` returns `llm_response.content`, and `memory.append` is called exactly twice (`"user"`, then `"assistant"`) with correct arguments and correct order.
  - Empty input → raises `ChatServiceError`; `memory.get_history`, `llm_client.generate_response`, and `memory.append` are **never called**.
  - `prompt_builder.build_messages` raises `ValueError` → `handle_message` raises `ChatServiceError` with that message; `llm_client.generate_response` and `memory.append` are never called.
  - `llm_client.generate_response` raises `LLMProviderError` → `handle_message` raises `ChatServiceError` with the generic retry message; `memory.append` is **never called** (verifying the no-partial-update guarantee from §12.10).
  - Unexpected exception from any dependency → wrapped as `ChatServiceError("An unexpected error occurred.")`, original exception logged via `logger.exception`.
- **Integration test** (Phase 1, with real or sandboxed components except the LLM, which remains mocked): full `ChatService` with real `MemoryService` and real `prompt_builder`, mocked `OpenAIClient` — verifies the components compose correctly end-to-end.

## 12.14 Future API Compatibility

A future FastAPI route would look like:

```python
# app/api/chat.py (Phase 2, illustrative)
from fastapi import APIRouter, HTTPException
from app.services.chat_service import ChatService, ChatServiceError

router = APIRouter()
chat_service = ChatService()  # or per-request/session instance, see below

@router.post("/chat")
def chat_endpoint(payload: ChatRequest) -> ChatResponse:
    try:
        reply = chat_service.handle_message(payload.message)
        return ChatResponse(reply=reply)
    except ChatServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

**Key requirement enabling this**: `handle_message(user_message: str) -> str` (plus the `ChatServiceError` contract) must remain stable. The FastAPI layer adds request/response schemas (`pydantic` models), HTTP status code mapping, and per-session `MemoryService` instantiation (keyed by session/user ID from auth) — none of which require changes to `ChatService` itself.

## 12.15 Future Webflow Compatibility

Webflow consumes the FastAPI REST endpoint via JavaScript (fetch/AJAX) from the embedded chat widget. Requirements this places on the stack (already satisfied by the design above):

- **CORS**: FastAPI must allow Webflow's domain as an origin (`CORS_ALLOWED_ORIGINS`, §6.13).
- **Session identity**: Webflow's frontend must send a session/user identifier (cookie, token, or generated UUID stored client-side) so `MemoryService` can be instantiated per-session (Future, §11.14) rather than the single global session of Phase 1.
- **Latency**: Webflow's UI should show a loading/typing indicator while `handle_message` (and the underlying LLM call) completes — no change needed in `ChatService`, but the API layer should support this (e.g., the endpoint is synchronous/blocking per request, which is acceptable; streaming responses are a further future enhancement).
- **Error display**: `ChatServiceError` messages are already user-safe (§12.9) and can be displayed directly in the Webflow chat UI.

## 12.16 Future Enhancements

- **Rule Engine integration**: insert a step between "build prompt" and "invoke LLM" (and/or after receiving the response) where `app/rules/*` can short-circuit with a canned response (e.g., for prohibited topics) or annotate the prompt.
- **RAG integration**: insert a step before "build prompt" where `app/rag/*` retrieves relevant documents based on `user_message`, passed to `prompt_builder.build_messages(..., context=retrieved_docs)`.
- **Streaming responses**: support `generate_response_stream()` on the LLM client and a corresponding `handle_message_stream()` for token-by-token output (terminal: print as it arrives; API: Server-Sent Events/WebSocket).
- **Per-session `ChatService`**: in Phase 2+, `ChatService` instances (or at least their `MemoryService`) become per-session, managed by a session manager keyed by user/session ID.
- **Async support**: when moving to FastAPI, consider an `async def handle_message` variant using the OpenAI SDK's async client, to avoid blocking the event loop under concurrent requests.

## 12.17 Risks if Misimplemented

| Risk | Consequence |
|---|---|
| Memory updated before LLM call / without success check | Corrupted history on failure (orphaned user message with no reply) |
| `main.py` calls `memory_service`/`openai_client` directly, bypassing `chat_service` | Orchestration logic duplicated/inconsistent between terminal and future API; defeats the purpose of this layer |
| Raw provider exceptions surfaced to the user | Confusing error messages; leaks implementation details (provider name, SDK error format) |
| No input validation | Wasted LLM calls, confusing empty responses, potential errors deep in `prompt_builder` |
| Tight coupling to `OpenAIClient` (not `LLMClient` interface) | Multi-provider goal blocked; every provider switch requires editing `chat_service.py` |
| Logging full conversation content at INFO | Sensitive data in logs (compounds with §11.8 healthcare concerns) |

## 12.18 Best Practices

- `ChatService` is the **only** module that imports from all three of `memory_service`, `prompt_builder`, and the LLM client — this concentration is intentional (it's the orchestrator) and should not be replicated elsewhere.
- Constructor-based dependency injection for all three collaborators, with sensible defaults — enables both production wiring (`ChatService()`) and test wiring (`ChatService(memory=mock_memory, llm_client=mock_llm, ...)`).
- Keep `handle_message` linear and readable (§12.6) — this is the method most likely to need new steps inserted (Rule Engine, RAG) as the project grows; a clear, well-commented sequence is far easier to extend safely than a tangled one.
- One custom exception type (`ChatServiceError`) as the outward-facing contract, regardless of how many internal exception types exist.

---

# 13. Engineering Standards & Justification

| Standard | Application in This Spec | Why It Matters Here |
|---|---|---|
| **SOLID — Single Responsibility** | Each module does exactly one thing: `settings.py` (config), `openai_client.py` (provider I/O), `prompt_builder.py` (prompt assembly), `memory_service.py` (state), `chat_service.py` (orchestration). | Each can be understood, tested, and changed independently — critical as RAG/Rules/multi-provider are added. |
| **SOLID — Dependency Inversion** | `chat_service.py` depends on `LLMClient` (abstraction, §9.13) and `MemoryStore` (abstraction, §11.14), not concrete classes. | Enables swapping OpenAI→Claude/Gemini and in-memory→database storage without touching orchestration. |
| **SOLID — Open/Closed** | New prompt templates (§10.13–10.14), rule checks, and RAG steps are added by extending `prompt_builder`/`chat_service` workflow, not modifying existing tested logic. | New capability shouldn't risk regressing existing, working flows. |
| **Separation of Concerns** | Config (§8) vs. provider I/O (§9) vs. prompt content (§10) vs. state (§11) vs. orchestration (§12) are distinct layers with one-directional dependencies. | Changes in one layer (e.g., switching LLM providers) have minimal blast radius. |
| **Clean Architecture** | Business orchestration (`chat_service`) does not depend on infrastructure details (OpenAI SDK specifics, `.env` parsing) — only on interfaces/contracts (`LLMResponse`, `messages` format, `ChatServiceError`). | Infrastructure (SDKs, databases, frameworks) can change without rewriting business logic — directly enables the Phase 1 → Phase 2+ evolution described throughout. |
| **Modular Design** | Directory structure (`config/`, `llm/`, `services/`, `rules/`, `rag/`, `api/`, `integrations/`) mirrors architectural layers, present even as empty scaffolding from Phase 1. | New team members and future contributors immediately understand where new code belongs. |
| **Scalability** | Stateless `ChatService`/`OpenAIClient` (config-driven, no hidden global mutable state beyond injected `MemoryService`) — ready for per-request instantiation in FastAPI/multi-user contexts. | Terminal Phase 1 code becomes the basis for a concurrent, multi-session Phase 2 service with minimal rework. |
| **Testability** | Every component has constructor-injectable dependencies and a documented Testing Strategy with mocked boundaries (§9.12, §10.12, §11.13, §12.13). | Enables fast, reliable, no-network unit test suites — essential as complexity grows. |
| **Secure Secret Management** | `.env` (§6) + `settings.py` (§8) as the sole, validated, masked path to secrets; never logged, never hardcoded. | Especially critical given the project's future healthcare-data ambitions, where credential and data leaks have compliance consequences. |
| **Environment-Based Configuration** | `ENVIRONMENT`, `DEBUG`, `LOG_LEVEL` drive behavior differences (logging verbosity, etc.) without code branching scattered across modules — centralized in `settings.py`. | One codebase, many deployment targets — a 12-factor app principle essential for dev → staging → production promotion. |
| **Provider Abstraction** | `app/llm/base.py` (`LLMClient` interface, §9.13) + factory pattern — `OpenAIClient`/`ClaudeClient`/`GeminiClient` are interchangeable. | Directly required by the stated goal of supporting OpenAI, Claude, and Gemini. |
| **Loose Coupling** | Modules communicate via simple data contracts (`messages: list[dict]`, `LLMResponse`, `ChatServiceError`) rather than passing internal objects/state. | Contracts can be shared across Phase 1 (terminal) and Phase 2+ (API) callers unchanged. |
| **High Cohesion** | All OpenAI-specific logic lives in one file (`openai_client.py`); all memory logic in one file (`memory_service.py`), etc. — no logic is split across unrelated modules. | Reduces the number of files an engineer must touch (and understand) to make a focused change. |

---

# 14. Cross-Component Data Contracts (Summary Reference)

| Contract | Shape | Produced By | Consumed By |
|---|---|---|---|
| `settings` | Immutable config object (§8.5) | `app/config/settings.py` | All modules (directly: `openai_client`, `memory_service`; transitively via injection elsewhere) |
| `messages: list[dict]` | `[{"role": "system"\|"user"\|"assistant", "content": str}, ...]` | `prompt_builder.build_messages` | `openai_client.generate_response` (via `chat_service`) |
| `LLMResponse` | Dataclass (§9.5): `content`, `model`, `finish_reason`, token counts | `openai_client.generate_response` | `chat_service.handle_message` |
| `history: list[dict]` | Same shape as `messages` but without the leading system prompt | `memory_service.get_history` | `prompt_builder.build_messages` |
| `ChatServiceError` | Exception with user-safe `str()` message | `chat_service.handle_message` | `main.py` (Phase 1), FastAPI routes (Phase 2+) |

---

# 15. Implementation Checklist (Phase 1)

- [ ] Create `.env` (gitignored) and `.env.example` (committed) per §6.7.
- [ ] Add `.gitignore` per §6.10.
- [ ] Populate `requirements.txt` and create `requirements-dev.txt` per §7.10.
- [ ] Implement `app/config/settings.py` per §8 — including `ConfigurationError`, validation, and masked `__repr__`.
- [ ] Implement `app/llm/base.py` with the `LLMClient` ABC and `LLMResponse` dataclass per §9.5/§9.13 (build the abstraction now, even with only one implementation, to avoid retrofitting).
- [ ] Implement `app/llm/openai_client.py` (`OpenAIClient(LLMClient)`) per §9 — including retry/backoff and `LLMProviderError`.
- [ ] Implement `app/services/prompt_builder.py` (`build_messages`, `DEFAULT_SYSTEM_PROMPT`) per §10.
- [ ] Implement `app/services/memory_service.py` (`MemoryService`, with `MemoryStore`/`InMemoryStore` seam per §11.15) per §11.
- [ ] Implement `app/services/chat_service.py` (`ChatService`, `ChatServiceError`) per §12.
- [ ] Implement `main.py` terminal loop per §12.12.1.
- [ ] Write unit tests for each component per the respective Testing Strategy sections (§8.13, §9.12, §10.12, §11.13, §12.13).
- [ ] Verify `pip install -r requirements.txt` succeeds in a clean virtual environment and the terminal chatbot runs end-to-end against the real OpenAI API.

---

*End of Specification.*
