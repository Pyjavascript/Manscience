# Plan: Implement Phase 6 & 7 — Conversation Intelligence & Memory Architecture

Spec: `.claude/spec/mansi-conversation-intelligence.md`

## Context

Phases 1–5 (discovery, normalisation, retrieval, context assembly, LLM response) are already implemented in `app/`. This spec layers Conversation Intelligence on top: correct follow-up resolution, bounded memory, deterministic clarification, response consistency, and a documented/executable test matrix.

Investigation found the existing code does **not** yet match the spec in several concrete ways — these are the actual implementation gaps, not just documentation gaps:

1. **`app/rag/query_understanding.py` is broken for every follow-up.** `_detect_follow_up` references an undefined name `_FOLLOW_UP_SIGNALS` (the real constants are `_FOLLOW_UP_WORD_SIGNALS` / `_FOLLOW_UP_PHRASE_SIGNALS`). This raises `NameError` on every call where `history` is non-empty, which `analyse()` swallows and converts to `Intent.UNKNOWN` — so today, **no follow-up is ever detected**. Confirmed via `pytest`: `test_follow_up_detected_with_history` fails with this exact `NameError`.
2. **`_extract_topics_from_history` is called but never defined** (`query_understanding.py:93`) — a second bug masked by bug #1. This is the method responsible for spec §5.3's "scan history for the most recently mentioned topic" step and needs to be written from scratch.
3. **Word-level signal matching doesn't strip punctuation**, so "What therapies help it?" (trailing `?`) would still fail to match the pronoun "it" even after fixing bug #1 — `lowered.split()` yields `"it?"`, not `"it"`.
4. **`ChatService` doesn't implement the deterministic clarification path (§5.5)** or the "ask without retrieval" requirement (AC-6-07) — an unresolved follow-up currently falls through to a normal LLM call with no context, which is non-deterministic and untested.
5. **Memory failure handling doesn't match §4.7.** `handle_message` raises `ChatServiceError` if the post-success memory write fails, but the spec requires the response still be returned to the user (memory failure must never surface as a user-visible error). There's also no guard around the initial `memory.get_history()` read for the "Memory Layer unavailable" scenario.
6. **The system prompt is missing the §7 (Structure/Terminology) and §8.3 (Missing Information) instructions** that Phase 5 already established the pattern for (grounding/safety/history rules are there; the newer rules from this spec are not).
7. Two existing tests assert pre-spec behaviour and currently fail or pass vacuously:
   - `test_history_included_in_context` / `test_history_capped_at_three_turns` use a default `QueryContext(is_follow_up=False, intent=CONDITION_LOOKUP)` — per spec §6.4 this should produce **no** history context, so the first assertion is simply wrong and the second passes vacuously (0 ≤ 6).
   - `test_empty_quality_context_does_not_inject_block` checks the bare substring `"MANSI WEBSITE CONTENT"` is absent from the system prompt — but the §8.4 history instruction text legitimately contains that phrase by name. The check needs to target the `--- MANSI WEBSITE CONTENT ---` block marker instead.
   - `test_follow_up_detected_with_history` expects `Intent.FOLLOW_UP`, but per the spec's own worked examples (§5.4 A–E), a *resolved* follow-up takes on the domain intent (e.g. `CONDITION_LOOKUP`), and an *unresolved* one becomes `UNKNOWN` — `Intent.FOLLOW_UP` is never the output of a correct resolution.

## Design decisions for the follow-up resolution algorithm (§5.3)

The spec's pseudocode and its own worked examples are in tension for multi-topic cases (Example C, MT-01, MT-03, MT-04 all need *two* prior topics merged; Examples A/D need just one). Resolution:

- Scan history backward (last 5 messages — `ConversationTurn` = one message per §4.3), message by message.
- The **first (most recent) message that mentions any known slug** seeds the candidate set with *every* slug it contains together (a comparison turn that names two therapies in one message is one candidate set, not an ambiguity to break).
- If the current message's pronoun/phrasing implies **multiple** prior entities (plural pronouns "they/those/them/these", or a comparison phrase like "which one"/"which is better"/"in common"), keep scanning further back until at least two distinct topics are collected or the window is exhausted. This is what makes MT-04 ("what do they have in common?", topics introduced two turns apart) and MT-03/Example C (comparison phrasing) resolve correctly, while singular references (Example A/D) still stop at the single most recent mention.
- History-derived topics are merged with any topics explicitly named in the *current* message (union, history first) — this is what Example C needs (`adhd` explicit + `cbt`/`occupational-therapy` from history).
- If nothing is found anywhere (no explicit mention, empty history scan) → `intent = UNKNOWN`, `is_follow_up = True` retained, `resolved_topics = ()`. This is the only path that should produce the clarification response.
- The "tie → UNKNOWN" clause in the spec's Step 4 is superseded by Example C's own documented output (two topics named together in one prior turn must resolve to *both*, not `UNKNOWN`) — implemented per the example, noted as a one-line code comment so a future reader isn't confused by the discrepancy.

Retrieval itself needs **no changes**: `FileSystemRetriever`'s exact-match strategy already iterates `QueryContext.resolved_topics`, so once Query Understanding populates `resolved_topics` correctly, the right documents are fetched regardless of whether the topic came from the current message or history.

## Files to Modify

