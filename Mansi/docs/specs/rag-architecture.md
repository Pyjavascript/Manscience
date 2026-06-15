# Mansi AI — RAG Architecture Specification

| Field | Value |
|---|---|
| Document Type | Software Specification (Documentation Only) |
| Project | Mansi AI Chatbot |
| Phase | Phase 3 — Retrieval-Augmented Generation (RAG) |
| Audience | Software Engineers, Architects |
| Status | Draft — Specification only. **No embeddings, vector database, or retrieval code is implemented by this document.** |

---

## 1. Purpose of This Document

This document describes the intended architecture for adding
Retrieval-Augmented Generation (RAG) to Mansi AI: how domain content
(courses, blogs, practitioner info, FAQs, policies, screening guides) will be
indexed, retrieved, and injected into the LLM prompt to ground responses in
Mansi-specific knowledge.

This is a **specification only**. It does not implement embeddings, a vector
database, or retrieval logic, and does not modify any existing file in
`app/`. The empty placeholder package `app/rag/` (created in Phase 1) is the
intended future home for this functionality.

---

## 2. High-Level RAG Architecture

```
                         ┌──────────────────────────┐
                         │        Datasets             │
                         │  data/courses/               │
                         │  data/blogs/                  │
                         │  data/practitioners/           │
                         │  data/faqs/                     │
                         │  data/policies/                  │
                         │  data/screening_guides/            │
                         └────────────┬─────────────────────┘
                                       │  (offline / batch)
                                       ▼
                         ┌──────────────────────────┐
                         │   Ingestion & Chunking      │
                         │   (app/rag/ingestion.py —    │
                         │    future, not implemented)   │
                         └────────────┬─────────────────────┘
                                       │  chunks + metadata
                                       ▼
                         ┌──────────────────────────┐
                         │   Embedding Pipeline         │
                         │   (app/rag/embeddings.py —    │
                         │    future, not implemented)    │
                         └────────────┬─────────────────────┘
                                       │  vectors + metadata
                                       ▼
                         ┌──────────────────────────┐
                         │     Vector Database          │
                         │   (e.g., ChromaDB — future)    │
                         └────────────┬─────────────────────┘
                                       │
                                       │  (online, per request)
┌──────────┐   user_message   ┌────────▼─────────────────┐
│   User    │ ───────────────▶│   Retrieval Layer            │
└──────────┘                  │   (app/rag/retriever.py —     │
                               │    future, not implemented)    │
                               └────────────┬─────────────────┘
                                             │  top-k chunks
                                             ▼
                               ┌──────────────────────────┐
                               │     Prompt Builder           │
                               │ (app/services/prompt_builder  │
                               │  .py — existing, extended)     │
                               └────────────┬─────────────────┘
                                             │  messages[]
                                             ▼
                               ┌──────────────────────────┐
                               │       LLM Client             │
                               │ (app/llm/*.py — existing,     │
                               │  unchanged)                    │
                               └────────────┬─────────────────┘
                                             │
                                             ▼
                               ┌──────────────────────────┐
                               │   Response (grounded)        │
                               └──────────────────────────┘
```

**Key principle**: RAG is an **additive layer**. It sits between "user
message arrives" and "prompt is built." `ChatService`, `PromptBuilder`,
`MemoryService`, and the LLM clients are not modified in shape — only
`PromptBuilder.build_messages` gains an optional `context` parameter (already
anticipated in `claude/spec/mansi-ai-spec-steps-3-8.md` §10.4/§10.6), and
`ChatService.handle_message` gains an optional retrieval step before calling
`build_messages` (already anticipated in §12.16).

---

## 3. Datasets Overview

RAG draws on six logical datasets, each covering a distinct knowledge domain.
Detailed folder layout, file formats, and metadata fields for each are
specified in `docs/specs/dataset-structure.md`. This document focuses on
**how each dataset participates in the RAG pipeline**.

