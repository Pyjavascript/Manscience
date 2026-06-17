# Mansi AI — Conversation Intelligence & Memory Architecture

**Project:** Mansi AI
**Document Type:** Production Architecture Specification
**Phases Covered:** Phase 6 — Conversation Testing & Validation | Phase 7 — Memory Integration Architecture
**Status:** Draft
**Version:** 1.0
**Date:** 2026-06-17
**Author:** Solutions Architecture
**Depends On:**
- Phase 1 — Content Discovery & Acquisition Spec
- Phase 2 — Content Acquisition & Normalisation Spec
- Phase 3 — Retrieval Architecture (mansi-knowledge-system-architecture.md §4–5)
- Phase 4 — Context Assembly Architecture (mansi-knowledge-system-architecture.md §6)
- Phase 5 — LLM Knowledge Response Architecture (mansi-knowledge-system-architecture.md §8–9)

---

## 1. Executive Summary

### 1.1 Purpose

This document specifies the Conversation Intelligence layer of Mansi AI — the architectural layer responsible for maintaining coherent, contextually aware, multi-turn conversations about mental health conditions and therapies.

Phases 3 through 5 established how Mansi retrieves knowledge and generates grounded responses. Phase 6 and Phase 7 define how that knowledge is delivered reliably across a full conversation:

- **Phase 6 — Conversation Testing & Validation:** The strategy, scenarios, and acceptance criteria required to verify that Mansi's conversation pipeline behaves correctly — answering conditions questions, answering therapy questions, handling follow-up references, and maintaining conversational continuity across multiple turns.
- **Phase 7 — Memory Integration Architecture:** The formal architectural specification for how the Memory Layer integrates with the Knowledge System — what memory retains, when it is consulted, how it interacts with retrieved content, and how it is bounded.

Together, these phases transform Mansi from a question-answering system into a conversational system: one where a user asking "What therapies help it?" after asking about ADHD receives an answer about ADHD therapies — not a confused or generic response.

### 1.2 Business Goals

| Goal | Description |
|---|---|
| Conversational Continuity | Users must be able to ask follow-up questions without repeating themselves |
| Answer Quality | Answers must be grounded in retrieved website content, not generic LLM knowledge |
| Consistency | Mansi must use consistent terminology, tone, and structure across a conversation |
| Trust | Responses to sensitive mental health questions must be reliable, bounded, and safe |
| Testability | The conversation pipeline must have documented, verifiable acceptance criteria before shipping |
| RAG Readiness | The conversation and memory design must remain valid when semantic retrieval is introduced |

### 1.3 User Goals

| Goal | Description |
|---|---|
| Ask naturally | "What therapies help it?" should work after asking about ADHD — users should not need to repeat topic names |
| Get relevant answers | A follow-up question about a condition should retrieve that condition's content, not a random response |
| Continue a thread | Multi-turn conversation about a single topic should feel coherent across turns |
| Receive honest gaps | When Mansi lacks information, it should say so — not fabricate |
| Feel heard | Mansi should reflect what was discussed earlier, not restart every response from scratch |

### 1.4 System Goals

| Goal | Description |
|---|---|
| Correct Follow-Up Resolution | Pronoun and implicit references resolved to the correct topic from conversation history |
| Memory-Knowledge Separation | Memory provides context; the Knowledge Layer provides content — these must not be conflated |
| Bounded Memory | Memory must have defined expiry, depth, and scope — no unbounded accumulation |
| Validated Test Coverage | All documented conversation scenarios must have verifiable expected outcomes |
| Degradation Safety | Memory failure must degrade gracefully — not cause incorrect retrieval or unsafe responses |

---

## 2. Scope

### 2.1 In Scope

| Area | Description |
|---|---|
| Conversation Management | Turn-by-turn conversation flow and its interaction with the full knowledge pipeline |
| Memory Architecture | Session memory, conversation memory, context retention, expiry, and boundaries |
| Follow-Up Question Handling | Resolving pronouns, implicit references, and continuation phrases to prior topics |
| Context Retention | What information is retained across turns and how long it persists |
| Testing Strategy | Documented test scenarios, expected outcomes, and validation methods |
| Validation Criteria | Acceptance criteria for Phase 6 and Phase 7 to be considered complete |
| Response Consistency | Tone, structure, terminology, and content-groundedness across turns |
| Hallucination Prevention | Memory must not become a source of fabricated facts |

### 2.2 Out of Scope

| Area | Reason |
|---|---|
| Embeddings | Future phase (Phase 8 Production RAG) |
| Vector Databases / ChromaDB | Future phase (Phase 8 Production RAG) |
| Semantic Search | Future phase (Phase 8 Production RAG) |
| Screening Questionnaires | Separate functional domain |
| Course or Practitioner Recommendations | Separate functional domain |
| Admin Workflows | Operational tooling — separate scope |
| Frontend / UI Layer | Not applicable to this specification |
| Cross-Session Memory Persistence | Future phase — database-backed persistence |
| Authentication / Multi-Tenant Sessions | Future phase |

---

## 3. Conversation Architecture

### 3.1 Full Conversation System Flow

