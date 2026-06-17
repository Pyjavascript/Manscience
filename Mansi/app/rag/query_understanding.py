"""Phase 3 Query Understanding: intent classification and entity extraction.

Pure transformation — no I/O except lazy slug-list loading from filenames.
No LLM calls. Never raises; returns UNKNOWN intent on any internal failure.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path

from app.rag.models import Intent, QueryContext, QuestionType

logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).parent.parent.parent
_NORMALIZED_DIR = _PROJECT_ROOT / "data" / "normalized"

_WORD_RE = re.compile(r"[a-z']+")

_DEFINITION_KEYWORDS = frozenset({
    "what is", "what are", "define", "explain", "tell me about", "describe", "about",
})
_TREATMENT_KEYWORDS = frozenset({
    "treat", "help", "therapy for", "therapies for", "used for", "good for",
    "therapies", "treatment", "treatments", "therapies help", "used to treat",
})
_COMPARISON_KEYWORDS = frozenset({
    "vs", "versus", "compare", "difference between", "better than", "differ", "vs.",
    "which is better", "which one", "which is more", "more suitable",
    "have in common", "in common",
})
_RELATIONSHIP_KEYWORDS = frozenset({
    "linked", "related", "connection", "associated with", "cause", "causes",
})
_AVAILABILITY_KEYWORDS = frozenset({
    "available", "offer", "do you have", "can i get", "access", "book",
})
_FOLLOW_UP_WORD_SIGNALS = frozenset({
    "it", "that", "this", "them", "these", "those", "one", "more", "they",
})
_FOLLOW_UP_PHRASE_SIGNALS = frozenset({
    "the condition", "the therapy", "tell me more", "other options", "what else",
    "which is better", "which one", "which is more",
})
_PLURAL_FOLLOW_UP_SIGNALS = frozenset({"they", "those", "them", "these"})


def _tokenize(lowered: str) -> set[str]:
    return set(_WORD_RE.findall(lowered))


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

        is_follow_up = self._detect_follow_up(lowered, history)

        effective_conditions = mentioned_conditions
        effective_therapies = mentioned_therapies

        # When a follow-up signal is detected, scan history to resolve the implied
        # topic(s) and merge them with anything explicitly named in the current
        # message (spec §5.3). History-derived topics come first.
        if is_follow_up:
            needs_multiple = self._needs_multiple_topics(lowered)
            hist_conditions, hist_therapies = self._extract_topics_from_history(
                history, conditions, therapies, depth=5, needs_multiple=needs_multiple,
            )
            if not hist_conditions and not hist_therapies and not mentioned_conditions and not mentioned_therapies:
                # Unresolvable follow-up — request clarification (spec §5.5)
                return QueryContext(
                    intent=Intent.UNKNOWN,
                    question_type=QuestionType.GENERAL,
                    mentioned_conditions=(),
                    mentioned_therapies=(),
                    resolved_topics=(),
                    is_follow_up=True,
                    confidence=0.0,
                )
            effective_conditions = tuple(dict.fromkeys(hist_conditions + mentioned_conditions))
            effective_therapies = tuple(dict.fromkeys(hist_therapies + mentioned_therapies))

        resolved_topics = tuple(dict.fromkeys(effective_conditions + effective_therapies))
        question_type = self._classify_question_type(lowered)
        # Pass is_follow_up=False: topics are now resolved so FOLLOW_UP intent is not needed
        intent = self._classify_intent(lowered, effective_conditions, effective_therapies, False)
        confidence = self._estimate_confidence(intent, resolved_topics)

        logger.debug(
            "QueryUnderstanding: intent=%s, conditions=%s, therapies=%s, follow_up=%s",
            intent.value, effective_conditions, effective_therapies, is_follow_up,
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
        words = _tokenize(lowered)
        if words & _FOLLOW_UP_WORD_SIGNALS:
            return True
        return any(phrase in lowered for phrase in _FOLLOW_UP_PHRASE_SIGNALS)

    def _needs_multiple_topics(self, lowered: str) -> bool:
        """True when the current message implies more than one prior entity.

        Plural pronouns ("they"/"those") and comparison phrasing ("which one")
        both imply at least two referents, so history scanning should keep
        looking past the single most recent mention until two are found.
        """
        if _tokenize(lowered) & _PLURAL_FOLLOW_UP_SIGNALS:
            return True
        return any(kw in lowered for kw in _COMPARISON_KEYWORDS)

    def _extract_topics_from_history(
        self,
        history: list[dict],
        conditions: frozenset[str],
        therapies: frozenset[str],
        depth: int,
        needs_multiple: bool,
    ) -> tuple[tuple[str, ...], tuple[str, ...]]:
        """Scan the most recent `depth` messages for condition/therapy slugs
        (spec §5.3 Steps 2-4).

        Stops at the first (most recent) message containing any known slug and
        returns every slug mentioned in that message together — slugs introduced
        in the same message (e.g. a comparison turn naming two therapies) are
        treated as one candidate set rather than picked apart. When
        `needs_multiple` is set, scanning continues into older messages until at
        least two distinct topics are collected or the window is exhausted,
        since the reference is to more than one prior entity.
        """
        recent = history[-depth:] if depth > 0 else []
        found_conditions: list[str] = []
        found_therapies: list[str] = []
        seen: set[str] = set()

        for turn in reversed(recent):
            content = str(turn.get("content", "")).lower()
            msg_conditions = [
                s for s in sorted(conditions)
                if s not in seen and (s in content or s.replace("-", " ") in content)
            ]
            msg_therapies = [
                s for s in sorted(therapies)
                if s not in seen and (s in content or s.replace("-", " ") in content)
            ]
            if not msg_conditions and not msg_therapies:
                continue
            found_conditions.extend(msg_conditions)
            found_therapies.extend(msg_therapies)
            seen.update(msg_conditions)
            seen.update(msg_therapies)
            if not needs_multiple or len(seen) >= 2:
                break

        return tuple(found_conditions), tuple(found_therapies)

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