### 1. `app/rag/query_understanding.py`
- Add module-level `_WORD_RE = re.compile(r"[a-z']+")` and a `_tokenize()` helper; use it in `_detect_follow_up` instead of `.split()`.
- Fix `_detect_follow_up` to check both `_FOLLOW_UP_WORD_SIGNALS` (tokenized) and `_FOLLOW_UP_PHRASE_SIGNALS` (substring) — removing the `_FOLLOW_UP_SIGNALS` `NameError`.
- Add `_PLURAL_FOLLOW_UP_SIGNALS = frozenset({"they", "those", "them", "these"})` and a `_needs_multiple_topics()` helper (plural pronoun OR comparison keyword).
- Extend `_COMPARISON_KEYWORDS` with `"which is better"`, `"which one"`, `"which is more"`, `"more suitable"`, `"have in common"`, `"in common"`.
- Extend `_FOLLOW_UP_PHRASE_SIGNALS` with `"which is better"`, `"which one"`, `"which is more"`.
- Implement `_extract_topics_from_history(history, conditions, therapies, depth, needs_multiple)` per the algorithm above.
- Update `_analyse_internal` to: always compute `is_follow_up`; when true, scan history and merge with explicitly-mentioned topics (union, history-first); early-return `UNKNOWN`/`is_follow_up=True`/`resolved_topics=()` only when nothing is found anywhere.

### 2. `app/services/chat_service.py`
- Add `CLARIFICATION_MESSAGE` constant (exact text from spec §5.5).
- Guard `self.memory.get_history()` in a try/except → empty list + log on failure (§4.7 "Memory Layer unavailable").
- After `query_understanding.analyse(...)`: if `intent is Intent.UNKNOWN and is_follow_up` → return `CLARIFICATION_MESSAGE` directly (write the turn to memory, but skip retrieval, context assembly, and the LLM call entirely — §5.5 + AC-6-07).
- Change the post-success memory-write failure handling from "log + raise `ChatServiceError`" to "log + still return `llm_response.content`" (§3.4 / §4.7 — memory failure must never become a user-visible error).

### 3. `app/services/prompt_builder.py`
- Extend `DEFAULT_SYSTEM_PROMPT` with a STRUCTURE section (§7.2: no headers, short paragraphs, bullets for lists, no markdown/inline citations), a TERMINOLOGY section (§7.3: consistent naming, no unexplained alias-switching), and a MISSING INFORMATION section (§8.3: say so plainly, never fill gaps with general knowledge). Extend SAFETY to mention redirecting out-of-scope questions. Existing GROUNDING/CONVERSATION HISTORY sections stay as-is (already match §8.4).

## Files to Create

### 4. `tests/test_conversation_intelligence.py`
Executable version of the spec's §9 test matrix (CT-01–05, TT-01–05, FU-01–06, MT-01–05, NT-01–06), built the same way as the existing `tests/test_retriever.py` / `tests/test_query_understanding.py` (tmp_path-seeded normalised JSON fixtures, `FakeMemory`/`FakeLLMClient` for full-pipeline cases). Where a scenario's expected outcome is about literal LLM prose (which can't be asserted without a live call), the test instead asserts the deterministic upstream signal the spec actually depends on: correct `intent`/`resolved_topics`, correct retrieved slugs, `retrieval_quality == EMPTY` for missing content, the relevant system-prompt instruction text reaching the LLM call, and clarification-without-retrieval for unresolvable follow-ups.

## Test Fixes

### 5. `tests/test_query_understanding.py`
- `test_follow_up_detected_with_history`: change expected intent from `Intent.FOLLOW_UP` to `Intent.CONDITION_LOOKUP` (adhd resolves from history, no treatment keyword present).
- Add a new test for the unresolvable case (spec Example E): no topic anywhere in history → `intent == UNKNOWN`, `is_follow_up is True`, `resolved_topics == ()`.

### 6. `tests/test_context_builder.py`
- Add `is_follow_up` parameter to the local `_make_qc()` helper.
- `test_history_included_in_context` and `test_history_capped_at_three_turns`: construct the `QueryContext` with `is_follow_up=True` so they actually exercise the history-inclusion path instead of passing vacuously.

### 7. `tests/test_prompt_builder.py`
- `test_empty_quality_context_does_not_inject_block`: assert the block marker `"--- MANSI WEBSITE CONTENT ---"` is absent, not the bare phrase (which legitimately appears in the always-present history instruction).

## Implementation Order

1. Fix `app/rag/query_understanding.py` (bugs + algorithm).
2. Update `app/services/chat_service.py` (clarification short-circuit + graceful memory failure handling).
3. Update `app/services/prompt_builder.py` (system prompt additions).
4. Fix the three outdated tests (`test_query_understanding.py`, `test_context_builder.py`, `test_prompt_builder.py`).
5. Write `tests/test_conversation_intelligence.py` covering the full §9 scenario matrix.
6. Run the full suite; confirm zero regressions and all new tests pass.

## Verification

1. `python -m pytest tests/ -v` — full suite green, no regressions in Phases 1–5 tests.
2. `python -m pytest tests/test_query_understanding.py tests/test_conversation_intelligence.py -v` — every FU/MT/CT/TT/NT scenario from spec §9 has a passing, named test.
3. Manually trace Example A–E from spec §5.4 against `QueryUnderstanding.analyse()` output to confirm `resolved_topics`/`intent` match the documented expectations exactly.
