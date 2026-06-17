# Mansi AI Knowledge System Architecture

**Project:** Mansi AI
**Document Type:** Production Architecture Specification
**Phases Covered:** Phase 3 — Retrieval Architecture | Phase 4 — Context Assembly Architecture | Phase 5 — LLM Knowledge Response Architecture
**Status:** Draft
**Version:** 1.0
**Date:** 2026-06-17
**Author:** Solutions Architecture
**Depends On:** Phase 1 — Content Discovery Spec | Phase 2 — Content Acquisition & Normalisation Spec

---

## 1. Executive Summary

### 1.1 Purpose

The Mansi Knowledge System is the intelligence layer of Mansi AI. It enables Mansi to answer questions about mental health conditions and therapies by grounding every response in content sourced directly from the Mansi website — not from general LLM training data.

This document specifies the architecture for three tightly coupled phases:

- **Phase 3 — Retrieval Architecture:** How Mansi identifies which website content is relevant to a user's question.
- **Phase 4 — Context Assembly Architecture:** How retrieved content is selected, ranked, and assembled into LLM context.
- **Phase 5 — LLM Knowledge Response Architecture:** How Mansi instructs the LLM to generate accurate, grounded, and safe responses.

### 1.2 Business Goals

| Goal | Description |
|---|---|
| Knowledge Accuracy | Responses must reflect what Mansi's website actually says, not generic LLM knowledge |
| User Trust | Users asking about sensitive mental health topics need confident, reliable answers |
| Source Transparency | Mansi must be able to acknowledge when information is not available |
| Scalability | The system must accommodate new content types without architectural redesign |
| Provider Flexibility | The system must not be permanently locked to any single LLM provider |

### 1.3 User Goals

| Goal | Description |
|---|---|
| Get direct answers | "What is ADHD?" should produce a clear, factual answer from Mansi's content |
| Understand treatment options | "What therapies help ADHD?" should return relevant therapy information |
| Follow a conversation | "What about autism?" after asking about ADHD should resolve the correct context |
| Feel safe | Responses about sensitive topics must not contain harmful, speculative, or fabricated information |

### 1.4 System Goals

| Goal | Description |
|---|---|
| Retrieval Precision | Retrieve only the content relevant to the current question |
| Context Efficiency | Use context window budget effectively — no redundant, duplicate, or irrelevant content |
| Hallucination Prevention | LLM must not generate content beyond what website content supports |
| Memory Continuity | Conversation history must inform retrieval and context assembly |
| RAG Readiness | Architecture must support future vector-based semantic retrieval without redesign |

---

## 2. Scope

### 2.1 In Scope

| Area | Description |
|---|---|
| Query Understanding | Detect intent, topic, question type, and conversation context |
| Retrieval Architecture | Match user questions to relevant normalised website content |
| Context Assembly | Select, rank, and assemble retrieved content for LLM consumption |
| Memory Integration | Use conversation history to resolve follow-up questions and maintain continuity |
| LLM Integration | Construct prompts, inject context, and govern response generation |
| Response Generation | Specify how Mansi formats, limits, and delivers answers to users |
| Hallucination Prevention | Grounding rules and missing-content handling |
| Error Handling | Behaviour when content is absent, ambiguous, or incomplete |
| Future RAG Readiness | Architectural design decisions that enable semantic search without redesign |

### 2.2 Out of Scope

| Area | Reason |
|---|---|
| Embedding Models | Future phase — not part of Phases 3–5 |
| ChromaDB / Vector Databases | Future phase — not part of Phases 3–5 |
| Screening Questionnaires | Separate functional domain — Phase 6+ |
| Roadmap Generation | Separate functional domain — Phase 6+ |
| Course Recommendation Logic | Separate functional domain — Phase 6+ |
| Admin Workflows | Operational tooling — separate scope |
| Practitioner Assignment Logic | Separate functional domain — Phase 6+ |
| Blogs, Courses, Practitioners | Future content types — not yet in scope |
| Frontend / UI Changes | Not applicable to this specification |

---

## 3. End-to-End Architecture

### 3.1 System Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                         MANSI KNOWLEDGE SYSTEM                                 │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  User                                                                   │   │
│  │  "What therapies help ADHD?"                                            │   │
│  └──────────────────────────────────┬──────────────────────────────────────┘   │
│                                     │                                          │
│                                     ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  Chat Service  (existing — app/api/chat.py)                             │   │
│  │  - Receives user message                                                │   │
│  │  - Orchestrates the full knowledge pipeline                             │   │
│  │  - Returns final response to user                                       │   │
│  └──────────────────────────────────┬──────────────────────────────────────┘   │
│                                     │                                          │
│                                     ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  Query Understanding Layer  [Phase 3]                                   │   │
│  │  - Detects intent (lookup / comparison / general / follow-up)           │   │
│  │  - Identifies mentioned conditions and therapies                        │   │
│  │  - Classifies question type                                             │   │
│  │  - Resolves follow-up references using Memory Layer                     │   │
│  │  Output: QueryContext object                                             │   │
│  └──────────────────────────────────┬──────────────────────────────────────┘   │
│                                     │                                          │
│                                     ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  Retrieval Layer  [Phase 3]                                             │   │
│  │  - Executes exact match, related content, and cross-reference lookups   │   │
│  │  - Reads from data/normalized/ (Phase 2 outputs)                        │   │
│  │  - Returns a ranked list of candidate content documents                 │   │
│  │  Output: RetrievalResult list                                            │   │
│  └──────────────────────────────────┬──────────────────────────────────────┘   │
│                                     │                                          │
│                                     ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  Context Builder  [Phase 4]                                             │   │
│  │  - Selects and ranks retrieved documents                                │   │
│  │  - Removes duplicates                                                   │   │
│  │  - Enforces context size limits                                         │   │
│  │  - Structures content sections for LLM consumption                      │   │
│  │  Output: AssembledContext object                                         │   │
│  └──────────────────────────────────┬──────────────────────────────────────┘   │
│                                     │                                          │
│                                     ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  Memory Layer  (existing — app/services/memory_service.py)              │   │
│  │  - Provides conversation history for follow-up resolution               │   │
│  │  - Receives current exchange for storage after response                 │   │
│  └──────────────────────────────────┬──────────────────────────────────────┘   │
│                                     │                                          │
│                                     ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  LLM Layer  [Phase 5]                                                   │   │
│  │  - Constructs grounded system prompt with assembled context             │   │
│  │  - Enforces hallucination prevention rules                              │   │
│  │  - Calls configured LLM provider (OpenAI or Claude)                    │   │
│  │  Output: Raw LLM response string                                         │   │
│  └──────────────────────────────────┬──────────────────────────────────────┘   │
│                                     │                                          │
│                                     ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  Response Formatter  [Phase 5]                                          │   │
│  │  - Validates response does not exceed safety boundaries                 │   │
│  │  - Formats response for user delivery                                   │   │
│  │  - Appends source references where applicable                           │   │
│  └──────────────────────────────────┬──────────────────────────────────────┘   │
│                                     │                                          │
│                                     ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  User                                                                   │   │
│  │  "CBT and Occupational Therapy are both used for ADHD. Here's how..."   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Summary