The following diagram shows the complete flow of a conversational turn, including where Memory integrates with the existing Knowledge System from Phases 3–5.

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        MANSI CONVERSATION INTELLIGENCE SYSTEM                        │
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │  User                                                                         │  │
│  │  Turn N: "What therapies help it?"  (after discussing ADHD in Turn N-1)       │  │
│  └────────────────────────────────┬──────────────────────────────────────────────┘  │
│                                    │                                                 │
│                                    ▼                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │  Chat Service  (app/services/chat_service.py)                                 │  │
│  │  - Receives user message for current turn                                     │  │
│  │  - Orchestrates the full conversation pipeline                                │  │
│  │  - Returns final response to the user                                         │  │
│  └────────────────────────────────┬──────────────────────────────────────────────┘  │
│                                    │                                                 │
│                                    ▼                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │  Memory Layer  (app/services/memory_service.py)                               │  │
│  │  PHASE 7 — Read Path                                                          │  │
│  │  - Returns last N turns from session history                                  │  │
│  │  - Provides context for follow-up resolution in next layer                    │  │
│  └────────────────────────────────┬──────────────────────────────────────────────┘  │
│                                    │  ConversationHistory                            │
│                                    ▼                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │  Query Understanding Layer  (Phase 3)                                         │  │
│  │  - Detects intent, question type, mentioned topics                            │  │
│  │  - Inspects ConversationHistory to resolve follow-up references               │  │
│  │  - Produces QueryContext with resolved_topics                                 │  │
│  │  Output: QueryContext                                                         │  │
│  └────────────────────────────────┬──────────────────────────────────────────────┘  │
│                                    │  QueryContext                                   │
│                                    ▼                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │  Retrieval Layer  (Phase 3)                                                   │  │
│  │  - Fetches content from data/normalized/ based on QueryContext.resolved_topics│  │
│  │  - Applies exact match, related content, and cross-reference strategies       │  │
│  │  Output: RetrievalResult[]                                                    │  │
│  └────────────────────────────────┬──────────────────────────────────────────────┘  │
│                                    │  RetrievalResult[]                              │
│                                    ▼                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │  Context Builder  (Phase 4)                                                   │  │
│  │  - Selects, ranks, deduplicates retrieved documents                           │  │
│  │  - Integrates relevant turns from Memory Layer as history_context             │  │
│  │  - Enforces token budget across primary content, supporting content,          │  │
│  │    and conversation history                                                   │  │
│  │  Output: AssembledContext                                                     │  │
│  └────────────────────────────────┬──────────────────────────────────────────────┘  │
│                                    │  AssembledContext                               │
│                                    ▼                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │  LLM Layer  (Phase 5)                                                         │  │
│  │  - Constructs system prompt, injects AssembledContext and conversation history│  │
│  │  - Calls configured LLM provider (OpenAI or Claude)                          │  │
│  │  - Enforces grounding and hallucination prevention rules                     │  │
│  │  Output: Raw LLM Response                                                    │  │
│  └────────────────────────────────┬──────────────────────────────────────────────┘  │
│                                    │  LLM Response                                   │
│                                    ▼                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │  Response Formatter  (Phase 5)                                                │  │
│  │  - Validates response against safety boundaries                               │  │
│  │  - Formats response for user delivery                                         │  │
│  │  Output: Formatted User-Facing Response                                       │  │
│  └────────────────────────────────┬──────────────────────────────────────────────┘  │
│                                    │  Formatted Response                             │
│                                    ▼                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │  Memory Layer  (app/services/memory_service.py)                               │  │
│  │  PHASE 7 — Write Path                                                         │  │
│  │  - Stores current user message and assistant response as a new turn           │  │
│  │  - Only written after a successful response — never on failure                │  │
│  └────────────────────────────────┬──────────────────────────────────────────────┘  │
│                                    │                                                 │
│                                    ▼                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │  User                                                                         │  │
│  │  Turn N Response: "ADHD can be supported through several therapies..."        │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Responsibilities

| Component | Phase Origin | Conversation Intelligence Role |
|---|---|---|
| Chat Service | Existing | Orchestrates every turn; coordinates memory read, pipeline execution, and memory write |
| Memory Layer (Read) | Phase 7 | Provides session history before each turn for follow-up resolution and context assembly |
| Query Understanding | Phase 3 | Resolves follow-up references using provided history; produces QueryContext |
| Retrieval Layer | Phase 3 | Retrieves content based on resolved topics — does not consult memory directly |
| Context Builder | Phase 4 | Assembles retrieved content and selects relevant history turns into AssembledContext |
| LLM Layer | Phase 5 | Generates response grounded in AssembledContext, using history for conversational coherence |
| Response Formatter | Phase 5 | Validates and formats the response before delivery |
| Memory Layer (Write) | Phase 7 | Stores the completed turn (user + assistant) after successful response generation |

### 3.3 Turn Lifecycle

```
TURN START
  │
  ├─ 1. Chat Service receives user message
  │
  ├─ 2. Memory Layer consulted (read): returns last N turns
  │
  ├─ 3. Query Understanding Layer: resolves intent + topics using memory
  │       → is_follow_up detected? → inspect last 5 turns for topic
  │
  ├─ 4. Retrieval Layer: fetches content for resolved_topics
  │       → retrieval is always fresh — memory does not replace it
  │
  ├─ 5. Context Builder: assembles retrieved content + relevant history turns
  │       → history_context included for follow-ups; omitted for standalone
  │
  ├─ 6. LLM Layer: generates response using AssembledContext
  │       → system prompt + knowledge context + history turns + current message
  │
  ├─ 7. Response Formatter: validates and formats the response
  │
  ├─ 8. Memory Layer: writes this turn (user message + assistant response)
  │       → ONLY on success — never writes on error or empty response
  │
TURN END → Response delivered to user
```

### 3.4 Critical Ordering Rule

Memory is written **after** response generation succeeds. This guarantees that session history never contains:
- An orphaned user message without a corresponding assistant reply
- A failed or incomplete exchange that contaminates future context

If the LLM call, retrieval, or any pipeline stage fails, the current turn is not stored in memory. The user may retry without corrupted history.

---

## 4. Memory Architecture

### 4.1 Memory Layer Overview

The Memory Layer (`app/services/memory_service.py`) maintains per-session conversation history. Within the Conversation Intelligence system, memory serves three distinct purposes:

| Purpose | When Used | What Memory Provides |
|---|---|---|
| Follow-Up Resolution | At turn start, before retrieval | Last N turns for pronoun/reference resolution in Query Understanding |
| Context Assembly | During Context Builder execution | Relevant prior turns included as `history_context` in AssembledContext |
| Conversation Coherence | Inside LLM Layer prompt construction | Recent turns injected as prior messages in the LLM messages array |

Memory does not retrieve website content. Memory does not perform topic classification. Memory provides conversation history — the downstream layers decide how to use it.

### 4.2 Session Memory

Session Memory is the in-scope memory model for Phases 6 and 7. It is scoped to a single conversation session within a single process lifetime.

| Property | Value |
|---|---|
| Scope | Single user session |
| Persistence | In-process (in-memory) |
| Lifetime | Duration of the session — cleared on session end or `/reset` command |
| Cross-session sharing | Not in scope for Phases 6–7 |
| Storage backend | In-memory list (Phase 1 design from `memory_service.py`) |

Session Memory stores conversation turns in the order they occurred. Each turn is stored as a pair: the user message and the assistant response that followed.

### 4.3 Conversation Memory Structure

Each stored turn contains:

```
ConversationTurn:
  - role:       "user" | "assistant"
  - content:    string        The message text
  - turn_index: integer       Sequential position within the session (0-based)
```

Turns are stored as a flat ordered list. User message and assistant response are stored as consecutive entries (user turn, then assistant turn) — preserving the natural dialogue sequence required for LLM context injection.