| Dataset | Content | Primary Consumers |
|---|---|---|
| `courses` | Course catalog: titles, descriptions, topics, levels, URLs | `POST /courses/recommend`, roadmap recommendations |
| `blogs` | Articles/blog posts: titles, body content, tags | `POST /research/search`, general chat grounding |
| `practitioners` | Practitioner directory: specialties, bios, contact/booking info | Roadmap follow-up, profile recommendations |
| `faqs` | Frequently asked questions and answers | General chat grounding, reducing repeated LLM-only answers |
| `policies` | Organizational/legal/operational policy documents | General chat grounding for policy questions, compliance-sensitive answers |
| `screening_guides` | Reference material informing roadmap questionnaires (Q1/Q2) | Roadmap question generation/validation (not chat-facing directly) |

Each dataset is chunked, embedded, and stored with metadata identifying its
source dataset (`source: "courses" | "blogs" | ...`), so retrieval can be
filtered by dataset when appropriate (e.g., `/courses/recommend` only
searches the `courses` collection; `/chat` may search across all
chat-facing datasets).

---

## 4. Chunking Strategy

### 4.1 Goals

- Produce chunks small enough to fit comfortably alongside the system prompt,
  conversation history, and user message within the model's context window
  and `settings.max_tokens_response` budget.
- Preserve enough surrounding context that a chunk is meaningful in
  isolation (avoid mid-sentence or mid-list splits where possible).
- Retain traceability: every chunk keeps a reference back to its source
  document and dataset for citation and debugging.

### 4.2 Proposed Approach

| Dataset | Chunking Unit | Notes |
|---|---|---|
| `courses` | One chunk per course record (title + description + metadata) | Course records are typically short; splitting further would lose context. |
| `blogs` | Paragraph- or section-based chunks (e.g., ~300–500 tokens with overlap) | Long-form content benefits from overlap (~10–20%) to avoid losing context at boundaries. |
| `practitioners` | One chunk per practitioner profile | Profiles are short, structured records. |
| `faqs` | One chunk per Q&A pair | Keeps question and answer together as the retrievable unit. |
| `policies` | Section-based chunks (by heading) | Policy documents are typically structured with headings; chunk at section boundaries. |
| `screening_guides` | Section-based chunks (by heading/topic) | Used to inform questionnaire design, not retrieved at chat time in the initial scope. |

### 4.3 Chunk Metadata (proposed schema)

Every chunk, regardless of dataset, carries:

```json
{
  "chunk_id": "string",
  "source_dataset": "courses | blogs | practitioners | faqs | policies | screening_guides",
  "source_id": "string",
  "source_title": "string",
  "text": "string",
  "tags": ["string", "..."],
  "version": "string",
  "updated_at": "2026-06-15"
}
```

This mirrors the per-dataset metadata fields defined in
`docs/specs/dataset-structure.md`, so ingestion does not need to invent new
fields — it propagates existing dataset metadata onto each chunk.

---

## 5. Embedding Pipeline

### 5.1 Goals

- Convert each chunk's `text` into a fixed-size vector representation
  suitable for similarity search.
- Keep the embedding model decoupled from the LLM provider used for chat —
  the embedding model choice should not constrain or be constrained by
  `app/llm/*` provider selection.

### 5.2 Proposed Flow (offline/batch)

```
1. Load dataset files from data/<dataset>/ (per docs/specs/dataset-structure.md)
2. For each source document:
     a. Parse content + metadata
     b. Chunk per §4
     c. For each chunk:
          - Compute embedding vector via an embedding model/provider
          - Attach chunk metadata (§4.3)
3. Upsert (chunk_id, vector, metadata, text) into the vector database
```

### 5.3 Provider Considerations (future decision, not made here)

- An embedding provider must be selected (e.g., OpenAI embeddings API,
  a local sentence-transformers model, or another provider). This decision
  is **out of scope** for this document and should be made in a dedicated
  implementation spec, considering:
  - Cost per embedding call vs. self-hosted compute.
  - Consistency: re-embedding all datasets is required if the embedding
    model ever changes (embeddings from different models are not
    comparable).
  - Latency for query-time embedding (the user's query must also be
    embedded using the *same* model as the stored chunks).

### 5.4 Re-indexing