| Component | Phase | Responsibility |
|---|---|---|
| Chat Service | Existing | Orchestrates the full pipeline per request |
| Query Understanding Layer | 3 | Parses intent, topics, and conversation context from user input |
| Retrieval Layer | 3 | Fetches matching normalised content documents from local store |
| Context Builder | 4 | Selects, ranks, deduplicates, and assembles retrieved content |
| Memory Layer | Existing | Maintains and provides per-session conversation history |
| LLM Layer | 5 | Constructs prompts, injects context, calls LLM, returns response |
| Response Formatter | 5 | Post-processes and validates the LLM response before delivery |

### 3.3 Data Flow Summary

```
User Message
     │
     ▼  [Query Understanding]
QueryContext { intent, topics, question_type, resolved_topics }
     │
     ▼  [Retrieval Layer] reads from data/normalized/
RetrievalResult[] { slug, page_type, content, relevance_score, match_type }
     │
     ▼  [Context Builder] + Memory Layer history
AssembledContext { primary_content[], supporting_content[], history_summary, token_budget_remaining }
     │
     ▼  [LLM Layer]
System Prompt + Assembled Context + User Message → LLM Provider
     │
     ▼  [Response Formatter]
Formatted User-Facing Response
```

---

## 4. Query Understanding Architecture

### 4.1 Purpose

The Query Understanding Layer transforms a raw user message into a structured `QueryContext` object that downstream components (Retrieval, Context Builder) can act on without re-parsing natural language.

This layer does not call the LLM for every message. It applies deterministic rules and lightweight pattern matching. LLM-assisted query understanding may be introduced in future phases if rule-based approaches prove insufficient.

### 4.2 QueryContext Object

```
QueryContext:
  - raw_message: string          The original user message
  - intent: IntentType           Classified intent (see §4.3)
  - question_type: QuestionType  Type of question (see §4.4)
  - mentioned_conditions: []     Conditions named in the message (e.g. ["adhd"])
  - mentioned_therapies: []      Therapies named in the message (e.g. ["cbt"])
  - resolved_topics: []          Topics resolved from conversation history (see §4.5)
  - is_follow_up: boolean        Whether this message references prior context
  - confidence: float            0.0–1.0 confidence in the parsed intent
```

### 4.3 Intent Detection

| Intent Type | Description | Example Trigger |
|---|---|---|
| `CONDITION_LOOKUP` | User wants information about a specific condition | "What is ADHD?" / "Tell me about autism" |
| `THERAPY_LOOKUP` | User wants information about a specific therapy | "What is CBT?" / "How does speech therapy work?" |
| `THERAPY_FOR_CONDITION` | User wants therapies relevant to a condition | "What therapies help ADHD?" / "What can help with anxiety?" |
| `CONDITION_FOR_THERAPY` | User wants conditions that a therapy addresses | "What conditions does CBT treat?" |
| `COMPARISON` | User wants to compare two or more items | "Compare CBT and occupational therapy" / "What's the difference between ADHD and autism?" |
| `GENERAL_KNOWLEDGE` | General question without specific topic reference | "What does Mansi do?" / "How does this work?" |
| `FOLLOW_UP` | Reference to a prior message without re-stating the topic | "What about autism?" / "Are there other options?" |
| `UNKNOWN` | Intent cannot be classified | Handled via graceful fallback (see §10) |

### 4.4 Topic Detection

Topic detection identifies which conditions and therapies are mentioned or implied in the user's message. It operates against the known slug inventory produced by Phase 1 and Phase 2.

**Detection strategy:**

```
1. Normalise input: lowercase, strip punctuation
2. Compare against known condition slugs (from data/normalized/conditions/)
3. Compare against known therapy slugs (from data/normalized/therapies/)
4. Apply alias mapping: "attention deficit" → "adhd", "talking therapy" → "cbt"
5. Flag unmatched terms as unknown_topics for escalation
```

**Alias mapping** (to be populated during Phase 1 content analysis):

| Alias | Resolved Slug | Type |
|---|---|---|
| "attention deficit disorder" | `adhd` | condition |
| "autism spectrum" | `autism` | condition |
| "cognitive behavioural" | `cbt` | therapy |
| "OT" | `occupational-therapy` | therapy |
| *(expanded during content analysis)* | | |

### 4.5 Question Classification

| Question Type | Description | Example |
|---|---|---|
| `DEFINITION` | Asks what something is | "What is ADHD?" |
| `TREATMENT` | Asks about therapies or interventions | "What helps ADHD?" |
| `COMPARISON` | Asks to contrast two items | "Compare CBT and occupational therapy" |
| `RELATIONSHIP` | Asks how items relate | "Is CBT used for autism?" |
| `AVAILABILITY` | Asks about access or booking | "Can I get CBT through Mansi?" |
| `GENERAL` | Does not fit specific types | "Tell me about conditions" |

### 4.6 Follow-Up Detection and Conversation Awareness