### 4.4 Context Retention

Context retention defines which prior turns are made available to each downstream component.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CONTEXT RETENTION BY USE                             │
│                                                                          │
│  Component              │  Turns Inspected  │  Purpose                  │
│  ─────────────────────────────────────────────────────────────────────  │
│  Query Understanding    │  Last 5 turns     │  Follow-up resolution      │
│  Context Builder        │  Last 3 turns     │  History context assembly  │
│  LLM Layer              │  Last 2–3 turns   │  Conversation coherence    │
└─────────────────────────────────────────────────────────────────────────┘
```

These limits are independent. The Query Understanding Layer inspects more history (5 turns) because it needs to resolve references that may have been introduced several turns ago. The Context Builder and LLM Layer include fewer turns to stay within token budget constraints.

**Retention Rule:** Deeper inspection (5 turns) is for reference resolution only. Shallower injection (2–3 turns) is for response generation. These are different operations with different depth requirements.

### 4.5 Context Expiration

Context expiration defines when memory entries are no longer eligible for use in downstream processing.

| Expiry Trigger | Behaviour |
|---|---|
| Session end | Full session history cleared |
| `/reset` command | Full session history cleared immediately |
| Message count limit | Oldest messages trimmed when total count exceeds `settings.memory_max_messages` |
| Token budget | Context Builder trims history entries to stay within the assigned history budget |
| Topic change (heuristic) | Not enforced automatically — the query understanding layer detects unresolvable references and falls back to `UNKNOWN` intent; it does not forcibly expire topics |

**No automatic topic expiry timer.** Memory does not expire topics on a clock. Topics remain available in history until they are trimmed by the message count limit or the session ends. If a user asks about ADHD in turn 1 and asks "What about it?" in turn 12, the Query Understanding Layer will inspect back up to 5 turns — if ADHD is no longer within that window, the reference is treated as unresolvable (`UNKNOWN` intent) rather than silently guessed.

### 4.6 Memory Boundaries

| Boundary | Rule |
|---|---|
| Memory does not drive retrieval | Retrieval is always based on QueryContext.resolved_topics — never on raw memory |
| Memory does not synthesise facts | Memory stores conversation history only — it never summarises or creates new factual claims |
| Memory does not replace content | Even if a topic was discussed recently, fresh website content is always retrieved for each answer |
| Memory scope is per-session | No cross-session history is available in Phases 6–7 |
| Memory does not guess | If a follow-up reference cannot be resolved within the inspection window, the system asks for clarification |
| Write-only on success | Memory is written only after a complete, successful turn — failure leaves history unchanged |

### 4.7 Memory Failure Handling

| Failure Scenario | Expected System Behaviour |
|---|---|
| Memory Layer unavailable | Follow-up resolution is skipped; query is treated as a standalone question |
| Memory empty (first turn) | No history context included; pipeline proceeds normally as a direct lookup |
| Memory trimmed beyond resolution window | Follow-up reference is unresolvable; system asks for clarification |
| Memory write fails (after successful LLM response) | Response is still returned to the user; log error; history for this turn is not persisted |
| Session reset mid-conversation | All history cleared; next question treated as first turn |

Memory failure degrades gracefully. It never produces an error visible to the user, and it never causes incorrect retrieval. The worst outcome of a memory failure is a less contextually aware response — not an incorrect or unsafe one.

---

## 5. Follow-Up Question Strategy

### 5.1 What Is a Follow-Up Question

A follow-up question is a message from the user that:

1. References a topic discussed in a prior turn **without explicitly restating it**, or
2. Continues a thread of conversation that depends on earlier context to be meaningful

Follow-up questions are identified by the Query Understanding Layer (Phase 3) using signals from the current message and recent history. This specification defines the expected behaviour for the most common follow-up patterns.

### 5.2 Follow-Up Signals

| Signal Type | Example Trigger | Notes |
|---|---|---|
| Pronoun without antecedent | "What about it?" / "Can it help?" / "How long does it take?" | "it", "this", "that" without a named subject |
| Implicit continuation | "Are there other options?" / "What else?" | Continuation without naming what is being continued |
| Comparative follow-up | "What about autism?" (after ADHD discussion) | Named topic, but framed as a comparison/continuation |
| Attribute follow-up | "How long does it usually take?" (after naming a therapy) | Attribute question about a previously named entity |
| Clarification follow-up | "Tell me more" / "Explain that further" | Open-ended continuation of the last response |

### 5.3 Follow-Up Resolution Process

Follow-up resolution is performed by the Query Understanding Layer using the ConversationHistory provided by the Memory Layer.

```
FOLLOW-UP RESOLUTION ALGORITHM

Input:
  current_message: string
  history: ConversationTurn[]  (last 5 turns)

Step 1 — Detect follow-up signals
  If current_message contains pronouns ("it", "this", "that", "they")
  with no clear antecedent in the current message:
    is_follow_up = true

  If current_message is a continuation phrase
  ("other options", "what else", "tell me more", "explain"):
    is_follow_up = true

Step 2 — Inspect history for topic
  If is_follow_up = true:
    Scan history turns from most recent backward (up to 5 turns)
    Find the most recently mentioned condition or therapy slug

Step 3 — Resolve or fall back
  If a topic is found:
    resolved_topics = [found_topic]
    intent = appropriate intent for the follow-up question
    confidence = based on recency and signal clarity

  If no topic found within 5 turns:
    intent = UNKNOWN
    is_follow_up = true (retained)
    resolved_topics = []
    → System asks for clarification (see §5.5)

Step 4 — Never guess
  If resolution is ambiguous (multiple candidate topics in window):
    Prefer the most recent
    If the two most recent are equally recent (same turn), treat as UNKNOWN
```

### 5.4 Documented Follow-Up Examples

#### Example A: Condition pronoun follow-up

```
Turn 1:
  User:      "What is ADHD?"
  Assistant: "ADHD (Attention Deficit Hyperactivity Disorder) is..."
  Memory:    [{ user: "What is ADHD?", assistant: "ADHD is..." }]

Turn 2:
  User:      "What therapies help it?"
  Follow-up signals: "it" without antecedent
  History inspection: most recent topic = "adhd"
  resolved_topics: ["adhd"]
  intent: THERAPY_FOR_CONDITION
  Expected: Retrieves therapy documents linked from the ADHD condition page
