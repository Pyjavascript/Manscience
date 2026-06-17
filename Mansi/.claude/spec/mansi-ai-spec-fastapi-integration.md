# Mansi AI — FastAPI Integration Specification
# DAY! STEP 2,3
## Phase 2: Expose the Existing Terminal Chatbot via REST API

| Field | Value |
|---|---|
| Document Type | Software Specification |
| Project | Mansi AI Chatbot |
| Phase | Phase 2 — REST API Layer (additive, non-breaking) |
| Audience | Software Engineers, Reviewers |
| Status | Draft — Spec only, **no implementation performed yet** |

---

## 1. Purpose of This Document

This document specifies how to expose the already-working terminal chatbot
(`main.py` + `ChatService` + `PromptBuilder` + `MemoryService` + `OpenAIClient`)
through a **FastAPI** REST API, so that a frontend (e.g., a Webflow-embedded
React widget) can call it over HTTP — **without rewriting, duplicating, or
breaking any existing Phase 1 code**.

This is a planning document only. No source files are created or modified by
this document itself.

---

## 2. Current State (Phase 1 Recap)

- `main.py` is a terminal REPL. It builds one `ChatService()` instance and
  loops on `input()`/`print()`.
- `ChatService.handle_message(user_message: str) -> str` (in
  `app/services/chat_service.py`) is already the **stable orchestration
  contract**: memory → prompt builder → LLM client → memory update → return
  reply text. It raises `ChatServiceError` (user-safe message) on any failure.
- `app/services/prompt_builder.py`, `app/services/memory_service.py`,
  `app/llm/openai_client.py`, `app/llm/base.py`, `app/config/settings.py` are
  complete, tested (44 tests passing), and **must not change**.
- `app/api/__init__.py` already exists as an **empty placeholder package**
  (0 bytes) — created in Phase 1 specifically so Phase 2 has a home.
- `requirements.txt` / `requirements-dev.txt` do not yet include `fastapi` or
  `uvicorn`.

---

## 3. Non-Negotiable Rules for This Change

1. Do **not** rewrite or replace existing chatbot logic.
2. Do **not** modify working files unless absolutely necessary.
3. Do **not** rename or move existing files or folders.
4. Do **not** duplicate `ChatService`, `PromptBuilder`, or LLM code.
5. Reuse the existing implementation as-is.
6. `main.py` must remain fully functional (terminal chatbot unchanged).
7. New code lives in `app/api/`; integration changes elsewhere are minimal
   and justified.