Follow-up messages reference prior conversation turns without explicitly restating the topic. The Query Understanding Layer resolves these references using the Memory Layer.

**Resolution process:**

```
User: "What is ADHD?"
  → Intent: CONDITION_LOOKUP
  → mentioned_conditions: ["adhd"]
  → is_follow_up: false

User: "What therapies help it?"
  → Raw message: no condition named
  → is_follow_up: true
  → Fetch last 3 turns from Memory Layer
  → Identify last-mentioned condition: "adhd"
  → resolved_topics: ["adhd"]
  → Effective query: "What therapies help adhd?"
  → Intent: THERAPY_FOR_CONDITION
```

**Follow-up signals:**

| Signal | Example |
|---|---|
| Pronoun without antecedent | "What about it?", "Can it help?" |
| Comparative reference | "What about autism?" (after discussing ADHD) |
| Implicit continuation | "Are there other options?" (after listing therapies) |
| Direct follow-up phrase | "And what about...", "Also..." |

**Resolution rules:**

1. Look back up to 5 prior turns for a topic reference.
2. If multiple topics were mentioned, prefer the most recent.
3. If resolution is ambiguous, treat as `UNKNOWN` intent and ask for clarification.
4. Never guess a topic that was not mentioned in recent history.

### 4.7 Worked Examples

**Example A — Direct lookup:**

```
User input:    "What is ADHD?"
intent:        CONDITION_LOOKUP
question_type: DEFINITION
mentioned_conditions: ["adhd"]
mentioned_therapies:  []
is_follow_up:  false
resolved_topics: ["adhd"]
```

**Example B — Therapy for condition:**

```
User input:    "What therapies help ADHD?"
intent:        THERAPY_FOR_CONDITION
question_type: TREATMENT
mentioned_conditions: ["adhd"]
mentioned_therapies:  []
is_follow_up:  false
resolved_topics: ["adhd"]
```

**Example C — Comparison:**

```
User input:    "Compare CBT and Occupational Therapy"
intent:        COMPARISON
question_type: COMPARISON
mentioned_conditions: []
mentioned_therapies:  ["cbt", "occupational-therapy"]
is_follow_up:  false
resolved_topics: ["cbt", "occupational-therapy"]
```

**Example D — Follow-up resolution:**

```
History:       User asked about ADHD in prior turns
User input:    "What about autism?"
intent:        CONDITION_LOOKUP
question_type: DEFINITION
mentioned_conditions: ["autism"]
is_follow_up:  true
resolved_topics: ["autism"]
```

---

## 5. Retrieval Architecture

### 5.1 Purpose

The Retrieval Layer accepts a `QueryContext` object and returns a list of candidate content documents from the local normalised content store (`data/normalized/`). It does not perform any LLM calls. It does not interpret content — it identifies and fetches documents relevant to the parsed topics and intent.

**Input:** `QueryContext`
**Output:** `RetrievalResult[]`

### 5.2 RetrievalResult Object

```
RetrievalResult:
  - slug: string              Page slug (e.g. "adhd", "cbt")
  - page_type: string         "condition" or "therapy"
  - source_url: string        Original page URL
  - page_title: string        Page title
  - match_type: MatchType     How this result was found (see §5.3)
  - relevance_score: float    0.0–1.0; higher = more relevant
  - content: NormalisedDoc    The full normalised document (Phase 2 schema)
```

### 5.3 Retrieval Strategy

The retrieval layer applies three strategies in order. All strategies operate on the normalised JSON content store produced by Phase 2.

```
┌─────────────────────────────────────────────────────────────────┐
│                    RETRIEVAL STRATEGY                           │
│                                                                 │
│  QueryContext                                                   │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Step 1: Exact Match Retrieval                          │   │
│  │  → Look up resolved_topics directly by slug             │   │
│  │  → Load matching normalised documents                   │   │
│  │  → Score: 1.0 (direct hit)                              │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Step 2: Related Content Retrieval                      │   │
│  │  → Follow internal_links from exact match documents     │   │
│  │  → For THERAPY_FOR_CONDITION: load linked therapies     │   │
│  │  → For CONDITION_FOR_THERAPY: load linked conditions    │   │
│  │  → Score: 0.7 (related hit)                             │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Step 3: Cross-Reference Retrieval                      │   │
│  │  → For COMPARISON: load all mentioned items             │   │
│  │  → For RELATIONSHIP: load both sides of the pair        │   │
│  │  → Score: 0.6 (cross-reference)                         │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  Combined RetrievalResult[]  (deduplicated, scored)             │
└─────────────────────────────────────────────────────────────────┘
```

#### 5.3.1 Exact Match Retrieval

Direct slug-to-file lookup. For each slug in `QueryContext.resolved_topics`:

```
For slug in resolved_topics:
  If page_type = "condition":
    Load data/normalized/conditions/{slug}.json
  If page_type = "therapy":
    Load data/normalized/therapies/{slug}.json
  If file not found:
    Log: "No document found for slug: {slug}"
    Return empty result for this slug
```

| Match Type | Score | Triggered By |
|---|---|---|
| `EXACT_CONDITION` | 1.0 | Condition slug found in content store |
| `EXACT_THERAPY` | 1.0 | Therapy slug found in content store |

#### 5.3.2 Related Content Retrieval

Follows `internal_links` from exact match documents to retrieve associated content. This is the mechanism by which "What therapies help ADHD?" retrieves the therapy documents linked from the ADHD page.

```
For each exact match document:
  For each link in document.internal_links:
    If intent = THERAPY_FOR_CONDITION AND link.target_type = "therapy":
      Load data/normalized/therapies/{link.slug}.json
    If intent = CONDITION_FOR_THERAPY AND link.target_type = "condition":
      Load data/normalized/conditions/{link.slug}.json
    Score this result as 0.7 (related)
```

| Match Type | Score | Triggered By |
|---|---|---|
| `RELATED_THERAPY` | 0.7 | Therapy linked from a matched condition |
| `RELATED_CONDITION` | 0.7 | Condition linked from a matched therapy |

#### 5.3.3 Cross-Reference Retrieval

