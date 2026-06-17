"""Unit tests for app.rag.context_builder.ContextBuilder."""

from __future__ import annotations

import pytest

from app.rag.context_builder import ContextBuilder, _GOOD_QUALITY_THRESHOLD, _MIN_SCORE
from app.rag.models import Intent, NormalisedDoc, QueryContext, QuestionType, RetrievalQuality, RetrievalResult


def _make_doc(
    slug: str = "adhd",
    page_type: str = "conditions",
    extraction_complete: bool = True,
    body_paragraphs: tuple[str, ...] = ("ADHD is a condition.", "It affects attention."),
    lists: tuple[dict, ...] = ({"list_type": "unordered", "items": ["Inattention", "Hyperactivity"]},),
    internal_links: tuple[dict, ...] = (),
) -> NormalisedDoc:
    return NormalisedDoc(
        slug=slug,
        page_type=page_type,
        source_url=f"https://example.com/{page_type}/{slug}",
        page_title=f"{slug.title()} — Mansi",
        h1=slug.title(),
        body_paragraphs=body_paragraphs,
        headings=({"level": 1, "text": slug.title()},),
        lists=lists,
        internal_links=internal_links,
        extraction_complete=extraction_complete,
    )


def _make_result(
    slug: str = "adhd",
    match_type: str = "exact",
    relevance_score: float = 1.0,
    extraction_complete: bool = True,
) -> RetrievalResult:
    doc = _make_doc(slug=slug, extraction_complete=extraction_complete)
    return RetrievalResult(
        slug=slug,
        page_type=doc.page_type,
        source_url=doc.source_url,
        page_title=doc.page_title,
        match_type=match_type,
        relevance_score=relevance_score,
        content=doc,
    )


def _make_qc(
    intent: Intent = Intent.CONDITION_LOOKUP,
    conditions: tuple[str, ...] = ("adhd",),
    therapies: tuple[str, ...] = (),
    is_follow_up: bool = False,
) -> QueryContext:
    resolved = tuple(dict.fromkeys(conditions + therapies))
    return QueryContext(
        intent=intent,
        question_type=QuestionType.DEFINITION,
        mentioned_conditions=conditions,
        mentioned_therapies=therapies,
        resolved_topics=resolved,
        is_follow_up=is_follow_up,
        confidence=0.9,
    )


cb = ContextBuilder()


# --- Empty and no-result scenarios ---

def test_empty_results_returns_empty_quality():
    ctx = cb.assemble([], _make_qc(), [])
    assert ctx.retrieval_quality == RetrievalQuality.EMPTY
    assert ctx.primary_content == ()
    assert ctx.supporting_content == ()


# --- Relevance filtering ---

def test_low_score_results_filtered_out():
    low = _make_result(slug="adhd", relevance_score=_MIN_SCORE - 0.01)
    ctx = cb.assemble([low], _make_qc(), [])
    assert ctx.retrieval_quality == RetrievalQuality.EMPTY


def test_score_at_threshold_is_included():
    at_threshold = _make_result(slug="adhd", relevance_score=_MIN_SCORE)
    ctx = cb.assemble([at_threshold], _make_qc(), [])
    assert ctx.retrieval_quality != RetrievalQuality.EMPTY


def test_extraction_incomplete_filtered_out():
    incomplete = _make_result(slug="adhd", extraction_complete=False)
    ctx = cb.assemble([incomplete], _make_qc(), [])
    assert ctx.retrieval_quality == RetrievalQuality.EMPTY


# --- Deduplication ---

def test_deduplication_keeps_highest_score():
    high = _make_result(slug="adhd", match_type="exact", relevance_score=1.0)
    low = _make_result(slug="adhd", match_type="related", relevance_score=0.7)
    ctx = cb.assemble([low, high], _make_qc(), [])
    all_sections = list(ctx.primary_content) + list(ctx.supporting_content)
    slugs = [s.slug for s in all_sections]
    assert slugs.count("adhd") == 1
    adhd_section = next(s for s in all_sections if s.slug == "adhd")
    assert adhd_section.relevance_score == 1.0


# --- Quality assessment ---