8. Any edit to an existing file must be explained (why it's required) before
   it's made.

---

## 4. Target Architecture

```
Frontend (Webflow / React)
        │  HTTP POST /chat  {"message": "..."}
        ▼
FastAPI            (app/api/main.py, app/api/chat.py, app/api/health.py)
        │  ChatService.handle_message(message)
        ▼
Existing ChatService          (app/services/chat_service.py — unchanged)
        │
        ▼
Existing Prompt Builder        (app/services/prompt_builder.py — unchanged)
        │
        ▼
Existing OpenAI Client          (app/llm/openai_client.py — unchanged)
        │
        ▼
LLM (OpenAI)
        │
        ▼
JSON Response  {"response": "<LLM reply>"}
```

`ChatService` is reused **as-is** — the same class, same instantiation
pattern (`ChatService()`), same `handle_message` contract that `main.py`
already uses. FastAPI is purely a new transport on top of it.

---

## 5. New Files to Create (all under `app/api/`)

No existing file is renamed or moved. The following are **new** files only.

### 5.1 `app/api/schemas.py`

Pydantic request/response models — kept separate from route logic for
clarity and reuse.

```python
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User's chat message")


class ChatResponse(BaseModel):
    response: str


class HealthResponse(BaseModel):
    status: str = "ok"
```

### 5.2 `app/api/chat.py`

A FastAPI router exposing `POST /chat`. Instantiates `ChatService` **once**
at module load (mirrors how `main.py` instantiates one `ChatService()` for
the life of the process — Phase 2 keeps the same single-session memory model
as Phase 1; per-session memory is a documented future enhancement, already
called out in the Phase 1 spec §11.14/§11.15).

```python
from fastapi import APIRouter, HTTPException

from app.api.schemas import ChatRequest, ChatResponse
from app.services.chat_service import ChatService, ChatServiceError

router = APIRouter()
_chat_service = ChatService()


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    try:
        reply = _chat_service.handle_message(payload.message)
    except ChatServiceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ChatResponse(response=reply)
```

Notes:
- `ChatRequest.message` uses `min_length=1`, so empty/whitespace-free bodies
  are rejected by FastAPI/Pydantic with `422` before reaching `ChatService`.
  A message containing only whitespace (e.g., `"   "`) still reaches
  `ChatService`, which already raises `ChatServiceError("Message cannot be
  empty.")` — mapped here to `400`. This reuses existing validation rather
  than duplicating it.
- All `ChatServiceError` instances carry user-safe messages already (per
  Phase 1 spec §12.9), so returning `str(exc)` in `detail` is safe.

### 5.3 `app/api/health.py`

A FastAPI router exposing `GET /health`. No dependency on `ChatService` —
intentionally cheap/fast for load-balancer or uptime checks.

```python
from fastapi import APIRouter

from app.api.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")
```

### 5.4 `app/api/main.py`

The FastAPI application entry point — what `uvicorn app.api.main:app --reload`
serves. Wires the two routers together.

```python
from fastapi import FastAPI

from app.api import chat, health

app = FastAPI(title="Mansi AI API")

app.include_router(health.router)
app.include_router(chat.router)
```

---

## 6. Existing Files Touched (and Why)

| File | Change | Why Required |
|---|---|---|
| `requirements.txt` | Add `fastapi` and `uvicorn` entries | The new `app/api/*` modules import `fastapi`; `uvicorn` is the ASGI server needed to run `app.api.main:app`. Both are **additive lines only** — no existing pins are changed, so `openai`/`httpx` compatibility (already carefully pinned) is untouched. |
| `app/api/__init__.py` | None | Already exists as an empty package marker; importing `app.api.main`, `app.api.chat`, `app.api.health` works as-is. No edit needed. |

No other existing file (`main.py`, `app/config/settings.py`,
`app/services/*.py`, `app/llm/*.py`, `tests/*`) requires any change.

`requirements-dev.txt` needs **no change**: `httpx==0.27.2` (already a
runtime dependency, pinned for `openai` compatibility) is the same package
FastAPI's `TestClient` requires for testing the new endpoints.

---

## 7. API Contract

### `GET /health`

**Response `200 OK`:**
```json
{ "status": "ok" }
```

### `POST /chat`

**Request:**
```json
{ "message": "Hello Mansi" }
```

**Response `200 OK`:**
```json
{ "response": "<LLM response>" }
```

**Error responses:**

| Condition | Status | Body |
|---|---|---|
| `message` missing or empty string in JSON body | `422 Unprocessable Entity` | FastAPI/Pydantic default validation error |
| `message` is whitespace-only, or `ChatService` raises `ChatServiceError` (e.g., LLM provider failure) | `400 Bad Request` | `{"detail": "<user-safe ChatServiceError message>"}` |

---

## 8. Explicitly Out of Scope (per requirements)

- RAG, Q1/Q2 flows, Courses, Blogs — not implemented.
- Per-session/multi-user memory — Phase 2 keeps the single shared
  `MemoryService` instance (one conversation history for the whole process),
  identical in spirit to running one terminal session. Documented as future
  work in the Phase 1 spec (§11.14–11.15).
- CORS configuration for Webflow — not required to satisfy the stated success
  criteria (`/health`, `/chat` reachable via `uvicorn`/`TestClient`); flagged
  as a follow-up before a browser-based Webflow frontend can call the API
  cross-origin (`CORS_ALLOWED_ORIGINS`, already anticipated in Phase 1 spec
  §6.13).
- Authentication, rate limiting, streaming responses — future phases.

---

## 9. Testing Strategy (for the future implementation step)

New tests only, added under `tests/` without touching existing test files:

- `tests/test_api_health.py` — `GET /health` returns `200` and
  `{"status": "ok"}`.
- `tests/test_api_chat.py` — using `fastapi.testclient.TestClient`, with
  `ChatService.handle_message` mocked/monkeypatched (no real OpenAI calls,
  consistent with how `tests/test_chat_service.py` already mocks the LLM
  layer):
  - Valid message → `200` with `{"response": "<mocked reply>"}`.
  - Empty-string message → `422` (Pydantic `min_length`).
  - Whitespace-only message → `400` with `ChatServiceError`'s message.
  - `ChatService.handle_message` raising `ChatServiceError` → `400`.

Existing test files (`test_chat_service.py`, `test_memory_service.py`,
`test_openai_client.py`, `test_prompt_builder.py`, `test_settings.py`,
`conftest.py`) are **not modified**.

---

## 10. Deliverables Checklist (mapped to request)

1. **Specification document** — this file.
2. **FastAPI implementation** — `app/api/schemas.py`, `app/api/health.py`,
   `app/api/chat.py`, `app/api/main.py` (to be created in the implementation
   step that follows this spec; none created yet).
3. **Files created** — the 4 files listed in §5 (none exist yet).
4. **Files modified** — only `requirements.txt` (§6), additive lines only.
5. **`main.py` confirmation** — `main.py` is not referenced, imported by, or
   modified for this change; the terminal chatbot continues to run exactly
   as before via `python main.py`.

---

## 11. Success Criteria

- `python main.py` still runs the terminal chatbot, unchanged.
- `uvicorn app.api.main:app --reload` starts a FastAPI server.
- `GET /health` → `200 {"status": "ok"}`.
- `POST /chat` with `{"message": "..."}` → `200 {"response": "..."}`, produced
  by the **same** `ChatService.handle_message` used by the terminal.
- No files outside `app/api/` (new) and `requirements.txt` (additive) are
  touched.

---

*End of Specification — implementation not yet performed.*