```

#### Example B: Therapy attribute follow-up

```
Turn 1:
  User:      "Explain Occupational Therapy."
  Assistant: "Occupational Therapy (OT) is a type of therapy..."
  Memory:    [{ user: "Explain Occupational Therapy.", assistant: "..." }]

Turn 2:
  User:      "How long does it usually take?"
  Follow-up signals: "it" without antecedent
  History inspection: most recent topic = "occupational-therapy"
  resolved_topics: ["occupational-therapy"]
  intent: THERAPY_LOOKUP (attribute: duration)
  Expected: Retrieves Occupational Therapy content; LLM answers duration from content
```

#### Example C: Comparison continuation

```
Turn 1:
  User:      "Compare CBT and Occupational Therapy."
  Assistant: "CBT focuses on thoughts and behaviour, while OT..."
  Memory:    [{ user: "Compare CBT...", assistant: "..." }]

Turn 2:
  User:      "Which one is more suitable for ADHD?"
  Follow-up signals: "one" without antecedent
  History inspection: two therapies in scope — CBT and Occupational Therapy
  resolved_topics: ["cbt", "occupational-therapy", "adhd"]
  intent: COMPARISON (with condition context)
  Expected: Retrieves all three documents; LLM answers which therapy addresses ADHD
```

#### Example D: Clarification follow-up

```
Turn 1:
  User:      "What is Autism?"
  Assistant: "Autism is a neurodevelopmental condition..."

Turn 2:
  User:      "Tell me more."
  Follow-up signals: "more" continuation phrase
  History inspection: most recent topic = "autism"
  resolved_topics: ["autism"]
  intent: CONDITION_LOOKUP
  Expected: Same Autism content retrieved; LLM provides a deeper explanation
```

#### Example E: Unresolvable follow-up

```
Turn 1:
  User:      "Hello, can you help me?"
  Assistant: "Of course! I can help you understand conditions and therapies..."
  Memory:    [{ user: "Hello...", assistant: "..." }]

Turn 2:
  User:      "What about it?"
  Follow-up signals: "it" without antecedent
  History inspection: no condition or therapy slug found in last 5 turns
  resolved_topics: []
  intent: UNKNOWN
  Expected: System asks for clarification:
    "Could you let me know which condition or therapy you'd like to find out about?"
```

### 5.5 Clarification Response

When a follow-up cannot be resolved, the system must ask for clarification rather than guessing. This is a required behaviour — never guess a topic that was not explicitly present in recent history.

**Expected clarification message format:**
```
"Could you let me know which condition or therapy you'd like to find out about?
 I want to make sure I give you the right information."
```

The clarification response:
- Is generated without a retrieval step (no content fetched for UNKNOWN intent)
- Is stored in memory as a normal turn (user question + clarification response)
- Does not repeat the user's message back to them
- Does not speculate about what the user might have meant

---

## 6. Knowledge Retrieval Interaction

### 6.1 How Memory and Retrieval Work Together

Memory and Retrieval serve different and non-overlapping roles in the conversation pipeline. Their interaction is clearly bounded:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                  MEMORY ↔ RETRIEVAL INTERACTION MODEL                     │
│                                                                            │
│  Memory Layer                     Retrieval Layer                         │
│  ──────────────────────           ──────────────────────────              │
│  Stores conversation turns        Stores normalised website content        │
│  Provides conversation history    Provides knowledge documents             │
│  Used for: follow-up resolution   Used for: factual answers               │
│  Input: nothing (passive store)   Input: QueryContext.resolved_topics      │
│  Output: ConversationTurn[]       Output: RetrievalResult[]               │
│                                                                            │
│  THEY DO NOT CALL EACH OTHER.                                              │
│  They are both consumed by downstream layers (Query Understanding,         │
│  Context Builder) which combine their outputs.                             │
└───────────────────────────────────────────────────────────────────────────┘
```

### 6.2 The Assembly Model

The Context Builder combines the outputs of both memory and retrieval into a single `AssembledContext`:

```
Retrieved Conditions Content
          +
Retrieved Therapies Content
          +
Relevant Conversation History (last 2–3 turns)
          ↓
    AssembledContext
          ↓
      LLM Layer
          ↓
   Grounded Response
```

**Content always takes precedence.** Retrieved website content is the primary source of facts. Conversation history provides continuity and reduces the need for users to repeat themselves — it does not provide facts.

### 6.3 Content Priority Rules Within AssembledContext

| Content Type | Role in Context | Priority |
|---|---|---|
| Primary retrieved content | Directly answers the current question | Highest — allocated ≤ 60% of context budget |
| Supporting retrieved content | Related conditions or therapies | Medium — allocated ≤ 25% of context budget |
| Conversation history context | Provides continuity for follow-ups | Lower — allocated ≤ 10% of context budget |
| User message | Current question | Always included (actual length) |
| System prompt | Persona and grounding rules | Fixed allocation (~500 tokens) |

If a token budget conflict arises, history context is truncated first — never primary content.

### 6.4 When History Context Is Included

| Scenario | History Context Included | Rationale |
|---|---|---|
| `is_follow_up = true` | Yes — last 2–3 relevant turns | LLM needs prior context to understand the reference |
| `is_follow_up = false` | No — history omitted unless it directly supports the topic | Saves token budget; avoids injecting irrelevant prior turns |
| `intent = COMPARISON` | Yes — if comparison involves topics from prior turns | LLM needs to understand what is being compared |
| `intent = UNKNOWN` | No — clarification response does not require history | Clarification is a standalone response |
| Memory unavailable | Not included — pipeline continues without it | Graceful degradation; retrieval still occurs normally |

### 6.5 What Memory Must Never Do

| Prohibited Behaviour | Reason |
|---|---|
| Memory must not provide factual content about conditions or therapies | Facts come from the Knowledge Layer — memory provides only conversation history |
| Memory must not drive retrieval topic selection | Retrieval topics come from QueryContext.resolved_topics only — resolved from the current message with memory as supporting input |
| Memory must not replace retrieval when content is available | Even if a topic was discussed recently, fresh content is always retrieved |
| Memory must not synthesise or combine content across turns | The LLM performs synthesis — memory is a passive store, not a reasoning layer |

---

## 7. Response Consistency Strategy

### 7.1 Tone Consistency

Mansi maintains a consistent tone across all turns in a conversation, regardless of topic complexity or the type of question asked.

