"""Phase 3 Retrieval Layer.

KnowledgeRetriever is the plug-in ABC. FileSystemRetriever is the initial
implementation backed by data/normalized/{page_type}/{slug}.json files.

Future implementations (e.g. VectorRetriever) implement KnowledgeRetriever
and are injected into ChatService without any other code changes.
"""

from __future__ import annotations

import json
import logging
from abc import ABC, abstractmethod
from pathlib import Path

from app.rag.models import Intent, NormalisedDoc, QueryContext, RetrievalResult

logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).parent.parent.parent
_NORMALIZED_DIR = _PROJECT_ROOT / "data" / "normalized"

_MAX_EXACT = 3
_MAX_RELATED = 5
_MAX_TOTAL = 8


class KnowledgeRetriever(ABC):
    """Plug-in interface for the knowledge retrieval step.

    Any implementation may replace FileSystemRetriever without changing
    ChatService, ContextBuilder, or build_messages.
    """

    @abstractmethod
    def retrieve(self, query_context: QueryContext) -> list[RetrievalResult]:
        """Return relevant documents ordered by relevance_score descending.

        Must never raise — return an empty list on error.
        """
        raise NotImplementedError


class FileSystemRetriever(KnowledgeRetriever):
    """KnowledgeRetriever backed by data/normalized/{page_type}/{slug}.json.

    Three strategies applied in order, results deduplicated by slug:
      1. Exact Match   — slug lookup from resolved_topics      → score 1.0
      2. Related       — follow internal_links from exact docs → score 0.7
      3. Cross-Ref     — all mentioned items for relational intents → score 0.6
    """

    def __init__(self, normalized_dir: Path | None = None) -> None:
        self._normalized_dir = normalized_dir or _NORMALIZED_DIR

    def retrieve(self, query_context: QueryContext) -> list[RetrievalResult]:
        try:
            return self._retrieve_internal(query_context)
        except Exception:
            logger.exception("FileSystemRetriever.retrieve failed; returning []")
            return []

    def _retrieve_internal(self, query_context: QueryContext) -> list[RetrievalResult]:
        results: dict[str, RetrievalResult] = {}

        # Strategy 1: Exact Match
        exact_docs: list[NormalisedDoc] = []
        for slug in query_context.resolved_topics:
            if len([r for r in results.values() if r.match_type == "exact"]) >= _MAX_EXACT:
                break
            doc = self._load_by_slug(slug)
            if doc is None:
                continue
            results[doc.slug] = RetrievalResult(
                slug=doc.slug,
                page_type=doc.page_type,
                source_url=doc.source_url,
                page_title=doc.page_title,
                match_type="exact",
                relevance_score=1.0,
                content=doc,
            )
            exact_docs.append(doc)

        # Strategy 2: Related Content (follow internal_links)
        related_count = 0
        for doc in exact_docs:
            for link in doc.internal_links:
                if related_count >= _MAX_RELATED:
                    break
                href = link.get("href", "") if isinstance(link, dict) else ""
                target_type = link.get("target_type", "") if isinstance(link, dict) else ""
                target_slug = self._slug_from_href(href)
                if not target_slug or target_slug in results:
                    continue
                related_doc = self._load_by_type_and_slug(target_type, target_slug)
                if related_doc is None:
                    continue
                results[target_slug] = RetrievalResult(
                    slug=related_doc.slug,
                    page_type=related_doc.page_type,
                    source_url=related_doc.source_url,
                    page_title=related_doc.page_title,
                    match_type="related",
                    relevance_score=0.7,
                    content=related_doc,
                )
                related_count += 1

        # Strategy 3: Cross-Reference (for relational/comparison intents)
        _cross_ref_intents = {
            Intent.COMPARISON,
            Intent.THERAPY_FOR_CONDITION,
            Intent.CONDITION_FOR_THERAPY,
        }
        if query_context.intent in _cross_ref_intents:
            all_mentioned = query_context.mentioned_conditions + query_context.mentioned_therapies
            for slug in all_mentioned:
                if slug in results:
                    continue
                doc = self._load_by_slug(slug)
                if doc is None:
                    continue
                results[slug] = RetrievalResult(
                    slug=doc.slug,
                    page_type=doc.page_type,
                    source_url=doc.source_url,
                    page_title=doc.page_title,
                    match_type="cross_reference",
                    relevance_score=0.6,
                    content=doc,
                )

        ordered = sorted(results.values(), key=lambda r: r.relevance_score, reverse=True)
        capped = ordered[:_MAX_TOTAL]

        logger.info(
            "Retrieval: intent=%s, exact=%d, related=%d, cross_ref=%d, total=%d",
            query_context.intent.value,
            sum(1 for r in capped if r.match_type == "exact"),
            sum(1 for r in capped if r.match_type == "related"),
            sum(1 for r in capped if r.match_type == "cross_reference"),
            len(capped),
        )
        return capped

    def _load_by_slug(self, slug: str) -> NormalisedDoc | None:
        """Try conditions/ then therapies/ for an untyped slug."""
        for page_type in ("conditions", "therapies"):
            doc = self._load_by_type_and_slug(page_type, slug)
            if doc is not None:
                return doc
        return None

    def _load_by_type_and_slug(self, page_type: str, slug: str) -> NormalisedDoc | None:
        if not page_type or not slug:
            return None
        path = self._normalized_dir / page_type / f"{slug}.json"
        if not path.exists():
            return None
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return self._dict_to_doc(data)
        except (OSError, json.JSONDecodeError, KeyError) as exc:
            logger.warning("Failed to load %s: %s", path, exc)
            return None

    @staticmethod
    def _dict_to_doc(data: dict) -> NormalisedDoc:
        return NormalisedDoc(
            slug=data["slug"],
            page_type=data["page_type"],
            source_url=data.get("source_url", ""),
            page_title=data.get("page_title", ""),
            h1=data.get("h1", ""),
            body_paragraphs=tuple(data.get("body_paragraphs", [])),
            headings=tuple(data.get("headings", [])),
            lists=tuple(data.get("lists", [])),
            internal_links=tuple(data.get("internal_links", [])),
            extraction_complete=data.get("extraction_complete", False),
            meta_description=data.get("meta_description"),
            canonical_url=data.get("canonical_url"),
        )

    @staticmethod
    def _slug_from_href(href: str) -> str:
        parts = href.strip("/").split("/")
        return parts[-1] if parts and parts[-1] else ""