- Re-indexing (re-chunking + re-embedding) is required whenever:
  - Source dataset content changes (see versioning in
    `docs/specs/dataset-structure.md`).
  - The chunking strategy changes.
  - The embedding model changes.
- Re-indexing should be idempotent (upsert by `chunk_id`, derived
  deterministically from `source_dataset` + `source_id` + chunk index) so
  re-running ingestion does not create duplicate vectors.

---

## 6. Vector Database Concept

### 6.1 Role

The vector database stores chunk vectors plus their metadata and text, and
supports similarity search: given a query vector, return the `k` most
similar stored vectors along with their metadata/text.

### 6.2 Proposed Logical Schema

A single logical collection (or one collection per dataset, TBD at
implementation time) with records shaped as:

| Field | Type | Description |
|---|---|---|
| `chunk_id` | string | Unique identifier, stable across re-indexing. |
| `vector` | float array | Embedding produced by the embedding pipeline (§5). |
| `text` | string | The chunk's source text (returned to the LLM as context). |
| `source_dataset` | string | One of the six datasets (§3) — used for filtering. |
| `source_id` | string | Identifier of the originating document/record. |
| `metadata` | object | Remaining fields from §4.3 (tags, version, updated_at, etc.). |

### 6.3 Candidate Technology

- `chromadb` is already listed as a future dependency in
  `claude/spec/mansi-ai-spec-steps-3-8.md` (§7.11). It is a reasonable
  default for a single-instance/local-first deployment given the project's
  current scale.
- Alternatives (Pinecone, pgvector, Weaviate) may be considered if/when
  multi-instance deployment, managed hosting, or existing Postgres
  infrastructure (`DATABASE_URL`, also anticipated in §6.13) make them more
  appropriate. This decision is deferred to an implementation-time spec.

### 6.4 Collection Partitioning

- Partitioning by `source_dataset` (either via separate collections or a
  metadata filter on a single collection) allows:
  - `POST /courses/recommend` to search only the `courses` partition.
  - `POST /research/search` to search `blogs` (and optionally `faqs`).
  - `POST /chat` to search across all chat-facing partitions
    (`courses`, `blogs`, `faqs`, `policies`) but not `screening_guides`,
    which informs roadmap question design rather than chat answers.

---

## 7. Retrieval Flow

### 7.1 Online Retrieval Sequence

```
User message
     │
     ▼
[1] Embed query
     - Compute a vector for the user's message (or a reformulated query)
       using the same embedding model as ingestion (§5.3).
     │
     ▼
[2] Similarity search (§8)
     - Query the vector database for top-k chunks, optionally filtered by
       source_dataset (§6.4) and/or metadata (tags, recency).
     │
     ▼
[3] Post-filter / re-rank (optional)
     - Drop chunks below a similarity threshold.
     - De-duplicate near-identical chunks from the same source document.
     │
     ▼
[4] Inject into prompt
     - Pass retrieved chunk texts to
       PromptBuilder.build_messages(..., context=[chunk_text, ...])
       (parameter already anticipated in the Phase 1 spec, §10.4).
     │
     ▼
[5] LLM call (unchanged) — app/llm/*.py
```

### 7.2 Where This Plugs Into `ChatService`

Per `claude/spec/mansi-ai-spec-steps-3-8.md` §12.16 ("RAG integration"):

```
ChatService.handle_message(user_message):
    history = memory.get_history()
    context = rag_retriever.retrieve(user_message)   # NEW — future step
    messages = prompt_builder.build_messages(user_message, history, context=context)
    llm_response = llm_client.generate_response(messages)
    ...
```

This insertion point requires no change to `MemoryService`, the LLM clients,
or the overall `handle_message` contract (`str -> str`,
`ChatServiceError` on failure) — only an additional, optional collaborator
(`rag_retriever`) injected into `ChatService`, consistent with its existing
constructor-injection pattern (§12.4).

### 7.3 Failure Handling

