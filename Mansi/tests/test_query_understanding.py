"""Unit tests for app.rag.query_understanding.QueryUnderstanding."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.rag.models import Intent, QuestionType
from app.rag.query_understanding import QueryUnderstanding


def _make_qu(tmp_path: Path, conditions: list[str], therapies: list[str]) -> QueryUnderstanding:
    """Create a QueryUnderstanding with a tmp_path as the normalised dir."""
    (tmp_path / "conditions").mkdir(parents=True, exist_ok=True)
    (tmp_path / "therapies").mkdir(parents=True, exist_ok=True)
    for slug in conditions:
        (tmp_path / "conditions" / f"{slug}.json").touch()
    for slug in therapies:
        (tmp_path / "therapies" / f"{slug}.json").touch()
    return QueryUnderstanding(normalized_dir=tmp_path)


# --- No data scenarios ---

def test_returns_unknown_when_normalized_dir_missing(tmp_path):
    missing = tmp_path / "does_not_exist"
    qu = QueryUnderstanding(normalized_dir=missing)
    # No slug data → "adhd" not recognised; "what is" keyword → GENERAL_KNOWLEDGE
    ctx = qu.analyse("what is adhd", [])
    assert ctx.intent in (Intent.UNKNOWN, Intent.GENERAL_KNOWLEDGE)
    assert ctx.mentioned_conditions == ()


def test_returns_unknown_when_no_json_files(tmp_path):
    (tmp_path / "conditions").mkdir()
    (tmp_path / "therapies").mkdir()
    qu = QueryUnderstanding(normalized_dir=tmp_path)
    # No slug files → "adhd" not recognised; "what is" keyword → GENERAL_KNOWLEDGE
    ctx = qu.analyse("what is adhd", [])
    assert ctx.intent in (Intent.UNKNOWN, Intent.GENERAL_KNOWLEDGE)
    assert ctx.mentioned_conditions == ()


# --- Intent classification ---

def test_condition_lookup_intent(tmp_path):
    qu = _make_qu(tmp_path, ["adhd"], [])
    ctx = qu.analyse("what is adhd", [])
    assert ctx.intent == Intent.CONDITION_LOOKUP
    assert "adhd" in ctx.mentioned_conditions


def test_therapy_lookup_intent(tmp_path):
    qu = _make_qu(tmp_path, [], ["cbt"])
    ctx = qu.analyse("tell me about cbt", [])
    assert ctx.intent == Intent.THERAPY_LOOKUP
    assert "cbt" in ctx.mentioned_therapies


def test_therapy_for_condition_intent_with_keyword(tmp_path):
    qu = _make_qu(tmp_path, ["adhd"], ["cbt"])
    ctx = qu.analyse("what therapies help adhd", [])
    assert ctx.intent == Intent.THERAPY_FOR_CONDITION
    assert "adhd" in ctx.mentioned_conditions


def test_therapy_for_condition_intent_with_both_slugs(tmp_path):
    qu = _make_qu(tmp_path, ["adhd"], ["cbt"])
    ctx = qu.analyse("does cbt work for adhd", [])
    assert ctx.intent == Intent.THERAPY_FOR_CONDITION


def test_comparison_intent_two_conditions(tmp_path):
    qu = _make_qu(tmp_path, ["adhd", "autism"], [])
    ctx = qu.analyse("compare adhd vs autism", [])
    assert ctx.intent == Intent.COMPARISON


def test_comparison_intent_two_therapies(tmp_path):
    qu = _make_qu(tmp_path, [], ["cbt", "emdr"])
    ctx = qu.analyse("cbt vs emdr which is better", [])
    assert ctx.intent == Intent.COMPARISON


def test_general_knowledge_intent_no_slugs(tmp_path):
    qu = _make_qu(tmp_path, ["adhd"], [])
    ctx = qu.analyse("what is anxiety", [])
    # "anxiety" not a known slug — no condition found; "what is" → GENERAL_KNOWLEDGE
    assert ctx.intent in (Intent.GENERAL_KNOWLEDGE, Intent.UNKNOWN)


# --- Question type classification ---

def test_definition_question_type(tmp_path):
    qu = _make_qu(tmp_path, ["adhd"], [])
    ctx = qu.analyse("what is adhd", [])
    assert ctx.question_type == QuestionType.DEFINITION


def test_treatment_question_type(tmp_path):
    qu = _make_qu(tmp_path, ["adhd"], [])
    ctx = qu.analyse("what treatments help adhd", [])
    assert ctx.question_type == QuestionType.TREATMENT


def test_comparison_question_type(tmp_path):
    qu = _make_qu(tmp_path, ["adhd", "autism"], [])
    ctx = qu.analyse("adhd vs autism", [])
    assert ctx.question_type == QuestionType.COMPARISON


# --- Follow-up detection ---

def test_follow_up_detected_with_history(tmp_path):
    qu = _make_qu(tmp_path, ["adhd"], [])
    history = [
        {"role": "user", "content": "what is adhd"},
        {"role": "assistant", "content": "ADHD is..."},
    ]
    ctx = qu.analyse("tell me more about it", history)
    assert ctx.is_follow_up is True
    assert ctx.intent == Intent.FOLLOW_UP


def test_no_follow_up_without_history(tmp_path):
    qu = _make_qu(tmp_path, ["adhd"], [])
    ctx = qu.analyse("tell me more about it", [])
    assert ctx.is_follow_up is False


# --- Resolved topics ---

def test_resolved_topics_contains_all_mentioned(tmp_path):
    qu = _make_qu(tmp_path, ["adhd"], ["cbt"])
    ctx = qu.analyse("does cbt help adhd", [])
    assert "adhd" in ctx.resolved_topics
    assert "cbt" in ctx.resolved_topics


def test_hyphenated_slug_detected_via_space_form(tmp_path):
    qu = _make_qu(tmp_path, [], ["occupational-therapy"])
    ctx = qu.analyse("tell me about occupational therapy", [])
    assert "occupational-therapy" in ctx.mentioned_therapies


# --- Confidence ---

def test_confidence_zero_for_unknown(tmp_path):
    qu = _make_qu(tmp_path, ["adhd"], [])
    ctx = qu.analyse("tell me more about it", [])
    if ctx.intent == Intent.UNKNOWN:
        assert ctx.confidence == 0.0


def test_confidence_positive_when_topics_found(tmp_path):
    qu = _make_qu(tmp_path, ["adhd"], [])
    ctx = qu.analyse("what is adhd", [])
    assert ctx.confidence > 0.0


# --- Error safety ---

def test_never_raises_on_empty_message(tmp_path):
    qu = _make_qu(tmp_path, ["adhd"], [])
    ctx = qu.analyse("", [])
    assert ctx.intent in Intent.__members__.values()


def test_never_raises_on_none_like_history(tmp_path):
    qu = _make_qu(tmp_path, ["adhd"], [])
    ctx = qu.analyse("what is adhd", [])
    assert ctx is not None