Used for comparisons and relationship queries. Fetches all explicitly mentioned items regardless of link structure.

```
For COMPARISON intent:
  Load all slugs in mentioned_conditions → score 1.0
  Load all slugs in mentioned_therapies → score 1.0
  These are loaded in parallel as equal-weight items for comparison

For RELATIONSHIP intent:
  Load both the condition and therapy slugs → score 0.9
```

| Match Type | Score | Triggered By |
|---|---|---|
| `COMPARISON_ITEM` | 1.0 | Item explicitly mentioned in a comparison query |
| `RELATIONSHIP_PAIR` | 0.9 | Both items in a relationship query |

#### 5.3.4 Future Semantic Retrieval Compatibility

The retrieval strategy is designed as a plug-in interface. The Retrieval Layer accepts a `QueryContext` and returns `RetrievalResult[]`. The internal strategy (exact match, related, semantic) is an implementation detail of this layer.

When semantic retrieval (vector search) is introduced in a future phase:

```
Current:  ExactMatchRetriever.retrieve(query_context) → RetrievalResult[]
Future:   SemanticRetriever.retrieve(query_context)   → RetrievalResult[]
          HybridRetriever.retrieve(query_context)     → RetrievalResult[]
```

The `RetrievalResult` schema is the stable contract. Context Builder, LLM Layer, and Response Formatter do not need to change when the retrieval strategy evolves.

### 5.4 Retrieval Scoring

| Score | Range | Meaning |
|---|---|---|
| Exact match | 0.9–1.0 | Direct slug hit |
| Related content | 0.6–0.8 | Found via internal_links |
| Cross-reference | 0.5–0.7 | Mentioned alongside another topic |
| No match | 0.0 | Document not found |

### 5.5 Retrieval Limits

| Limit | Value | Rationale |
|---|---|---|
| Max exact match results | 3 | Prevents context overflow for broad queries |
| Max related content results | 5 | Supports multi-therapy answers without bloat |
| Max total results passed to Context Builder | 8 | Context Builder applies final selection |

---

## 6. Context Builder Architecture

### 6.1 Purpose

The Context Builder accepts the `RetrievalResult[]` list and the Memory Layer's conversation history, and produces a single `AssembledContext` object ready for injection into the LLM prompt.

The Context Builder does not retrieve content and does not call the LLM. It selects, ranks, deduplicates, and structures what was retrieved.

**Input:** `RetrievalResult[]` + `ConversationHistory` from Memory Layer
**Output:** `AssembledContext`

### 6.2 AssembledContext Object

```
AssembledContext:
  - primary_content: ContentSection[]    Most relevant content (high priority)
  - supporting_content: ContentSection[] Supporting or related content
  - history_context: string             Summarised relevant history (if applicable)
  - metadata: ContextMetadata           Source info, token estimates, retrieval types used
  - retrieval_quality: RetrievalQuality "GOOD" | "PARTIAL" | "EMPTY"

ContentSection:
  - slug: string
  - page_type: string
  - page_title: string
  - source_url: string
  - summary: string              Key sentences from body_paragraphs
  - headings: string[]           Section headings for structure
  - relevant_lists: string[][]   Key list items (symptoms, methods, etc.)
  - relevance_score: float
  - match_type: MatchType
```

### 6.3 Context Assembly Pipeline

```
RetrievalResult[]
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│  Step 1: Relevance Filtering                            │
│  → Drop results with relevance_score < 0.4              │
│  → Drop documents with extraction_complete = false       │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Step 2: Duplicate Removal                              │
│  → Deduplicate by slug — keep highest-scoring instance  │
│  → Detect near-duplicate content by heading overlap     │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Step 3: Intent-Based Prioritisation                    │
│  → CONDITION_LOOKUP: condition doc is primary           │
│  → THERAPY_FOR_CONDITION: condition primary,            │
│    linked therapies as supporting                       │
│  → COMPARISON: all compared items as primary            │
│  → GENERAL: highest-scoring doc is primary              │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Step 4: Content Section Extraction                     │
│  → Extract: page_title, h1, summary paragraphs,         │
│    relevant headings, list items                        │
│  → Do NOT include navigation, CTAs, boilerplate         │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Step 5: Context Size Management                        │
│  → Estimate token count per content section             │
│  → Apply budget: primary_content ≤ 60% of context      │
│  → Apply budget: supporting_content ≤ 25% of context   │
│  → Reserve ≥ 15% for conversation history and prompt   │
│  → Truncate lowest-priority sections if over budget     │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Step 6: History Integration                            │
│  → Fetch relevant history turns from Memory Layer       │
│  → Include only turns relevant to current resolved_topics│
│  → Summarise if > 3 relevant prior turns                │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
AssembledContext
```

### 6.4 Content Selection Rules

| Rule | Description |
|---|---|
| Minimum score threshold | Do not include any result with relevance_score below 0.4 |
| Completeness gate | Exclude documents with `extraction_complete = false` |
| Primary content maximum | At most 3 documents classified as `primary_content` |
| Supporting content maximum | At most 4 documents classified as `supporting_content` |
| Total content sections | At most 7 content sections in the assembled context |

### 6.5 Content Extraction from Normalised Documents

The Context Builder does not pass entire normalised JSON documents to the LLM. It extracts the most informative fields:

| Field | Source in Normalised Doc | Context Use |
|---|---|---|
| Page title | `page_title` | Heading for the content section |
| Summary | First 2–3 `body_paragraphs` | Primary descriptive text |
| Headings | `headings` array (h2 level) | Structural navigation |
| Relevant lists | `lists` array items | Symptoms, methods, benefits |
| Internal links | `internal_links` (slugs only) | Cross-reference metadata for LLM |
| Source URL | `source_url` | Attribution and citation |

Fields **not** passed to the LLM: raw HTML, extraction timestamps, content hash, HTTP metadata.

### 6.6 Token Budget

The context size limits prevent LLM context window overflow while preserving space for the system prompt, conversation history, and the user's message.

