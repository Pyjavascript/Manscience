"""Shared data objects for the Mansi Knowledge System (Phases 3–5)."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Intent(str, Enum):
    CONDITION_LOOKUP = "CONDITION_LOOKUP"
    THERAPY_LOOKUP = "THERAPY_LOOKUP"
    THERAPY_FOR_CONDITION = "THERAPY_FOR_CONDITION"
    CONDITION_FOR_THERAPY = "CONDITION_FOR_THERAPY"
    COMPARISON = "COMPARISON"
    GENERAL_KNOWLEDGE = "GENERAL_KNOWLEDGE"
    FOLLOW_UP = "FOLLOW_UP"
    UNKNOWN = "UNKNOWN"


class QuestionType(str, Enum):
    DEFINITION = "DEFINITION"
    TREATMENT = "TREATMENT"
    COMPARISON = "COMPARISON"
    RELATIONSHIP = "RELATIONSHIP"
    AVAILABILITY = "AVAILABILITY"
    GENERAL = "GENERAL"


class RetrievalQuality(str, Enum):
    GOOD = "GOOD"
    PARTIAL = "PARTIAL"
    EMPTY = "EMPTY"


@dataclass(frozen=True)
class QueryContext:
    intent: Intent
    question_type: QuestionType
    mentioned_conditions: tuple[str, ...]
    mentioned_therapies: tuple[str, ...]
    resolved_topics: tuple[str, ...]
    is_follow_up: bool
    confidence: float


@dataclass(frozen=True)
class NormalisedDoc:
    """Mirrors the Phase 2 JSON schema. All list fields use tuple for hashability."""

    slug: str
    page_type: str
    source_url: str
    page_title: str
    h1: str
    body_paragraphs: tuple[str, ...]
    headings: tuple[dict, ...]
    lists: tuple[dict, ...]
    internal_links: tuple[dict, ...]
    extraction_complete: bool
    meta_description: str | None = None
    canonical_url: str | None = None


@dataclass(frozen=True)
class RetrievalResult:
    slug: str
    page_type: str
    source_url: str
    page_title: str
    match_type: str
    relevance_score: float
    content: NormalisedDoc


@dataclass
class ContentSection:
    """A rendered content snippet ready for LLM context injection."""

    title: str
    source_url: str
    summary: str
    bullets: list[str]
    relevance_score: float
    slug: str


@dataclass(frozen=True)
class AssembledContext:
    primary_content: tuple[ContentSection, ...]
    supporting_content: tuple[ContentSection, ...]
    history_context: tuple[dict, ...]
    metadata: dict[str, Any]
    retrieval_quality: RetrievalQuality