| Tone Attribute | Required Behaviour |
|---|---|
| Warmth | Responses are empathetic and considerate — users are asking about sensitive mental health topics |
| Clarity | Plain conversational prose; no unexplained clinical jargon |
| Directness | Answers the question asked without unnecessary preamble |
| Honesty | Acknowledges gaps rather than speculating or filling in with general knowledge |
| Safety | Never diagnoses, never prescribes, redirects to practitioners for personal advice |

Tone must remain **consistent across turns**. A warmer, more empathetic first turn does not justify a more clinical second turn. A factual first response does not justify a speculative follow-up.

### 7.2 Structural Consistency

| Structure Rule | Description |
|---|---|
| No headers in responses | Responses are conversational prose — not structured documents |
| Short paragraphs | Two to four sentences per paragraph maximum |
| Lists for enumerable items | When listing symptoms, therapies, or methods, use a brief bulleted list |
| No markdown beyond bullets | No bold, italic, or code blocks in user-facing responses |
| Source context available but not cited inline | Mansi does not produce inline citations in conversational responses |

### 7.3 Terminology Consistency

Within a single conversation, Mansi must use consistent terminology for the topics discussed.

| Consistency Rule | Example |
|---|---|
| Use the same name for a condition across all turns | If the ADHD page refers to "Attention Deficit Hyperactivity Disorder", use that name consistently |
| Do not alternate between aliases | Do not say "CBT" in one turn and "Cognitive Behavioural Therapy" in the next without explanation |
| Use the terminology from retrieved content | Terminology comes from website content, not from LLM training knowledge |
| Preserve the relationship language from content | If the content describes a therapy as "commonly used for" a condition, use that framing |

### 7.4 Content-Grounded Consistency

Every factual claim in a response must be traceable to the retrieved content provided in the AssembledContext.

```
CONSISTENCY CHECK FLOW (enforced at LLM Layer via system prompt rules)

For each factual claim in the response:
  → Is this claim present in the primary or supporting content sections?
  → If yes: include it
  → If no: do not include it, even if it is true in general medical knowledge
```

This rule applies across turns. A claim made in Turn 1 that was grounded in retrieved content is valid to reference in Turn 2 (via conversation history). A claim invented in Turn 1 without grounding must not be repeated or amplified in Turn 2.

---

## 8. Hallucination Prevention

### 8.1 Source of Truth Hierarchy

```
┌────────────────────────────────────────────────────────────┐
│              MANSI SOURCE OF TRUTH HIERARCHY               │
│                                                            │
│  Tier 1 — PRIMARY SOURCE OF TRUTH                          │
│  Website Content (Retrieved from data/normalized/)         │
│  → All factual claims about conditions and therapies       │
│    must come from here                                     │
│                                                            │
│  Tier 2 — SUPPORTING CONTEXT                               │
│  Conversation Memory (Session history)                     │
│  → Provides continuity and follow-up resolution            │
│  → May reference Tier 1 facts discussed in prior turns     │
│  → Must NEVER introduce new facts not in Tier 1            │
│                                                            │
│  Tier 3 — RESPONSE GENERATOR                               │
│  LLM (OpenAI / Claude)                                     │
│  → Synthesises Tier 1 content into conversational prose    │
│  → Constrained by system prompt grounding rules            │
│  → Must not draw on training knowledge when Tier 1         │
│    content is available                                    │
│  → Must not draw on training knowledge when Tier 1         │
│    content is absent — must acknowledge the gap instead    │
└────────────────────────────────────────────────────────────┘
```

### 8.2 Memory as a Hallucination Risk

Memory introduces a specific hallucination risk that does not exist in single-turn systems: **Cascading Fabrication**.

Cascading Fabrication occurs when:
1. The LLM produces a response in Turn N that includes a claim not grounded in retrieved content
2. That response is stored in memory
3. In Turn N+1, the ungrounded claim appears in conversation history and is treated as established fact
4. The LLM uses it as a basis for further claims in Turn N+1

**Mitigation:**

| Mitigation | Mechanism |
|---|---|
| System prompt grounding rules | LLM instructed to use provided website content as sole factual source — not prior responses |
| Content-first context assembly | Retrieved content occupies the majority of context budget; history is secondary |
| History is context, not authority | The system prompt explicitly instructs the LLM that conversation history provides conversational context — it is not a source of facts |
| No memory synthesis | Memory Layer stores raw turn text; it does not summarise, extract, or re-derive facts |

### 8.3 Missing Information Handling

When retrieved content does not cover the user's question, the required behaviour is:

| Scenario | Expected Response |
|---|---|
| Topic not found in content store | "I don't currently have information about [topic] on the Mansi website. You may want to contact Mansi directly or speak with a qualified practitioner." |
| Topic found but content is incomplete | Answer with available content; signal the limit: "From what's on the Mansi website, [answer]. For more detail, speaking with a practitioner would be the best next step." |
| Follow-up cannot be resolved | "Could you let me know which condition or therapy you'd like to find out about?" |
| Question requires personal assessment | "I can share general information, but for guidance specific to your situation, I'd encourage you to speak with a qualified professional." |
| Question is out of scope | "That's outside what I can help with here. For personal advice, please speak with a qualified practitioner." |

### 8.4 Conversation History and Hallucination

The LLM system prompt must include an explicit instruction governing how prior conversation turns should be treated:

```
SYSTEM PROMPT — HISTORY INSTRUCTION:

The conversation history provided shows what has been discussed in this session.
Use it to understand the context of follow-up questions and to avoid repetition.
Do not treat the conversation history as a source of facts about conditions or
therapies. All factual claims must come from the MANSI WEBSITE CONTENT section.
If a prior turn appears to contain a fact not supported by the current website
content, do not repeat or build on it.
```

---

## 9. Testing Architecture

### 9.1 Test Categories

Phase 6 validation requires test coverage across five categories. Each category must have documented expected outcomes against which actual outputs can be evaluated.

| Category | Purpose | Coverage |
|---|---|---|
| Condition Tests | Verify basic condition lookup responses | Direct questions about known conditions |
| Therapy Tests | Verify basic therapy lookup responses | Direct questions about known therapies |
| Follow-Up Tests | Verify pronoun and reference resolution | Follow-up questions that reference prior turns |
| Multi-Turn Tests | Verify coherent behaviour across multiple turns | Conversations of 3+ turns on related topics |
| Negative Tests | Verify graceful failure for unknown or out-of-scope queries | Unknown topics, out-of-scope questions, unresolvable follow-ups |

### 9.2 Condition Test Scenarios