| Budget Zone | Allocation | Contents |
|---|---|---|
| System Prompt | Fixed (est. 500 tokens) | Mansi persona, grounding rules, safety instructions |
| Primary Content | ≤ 60% of remaining budget | Directly relevant documents |
| Supporting Content | ≤ 25% of remaining budget | Related or cross-referenced documents |
| History Context | ≤ 10% of remaining budget | Summarised relevant conversation history |
| User Message | Actual length | Current user message |
| LLM Response Budget | Reserved (est. 800 tokens) | Space for the model to generate a full answer |

> **Note:** Exact token counts depend on the LLM provider and model selected. The Context Builder must use an approximate tokeniser consistent with the active LLM provider's counting method.

### 6.7 Retrieval Quality Assessment

The Context Builder produces a `retrieval_quality` assessment for use by the LLM Layer:

| Quality Level | Condition | LLM Behaviour |
|---|---|---|
| `GOOD` | ≥ 1 primary content section, score ≥ 0.7 | Respond confidently using provided content |
| `PARTIAL` | Content found but low scores or incomplete | Respond with available content, signal uncertainty |
| `EMPTY` | No relevant content found | Use "content not available" response (see §9 and §10) |

---

## 7. Memory Integration Architecture

### 7.1 Purpose

The Memory Layer maintains per-session conversation history. Within the knowledge system, memory serves two distinct functions:

1. **Query Understanding:** Resolving follow-up references ("What about it?") by examining recent turns.
2. **Context Assembly:** Including relevant prior exchanges in the assembled context so the LLM can produce coherent, continuous responses.

Memory does not retrieve website content. It does not affect what content is retrieved — only what context is assembled from retrieved content and prior turns.

### 7.2 Memory Responsibilities Within This System

| Responsibility | Owner | Description |
|---|---|---|
| Store conversation turns | Memory Layer (existing) | After each exchange, store user message + assistant response |
| Provide recent history | Memory Layer (existing) | Return last N turns on request |
| Follow-up resolution input | Query Understanding Layer | Read last 5 turns to resolve pronoun/reference |
| History context assembly | Context Builder | Read turns relevant to current topics for inclusion in assembled context |
| History after response | Chat Service | Memory stores the current turn after response is generated |

### 7.3 Memory Interaction Diagram

```
User: "What is ADHD?"
  │
  ├─→ Query Understanding: memory not needed (direct reference)
  ├─→ Retrieval: loads adhd.json
  ├─→ Context Builder: assembles ADHD content; no prior history yet
  ├─→ LLM: generates ADHD description
  └─→ Memory: stores { user: "What is ADHD?", assistant: "ADHD is..." }

User: "What therapies help it?"
  │
  ├─→ Query Understanding: reads Memory → finds "ADHD" in prior turn
  │     → resolved_topics: ["adhd"]
  │     → intent: THERAPY_FOR_CONDITION
  │
  ├─→ Retrieval: loads adhd.json → follows internal_links → loads therapy docs
  ├─→ Context Builder:
  │     → assembles therapy content as primary
  │     → includes prior "What is ADHD?" exchange as history_context
  │
  ├─→ LLM: generates therapy answer; knows user already knows what ADHD is
  └─→ Memory: stores { user: "What therapies help it?", assistant: "..." }
```

### 7.4 Memory Boundaries

| Boundary | Rule |
|---|---|
| Memory does not drive retrieval | Retrieval is always based on the current QueryContext |
| Memory does not synthesise content | Memory provides history; it does not summarise or interpret website content |
| Memory scope is per-session | No cross-session memory is in scope for Phases 3–5 |
| History depth for follow-up resolution | Maximum 5 prior turns inspected |
| History depth for context assembly | Maximum 3 prior turns included in assembled context |
| Memory does not replace retrieval | Even if a topic was discussed recently, fresh content is always retrieved |

### 7.5 Memory-Informed Behaviour Examples

| Scenario | Without Memory | With Memory |
|---|---|---|
| "What therapies help it?" (no prior context) | Cannot resolve "it" — returns UNKNOWN | Resolves "it" to the most recent condition discussed |
| "Are there other options?" | Cannot determine options for what | Identifies the last therapy discussed and retrieves alternatives |
| "Compare them" | Cannot identify comparison subjects | Uses last two items discussed as comparison subjects |
| "What about autism?" (after ADHD discussion) | Handles correctly — "autism" is explicit | Handles correctly — "autism" is explicit; prior ADHD context available in history |

---

## 8. LLM Knowledge Architecture

### 8.1 Purpose

The LLM Layer receives the `AssembledContext` from the Context Builder and constructs a complete prompt that instructs the LLM to generate a grounded, accurate, and safe response to the user's question.

This layer is provider-agnostic. It produces a structured messages array compatible with both OpenAI and Claude (Anthropic) APIs via the existing `app/llm/` abstraction layer.

### 8.2 Supported Providers

| Provider | Client | Notes |
|---|---|---|
| OpenAI | `app/llm/openai_client.py` (existing) | GPT-4 and compatible models |
| Claude (Anthropic) | `app/llm/claude_client.py` (existing) | Claude Sonnet, Opus, and compatible models |

Provider selection is governed by application configuration (`app/config/settings.py`). The LLM Layer does not hard-code a provider.

### 8.3 Prompt Construction Architecture

The LLM prompt is assembled in layers. Each layer has a defined purpose and a defined position in the messages array.

```
messages = [
  { role: "system",    content: SYSTEM_PROMPT },
  { role: "system",    content: KNOWLEDGE_CONTEXT },      ← assembled context injected here
  { role: "user",      content: prior_user_turn_1 },      ← from Memory Layer (if applicable)
  { role: "assistant", content: prior_assistant_turn_1 },
  { role: "user",      content: prior_user_turn_2 },
  { role: "assistant", content: prior_assistant_turn_2 },
  { role: "user",      content: CURRENT_USER_MESSAGE }    ← current question
]
```

> For Claude (Anthropic), the second system block may be represented as a user-turn prefix if the provider API does not support multiple system messages. The abstraction layer in `app/llm/` handles this difference transparently.

