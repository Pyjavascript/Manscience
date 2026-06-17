"""Unit tests for app.rag.retriever.FileSystemRetriever."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.rag.models import Intent, QueryContext, QuestionType
from app.rag.retriever import FileSystemRetriever, _MAX_TOTAL


def _make_doc(
    slug: str,
    page_type: str,
    source_url: str = "https://example.com",
    body_paragraphs: list[str] | None = None,
    internal_links: list[dict] | None = None,
    extraction_complete: bool = True,
) -> dict:
    return {
        "slug": slug,
        "page_type": page_type,
        "source_url": source_url,
        "page_title": f"{slug.title()} — Mansi",
        "h1": slug.title(),
        "body_paragraphs": body_paragraphs or [f"{slug} is a condition/therapy."],
        "headings": [{"level": 1, "text": slug.title()}],
        "lists": [],
        "internal_links": internal_links or [],
        "extraction_complete": extraction_complete,
        "meta_description": None,
        "canonical_url": None,
    }


def _write_doc(tmp_path: Path, page_type: str, slug: str, **kwargs) -> None:
    directory = tmp_path / page_type
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{slug}.json"
    path.write_text(json.dumps(_make_doc(slug, page_type, **kwargs)), encoding="utf-8")


def _make_qc(
    intent: Intent,
    conditions: tuple[str, ...] = (),
    therapies: tuple[str, ...] = (),
) -> QueryContext:
    resolved = tuple(dict.fromkeys(conditions + therapies))
    return QueryContext(
        intent=intent,
        question_type=QuestionType.GENERAL,
        mentioned_conditions=conditions,
        mentioned_therapies=therapies,
        resolved_topics=resolved,
        is_follow_up=False,
        confidence=0.9,
    )


# --- Empty state ---

def test_returns_empty_list_when_no_data(tmp_path):
    r = FileSystemRetriever(normalized_dir=tmp_path)
    qc = _make_qc(Intent.CONDITION_LOOKUP, conditions=("adhd",))
    results = r.retrieve(qc)
    assert results == []


def test_returns_empty_list_for_unknown_slug(tmp_path):
    _write_doc(tmp_path, "conditions", "autism")
    r = FileSystemRetriever(normalized_dir=tmp_path)
    qc = _make_qc(Intent.CONDITION_LOOKUP, conditions=("adhd",))
    results = r.retrieve(qc)
    assert results == []


# --- Exact match ---

def test_exact_match_condition_returns_score_1(tmp_path):
    _write_doc(tmp_path, "conditions", "adhd")
    r = FileSystemRetriever(normalized_dir=tmp_path)
    qc = _make_qc(Intent.CONDITION_LOOKUP, conditions=("adhd",))
    results = r.retrieve(qc)
    assert len(results) == 1
    assert results[0].slug == "adhd"
    assert results[0].relevance_score == 1.0
    assert results[0].match_type == "exact"


def test_exact_match_therapy_returns_score_1(tmp_path):
    _write_doc(tmp_path, "therapies", "cbt")
    r = FileSystemRetriever(normalized_dir=tmp_path)
    qc = _make_qc(Intent.THERAPY_LOOKUP, therapies=("cbt",))
    results = r.retrieve(qc)
    assert len(results) == 1
    assert results[0].slug == "cbt"
    assert results[0].relevance_score == 1.0


def test_loads_correct_doc_fields(tmp_path):
    _write_doc(tmp_path, "conditions", "adhd", source_url="https://mansi.co/conditions/adhd")
    r = FileSystemRetriever(normalized_dir=tmp_path)
    qc = _make_qc(Intent.CONDITION_LOOKUP, conditions=("adhd",))
    results = r.retrieve(qc)
    doc = results[0].content
    assert doc.slug == "adhd"
    assert doc.page_type == "conditions"
    assert doc.source_url == "https://mansi.co/conditions/adhd"
    assert doc.extraction_complete is True


# --- Related content ---

def test_related_content_follows_internal_links(tmp_path):
    _write_doc(
        tmp_path, "conditions", "adhd",
        internal_links=[{"href": "/therapies/cbt", "anchor_text": "CBT", "target_type": "therapies"}],
    )
    _write_doc(tmp_path, "therapies", "cbt")
    r = FileSystemRetriever(normalized_dir=tmp_path)
    qc = _make_qc(Intent.THERAPY_FOR_CONDITION, conditions=("adhd",))
    results = r.retrieve(qc)
    slugs = {r.slug for r in results}
    assert "adhd" in slugs
    assert "cbt" in slugs
    related = next(r for r in results if r.slug == "cbt")
    assert related.match_type == "related"
    assert related.relevance_score == 0.7


def test_related_content_not_duplicated(tmp_path):
    _write_doc(
        tmp_path, "conditions", "adhd",
        internal_links=[{"href": "/therapies/cbt", "target_type": "therapies"}],
    )
    _write_doc(tmp_path, "therapies", "cbt")
    r = FileSystemRetriever(normalized_dir=tmp_path)
    qc = _make_qc(Intent.THERAPY_FOR_CONDITION, conditions=("adhd",), therapies=("cbt",))
    results = r.retrieve(qc)
    slugs = [r.slug for r in results]
    assert slugs.count("cbt") == 1


# --- Cross-reference ---

def test_cross_reference_for_comparison_intent(tmp_path):
    _write_doc(tmp_path, "conditions", "adhd")
    _write_doc(tmp_path, "conditions", "autism")
    r = FileSystemRetriever(normalized_dir=tmp_path)
    qc = _make_qc(Intent.COMPARISON, conditions=("adhd", "autism"))
    results = r.retrieve(qc)
    slugs = {r.slug for r in results}
    assert "adhd" in slugs
    assert "autism" in slugs


# --- Limits ---

def test_max_total_cap_respected(tmp_path):
    for i in range(15):
        _write_doc(tmp_path, "conditions", f"condition-{i}")
    r = FileSystemRetriever(normalized_dir=tmp_path)
    topics = tuple(f"condition-{i}" for i in range(15))
    qc = _make_qc(Intent.COMPARISON, conditions=topics)
    results = r.retrieve(qc)
    assert len(results) <= _MAX_TOTAL


# --- Result ordering ---

def test_results_ordered_by_score_descending(tmp_path):
    _write_doc(tmp_path, "conditions", "adhd")
    _write_doc(
        tmp_path, "conditions", "autism",
        internal_links=[{"href": "/therapies/cbt", "target_type": "therapies"}],
    )
    _write_doc(tmp_path, "therapies", "cbt")
    r = FileSystemRetriever(normalized_dir=tmp_path)
    qc = _make_qc(Intent.COMPARISON, conditions=("adhd", "autism"))
    results = r.retrieve(qc)
    scores = [res.relevance_score for res in results]
    assert scores == sorted(scores, reverse=True)


# --- Error resilience ---

def test_graceful_on_malformed_json(tmp_path):
    (tmp_path / "conditions").mkdir()
    (tmp_path / "conditions" / "adhd.json").write_text("NOT VALID JSON", encoding="utf-8")
    r = FileSystemRetriever(normalized_dir=tmp_path)
    qc = _make_qc(Intent.CONDITION_LOOKUP, conditions=("adhd",))
    results = r.retrieve(qc)
    assert results == []


def test_graceful_on_missing_required_field(tmp_path):
    (tmp_path / "conditions").mkdir()
    (tmp_path / "conditions" / "adhd.json").write_text(
        json.dumps({"page_type": "conditions"}),  # missing "slug"
        encoding="utf-8",
    )
    r = FileSystemRetriever(normalized_dir=tmp_path)
    qc = _make_qc(Intent.CONDITION_LOOKUP, conditions=("adhd",))
    results = r.retrieve(qc)
    assert results == []


def test_never_raises_on_retriever_error(tmp_path):
    r = FileSystemRetriever(normalized_dir=tmp_path)
    qc = _make_qc(Intent.UNKNOWN)
    results = r.retrieve(qc)
    assert isinstance(results, list)
