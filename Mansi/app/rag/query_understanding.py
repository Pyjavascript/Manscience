"""Phase 3 Query Understanding: intent classification and entity extraction.

Pure transformation — no I/O except lazy slug-list loading from filenames.
No LLM calls. Never raises; returns UNKNOWN intent on any internal failure.
"""

from __future__ import annotations

import logging
from pathlib import Path

from app.rag.models import Intent, QueryContext, QuestionType

logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).parent.parent.parent
_NORMALIZED_DIR = _PROJECT_ROOT / "data" / "normalized"

_DEFINITION_KEYWORDS = frozenset({
    "what is", "what are", "define", "explain", "tell me about", "describe", "about",
})
_TREATMENT_KEYWORDS = frozenset({
    "treat", "help", "therapy for", "therapies for", "used for", "good for",
    "therapies", "treatment", "treatments", "therapies help", "used to treat",
})
_COMPARISON_KEYWORDS = frozenset({
    "vs", "versus", "compare", "difference between", "better than", "differ", "vs.",
})
_RELATIONSHIP_KEYWORDS = frozenset({
    "linked", "related", "connection", "associated with", "cause", "causes",
})
_AVAILABILITY_KEYWORDS = frozenset({
    "available", "offer", "do you have", "can i get", "access", "book",
})
_FOLLOW_UP_SIGNALS = frozenset({
    "it", "that", "this", "them", "these", "those",
    "the condition", "the therapy", "more about it", "tell me more",
})


class QueryUnderstanding:
    """Classifies user intent and extracts mentioned entity slugs.

    Slug lists are loaded lazily from data/normalized/ filenames on first call
    and cached. Returns UNKNOWN intent when no normalised data exists yet.
    """

    def __init__(self, normalized_dir: Path | None = None) -> None:
        self._normalized_dir = normalized_dir or _NORMALIZED_DIR
        self._known_condition_slugs: frozenset[str] | None = None
        self._known_therapy_slugs: frozenset[str] | None = None

    def analyse(self, user_message: str, history: list[dict]) -> QueryContext:
        """Classify intent and extract slugs from user_message.

        Never raises — returns QueryContext(intent=UNKNOWN) on any error.
        """
        try:
            return self._analyse_internal(user_message, history)
        except Exception:
            logger.exception("QueryUnderstanding.analyse failed; returning UNKNOWN")
            return QueryContext(
                intent=Intent.UNKNOWN,
                question_type=QuestionType.GENERAL,
                mentioned_conditions=(),
                mentioned_therapies=(),
                resolved_topics=(),
                is_follow_up=False,
                confidence=0.0,
            )

    def _analyse_internal(self, user_message: str, history: list[dict]) -> QueryContext:
        lowered = user_message.lower()
        conditions = self._known_conditions()
        therapies = self._known_therapies()

        mentioned_conditions = tuple(
            s for s in sorted(conditions)
            if s in lowered or s.replace("-", " ") in lowered
        )
        mentioned_therapies = tuple(
            s for s in sorted(therapies)
            if s in lowered or s.replace("-", " ") in lowered
        )
        resolved_topics = tuple(dict.fromkeys(mentioned_conditions + mentioned_therapies))

        is_follow_up = self._detect_follow_up(lowered, history)
        question_type = self._classify_question_type(lowered)
        intent = self._classify_intent(lowered, mentioned_conditions, mentioned_therapies, is_follow_up)
        confidence = self._estimate_confidence(intent, resolved_topics)

        logger.debug(
            "QueryUnderstanding: intent=%s, conditions=%s, therapies=%s, follow_up=%s",
            intent.value, mentioned_conditions, mentioned_therapies, is_follow_up,
        )

        return QueryContext(
            intent=intent,
            question_type=question_type,
            mentioned_conditions=mentioned_conditions,
            mentioned_therapies=mentioned_therapies,
            resolved_topics=resolved_topics,
            is_follow_up=is_follow_up,
            confidence=confidence,
        )

    def _classify_intent(
        self,
        lowered: str,
        conditions: tuple[str, ...],
        therapies: tuple[str, ...],
        is_follow_up: bool,
    ) -> Intent:
        has_conditions = bool(conditions)
        has_therapies = bool(therapies)

        if is_follow_up and not has_conditions and not has_therapies:
            return Intent.FOLLOW_UP

        has_comparison = any(kw in lowered for kw in _COMPARISON_KEYWORDS)
        if has_comparison and (len(conditions) >= 2 or len(therapies) >= 2 or (has_conditions and has_therapies)):
            return Intent.COMPARISON

        if has_conditions and has_therapies:
            has_relationship = any(kw in lowered for kw in _RELATIONSHIP_KEYWORDS)
            if has_relationship:
                return Intent.CONDITION_FOR_THERAPY
            return Intent.THERAPY_FOR_CONDITION

        if has_conditions:
            has_treatment = any(kw in lowered for kw in _TREATMENT_KEYWORDS)
            if has_treatment:
                return Intent.THERAPY_FOR_CONDITION
            return Intent.CONDITION_LOOKUP

        if has_therapies:
            return Intent.THERAPY_LOOKUP

        if any(kw in lowered for kw in _DEFINITION_KEYWORDS | _TREATMENT_KEYWORDS):
            return Intent.GENERAL_KNOWLEDGE

        return Intent.UNKNOWN

    def _classify_question_type(self, lowered: str) -> QuestionType:
        if any(kw in lowered for kw in _COMPARISON_KEYWORDS):
            return QuestionType.COMPARISON
        if any(kw in lowered for kw in _RELATIONSHIP_KEYWORDS):
            return QuestionType.RELATIONSHIP
        if any(kw in lowered for kw in _TREATMENT_KEYWORDS):
            return QuestionType.TREATMENT
        if any(kw in lowered for kw in _AVAILABILITY_KEYWORDS):
            return QuestionType.AVAILABILITY
        if any(kw in lowered for kw in _DEFINITION_KEYWORDS):
            return QuestionType.DEFINITION
        return QuestionType.GENERAL

    def _detect_follow_up(self, lowered: str, history: list[dict]) -> bool:
        if not history:
            return False
        words = set(lowered.split())
        return bool(words & _FOLLOW_UP_SIGNALS)

    def _estimate_confidence(self, intent: Intent, resolved_topics: tuple[str, ...]) -> float:
        if intent == Intent.UNKNOWN:
            return 0.0
        return min(0.5 + len(resolved_topics) * 0.2, 1.0)

    def _known_conditions(self) -> frozenset[str]:
        if self._known_condition_slugs is None:
            self._known_condition_slugs = self._load_slugs("conditions")
        return self._known_condition_slugs

    def _known_therapies(self) -> frozenset[str]:
        if self._known_therapy_slugs is None:
            self._known_therapy_slugs = self._load_slugs("therapies")
        return self._known_therapy_slugs

    def _load_slugs(self, page_type: str) -> frozenset[str]:
        """Read slugs from filenames — no JSON parsing needed."""
        directory = self._normalized_dir / page_type
        if not directory.exists():
            logger.debug("Normalized directory %s not found; no known %s slugs.", directory, page_type)
            return frozenset()
        slugs = frozenset(p.stem for p in directory.glob("*.json"))
        logger.debug("Loaded %d known %s slugs.", len(slugs), page_type)
        return slugs