### 8.4 System Prompt Specification

The system prompt establishes Mansi's persona, scope, and grounding rules. It does not change per request.

**System prompt sections:**

```
Section 1 — Identity and Role
  You are Mansi, an AI assistant for the Mansi mental health platform.
  You help users understand mental health conditions and therapeutic approaches.

Section 2 — Source of Truth Rules
  You answer questions based exclusively on the provided website content.
  Do not draw on general training knowledge about conditions or therapies.
  If the provided content does not contain an answer, say so explicitly.

Section 3 — Tone and Safety
  Respond with warmth, clarity, and care.
  Do not provide clinical diagnoses or treatment recommendations.
  Direct users to qualified practitioners for personal advice.
  Never speculate about a user's personal condition.

Section 4 — Response Format
  Respond in plain conversational prose.
  Use short paragraphs. Avoid technical jargon without explanation.
  If listing therapies or symptoms, use a brief bulleted list.
  Do not use headers in your response.
```

### 8.5 Knowledge Context Injection

The assembled context is injected as a structured block following the system prompt. The format is consistent regardless of which retrieval strategy produced the content.

**Context block format:**

```
--- MANSI WEBSITE CONTENT ---

The following information comes directly from the Mansi website.
Use this content as your primary source for answering the user's question.

[PRIMARY CONTENT]

Title: {content_section.page_title}
Source: {content_section.source_url}

{content_section.summary}

{content_section.relevant_lists formatted as bullet points}

[SUPPORTING CONTENT — if applicable]

Title: {supporting_section.page_title}
Source: {supporting_section.source_url}

{supporting_section.summary}

--- END OF MANSI WEBSITE CONTENT ---
```

**Context injection rules:**

| Rule | Description |
|---|---|
| Always delimited | Use clear start/end markers so the LLM can distinguish content from instructions |
| Source URLs always included | Every content section carries its source URL for attribution |
| Plain text only | No Markdown headers or formatting in injected content — clean prose |
| No metadata in context | Do not include slugs, hashes, or technical fields in the LLM context block |
| Empty context handled explicitly | If `retrieval_quality = EMPTY`, use the empty-context prompt variant (see §9) |

### 8.6 Response Generation Controls

| Control | Description |
|---|---|
| Max response tokens | Configured via `settings.max_tokens_response`; not set per-request by this layer |
| Temperature | Low temperature (e.g. 0.3) for factual knowledge responses; configured in settings |
| Stop sequences | No custom stop sequences for knowledge responses |
| Streaming | Supported if the LLM client and API layer support it; no change required at this layer |
| Retry on failure | Handled by the existing LLM client retry logic in `app/llm/` |

### 8.7 Provider-Specific Considerations

| Concern | OpenAI | Claude (Anthropic) |
|---|---|---|
| Multiple system messages | Supported via `role: "system"` array entries | Use `system` parameter (top-level) for the system prompt; inject context as first user-turn prefix if needed |
| Context window size | GPT-4 Turbo: 128K tokens | Claude 3+: 200K tokens |
| Conversation history format | `messages[]` with role/content | Same `messages[]` format for Claude API |
| Temperature parameter | `temperature` in request body | `temperature` in request body |
| Response format | `choices[0].message.content` | `content[0].text` |

These differences are handled by the existing `app/llm/` abstraction. The LLM Layer constructs a provider-agnostic messages structure; the client implementations handle serialisation.

---

## 9. Hallucination Prevention Strategy

### 9.1 Source-of-Truth Principles

Mansi's responses must be grounded in website content. The following principles define the boundaries of what the LLM is permitted to say:

| Principle | Description |
|---|---|
| Website-First | The LLM answers using provided website content as the primary source |
| No Unsourced Claims | The LLM must not make factual claims about conditions or therapies that are not supported by the provided content |
| No Diagnosis | The LLM must never suggest, imply, or confirm a diagnosis for a user |
| No Treatment Prescription | The LLM must not recommend a specific therapy for a specific user |
| No Speculation | If a user asks something the content does not cover, the LLM must acknowledge the gap |
| Acknowledgement Over Fabrication | An honest "I don't have that information" is always preferable to a fabricated answer |

### 9.2 Grounding Instructions in the System Prompt

The system prompt contains explicit grounding rules that the LLM must follow:

```
GROUNDING RULES:
1. Only use the provided MANSI WEBSITE CONTENT section to answer questions about
   specific conditions or therapies.
2. If the website content does not contain the answer, respond:
   "I don't have specific information about that on the Mansi website right now.
   You may want to contact Mansi directly or speak with a qualified practitioner."
3. Do not combine website content with your own training knowledge to create
   answers that are not supported by the provided content.
4. If you are uncertain whether a fact comes from the provided content or your
   training data, do not include it.
```

### 9.3 Missing Information Handling

| Scenario | Expected Behaviour |
|---|---|
| Topic not in content store | "I don't currently have information about {topic} on the Mansi website." |
| Topic exists but content is incomplete | Answer with available content; acknowledge the limit |
| Question is out of scope | Redirect: "That's outside what I can help with here. Please speak with a practitioner." |
| Question requires personal assessment | "I can share general information, but I'd encourage you to speak with a qualified professional for personal guidance." |

### 9.4 Confidence Expectations

The LLM is not expected to express numerical confidence. It is expected to:

- Answer directly when the content clearly covers the question.
- Signal uncertainty with natural language when content is partial: "Based on what's on the Mansi website..." or "From what I can see..."
- Clearly acknowledge absence when content is missing: "I don't have information about that here."

Confidence is governed by the `retrieval_quality` field from the Context Builder:

| retrieval_quality | LLM Instruction |
|---|---|
| `GOOD` | Answer confidently from provided content |
| `PARTIAL` | Answer with available content; note limits |
| `EMPTY` | Do not attempt to answer; use the "no content" response |

---

## 10. Error Handling Strategy

### 10.1 Error Scenarios and Expected Behaviour