def test_good_quality_when_primary_score_above_threshold():
    result = _make_result(slug="adhd", relevance_score=_GOOD_QUALITY_THRESHOLD)
    ctx = cb.assemble([result], _make_qc(), [])
    assert ctx.retrieval_quality == RetrievalQuality.GOOD


def test_partial_quality_when_score_below_threshold():
    result = _make_result(slug="adhd", relevance_score=_MIN_SCORE)
    ctx = cb.assemble([result], _make_qc(intent=Intent.GENERAL_KNOWLEDGE, conditions=()), [])
    assert ctx.retrieval_quality in (RetrievalQuality.PARTIAL, RetrievalQuality.EMPTY)


# --- Content section extraction ---

def test_section_title_uses_page_title():
    result = _make_result(slug="adhd")
    ctx = cb.assemble([result], _make_qc(), [])
    all_sections = list(ctx.primary_content) + list(ctx.supporting_content)
    assert any("Adhd" in s.title or "ADHD" in s.title for s in all_sections)


def test_section_summary_from_first_two_paragraphs():
    result = _make_result(slug="adhd")
    ctx = cb.assemble([result], _make_qc(), [])
    all_sections = list(ctx.primary_content) + list(ctx.supporting_content)
    adhd = next(s for s in all_sections if s.slug == "adhd")
    assert "ADHD is a condition" in adhd.summary


def test_section_bullets_from_first_list():
    result = _make_result(slug="adhd")
    ctx = cb.assemble([result], _make_qc(), [])
    all_sections = list(ctx.primary_content) + list(ctx.supporting_content)
    adhd = next(s for s in all_sections if s.slug == "adhd")
    assert "Inattention" in adhd.bullets


# --- Prioritisation ---

def test_relational_intent_puts_mentioned_topics_in_primary():
    adhd = _make_result(slug="adhd", match_type="exact", relevance_score=1.0)
    cbt = _make_result(slug="cbt", match_type="related", relevance_score=0.7)
    qc = _make_qc(intent=Intent.THERAPY_FOR_CONDITION, conditions=("adhd",), therapies=("cbt",))
    ctx = cb.assemble([adhd, cbt], qc, [])
    primary_slugs = {s.slug for s in ctx.primary_content}
    assert "adhd" in primary_slugs
    assert "cbt" in primary_slugs


# --- History integration ---

def test_history_included_in_context():
    # History is only included for follow-ups / comparisons (spec §6.4).
    result = _make_result(slug="adhd")
    history = [
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": "hello"},
    ]
    ctx = cb.assemble([result], _make_qc(is_follow_up=True), history)
    assert len(ctx.history_context) >= 1


def test_history_capped_at_three_turns(tmp_path=None):
    result = _make_result(slug="adhd")
    # 8 turns = 4 user-assistant pairs → should be capped
    history = [{"role": "user" if i % 2 == 0 else "assistant", "content": f"msg {i}"} for i in range(8)]
    ctx = cb.assemble([result], _make_qc(is_follow_up=True), history)
    assert len(ctx.history_context) <= 6  # max 3 pairs = 6 messages


def test_history_omitted_when_not_follow_up_or_comparison():
    # Standalone (non-follow-up, non-comparison) questions omit history
    # entirely to save token budget (spec §6.4).
    result = _make_result(slug="adhd")
    history = [
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": "hello"},
    ]
    ctx = cb.assemble([result], _make_qc(is_follow_up=False), history)
    assert ctx.history_context == ()


def test_empty_history_produces_empty_history_context():
    result = _make_result(slug="adhd")
    ctx = cb.assemble([result], _make_qc(), [])
    assert ctx.history_context == ()


# --- Metadata ---

def test_metadata_contains_retrieval_quality():
    result = _make_result(slug="adhd")
    ctx = cb.assemble([result], _make_qc(), [])
    assert "retrieval_quality" in ctx.metadata


def test_metadata_contains_intent():
    result = _make_result(slug="adhd")
    ctx = cb.assemble([result], _make_qc(), [])
    assert ctx.metadata["intent"] == Intent.CONDITION_LOOKUP.value


# --- Error safety ---

def test_never_raises_on_empty_input():
    ctx = cb.assemble([], _make_qc(), [])
    assert ctx is not None
    assert ctx.retrieval_quality == RetrievalQuality.EMPTY
