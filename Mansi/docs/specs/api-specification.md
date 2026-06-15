# Mansi AI — API Specification

| Field | Value |
|---|---|
| Document Type | Software Specification (Documentation Only) |
| Project | Mansi AI Chatbot |
| Phase | Phase 2+ — REST API Surface |
| Audience | Software Engineers, Frontend/Webflow Integrators, QA |
| Status | Draft — Specification only. Endpoints marked **Planned** are **not implemented**. |

---

## 1. Purpose of This Document

This document specifies the full intended REST API surface for the Mansi AI
backend: endpoints that already exist (`GET /health`, `POST /chat`) and
endpoints planned for future phases (Personalized Roadmap, Course
Recommendations, Research & Blogs, Profile Generation).

This is a **specification only**. No endpoint described here as "Planned" is
implemented by this document, and nothing in this document modifies the
existing, working implementation in `app/api/`.

---

## 2. Current Implementation Status

| Endpoint | Status | Implementation |
|---|---|---|
| `GET /health` | **Implemented** | `app/api/health.py` |
| `POST /chat` | **Implemented** | `app/api/chat.py` |
| `GET /roadmap/q1` | Planned | Not implemented |
| `POST /roadmap/q1/submit` | Planned | Not implemented |
| `GET /roadmap/q2` | Planned | Not implemented |
| `POST /roadmap/q2/submit` | Planned | Not implemented |
| `POST /courses/recommend` | Planned | Not implemented |
| `POST /research/search` | Planned | Not implemented |
| `POST /profile/generate` | Planned | Not implemented |

---

## 3. General Conventions

- **Base URL**: Relative paths shown below (e.g., `/chat`) are mounted on the
  FastAPI app defined in `app/api/main.py`.
- **Content type**: All requests and responses use `application/json`.
- **Error envelope**: FastAPI default validation errors (`422`) use the
  standard Pydantic error shape:

  ```json
  {
    "detail": [
      {
        "loc": ["body", "message"],
        "msg": "field required",
        "type": "value_error.missing"
      }
    ]
  }
  ```

  Application-level errors (e.g., `ChatServiceError`) use:

  ```json
  { "detail": "<user-safe error message>" }
  ```

- **Versioning**: No URL versioning (`/v1/...`) exists today. If introduced,
  it should be additive (new `/v1/*` routers mounted alongside existing
  unversioned routes) so existing integrations are not broken.

---

## 4. Authentication

### 4.1 Current State

No authentication or authorization is implemented on any endpoint. The API is
suitable for local development and trusted-network use only.

### 4.2 Future Notes

- A `JWT_SECRET_KEY` environment variable is already anticipated in
  `claude/spec/mansi-ai-spec-steps-3-8.md` (§6.13) for a future
  authentication layer.
- Endpoints that are per-user (Personalized Roadmap, Profile Generation)
  will require a user/session identifier once authentication is introduced —
  either via a bearer token (`Authorization: Bearer <jwt>`) or a
  session/user ID header or cookie.
- Until authentication exists, any "per-user" behavior described below
  (e.g., roadmap progress, generated profile) is **stateless per-request** or
  keyed by a client-supplied identifier passed in the request body.

---

## 5. Health

### 5.1 `GET /health`

**Status**: Implemented (`app/api/health.py`)

#### Purpose

Lightweight liveness/readiness probe for load balancers, uptime monitors, and
deployment health checks. Performs no downstream calls (no LLM, no database).

#### Request Schema

No request body. No query parameters.

#### Response Schema

`200 OK`

```json
{ "status": "ok" }
```

| Field | Type | Description |
|---|---|---|
| `status` | string | Always `"ok"` when the process is running and able to respond. |

#### Error Responses

None expected under normal operation. A non-`200` response (or no response)
indicates the process is down or unreachable — handled by infrastructure
(load balancer / orchestrator), not by application-level error handling.

#### Authentication Requirements

None.

#### Future Notes