| Scenario | System Behaviour | User Experience |
|---|---|---|
| No content found for query | `retrieval_quality = EMPTY`; LLM uses no-content prompt | "I don't have information about that on the Mansi website right now." |
| Ambiguous question | `intent = UNKNOWN`; ask for clarification | "Could you tell me a bit more about what you're looking for?" |
| Multiple partial matches | All partial matches included as `supporting_content` | Answer uses combined available information; no single authoritative source |
| Follow-up cannot be resolved | `is_follow_up = true` but resolution fails; treat as `UNKNOWN` | "I want to make sure I understand your question — could you tell me more?" |
| Normalised document is incomplete | Document excluded by completeness gate; treated as absent | Falls through to no-content or partial-content handling |
| LLM provider error | Existing `ChatServiceError` handling in `app/services/` | Standard error response; no knowledge-specific message |
| Context builder produces empty context | `retrieval_quality = EMPTY` | No-content response as above |
| Memory unavailable | Follow-up resolution skipped; question treated as standalone | Reduced accuracy on follow-ups; no error shown to user |

### 10.2 Degradation Levels

The system is designed to degrade gracefully. Each failure scenario has a defined fallback:

```
GOOD path:     Full retrieval → full context → confident LLM response
PARTIAL path:  Partial retrieval → partial context → hedged LLM response
EMPTY path:    No retrieval → empty context → "no information" response
ERROR path:    Pipeline failure → ChatServiceError → standard error response
```

No failure scenario should result in the LLM fabricating information or producing an unsafe response.

### 10.3 Logging and Observability

| Event | Log Level | Fields Logged |
|---|---|---|
| Query Understanding result | DEBUG | intent, question_type, resolved_topics, is_follow_up |
| Retrieval result | DEBUG | slug list, match types, scores, retrieval_quality |
| Context assembly | DEBUG | token estimates per section, content sections count |
| Empty retrieval | INFO | query intent, resolved_topics (no user message content) |
| LLM call | DEBUG | model, token estimate, retrieval_quality passed |
| Pipeline error | ERROR | error type, stage, no user content |

> Privacy rule: User message content must never appear in INFO or higher log levels. Only DEBUG logs (not enabled in production by default) may include query details.

---

## 11. Future RAG Readiness

### 11.1 Design Decisions That Enable Future Semantic Retrieval

Every architectural decision in Phases 3–5 was made with future RAG compatibility as a first-class requirement. The following table documents the forward-compatibility choices:

| Decision | Current Behaviour | Future RAG Behaviour | Compatibility |
|---|---|---|---|
| Retrieval Layer is an interface | ExactMatchRetriever implements it | SemanticRetriever implements same interface | Drop-in replacement |
| RetrievalResult is a stable schema | Populated from file lookup | Populated from vector DB query | Same schema — no downstream changes |
| Context Builder is retrieval-agnostic | Consumes RetrievalResult[] regardless of source | Same behaviour with semantic results | No change required |
| LLM Layer uses AssembledContext | Already decoupled from retrieval strategy | Same — context quality improves but format unchanged | No change required |
| Normalised documents are chunk-ready | Fields are clean plain text with heading structure | Same fields fed to embedding pipeline | No restructuring required |

### 11.2 Embedding Pipeline Readiness

Phase 2 normalised documents are designed to be chunked and embedded without transformation:

| Normalised Field | Embedding Use |
|---|---|
| `body_paragraphs` | Primary text for paragraph-level chunks |
| `headings` | Section context for chunk boundaries |
| `lists` | Structured content as additional chunks |
| `page_title` | Chunk metadata / document title |
| `slug` + `page_type` | Vector store metadata for filtering |
| `source_url` | Chunk metadata for attribution |
| `internal_links` | Graph relationships preserved alongside embeddings |

### 11.3 Hybrid Search Readiness

When both exact match and semantic retrieval are available, the Retrieval Layer can run both strategies and merge results:

```
HybridRetriever:
  exact_results  = ExactMatchRetriever.retrieve(query_context)
  semantic_results = SemanticRetriever.retrieve(query_context)
  merged = merge_and_deduplicate(exact_results, semantic_results)
  return ranked(merged)
```

The Context Builder and all downstream components continue to consume `RetrievalResult[]` without modification.

### 11.4 Knowledge Expansion Readiness

As new content types are added (blogs, practitioners, courses), the architecture accommodates them through:

| Extension Point | How New Content Types Are Added |
|---|---|
| Normalised content store | New `data/normalized/{type}/` directory (Phase 2 design) |
| Query Understanding | New intent types and alias mappings per content type |
| Retrieval Layer | New retrieval paths per content type (same interface) |
| Context Builder | Content sections agnostic to content type |
| LLM System Prompt | New grounding rules per content type if required |

---

## 12. Assumptions

Because actual website URLs, page structures, and CMS schemas are not confirmed at the time of this specification, the following assumptions have been made:

| # | Assumption | Impact If Wrong |
|---|---|---|
| A1 | Normalised documents in `data/normalized/` conform to the Phase 2 schema | Retrieval Layer will fail to load documents; re-extraction required |
| A2 | `internal_links` in normalised documents correctly map condition-to-therapy relationships | Related content retrieval will not function; must fall back to intent-only retrieval |
| A3 | Slug names in the normalised store match the topic names users will use in conversation | Alias mapping will be incomplete; follow-up resolution may fail |
| A4 | Condition and therapy pages contain enough content to answer common questions | Context Assembly will produce `PARTIAL` or `EMPTY` results for thin pages |
| A5 | The LLM provider (OpenAI or Claude) is correctly configured via `app/config/settings.py` | LLM Layer will raise a provider error |
| A6 | The Memory Layer is functional and provides consistent per-session history | Follow-up resolution will degrade; queries treated as standalone |
| A7 | Token counts can be estimated with sufficient accuracy using approximate tokenisers | Context size limits may be exceeded or unnecessarily conservative |
| A8 | Website content structure is consistent across all condition pages, and consistent across all therapy pages | Content extraction field mapping will produce uneven results across pages |
| A9 | No Webflow CMS API is available during Phases 3–5 | All retrieval is from Phase 2 normalised local documents only |
| A10 | The set of conditions and therapies is relatively stable during these phases | Alias mapping and slug inventory will not require frequent updates |

