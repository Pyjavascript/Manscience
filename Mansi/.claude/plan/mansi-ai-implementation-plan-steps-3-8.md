# Plan: Implement Mansi AI Phase 1 (Steps 3–8) per `claude/spec/mansi-ai-spec-steps-3-8.md`

## Context

The spec at `claude/spec/mansi-ai-spec-steps-3-8.md` defines a complete, implementation-ready blueprint for the Mansi AI terminal chatbot: configuration, an OpenAI LLM client behind a provider-agnostic interface, prompt building, conversation memory, and a chat orchestration layer.

I verified the project is a clean scaffold — every target file already exists but is **empty** (`main.py`, `requirements.txt`, `.env`, `README.md`, and all files under `app/config`, `app/llm`, `app/services`). No `.gitignore`, `.env.example`, or `tests/` directory exists yet. Python 3.12.3 venv is already set up at `mansi/venv`.

The goal of this task is to write all the actual code so the terminal chatbot runs end-to-end against OpenAI, following the spec's contracts, error handling, logging, and testing strategy exactly — so it composes cleanly today and is ready for the FastAPI/RAG/multi-provider future described in the spec.

`app/llm/claude_client.py` is explicitly out of scope (spec marks it "Future") — leave it as an empty placeholder file.

---

## Files to Create / Modify

All paths relative to `/home/user/Mansi_chatboat/mansi/`.

### 1. `.gitignore` (new)
Per spec §6.10: ignore `.env`, `.env.*.local`, `venv/`, `__pycache__/`, `*.pyc`, `*.log`, plus standard `.pytest_cache/`.

### 2. `.env.example` (new) and `.env` (populate)
Per spec §6.7. Both files get the documented variables:
`OPENAI_API_KEY`, `MODEL_NAME`, `OPENAI_API_BASE`, `OPENAI_TIMEOUT_SECONDS`, `OPENAI_MAX_RETRIES`, `ENVIRONMENT`, `DEBUG`, `LOG_LEVEL`, `MEMORY_MAX_MESSAGES`, `MAX_TOKENS_RESPONSE`, `TEMPERATURE`.

- `.env.example`: committed placeholder values (`OPENAI_API_KEY=your_openai_api_key_here`, `MODEL_NAME=gpt-4o-mini`, etc.)
- `.env`: same shape but with a `sk-`-prefixed placeholder (`sk-REPLACE_WITH_YOUR_REAL_KEY`) so `settings.py` validation passes structurally; user must swap in their real key before making live API calls. `DEBUG=true`, `LOG_LEVEL=DEBUG`, `ENVIRONMENT=development` for local dev per §6.11.

### 3. `requirements.txt` and `requirements-dev.txt` (new)
Per spec §7.10:
```
# requirements.txt
openai==1.54.4
python-dotenv==1.0.1
```
```
# requirements-dev.txt
-r requirements.txt
pytest==8.3.2
pytest-mock==3.14.0
```
(Will verify these versions install cleanly in the existing venv during implementation; adjust pins only if a listed version is unavailable, keeping exact pinning.)

### 4. `app/config/settings.py`
Per spec §8. Implements:
- `load_dotenv()` at module load.
- `ConfigurationError` exception.
- Frozen `Settings` dataclass with all fields from §8.5 (`openai_api_key`, `model_name`, `debug`, `log_level`, `environment`, `openai_api_base`, `openai_timeout_seconds`, `openai_max_retries`, `memory_max_messages`, `max_tokens_response`, `temperature`).
- `__repr__` masking `openai_api_key`.
- `_load_settings()` collecting **all** validation errors (§6.8) before raising a single `ConfigurationError`.
- Module-level `settings = _load_settings()` singleton.

### 5. `app/llm/base.py` (new content)
Per spec §9.5 / §9.13:
- `LLMResponse` frozen dataclass (`content`, `model`, `finish_reason`, `prompt_tokens`, `completion_tokens`, `total_tokens`).
- `LLMProviderError` exception.
- `LLMClient` ABC with abstract `generate_response(messages, model=None, temperature=None, max_tokens=None) -> LLMResponse`.

### 6. `app/llm/openai_client.py`
Per spec §9. `OpenAIClient(LLMClient)`:
- Constructor creates `openai.OpenAI` client using `settings.openai_api_key`, `settings.openai_api_base`, `settings.openai_timeout_seconds`.
- `generate_response(...)` resolves overrides, calls `client.chat.completions.create(...)`, wrapped in a retry loop (exponential backoff + jitter, up to `settings.openai_max_retries`) for `RateLimitError`/`APITimeoutError`/`APIConnectionError`/`InternalServerError`; no retry for `AuthenticationError`/`BadRequestError`.
- Parses response into `LLMResponse`.
- Translates all SDK exceptions into `LLMProviderError` per the table in §9.9.
- Logging per §9.10 (DEBUG = full payload only if `settings.debug`, INFO = summary, WARNING = retries, ERROR = failures) using the standard `logging` module.

