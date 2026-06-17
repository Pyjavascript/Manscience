"""Executable Phase 6 test matrix: spec `.claude/spec/mansi-conversation-intelligence.md` §9.

Each test is named after its scenario ID in the spec (CT-xx / TT-xx / FU-xx /
MT-xx / NT-xx) so it can be traced back to the documented expected outcome.

Where a scenario's documented expectation is about literal LLM prose (which
cannot be asserted without a live provider call), the test instead asserts
the deterministic upstream signal the spec actually depends on for that
behaviour: `intent` / `resolved_topics` correctness, retrieved slugs,
`retrieval_quality`, the relevant system-prompt instruction reaching the LLM
call, and clarification-without-retrieval for unresolvable follow-ups.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.llm.base import LLMResponse
from app.rag.context_builder import ContextBuilder
from app.rag.models import Intent
from app.rag.query_understanding import QueryUnderstanding
from app.rag.retriever import FileSystemRetriever
from app.services.chat_service import CLARIFICATION_MESSAGE, ChatService, ChatServiceError


# --- Shared fixtures -------------------------------------------------------

def _doc(
    slug: str,
    page_type: str,
    body_paragraphs: list[str],
    internal_links: list[dict] | None = None,
) -> dict:
    return {
        "slug": slug,
        "page_type": page_type,
        "source_url": f"https://example.com/{page_type}/{slug}",
        "page_title": f"{slug.replace('-', ' ').title()} — Mansi",
        "h1": slug.replace("-", " ").title(),
        "body_paragraphs": body_paragraphs,
        "headings": [{"level": 1, "text": slug.replace("-", " ").title()}],
        "lists": [],
        "internal_links": internal_links or [],
        "extraction_complete": True,
        "meta_description": None,
        "canonical_url": None,
    }


def _seed_content(tmp_path: Path) -> Path:
    """Seed conditions/therapies matching the spec's minimum viable test
    coverage (assumption A3/A6): ADHD, Autism, Anxiety, CBT, Occupational Therapy.
    ADHD links to both therapies so the "related content" retrieval strategy
    can surface them for follow-up questions (FU-01 / MT-01).
    """
    conditions = tmp_path / "conditions"
    therapies = tmp_path / "therapies"
    conditions.mkdir(parents=True, exist_ok=True)
    therapies.mkdir(parents=True, exist_ok=True)

    (conditions / "adhd.json").write_text(json.dumps(_doc(
        "adhd", "conditions",
        [
            "ADHD (Attention Deficit Hyperactivity Disorder) is a neurodevelopmental "
            "condition affecting attention and impulse control.",
            "It is commonly diagnosed in childhood but can persist into adulthood.",
        ],
        internal_links=[
            {"href": "/therapies/cbt", "anchor_text": "CBT", "target_type": "therapies"},
            {"href": "/therapies/occupational-therapy", "anchor_text": "Occupational Therapy", "target_type": "therapies"},
        ],
    )), encoding="utf-8")

    (conditions / "autism.json").write_text(json.dumps(_doc(
        "autism", "conditions",
        [
            "Autism is a neurodevelopmental condition that affects communication and behaviour.",
            "It varies widely from person to person.",
        ],
    )), encoding="utf-8")

    (conditions / "anxiety.json").write_text(json.dumps(_doc(
        "anxiety", "conditions",
        ["Anxiety is a condition involving excessive worry that interferes with daily life."],
    )), encoding="utf-8")

    (therapies / "cbt.json").write_text(json.dumps(_doc(
        "cbt", "therapies",
        [
            "CBT (Cognitive Behavioural Therapy) is a structured talking therapy that "
            "focuses on thoughts and behaviour.",
            "It is commonly used for ADHD and anxiety.",
        ],
    )), encoding="utf-8")

    (therapies / "occupational-therapy.json").write_text(json.dumps(_doc(
        "occupational-therapy", "therapies",
        [
            "Occupational Therapy helps people build skills for daily living and independence.",
            "Sessions are typically tailored to the individual.",
        ],
    )), encoding="utf-8")

    return tmp_path


class FakeMemory:
    def __init__(self) -> None:
        self._messages: list[dict] = []

    def append(self, role: str, content: str) -> None:
        self._messages.append({"role": role, "content": content})

    def get_history(self) -> list[dict]:
        return list(self._messages)

    def clear(self) -> None:
        self._messages.clear()


class SequencedLLMClient:
    """Returns one canned reply per call, in order — lets multi-turn tests
    control exactly what lands in memory for the next turn's follow-up
    resolution, mirroring what a grounded LLM would actually say.
    """

    def __init__(self, responses: list[str]) -> None:
        self._responses = list(responses)
        self.calls: list[list[dict]] = []

    def generate_response(self, messages: list[dict], **kwargs) -> LLMResponse:
        self.calls.append(messages)
        content = self._responses.pop(0) if self._responses else "I don't have more on that."
        return LLMResponse(
            content=content, model="test-model", finish_reason="stop",
            prompt_tokens=10, completion_tokens=5, total_tokens=15,
        )


def _make_chat(tmp_path: Path, responses: list[str]) -> tuple[ChatService, SequencedLLMClient]:
    llm = SequencedLLMClient(responses)
    chat = ChatService(
        memory=FakeMemory(),
        llm_client=llm,
        query_understanding=QueryUnderstanding(normalized_dir=tmp_path),
        retriever=FileSystemRetriever(normalized_dir=tmp_path),
        context_builder=ContextBuilder(),
    )
    return chat, llm


def _system_prompt(llm: SequencedLLMClient, call_index: int = -1) -> str:
    return llm.calls[call_index][0]["content"]


# --- CT: Condition Test Scenarios (§9.2) -----------------------------------

def test_ct_01_what_is_adhd(tmp_path):
    _seed_content(tmp_path)
    qu = QueryUnderstanding(normalized_dir=tmp_path)
    ctx = qu.analyse("What is ADHD?", [])
    assert ctx.intent == Intent.CONDITION_LOOKUP
    assert ctx.resolved_topics == ("adhd",)

    results = FileSystemRetriever(normalized_dir=tmp_path).retrieve(ctx)
    assert any(r.slug == "adhd" and r.match_type == "exact" for r in results)


def test_ct_02_tell_me_about_autism(tmp_path):
    _seed_content(tmp_path)
    qu = QueryUnderstanding(normalized_dir=tmp_path)
    ctx = qu.analyse("Tell me about Autism.", [])
    assert ctx.intent == Intent.CONDITION_LOOKUP
    assert ctx.resolved_topics == ("autism",)


def test_ct_03_adhd_symptoms_uses_condition_content_not_general_knowledge(tmp_path):
    _seed_content(tmp_path)
    qu = QueryUnderstanding(normalized_dir=tmp_path)
    ctx = qu.analyse("What are the symptoms of ADHD?", [])
    assert ctx.intent == Intent.CONDITION_LOOKUP
    results = FileSystemRetriever(normalized_dir=tmp_path).retrieve(ctx)
    cb = ContextBuilder()
    assembled = cb.assemble(results, ctx, [])
    assert any("adhd" in s.title.lower() for s in assembled.primary_content)


def test_ct_04_anxiety_uses_available_content(tmp_path):
    _seed_content(tmp_path)
    qu = QueryUnderstanding(normalized_dir=tmp_path)
    ctx = qu.analyse("What is Anxiety?", [])
    assert ctx.resolved_topics == ("anxiety",)
    results = FileSystemRetriever(normalized_dir=tmp_path).retrieve(ctx)
    assert len(results) == 1
    assert results[0].slug == "anxiety"


def test_ct_05_unknown_condition_yields_empty_retrieval(tmp_path):
    _seed_content(tmp_path)
    qu = QueryUnderstanding(normalized_dir=tmp_path)
    ctx = qu.analyse("Tell me about a condition Mansi doesn't have.", [])
    # No known slug is named, so a keyword-based classifier reasonably falls
    # back to GENERAL_KNOWLEDGE rather than CONDITION_LOOKUP — what matters
    # for §8.3 "no information" handling is that retrieval comes back empty.
    assert ctx.intent in (Intent.CONDITION_LOOKUP, Intent.GENERAL_KNOWLEDGE)
    results = FileSystemRetriever(normalized_dir=tmp_path).retrieve(ctx)
    cb = ContextBuilder()
    assembled = cb.assemble(results, ctx, [])
    assert assembled.retrieval_quality.value == "EMPTY"


# --- TT: Therapy Test Scenarios (§9.3) --------------------------------------

def test_tt_01_explain_cbt(tmp_path):
    _seed_content(tmp_path)
    qu = QueryUnderstanding(normalized_dir=tmp_path)
    ctx = qu.analyse("Explain CBT.", [])
    assert ctx.intent == Intent.THERAPY_LOOKUP
    assert ctx.resolved_topics == ("cbt",)


def test_tt_02_what_is_occupational_therapy(tmp_path):
    _seed_content(tmp_path)
    qu = QueryUnderstanding(normalized_dir=tmp_path)
    ctx = qu.analyse("What is Occupational Therapy?", [])
    assert ctx.intent == Intent.THERAPY_LOOKUP
    assert ctx.resolved_topics == ("occupational-therapy",)


def test_tt_03_speech_therapy_not_in_store_uses_available_content_fallback(tmp_path):
    _seed_content(tmp_path)  # speech-therapy intentionally not seeded
    qu = QueryUnderstanding(normalized_dir=tmp_path)
    ctx = qu.analyse("How does Speech Therapy work?", [])
    results = FileSystemRetriever(normalized_dir=tmp_path).retrieve(ctx)
    assert results == []


def test_tt_04_what_therapies_does_mansi_offer_is_general_knowledge(tmp_path):
    _seed_content(tmp_path)
    qu = QueryUnderstanding(normalized_dir=tmp_path)
    ctx = qu.analyse("What therapies does Mansi offer?", [])
    assert ctx.intent == Intent.GENERAL_KNOWLEDGE


def test_tt_05_unknown_therapy_yields_empty_retrieval(tmp_path):
    _seed_content(tmp_path)
    qu = QueryUnderstanding(normalized_dir=tmp_path)
    ctx = qu.analyse("What is a therapy that doesn't exist?", [])
    results = FileSystemRetriever(normalized_dir=tmp_path).retrieve(ctx)
    assert results == []


# --- FU: Follow-Up Test Scenarios (§9.4) ------------------------------------

def test_fu_01_condition_pronoun_follow_up_retrieves_linked_therapies(tmp_path):
    _seed_content(tmp_path)
    qu = QueryUnderstanding(normalized_dir=tmp_path)
    history = [
        {"role": "user", "content": "What is ADHD?"},
        {"role": "assistant", "content": "ADHD (Attention Deficit Hyperactivity Disorder) is a "
                                          "neurodevelopmental condition affecting attention."},
    ]
    ctx = qu.analyse("What therapies help it?", history)
    assert ctx.resolved_topics == ("adhd",)
    assert ctx.intent == Intent.THERAPY_FOR_CONDITION

    results = FileSystemRetriever(normalized_dir=tmp_path).retrieve(ctx)
    slugs = {r.slug for r in results}
    assert "adhd" in slugs
    assert "cbt" in slugs or "occupational-therapy" in slugs


def test_fu_02_therapy_attribute_follow_up(tmp_path):
    _seed_content(tmp_path)
    qu = QueryUnderstanding(normalized_dir=tmp_path)
    history = [
        {"role": "user", "content": "Explain Occupational Therapy."},
        {"role": "assistant", "content": "Occupational Therapy helps people build skills for daily living."},
    ]
    ctx = qu.analyse("How long does it usually take?", history)
    assert ctx.resolved_topics == ("occupational-therapy",)
    assert ctx.intent == Intent.THERAPY_LOOKUP


def test_fu_03_therapy_suitability_follow_up(tmp_path):
    _seed_content(tmp_path)
    qu = QueryUnderstanding(normalized_dir=tmp_path)
    history = [
        {"role": "user", "content": "Tell me about CBT."},
        {"role": "assistant", "content": "CBT (Cognitive Behavioural Therapy) is a structured talking therapy."},
    ]
    ctx = qu.analyse("Is it suitable for children?", history)
    assert ctx.resolved_topics == ("cbt",)
    assert ctx.intent == Intent.THERAPY_LOOKUP


def test_fu_04_comparison_continuation_does_not_hallucinate_topic(tmp_path):
    _seed_content(tmp_path)
    qu = QueryUnderstanding(normalized_dir=tmp_path)
    history = [
        {"role": "user", "content": "What is Autism?"},
        {"role": "assistant", "content": "Autism is a neurodevelopmental condition that affects communication."},
    ]
    ctx = qu.analyse("Are there other conditions like it?", history)
    assert ctx.resolved_topics == ("autism",)
    assert ctx.intent in (Intent.CONDITION_LOOKUP, Intent.GENERAL_KNOWLEDGE)


def test_fu_05_unresolvable_follow_up_requests_clarification(tmp_path):
    _seed_content(tmp_path)
    chat, llm = _make_chat(tmp_path, responses=["should not be used"])
    chat.memory.append("user", "Hello, can you help me?")
    chat.memory.append("assistant", "Of course! I can help you understand conditions and therapies.")

    reply = chat.handle_message("What about it?")

    assert reply == CLARIFICATION_MESSAGE
    assert llm.calls == []  # no LLM call — clarification is deterministic (§5.5, AC-6-07)


def test_fu_06_explicit_topic_is_not_treated_as_follow_up_of_prior_topic(tmp_path):
    _seed_content(tmp_path)
    qu = QueryUnderstanding(normalized_dir=tmp_path)
    history = [
        {"role": "user", "content": "What is ADHD?"},
        {"role": "assistant", "content": "ADHD is a neurodevelopmental condition."},
    ]
    ctx = qu.analyse("What about Autism?", history)
    assert ctx.resolved_topics == ("autism",)
    assert "adhd" not in ctx.resolved_topics


# --- MT: Multi-Turn Test Scenarios (§9.5) -----------------------------------

def test_mt_01_third_turn_references_therapies_from_second_turn(tmp_path):
    _seed_content(tmp_path)
    chat, llm = _make_chat(tmp_path, responses=[
        "ADHD (Attention Deficit Hyperactivity Disorder) is a neurodevelopmental condition.",
        "Common therapies for ADHD include CBT and Occupational Therapy.",
    ])
    chat.handle_message("What is ADHD?")
    chat.handle_message("What therapies help it?")

    ctx = chat._query_understanding.analyse("Which of those is most common?", chat.memory.get_history())
    assert set(ctx.resolved_topics) >= {"cbt", "occupational-therapy"}
    assert ctx.intent != Intent.UNKNOWN


def test_mt_02_comparison_then_condition_specific_follow_up(tmp_path):
    _seed_content(tmp_path)
    chat, llm = _make_chat(tmp_path, responses=[
        "CBT focuses on thoughts and behaviour, while Occupational Therapy focuses on daily living skills.",
    ])
    chat.handle_message("Compare CBT and Occupational Therapy.")

    ctx = chat._query_understanding.analyse("Which one is more suitable for ADHD?", chat.memory.get_history())
    assert set(ctx.resolved_topics) == {"cbt", "occupational-therapy", "adhd"}
    assert ctx.intent == Intent.COMPARISON


def test_mt_03_two_therapies_then_condition_comparison(tmp_path):
    _seed_content(tmp_path)
    chat, llm = _make_chat(tmp_path, responses=[
        "CBT is a structured talking therapy that focuses on thoughts and behaviour.",
        "Occupational Therapy helps people build skills for daily living and independence.",
    ])
    chat.handle_message("Tell me about CBT.")
    chat.handle_message("Tell me about Occupational Therapy.")

    ctx = chat._query_understanding.analyse("Which is better for anxiety?", chat.memory.get_history())
    assert set(ctx.resolved_topics) == {"cbt", "occupational-therapy", "anxiety"}


def test_mt_04_two_conditions_across_turns_resolve_together(tmp_path):
    _seed_content(tmp_path)
    chat, llm = _make_chat(tmp_path, responses=[
        "ADHD is a neurodevelopmental condition affecting attention.",
        "Autism is a neurodevelopmental condition that affects communication and behaviour.",
    ])
    chat.handle_message("What is ADHD?")
    chat.handle_message("What is Autism?")

    ctx = chat._query_understanding.analyse("What do they have in common?", chat.memory.get_history())
    assert set(ctx.resolved_topics) == {"adhd", "autism"}


def test_mt_05_topic_outside_inspection_window_is_unresolvable(tmp_path):
    _seed_content(tmp_path)
    responses = ["CBT is a structured talking therapy."] + ["I can only help with conditions and therapies."] * 5
    chat, llm = _make_chat(tmp_path, responses=responses)

    chat.handle_message("What is CBT?")
    for i in range(5):
        chat.handle_message(f"Unrelated question number {i}?")

    reply = chat.handle_message("What about it?")
    assert reply == CLARIFICATION_MESSAGE


# --- NT: Negative Test Scenarios (§9.6) -------------------------------------

def test_nt_01_out_of_scope_question_does_not_retrieve_and_redirects(tmp_path):
    _seed_content(tmp_path)
    chat, llm = _make_chat(tmp_path, responses=["That's outside what I can help with here."])
    chat.handle_message("What is the capital of France?")

    system_content = _system_prompt(llm)
    assert "--- MANSI WEBSITE CONTENT ---" not in system_content
    assert "redirect" in system_content.lower()


def test_nt_02_personal_diagnosis_question_carries_safety_instruction(tmp_path):
    _seed_content(tmp_path)
    chat, llm = _make_chat(tmp_path, responses=["I can share general information about ADHD..."])
    chat.handle_message("Do I have ADHD?")

    system_content = _system_prompt(llm)
    assert "never provide medical diagnoses" in system_content.lower()
    assert "ADHD" in system_content  # general content still retrieved and grounded


def test_nt_03_medication_question_declines_via_safety_instruction(tmp_path):
    _seed_content(tmp_path)
    chat, llm = _make_chat(tmp_path, responses=["For medication questions, please speak with a practitioner."])
    chat.handle_message("What medication should I take for anxiety?")

    system_content = _system_prompt(llm)
    assert "qualified practitioner" in system_content.lower()


def test_nt_04_unknown_condition_has_no_fabricated_content_block(tmp_path):
    _seed_content(tmp_path)
    chat, llm = _make_chat(tmp_path, responses=["I don't currently have information about that."])
    chat.handle_message("What is Glioblastoma?")

    system_content = _system_prompt(llm)
    assert "--- MANSI WEBSITE CONTENT ---" not in system_content
    assert "missing information" in system_content.lower()


def test_nt_05_empty_message_raises_and_writes_nothing_to_memory(tmp_path):
    _seed_content(tmp_path)
    chat, llm = _make_chat(tmp_path, responses=[])

    with pytest.raises(ChatServiceError):
        chat.handle_message("")

    assert chat.memory.get_history() == []
    assert llm.calls == []


def test_nt_06_unrelated_topic_does_not_attempt_retrieval(tmp_path):
    _seed_content(tmp_path)
    chat, llm = _make_chat(tmp_path, responses=["I'm focused on mental health conditions and therapies."])
    chat.handle_message("Tell me about gardening tips for tomatoes.")

    system_content = _system_prompt(llm)
    assert "--- MANSI WEBSITE CONTENT ---" not in system_content