- May be extended to report downstream dependency health (e.g., LLM provider
  reachability, vector database connectivity) as `{"status": "ok", "checks": {...}}`,
  but any such change must remain backward compatible (`status` field always
  present with the same meaning) since infrastructure tooling may only check
  that field.

---

## 6. Chat

### 6.1 `POST /chat`

**Status**: Implemented (`app/api/chat.py`)

#### Purpose

Send a single user message to the Mansi AI chatbot and receive a generated
reply. Internally delegates to `ChatService.handle_message`, the same
orchestration contract used by the terminal chatbot (`main.py`).

#### Request Schema

```json
{
  "message": "Hello Mansi"
}
```

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `message` | string | Yes | `min_length=1` | The user's chat message. |

#### Response Schema

`200 OK`

```json
{
  "response": "Hi! I'm Mansi. How can I help you today?"
}
```

| Field | Type | Description |
|---|---|---|
| `response` | string | The assistant's reply text. |

#### Error Responses

| Condition | Status | Body |
|---|---|---|
| `message` field missing or empty string | `422 Unprocessable Entity` | Pydantic validation error (see §3) |
| `message` is whitespace-only | `400 Bad Request` | `{"detail": "Message cannot be empty."}` |
| LLM provider failure (`ChatServiceError`) | `400 Bad Request` | `{"detail": "<user-safe message>"}` |

#### Authentication Requirements

None currently. Once authentication exists, this endpoint will need a
user/session identifier so conversation memory (`MemoryService`) can be
scoped per user instead of the current single shared, process-wide session
(see `claude/spec/mansi-ai-spec-fastapi-integration.md` §8).

#### Future Notes

- Per-session memory (one `MemoryService` per authenticated user/session).
- Streaming responses (Server-Sent Events / WebSocket) for token-by-token
  output.
- Optional RAG context injection (retrieved course/blog/FAQ snippets) before
  the message reaches `PromptBuilder` — see `docs/specs/rag-architecture.md`.

---

## 7. Personalized Roadmap

**Status**: Planned — not implemented.

The Personalized Roadmap feature guides a user through staged
questionnaires ("Q1" and "Q2"). Each stage has a "fetch questions" endpoint
and a "submit answers" endpoint. Submitting answers is expected to update the
user's roadmap/profile state and return either the next stage or a
roadmap result.

No question content, scoring logic, or medical/screening content is defined
by this document — see `docs/planning/Q1_Questions.md` and
`docs/planning/Q2_Questions.md` for placeholders to be filled in separately.

### 7.1 `GET /roadmap/q1`

#### Purpose

Retrieve the set of "Q1" stage questions for the personalized roadmap flow.

#### Request Schema

No request body. Optional future query parameter: `user_id` (or derived from
auth context once authentication exists).

#### Response Schema (proposed)

```json
{
  "stage": "q1",
  "questions": [
    {
      "id": "string",
      "text": "string",
      "type": "single_choice | multiple_choice | text | scale",
      "options": ["string", "..."]
    }
  ]
}
```

#### Error Responses (proposed)

| Condition | Status | Body |
|---|---|---|
| User has already completed Q1 (if state is tracked) | `409 Conflict` | `{"detail": "Q1 already completed."}` |
| Unknown/invalid user identifier | `404 Not Found` | `{"detail": "User not found."}` |

#### Authentication Requirements

Requires a user/session identifier once authentication exists. Without
authentication, question content may be returned statically (same for all
callers).

#### Future Notes

- Question content sourced from `data/screening_guides/` and/or
  `docs/planning/Q1_Questions.md` once populated.
- Localization (multiple languages) for question text.

---

### 7.2 `POST /roadmap/q1/submit`

#### Purpose

Submit the user's answers to the Q1 questionnaire and advance the roadmap
state.

#### Request Schema (proposed)