### 7. `app/services/prompt_builder.py`
Per spec §10. `build_messages(user_message, history, system_prompt_override=None)`:
- `DEFAULT_SYSTEM_PROMPT` constant (Mansi persona).
- Validates `user_message` non-empty after `.strip()` → `ValueError`.
- Validates each `history` entry has `role`/`content` → `ValueError`.
- Returns `[system, *history, current_user_message]`.
- DEBUG-level logging of message count/length only.

### 8. `app/services/memory_service.py`
Per spec §11. `MemoryService`:
- `__init__(self, max_messages: int | None = None)` defaulting to `settings.memory_max_messages`.
- `append(role, content)` — validates role in `("user","assistant")`, appends, trims.
- `get_history()` — returns a **copy** of the list.
- `clear()` — empties, idempotent.
- `_trim()` — sliding-window FIFO trim to `max_messages`.
- Logging per §11.10 (DEBUG message counts, INFO on trim, never full content at INFO+).
- Note: per spec §11.15 this is designed as a self-contained class for Phase 1 (no separate `MemoryStore` interface file needed yet — keeping scope to what's required for the terminal app, while keeping the public surface minimal so a store can be injected later without breaking callers).

### 9. `app/services/chat_service.py`
Per spec §12. `ChatService` and `ChatServiceError`:
- Constructor takes optional `memory: MemoryService`, `llm_client: LLMClient`, `prompt_builder` (defaults: `MemoryService()`, `OpenAIClient()`, `build_messages`).
- `handle_message(user_message: str) -> str` implements the exact sequence in §12.6: validate → get history → build messages → call LLM → append user+assistant to memory (only on success) → return content.
- Wraps `ValueError` (from prompt builder) and `LLMProviderError` (from LLM client) into `ChatServiceError` with the user-safe messages from §12.10; logs per §12.11.

### 10. `main.py`
Per spec §12.12.1. Terminal REPL:
- On startup, catch `ConfigurationError` from `app.config.settings` import, print a friendly message, `exit(1)` (§8.10).
- Loop: read input, `exit`/`quit` to break, `/reset` clears `chat.memory`, otherwise `chat.handle_message(...)` and print reply or `ChatServiceError` message.

### 11. `tests/` (new directory)
Per spec testing-strategy sections (§8.13, §9.12, §10.12, §11.13, §12.13), using `pytest` + `pytest-mock`, no real network calls:
- `tests/test_settings.py` — env var validation via `monkeypatch`, masked repr.
- `tests/test_openai_client.py` — mock `openai.OpenAI`, cover success, retry-then-success, retries-exhausted, no-retry on auth/bad-request, overrides passed through, debug logging gating.
- `tests/test_prompt_builder.py` — pure unit tests for message assembly and validation errors.
- `tests/test_memory_service.py` — append/get_history copy semantics/trim FIFO/clear idempotency.
- `tests/test_chat_service.py` — mocked dependencies, happy path + each error path from §12.13, verifying memory is untouched on failure.
- `tests/conftest.py` if needed to set required env vars (`OPENAI_API_KEY=sk-test...`, `MODEL_NAME=gpt-4o-mini`, etc.) via fixtures so `settings` import succeeds in tests.

### 12. `README.md` (minimal fill-in)
Currently empty. Add a short setup/run section: venv activation, `pip install -r requirements.txt`, copying `.env.example` to `.env` and setting `OPENAI_API_KEY`, running `python main.py`, running tests with `pytest`. Kept brief — not a full rewrite of the spec.

---

## Out of Scope (per spec)
- `app/llm/claude_client.py`, `app/rules/`, `app/rag/`, `app/api/`, `app/integrations/` remain untouched empty stubs (Future phases).
- No FastAPI, RAG, database, or multi-provider factory code — only the `LLMClient`/`LLMResponse` abstraction needed for Phase 1.

---

## Verification

1. `pip install -r requirements-dev.txt` inside `mansi/venv` — confirm clean install.
2. `pytest -q` from `mansi/` — all unit tests pass without network access.
3. Manual smoke test: with a real `OPENAI_API_KEY` set in `.env`, run `python main.py`, send a message, confirm a reply, confirm `/reset` clears memory (next message has no prior context), confirm `exit` quits cleanly. If no real key is available in this environment, document this as a manual step for the user and instead verify the `ConfigurationError` path triggers correctly with a placeholder/invalid key.