- If retrieval fails (vector DB unavailable, embedding call fails), the
  chat flow should **degrade gracefully**: proceed with `context=None`
  (i.e., behave as Phase 1/2 do today) rather than failing the entire
  request. This preserves the existing reliability characteristics of
  `ChatService` for users even when RAG is unavailable.

---

## 8. Similarity Search

### 8.1 Metric

Cosine similarity (or equivalent distance metric, e.g., normalized dot
product) is the standard choice for most embedding models and vector
databases, and is assumed as the default unless the chosen embedding model's
documentation recommends otherwise.

### 8.2 `top_k` and Thresholds

- `top_k`: number of chunks retrieved per query. A small value (e.g., 3–5)
  balances grounding quality against prompt size/cost.
- Similarity threshold: chunks below a minimum similarity score should be
  excluded rather than padding the prompt with irrelevant context — exact
  threshold value is an implementation/tuning detail, not fixed here.

### 8.3 Filtering by Metadata

Similarity search may be combined with metadata filters (§6.4), e.g.:
- `source_dataset = "courses"` for course recommendations.
- `tags` overlap with user-stated interests.
- `updated_at` recency preference for time-sensitive content (e.g.,
  `policies`).

---

## 9. LLM Integration

### 9.1 Prompt Construction with Retrieved Context

Per `claude/spec/mansi-ai-spec-steps-3-8.md` §10.6, retrieved context is
appended to the **system prompt**, clearly delimited, e.g.:

```
<system prompt>

Relevant context:
- <chunk 1 text>
- <chunk 2 text>
- <chunk 3 text>
```

The user's message remains in the `user` role, unmodified — retrieved
content is never concatenated into or treated as user input, preserving the
prompt-injection mitigations already specified in §10.8.

### 9.2 Instructing the Model on Retrieved Content

The system prompt addition should instruct the model to:
- Treat the "Relevant context" section as **reference information**, not as
  instructions to follow.
- Prefer grounded answers from the provided context when relevant, but
  acknowledge when the context does not answer the question rather than
  fabricating an answer.
- Avoid treating retrieved content (which may originate from blogs or
  external-ish sources) as a source of behavioral instructions — mitigating
  indirect prompt injection from untrusted retrieved documents (§10.8).

### 9.3 Provider Independence

Because retrieved context is injected via `PromptBuilder` (provider-agnostic)
rather than via provider-specific APIs, RAG works identically regardless of
which `LLMClient` implementation (`OpenAIClient`, future `ClaudeClient`,
etc.) is active — consistent with the provider abstraction goals in §9.13.

---

## 10. Future Scalability

| Concern | Approach |
|---|---|
| Dataset growth (more courses/blogs over time) | Incremental re-indexing (upsert by `chunk_id`, §5.4) avoids full re-embedding on every update. |
| Multi-user / multi-tenant content | If different organizations have different course/policy catalogs, partition collections by tenant in addition to dataset (§6.4). |
| Latency | Cache frequent queries' retrieval results; consider async embedding/retrieval calls (the Phase 1 spec already anticipates async support for the LLM layer, §12.16). |
| Embedding model upgrades | Track embedding model version in chunk metadata; support running two collections (old/new model) during migration, then cut over. |
| Evaluation | Before relying on RAG for user-facing answers, establish a small evaluation set (representative queries + expected/acceptable retrieved chunks) to catch retrieval regressions when chunking/embedding/thresholds change. |
| Observability | Log (at `DEBUG`, consistent with existing logging conventions in §9.10/§10.10/§12.11) retrieval query, `top_k` results' `chunk_id`s and scores — never full user message content at `INFO`+, consistent with existing privacy conventions. |

---

## 11. Explicitly Out of Scope (per this document)

- No embedding model is selected.
- No vector database is provisioned or configured.
- No `app/rag/*` modules are implemented — `app/rag/__init__.py` remains the
  empty placeholder it is today.
- No changes to `PromptBuilder`, `ChatService`, `MemoryService`, or any
  `app/llm/*` file are made by this document.
- No dataset content is created — see `docs/specs/dataset-structure.md` and
  `docs/planning/` for dataset planning placeholders.

---

*End of Specification — implementation not yet performed.*