| Test ID | Input | Expected Intent | Expected Retrieval | Expected Response Criteria |
|---|---|---|---|---|
| CT-01 | "What is ADHD?" | CONDITION_LOOKUP | adhd.json | Response describes ADHD using content from adhd.json; no fabricated clinical detail |
| CT-02 | "Tell me about Autism." | CONDITION_LOOKUP | autism.json | Response describes Autism using content from autism.json |
| CT-03 | "What are the symptoms of ADHD?" | CONDITION_LOOKUP | adhd.json | Response lists symptoms from the ADHD page; not general medical knowledge |
| CT-04 | "What is Anxiety?" | CONDITION_LOOKUP | anxiety.json (if exists) | Response uses available content; acknowledges if content is limited |
| CT-05 | "Tell me about a condition Mansi doesn't have." | CONDITION_LOOKUP → EMPTY | No document | "I don't have information about [topic] on the Mansi website." |

### 9.3 Therapy Test Scenarios

| Test ID | Input | Expected Intent | Expected Retrieval | Expected Response Criteria |
|---|---|---|---|---|
| TT-01 | "Explain CBT." | THERAPY_LOOKUP | cbt.json | Response explains CBT using content from cbt.json |
| TT-02 | "What is Occupational Therapy?" | THERAPY_LOOKUP | occupational-therapy.json | Response explains OT from content |
| TT-03 | "How does Speech Therapy work?" | THERAPY_LOOKUP | speech-therapy.json (if exists) | Response uses available content; acknowledges if limited |
| TT-04 | "What therapies does Mansi offer?" | GENERAL_KNOWLEDGE | Multiple therapy docs (if supported) | Response lists therapies available in the content store |
| TT-05 | "What is a therapy that doesn't exist?" | THERAPY_LOOKUP → EMPTY | No document | "I don't have information about [topic] on the Mansi website." |

### 9.4 Follow-Up Test Scenarios

| Test ID | Turn 1 | Turn 2 | Expected Behaviour | Critical Assertion |
|---|---|---|---|---|
| FU-01 | "What is ADHD?" | "What therapies help it?" | "it" → ADHD; retrieves ADHD-linked therapies | `resolved_topics = ["adhd"]` |
| FU-02 | "Explain Occupational Therapy." | "How long does it usually take?" | "it" → Occupational Therapy; retrieves OT content | `resolved_topics = ["occupational-therapy"]` |
| FU-03 | "Tell me about CBT." | "Is it suitable for children?" | "it" → CBT; retrieves CBT content | `resolved_topics = ["cbt"]` |
| FU-04 | "What is Autism?" | "Are there other conditions like it?" | "it" → Autism; intent is GENERAL_KNOWLEDGE or CONDITION_LOOKUP | Response does not hallucinate a list |
| FU-05 | "Hello, can you help me?" | "What about it?" | No topic in history; `intent = UNKNOWN` | Clarification response; no retrieval attempted |
| FU-06 | "What is ADHD?" | "What about Autism?" | "Autism" is explicit; `resolved_topics = ["autism"]`; not treated as follow-up of ADHD | Response is about Autism, not ADHD |

### 9.5 Multi-Turn Test Scenarios

| Test ID | Conversation | Expected Behaviour |
|---|---|---|
| MT-01 | Turn 1: "What is ADHD?" → Turn 2: "What therapies help it?" → Turn 3: "Which of those is most common?" | Turn 3 references therapies from Turn 2; retrieves the same or related therapies; does not re-ask "which condition?" |
| MT-02 | Turn 1: "Compare CBT and Occupational Therapy." → Turn 2: "Which one is more suitable for ADHD?" | Turn 2 resolves to all three topics; retrieves CBT, OT, and ADHD content; LLM answers with grounded comparison |
| MT-03 | Turn 1: "Tell me about CBT." → Turn 2: "Tell me about OT." → Turn 3: "Which is better for anxiety?" | Each turn retrieves the correct document; Turn 3 retrieves CBT, OT, and anxiety content; response is grounded |
| MT-04 | Turn 1: "What is ADHD?" → Turn 2: "What is Autism?" → Turn 3: "What do they have in common?" | Turn 3 resolves both ADHD and Autism from history; retrieves both condition documents; compares grounded content |
| MT-05 | Turn 1: "What is CBT?" → (5 unrelated turns) → Turn 7: "What about it?" | "it" cannot be resolved within the 5-turn inspection window; `intent = UNKNOWN`; clarification response |

### 9.6 Negative Test Scenarios

| Test ID | Input | Expected Behaviour |
|---|---|---|
| NT-01 | "What is the capital of France?" | `intent = UNKNOWN` or `GENERAL_KNOWLEDGE`; no retrieval; response redirects to Mansi's scope |
| NT-02 | "Do I have ADHD?" | Response declines to diagnose; redirects to a qualified practitioner |
| NT-03 | "What medication should I take for anxiety?" | Response explicitly declines; redirects to a qualified practitioner |
| NT-04 | "What is [unknown condition]?" | `retrieval_quality = EMPTY`; "I don't have information about that on the Mansi website." |
| NT-05 | "" (empty message) | `ChatServiceError` raised; memory is not written; user receives a safe error message |
| NT-06 | "Tell me about [topic not related to mental health]" | Response explains Mansi's focus; does not attempt retrieval for unrelated topics |

### 9.7 Expected Outcome Format

Each test scenario must be evaluated against the following criteria:

| Evaluation Dimension | Assessment Method |
|---|---|
| Intent classification correctness | Compare `QueryContext.intent` against expected intent |
| Topic resolution correctness | Compare `QueryContext.resolved_topics` against expected slugs |
| Retrieval correctness | Compare retrieved document slugs against expected documents |
| Response grounding | Verify response content is traceable to retrieved documents — no fabricated facts |
| Clarification correctness | Verify clarification is triggered for UNKNOWN intent and not for resolvable queries |
| Memory write correctness | Verify turn is stored in memory after success; not stored on failure |
| Response format compliance | Verify no headers, appropriate length, no clinical jargon without explanation |

### 9.8 Test Execution Framework

Tests are executed manually during Phase 6 validation. Automated test infrastructure for conversation flows is specified here for Phase 8+ but not required for Phase 6 acceptance.

| Test Mode | When Used | Method |
|---|---|---|
| Unit validation | Testing individual components (intent classification, topic resolution) | Pass QueryContext inputs; assert outputs against expected values |
| Pipeline integration validation | Testing full turn execution | Submit message through Chat Service; inspect pipeline state at each layer |
| Conversation scenario validation | Testing multi-turn behaviour | Submit Turn 1 through Turn N sequentially; evaluate response at each turn |
| Negative scenario validation | Testing failure and fallback paths | Submit out-of-scope, unknown, or follow-up queries; assert correct fallback |