```json
{
  "user_id": "string",
  "answers": [
    { "question_id": "string", "value": "string | number | array" }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `user_id` | string | Yes (once auth exists; optional placeholder otherwise) | Identifies the user/session whose roadmap is updated. |
| `answers` | array of objects | Yes | Each entry maps a `question_id` from `GET /roadmap/q1` to the user's response. |

#### Response Schema (proposed)

```json
{
  "stage": "q1",
  "status": "completed",
  "next_stage": "q2"
}
```

#### Error Responses (proposed)

| Condition | Status | Body |
|---|---|---|
| Missing/empty `answers` | `422 Unprocessable Entity` | Pydantic validation error |
| `question_id` not recognized | `400 Bad Request` | `{"detail": "Unknown question_id: <id>"}` |
| Unknown/invalid user identifier | `404 Not Found` | `{"detail": "User not found."}` |

#### Authentication Requirements

Same as §7.1 — requires user/session identification once authentication
exists.

#### Future Notes

- Scoring/branching logic (which `next_stage` is returned) is intentionally
  undefined here — see `docs/planning/Q1_Questions.md` (`Scoring Rules`
  section, TODO).
- Answers will need persistence (database), tying into the future
  `DATABASE_URL` configuration anticipated in the Phase 1 spec.

---

### 7.3 `GET /roadmap/q2`

#### Purpose

Retrieve the set of "Q2" stage questions for the personalized roadmap flow.
Mirrors §7.1 for the second stage.

#### Request Schema

Same shape as §7.1 (no body; optional `user_id`).

#### Response Schema (proposed)

Same shape as §7.1, with `"stage": "q2"`.

#### Error Responses (proposed)

| Condition | Status | Body |
|---|---|---|
| Q1 not yet completed (if Q2 depends on Q1) | `409 Conflict` | `{"detail": "Complete Q1 before starting Q2."}` |
| Unknown/invalid user identifier | `404 Not Found` | `{"detail": "User not found."}` |

#### Authentication Requirements

Same as §7.1.

#### Future Notes

- Question content sourced from `docs/planning/Q2_Questions.md` once
  populated.
- Q2 questions may be conditionally selected based on Q1 answers
  (personalization) — branching logic not defined here.

---

### 7.4 `POST /roadmap/q2/submit`

#### Purpose

Submit the user's answers to the Q2 questionnaire and finalize the
personalized roadmap.

#### Request Schema (proposed)

Same shape as §7.2, with answers referencing Q2 question IDs.

#### Response Schema (proposed)

```json
{
  "stage": "q2",
  "status": "completed",
  "roadmap": {
    "summary": "string",
    "recommended_next_steps": ["string", "..."]
  }
}
```

#### Error Responses (proposed)

Same categories as §7.2.

#### Authentication Requirements

Same as §7.1.

#### Future Notes

- The shape of `roadmap` (summary, steps, recommended courses/practitioners)
  is intentionally high-level — detailed content depends on
  `docs/planning/Q2_Questions.md` and the RAG/course datasets
  (`docs/specs/rag-architecture.md`, `docs/specs/dataset-structure.md`).
- May trigger `POST /courses/recommend` and/or `POST /profile/generate`
  internally once those are implemented.

---

## 8. Suggest Courses

### 8.1 `POST /courses/recommend`

**Status**: Planned — not implemented.

#### Purpose

Return a list of recommended courses based on user input (free-text query,
roadmap results, and/or stated interests/goals).

#### Request Schema (proposed)

```json
{
  "query": "string",
  "user_id": "string",
  "filters": {
    "level": "beginner | intermediate | advanced",
    "topics": ["string", "..."]
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `query` | string | No | Free-text description of what the user is looking for. |
| `user_id` | string | No (becomes required once auth exists) | Used to personalize recommendations from roadmap/profile data. |
| `filters` | object | No | Optional structured filters. |

At least one of `query`, `user_id`, or `filters` should be provided.

#### Response Schema (proposed)

```json
{
  "recommendations": [
    {
      "course_id": "string",
      "title": "string",
      "description": "string",
      "url": "string",
      "score": 0.0
    }
  ]
}
```

#### Error Responses (proposed)

| Condition | Status | Body |
|---|---|---|
| No usable input (`query`, `user_id`, and `filters` all absent) | `422 Unprocessable Entity` | `{"detail": "At least one of query, user_id, or filters is required."}` |
| Course dataset unavailable | `503 Service Unavailable` | `{"detail": "Course recommendations are temporarily unavailable."}` |

#### Authentication Requirements

None required for anonymous `query`/`filters`-based recommendations.
`user_id`-based personalization requires authentication once available.

#### Future Notes

- Backed by the RAG pipeline over the `courses` dataset
  (`docs/specs/rag-architecture.md`, `docs/specs/dataset-structure.md`).
- `score` semantics (similarity score vs. ranking score) to be defined when
  the retrieval implementation is specified.

---

## 9. Research & Blogs

### 9.1 `POST /research/search`

**Status**: Planned — not implemented.

#### Purpose

Search the `blogs` (and potentially `research`/`practitioners`-adjacent)
datasets for content relevant to a free-text query, optionally summarized or
contextualized by the LLM.

#### Request Schema (proposed)

```json
{
  "query": "string",
  "limit": 10
}
```

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `query` | string | Yes | `min_length=1` | Free-text search query. |
| `limit` | integer | No | `1–50`, default `10` | Maximum number of results to return. |

#### Response Schema (proposed)

```json
{
  "results": [
    {
      "id": "string",
      "title": "string",
      "summary": "string",
      "url": "string",
      "score": 0.0
    }
  ]
}
```

#### Error Responses (proposed)

| Condition | Status | Body |
|---|---|---|
| `query` missing or empty | `422 Unprocessable Entity` | Pydantic validation error |
| `limit` out of range | `422 Unprocessable Entity` | Pydantic validation error |
| Search backend unavailable | `503 Service Unavailable` | `{"detail": "Research search is temporarily unavailable."}` |

#### Authentication Requirements

None anticipated — research/blog content is expected to be public.

#### Future Notes

- Backed by the RAG pipeline over the `blogs` dataset (and potentially
  `faqs`/`policies`), using similarity search over embeddings
  (`docs/specs/rag-architecture.md`).
- May optionally return an LLM-generated synthesis/summary across results in
  addition to raw `results` — to be defined alongside the RAG
  implementation.

---

## 10. Profile

### 10.1 `POST /profile/generate`

**Status**: Planned — not implemented.

#### Purpose

Generate or update a user profile summary (e.g., goals, roadmap progress,
recommended next steps) based on roadmap answers and conversation history.

#### Request Schema (proposed)

```json
{
  "user_id": "string"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `user_id` | string | Yes | Identifies the user whose profile is generated/updated. Becomes implicit (derived from auth context) once authentication exists. |

#### Response Schema (proposed)

```json
{
  "user_id": "string",
  "profile": {
    "summary": "string",
    "goals": ["string", "..."],
    "roadmap_status": "string",
    "generated_at": "2026-06-15T00:00:00Z"
  }
}
```

#### Error Responses (proposed)

| Condition | Status | Body |
|---|---|---|
| `user_id` missing | `422 Unprocessable Entity` | Pydantic validation error |
| Unknown user | `404 Not Found` | `{"detail": "User not found."}` |
| Insufficient data to generate a profile (e.g., roadmap not completed) | `409 Conflict` | `{"detail": "Roadmap must be completed before generating a profile."}` |

#### Authentication Requirements

Requires user/session identification once authentication exists. Until then,
`user_id` must be supplied explicitly by the caller and treated as
untrusted input (validated against known users before use).

#### Future Notes

- Likely composes data from `POST /roadmap/q1/submit`,
  `POST /roadmap/q2/submit`, and conversation history (`MemoryService`) —
  exact composition to be defined when this endpoint is specified for
  implementation.
- Profile data persistence requires the same future database layer noted in
  §7.2.

---

## 11. Summary

This specification documents 9 endpoints: 2 implemented (`/health`, `/chat`)
and 7 planned. All planned endpoints' schemas are **proposed** and subject to
change when an implementation spec is written for them. No code changes are
implied or required by this document.
