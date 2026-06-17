"""Phase 4 Context Builder.

Assembles RetrievalResult[] into a token-budgeted AssembledContext ready
for injection into the LLM prompt. Handles filtering, deduplication,
intent-based prioritisation, content extraction, and history integration.
"""

from __future__ import annotations

import logging

from app.rag.models import (
    AssembledContext,
    ContentSection,
    Intent,
    QueryContext,
    RetrievalQuality,
    RetrievalResult,
)

logger = logging.getLogger(__name__)

_MIN_SCORE = 0.4
_GOOD_QUALITY_THRESHOLD = 0.7
_MAX_HISTORY_TURNS = 3

# Character budgets (1 token ≈ 4 chars; total injection ~3000 tokens = 12000 chars)
_TOTAL_BUDGET_CHARS = 12_000
_PRIMARY_BUDGET_CHARS = int(_TOTAL_BUDGET_CHARS * 0.60)    # 7200
_SUPPORTING_BUDGET_CHARS = int(_TOTAL_BUDGET_CHARS * 0.25)  # 3000
_HISTORY_BUDGET_CHARS = int(_TOTAL_BUDGET_CHARS * 0.10)    # 1200


class ContextBuilder:
    """Stateless assembler — the same instance may be called for every request."""

    def assemble(
        self,
        results: list[RetrievalResult],
        query_context: QueryContext,
        history: list[dict],
    ) -> AssembledContext:
        """Build an AssembledContext from retrieval results.

        Never raises — returns EMPTY quality context on any internal error.
        """
        try:
            return self._assemble_internal(results, query_context, history)
        except Exception:
            logger.exception("ContextBuilder.assemble failed; returning EMPTY context")
            return AssembledContext(
                primary_content=(),
                supporting_content=(),
                history_context=(),
                metadata={"retrieval_quality": RetrievalQuality.EMPTY.value},
                retrieval_quality=RetrievalQuality.EMPTY,
            )

    def _assemble_internal(
        self,
        results: list[RetrievalResult],
        query_context: QueryContext,
        history: list[dict],
    ) -> AssembledContext:
        # Step 1: Relevance filtering
        filtered = [
            r for r in results
            if r.relevance_score >= _MIN_SCORE and r.content.extraction_complete
        ]

        # Step 2: Deduplicate by slug — keep highest score
        seen: dict[str, RetrievalResult] = {}
        for r in sorted(filtered, key=lambda x: x.relevance_score, reverse=True):
            if r.slug not in seen:
                seen[r.slug] = r
        deduped = sorted(seen.values(), key=lambda x: x.relevance_score, reverse=True)

        # Step 3: Intent-based prioritisation
        primary_results, supporting_results = self._prioritise(deduped, query_context)

        # Step 4: Content section extraction
        primary_sections = [self._extract_section(r) for r in primary_results]
        supporting_sections = [self._extract_section(r) for r in supporting_results]

        # Step 5: Token budget enforcement
        primary_sections = self._apply_budget(primary_sections, _PRIMARY_BUDGET_CHARS)
        supporting_sections = self._apply_budget(supporting_sections, _SUPPORTING_BUDGET_CHARS)

        # Step 6: History integration (follow-ups and comparisons only — saves token budget)
        if query_context.is_follow_up or query_context.intent == Intent.COMPARISON:
            history_context = self._select_history(history)
        else:
            history_context = []

        # Step 7: Retrieval quality assessment
        quality = self._assess_quality(primary_sections, supporting_sections, deduped)

        logger.info(
            "ContextBuilder: quality=%s, primary=%d, supporting=%d, history_turns=%d",
            quality.value,
            len(primary_sections),
            len(supporting_sections),
            len(history_context),
        )

        return AssembledContext(
            primary_content=tuple(primary_sections),
            supporting_content=tuple(supporting_sections),
            history_context=tuple(history_context),
            metadata={
                "retrieval_quality": quality.value,
                "intent": query_context.intent.value,
                "total_retrieved": len(results),
                "total_after_filter": len(deduped),
            },
            retrieval_quality=quality,
        )

    def _prioritise(
        self,
        results: list[RetrievalResult],
        query_context: QueryContext,
    ) -> tuple[list[RetrievalResult], list[RetrievalResult]]:
        _relational_intents = {Intent.COMPARISON, Intent.THERAPY_FOR_CONDITION, Intent.CONDITION_FOR_THERAPY}
        if query_context.intent in _relational_intents:
            mentioned = set(query_context.resolved_topics)
            primary = [r for r in results if r.slug in mentioned]
            supporting = [r for r in results if r.slug not in mentioned]
        else:
            primary = [r for r in results if r.match_type == "exact" or r.relevance_score >= _GOOD_QUALITY_THRESHOLD]
            supporting = [r for r in results if r not in primary]
        return primary, supporting

    def _extract_section(self, result: RetrievalResult) -> ContentSection:
        doc = result.content
        summary = " ".join(list(doc.body_paragraphs[:2]))
        bullets: list[str] = []
        if doc.lists:
            first_list = doc.lists[0]
            if isinstance(first_list, dict):
                bullets = list(first_list.get("items", []))
        return ContentSection(
            title=doc.page_title or doc.h1,
            source_url=doc.source_url,
            summary=summary,
            bullets=bullets,
            relevance_score=result.relevance_score,
            slug=result.slug,
        )

    def _apply_budget(
        self,
        sections: list[ContentSection],
        budget_chars: int,
    ) -> list[ContentSection]:
        used = 0
        kept: list[ContentSection] = []
        for section in sections:
            section_chars = len(section.title) + len(section.summary) + sum(len(b) for b in section.bullets)
            if used + section_chars > budget_chars:
                remaining = budget_chars - used - len(section.title)
                if remaining > 50:
                    section.summary = section.summary[:remaining]
                    section.bullets = []
                    kept.append(section)
                break
            kept.append(section)
            used += section_chars
        return kept

    def _select_history(self, history: list[dict]) -> list[dict]:
        if not history:
            return []
        recent = history[-(_MAX_HISTORY_TURNS * 2):]
        used = 0
        kept: list[dict] = []
        for turn in reversed(recent):
            content_len = len(turn.get("content", ""))
            if used + content_len > _HISTORY_BUDGET_CHARS:
                break
            kept.insert(0, turn)
            used += content_len
        return kept

    def _assess_quality(
        self,
        primary_sections: list[ContentSection],
        supporting_sections: list[ContentSection],
        all_results: list[RetrievalResult],
    ) -> RetrievalQuality:
        if not all_results:
            return RetrievalQuality.EMPTY
        if primary_sections and any(s.relevance_score >= _GOOD_QUALITY_THRESHOLD for s in primary_sections):
            return RetrievalQuality.GOOD
        if primary_sections or supporting_sections:
            return RetrievalQuality.PARTIAL
        return RetrievalQuality.EMPTY