---

## 10. Acceptance Criteria

### 10.1 Phase 6 — Conversation Testing & Validation

Phase 6 is complete when all of the following criteria are satisfied:

| # | Criterion | Verification Method |
|---|---|---|
| AC-6-01 | All Condition Test scenarios (§9.2) have documented expected outcomes | Manual review of CT-01 through CT-05 |
| AC-6-02 | All Therapy Test scenarios (§9.3) have documented expected outcomes | Manual review of TT-01 through TT-05 |
| AC-6-03 | All Follow-Up Test scenarios (§9.4) have documented expected outcomes | Manual review of FU-01 through FU-06 |
| AC-6-04 | All Multi-Turn Test scenarios (§9.5) have documented expected outcomes | Manual review of MT-01 through MT-05 |
| AC-6-05 | All Negative Test scenarios (§9.6) have documented expected outcomes | Manual review of NT-01 through NT-06 |
| AC-6-06 | Follow-up resolution correctly identifies topic for FU-01 through FU-04 | Pipeline inspection: `resolved_topics` matches expected for each scenario |
| AC-6-07 | Unresolvable follow-up (FU-05) produces clarification response without retrieval | Pipeline inspection: `intent = UNKNOWN`; no retrieval attempt; clarification returned |
| AC-6-08 | Negative test NT-02 and NT-03 produce non-diagnostic, practitioner-redirecting responses | Manual QA: responses explicitly decline and redirect |
| AC-6-09 | Negative test NT-04 produces "no information" response without fabrication | Manual QA: response acknowledges gap; no medical facts invented |
| AC-6-10 | Response format compliance verified across all test scenarios | Manual review: no headers, appropriate length, consistent tone |

### 10.2 Phase 7 — Memory Integration Architecture

Phase 7 is complete when all of the following criteria are satisfied:

| # | Criterion | Verification Method |
|---|---|---|
| AC-7-01 | Memory architecture is documented with session scope, retention depth, and expiry rules | This document §4 |
| AC-7-02 | Follow-up resolution algorithm is documented with all signal types and resolution steps | This document §5.3 |
| AC-7-03 | Memory-retrieval interaction model is documented — roles separated, interaction bounded | This document §6 |
| AC-7-04 | Memory write ordering is documented (after success only) | This document §3.4 |
| AC-7-05 | Memory failure handling is documented for all failure scenarios | This document §4.7 |
| AC-7-06 | Hallucination prevention for memory context is documented | This document §8.2–§8.4 |
| AC-7-07 | Context retention depth is documented per consuming component | This document §4.4 |
| AC-7-08 | Memory boundaries are documented (what memory must not do) | This document §4.6 and §6.5 |
| AC-7-09 | Token budget allocation for history_context is documented | This document §6.3 |
| AC-7-10 | Future RAG compatibility of the memory design is documented | This document §12 |

---

## 11. Risks

### 11.1 Risk Register

| Risk ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | Incorrect context retention — follow-up resolves to wrong topic | Medium | High | Inspection window limited to 5 turns; disambiguation rules prefer most recent; UNKNOWN fallback prevents wrong answers |
| R-02 | Ambiguous follow-up questions — multiple valid resolutions in window | Medium | Medium | When ambiguous, system asks for clarification rather than guessing; never silently resolves to a wrong topic |
| R-03 | Missing content — user asks about a condition or therapy not in the content store | High | Medium | `retrieval_quality = EMPTY` path is documented and tested; "no information" response is specific and honest |
| R-04 | Session reset at an unexpected time — history lost mid-conversation | Low | Low | User simply re-states their question; memory reset is safe; no data corruption |
| R-05 | Memory grows unbounded — trimming removes relevant context | Low | Medium | `memory_max_messages` setting prevents unbounded growth; trimming removes oldest turns first; within-window resolution handles the typical case |
| R-06 | LLM uses history as a fact source — cascading fabrication | Medium | High | System prompt explicitly instructs LLM that history provides conversational context only; facts must come from MANSI WEBSITE CONTENT section |
| R-07 | Future content expansion — new conditions or therapies not in alias map | High | Low | UNKNOWN intent (safe failure) rather than wrong retrieval; alias map is a maintenance artefact updated as new content is added |
| R-08 | LLM provider change breaks conversation history format | Low | Medium | Conversation history is in the standard `messages[]` format compatible with both OpenAI and Claude via the existing `app/llm/` abstraction |
| R-09 | Token budget overflow from history — primary content truncated | Low | Medium | Context Builder allocates history_context a fixed maximum (≤ 10% of budget); truncated first before primary content |
| R-10 | Inconsistent terminology across turns — LLM uses different names for same topic | Low | Medium | System prompt instructs use of terminology from provided content; content slugs and page titles are consistent |

---

## 12. Future Compatibility

### 12.1 Compatibility with Phase 8 Production RAG

The conversation intelligence design specified here is compatible with Phase 8 semantic/vector-based RAG without architectural redesign.

| Design Decision | Current Behaviour | Phase 8 RAG Behaviour | Compatibility |
|---|---|---|---|
| Memory Layer interface | Provides `ConversationTurn[]` to Query Understanding and Context Builder | Same interface — RAG does not change the memory contract | No change required |
| Follow-Up Resolution | Uses `QueryContext.resolved_topics` from Query Understanding Layer | RAG adds semantic retrieval as an additional retrieval strategy within the Retrieval Layer — follow-up resolution is upstream and unaffected | No change required |
| Context Builder history_context | Includes relevant turns from Memory Layer | Same behaviour — history_context is a fixed allocation within the token budget | No change required |
| LLM Layer history injection | Injects last 2–3 turns as prior messages | Same — the number of turns and the injection format do not change with RAG | No change required |
| Memory boundaries | Memory does not provide facts | In Phase 8, facts continue to come from retrieved content (now semantically retrieved) — memory role is unchanged | No change required |

**Key insight:** The Memory Architecture (Phase 7) is orthogonal to the Retrieval Architecture (Phase 3 / Phase 8). Memory concerns session history. Retrieval concerns website content. Phase 8 improves retrieval precision — it does not change memory's role, interface, or boundaries.

### 12.2 Compatibility with Future Semantic Search