---

## 13. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Content structure changes mid-phase | Medium | High | Retrieval Layer reads from normalised JSON — only the extractor (Phase 2) needs updating, not retrieval logic |
| CMS platform change (e.g. away from Webflow) | Low | Medium | Architecture is CMS-agnostic; all retrieval is from normalised local content |
| Normalised documents contain insufficient text for grounding | Medium | High | Context Builder exposes `retrieval_quality = PARTIAL` or `EMPTY`; LLM handles gracefully |
| Alias mapping is incomplete | High | Medium | Missing aliases result in `UNKNOWN` intent rather than wrong retrieval; gaps are safe failures |
| Follow-up resolution produces incorrect topic | Medium | Medium | Wrong topic retrieved → wrong context → LLM may give incorrect answer; log for monitoring |
| Context window overflow | Low | Medium | Token budget in Context Builder prevents overflow; last resort: truncate supporting_content first |
| LLM generates content beyond what website provides | Medium | High | System prompt grounding rules mitigate; monitored via response quality sampling |
| Scaling beyond current page count | Low | Low | File-based retrieval scales linearly; no infrastructure change needed until hundreds of pages |
| Vector DB introduced without interface abstraction | Low | High | Retrieval Layer interface design prevents this — semantic retrieval is a drop-in implementation |
| Provider API changes (OpenAI/Anthropic) | Low | Medium | Existing `app/llm/` abstraction layer isolates this risk |

---

## 14. Success Criteria

Phases 3, 4, and 5 are complete when all of the following criteria are met:

### Phase 3 — Retrieval Architecture

| # | Criterion | Verification Method |
|---|---|---|
| SC-3-01 | Query Understanding correctly classifies intent for all documented example queries | Manual test against §4.7 examples |
| SC-3-02 | Exact match retrieval loads the correct normalised document for any known slug | Load test: pass each known slug → verify correct document returned |
| SC-3-03 | Related content retrieval follows internal_links correctly | Test: ADHD query with THERAPY_FOR_CONDITION → linked therapy documents returned |
| SC-3-04 | Follow-up resolution correctly identifies topic from prior turn | Test: "What is ADHD?" followed by "What therapies help it?" → resolved_topics = ["adhd"] |
| SC-3-05 | No retrieval results returned for unknown slugs (graceful empty) | Test: pass unknown slug → retrieval_quality = EMPTY, no error thrown |
| SC-3-06 | Retrieval interface is documented and stable (not tightly coupled to file system) | Architecture review: interface abstraction layer exists |

### Phase 4 — Context Assembly Architecture

| # | Criterion | Verification Method |
|---|---|---|
| SC-4-01 | Context Builder produces AssembledContext with correct primary/supporting split | Unit test: THERAPY_FOR_CONDITION → condition in primary, therapies in supporting |
| SC-4-02 | Duplicate documents are removed before assembly | Test: same slug appears in exact and related results → only one copy in assembled context |
| SC-4-03 | Token budget is respected across all content sections | Test: large retrieval result set → assembled context does not exceed budget |
| SC-4-04 | retrieval_quality is correctly assessed and set | Test all three scenarios: full content → GOOD; partial → PARTIAL; no content → EMPTY |
| SC-4-05 | History context is included for follow-up queries and excluded for standalone queries | Test both scenarios; verify history_context field |

### Phase 5 — LLM Knowledge Response Architecture

| # | Criterion | Verification Method |
|---|---|---|
| SC-5-01 | System prompt contains all grounding rules from §8.4 | Prompt review: verify all four sections present |
| SC-5-02 | Website content is injected with correct delimiters and source URLs | Prompt inspection: context block well-formed for known test queries |
| SC-5-03 | LLM response for known condition query is grounded in website content | Manual QA: "What is ADHD?" → response uses Mansi content, not generic medical knowledge |
| SC-5-04 | LLM responds correctly when retrieval_quality = EMPTY | Test: unknown topic → response matches "no information" template |
| SC-5-05 | Both OpenAI and Claude providers produce equivalent grounded responses | Cross-provider QA: same query tested on both providers |
| SC-5-06 | Response does not contain fabricated clinical claims for topics not in content store | Adversarial test: ask about an unlisted condition → response acknowledges gap |

---

## 15. Deliverables

### 15.1 Specification Deliverables (This Document)

| Deliverable | Location | Description |
|---|---|---|
| This specification document | `.claude/spec/mansi-knowledge-system-architecture.md` | Combined architecture for Phases 3, 4, and 5 |

### 15.2 Architecture Artefacts Defined in This Document

| Artefact | Type | Defined In |
|---|---|---|
| `QueryContext` object schema | Data contract | §4.2 |
| `RetrievalResult` object schema | Data contract | §5.2 |
| `AssembledContext` object schema | Data contract | §6.2 |
| Retrieval strategy (Exact / Related / Cross-Reference) | Architecture decision | §5.3 |
| Context assembly pipeline | Architecture decision | §6.3 |
| Token budget allocation | Architecture decision | §6.6 |
| System prompt structure | Specification | §8.4 |
| Knowledge context injection format | Specification | §8.5 |
| Hallucination prevention rules | Specification | §9 |
| Retrieval interface contract (future RAG compatibility) | Architecture decision | §11.1 |
| Error handling and degradation levels | Specification | §10.2 |

### 15.3 Implementation Readiness

This document defines the architecture. Implementation requires the following inputs before it can begin:

| Prerequisite | Status |
|---|---|
| Phase 2 normalised content store populated | Depends on Phase 1 and Phase 2 completion |
| Actual website URLs confirmed | To be provided |
| Alias mapping populated from real content | To be produced during Phase 1 content analysis |
| LLM provider configured in `app/config/settings.py` | Existing configuration |
| Memory Layer confirmed functional | Existing implementation |

---

*End of Specification — Mansi AI Knowledge System Architecture (Phases 3, 4, and 5)*

*Document Version: 1.0 | Last Updated: 2026-06-17*