When semantic search is introduced, the Retrieval Layer will return `RetrievalResult[]` objects with higher semantic relevance scores than the current exact-match approach. The rest of the pipeline — including the Memory Layer, Context Builder history integration, and LLM Layer prompt construction — consumes `AssembledContext` regardless of how the retrieval was performed.

Conversation intelligence components that will work without change with semantic retrieval:

- Memory Layer (read and write)
- Query Understanding follow-up resolution
- Context Builder history_context inclusion and token budgeting
- LLM Layer conversation history injection
- Response Formatter

### 12.3 Compatibility with Future Knowledge Sources

As new content types are added (blogs, practitioners, courses), the conversation intelligence layer accommodates them as follows:

| Extension Point | How New Content Types Are Integrated |
|---|---|
| Memory Layer | No change required — memory stores conversation turns, not content types |
| Follow-Up Resolution | Query Understanding adds new topic types (blog slugs, practitioner names) to alias mapping and slug detection |
| Context Builder | Content sections are type-agnostic — new content types produce `ContentSection` objects in the same format |
| Response Consistency | System prompt grounding rules updated to reference new content types; memory handling unchanged |
| Test Scenarios | New test scenarios added per content type; existing scenarios remain valid |

### 12.4 Cross-Session Memory (Future Phase)

Phases 6 and 7 specify in-session memory only. Cross-session memory — where a user returning in a new session retains context from prior sessions — is explicitly deferred to a future phase requiring:

- Persistent storage backend (database-backed `MemoryStore`)
- User authentication and session identity management
- Privacy and data retention policies
- Opt-in/opt-out user controls

The current Memory Layer interface (`get_history`, `append`, `clear`) is designed for dependency injection and can be backed by a persistent store in a future phase without changes to the conversation intelligence layer.

---

## 13. Deliverables

### 13.1 Specification Deliverables (This Document)

| Deliverable | Location | Description |
|---|---|---|
| Phase 6 & 7 Architecture Specification | `.claude/spec/mansi-conversation-intelligence.md` | This document — combined specification for Phases 6 and 7 |

### 13.2 Architecture Artefacts Defined in This Document

| Artefact | Type | Defined In |
|---|---|---|
| Full Conversation System Flow | Architecture diagram | §3.1 |
| Turn Lifecycle with Memory | Process diagram | §3.3 |
| Critical Ordering Rule (memory write) | Architecture decision | §3.4 |
| Session Memory model | Data contract | §4.2 |
| ConversationTurn object | Data contract | §4.3 |
| Context Retention depth by component | Architecture decision | §4.4 |
| Context Expiration rules | Architecture decision | §4.5 |
| Memory Boundaries | Architecture decision | §4.6 |
| Memory Failure Handling | Error specification | §4.7 |
| Follow-Up Resolution Algorithm | Process specification | §5.3 |
| Follow-Up Examples A through E | Documented behaviour | §5.4 |
| Clarification Response format | Content specification | §5.5 |
| Memory ↔ Retrieval Interaction Model | Architecture decision | §6.1 |
| AssembledContext token budget allocation | Architecture decision | §6.3 |
| History context inclusion rules | Architecture decision | §6.4 |
| Memory prohibition rules | Architecture constraint | §6.5 |
| Tone and Structural Consistency rules | Response specification | §7.1–§7.3 |
| Source of Truth Hierarchy | Architecture decision | §8.1 |
| Cascading Fabrication risk and mitigation | Risk specification | §8.2 |
| Missing information response formats | Content specification | §8.3 |
| History instruction for system prompt | Prompt specification | §8.4 |
| All test scenario matrices (CT, TT, FU, MT, NT) | Test specifications | §9.2–§9.6 |
| Evaluation dimensions for test outcomes | Validation criteria | §9.7 |
| Phase 6 acceptance criteria | Acceptance criteria | §10.1 |
| Phase 7 acceptance criteria | Acceptance criteria | §10.2 |
| Risk register | Risk documentation | §11.1 |
| Future RAG compatibility table | Architecture decision | §12.1 |

### 13.3 Inputs Required Before Validation

| Prerequisite | Status |
|---|---|
| Phase 2 normalised content store populated | Required for Condition Tests and Therapy Tests |
| Phase 3 Retrieval Layer implemented | Required for all pipeline tests |
| Phase 4 Context Builder implemented | Required for all pipeline tests |
| Phase 5 LLM Layer implemented | Required for all pipeline tests |
| Memory Layer functional (`app/services/memory_service.py`) | Required for all follow-up and multi-turn tests |
| LLM provider configured in `app/config/settings.py` | Required for all response tests |
| At least 2 condition pages normalised (e.g., ADHD, Autism) | Minimum viable test coverage for CT and FU tests |
| At least 2 therapy pages normalised (e.g., CBT, Occupational Therapy) | Minimum viable test coverage for TT and multi-turn tests |

---

## 14. Assumptions

| # | Assumption | Impact If Wrong |
|---|---|---|
| A1 | The Memory Layer (`app/services/memory_service.py`) is functional and provides consistent `get_history()` / `append()` / `clear()` behaviour | Follow-up resolution and multi-turn tests will not function; phases cannot be validated |
| A2 | Phases 3–5 (Retrieval, Context Assembly, LLM Response) are implemented before Phase 6 validation begins | Full pipeline tests cannot execute; only component-level unit tests are possible |
| A3 | At least ADHD and CBT pages are normalised and present in `data/normalized/` | Test scenarios CT-01, TT-01, and FU-01 through FU-03 cannot be validated |
| A4 | The LLM provider supports the `messages[]` conversation format with prior turns | History injection into LLM prompts will not function; conversation coherence tests cannot be validated |
| A5 | `memory_max_messages` is set to a value that retains at least 10 turns during validation | Multi-turn test scenarios will be prematurely trimmed if the limit is set too low |
| A6 | The topic slugs resolved from follow-up queries match the slugs in `data/normalized/` | Retrieval will fail for resolved topics that do not match normalised file names |
| A7 | The system prompt grounding instructions (Phase 5 §8.4) are in place before Phase 6 validation | Response grounding tests will fail — LLM may produce ungrounded responses |
| A8 | Future conditions and therapy pages added to the content store will produce normalised documents compatible with the Phase 2 schema | Test scenario coverage will extend naturally to new content without test redesign |

---

*End of Specification — Mansi AI Conversation Intelligence & Memory Architecture (Phases 6 and 7)*

*Document Version: 1.0 | Last Updated: 2026-06-17*
