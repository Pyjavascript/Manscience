"""HTML content analysis for Mansi Phase 1.

Reads raw HTML files from data/raw/, extracts structured metadata and
cross-page relationships, then writes docs/specs/phase-1-content-model.md.
Makes no HTTP requests — operates purely on local files.
"""

from __future__ import annotations

import logging
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from bs4 import BeautifulSoup

from app.config.settings import settings

logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).parent.parent.parent
_DEFAULT_RAW_DIR = _PROJECT_ROOT / "data" / "raw"
_DEFAULT_OUTPUT_PATH = _PROJECT_ROOT / "docs" / "specs" / "phase-1-content-model.md"

_STRIP_TAGS = {"script", "style", "nav", "footer", "noscript", "head"}


class AnalysisError(Exception):
    """User-safe error from the HTML analysis workflow."""


@dataclass
class PageMetadata:
    url: str
    slug: str
    category: str
    title: str
    h1: str
    headings: list[str] = field(default_factory=list)   # h2/h3 texts in document order
    meta_description: str = ""
    meta_keywords: str = ""
    internal_links: list[str] = field(default_factory=list)
    word_count: int = 0
    source_file: str = ""
    parsed_at: str = ""


@dataclass
class ContentRelationship:
    from_url: str
    to_url: str
    from_category: str
    to_category: str
    link_text: str


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class AnalysisService:
    """Parses raw HTML files and produces a structured content model document."""

    def __init__(
        self,
        raw_dir: Path | None = None,
        output_path: Path | None = None,
    ) -> None:
        self._raw_dir = raw_dir or _DEFAULT_RAW_DIR
        self._output_path = output_path or _DEFAULT_OUTPUT_PATH
        self._base_url = settings.website_base_url

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    def run(self) -> Path:
        """Parse all raw HTML files and write the content model document.

        Raises:
            AnalysisError: if raw_dir does not exist or contains no .html files.
        """
        if not self._raw_dir.exists():
            raise AnalysisError(
                f"Raw data directory '{self._raw_dir}' does not exist. "
                "Run the acquisition step first."
            )

        html_files = sorted(self._raw_dir.glob("**/*.html"))
        if not html_files:
            raise AnalysisError(
                f"No .html files found in '{self._raw_dir}'. "
                "Run the acquisition step first."
            )

        logger.info("Analysing %d HTML files from %s", len(html_files), self._raw_dir)

        pages: list[PageMetadata] = []
        for html_path in html_files:
            category = html_path.parent.name  # "conditions" or "therapies"
            slug = html_path.stem
            url = f"{self._base_url}/{category}/{slug}"
            try:
                metadata = self.extract_page_metadata(html_path, url, category)
                pages.append(metadata)
            except AnalysisError:
                logger.exception("Failed to parse %s; skipping.", html_path)

        if not pages:
            raise AnalysisError("No pages could be successfully parsed.")

        relationships = self.extract_relationships(pages, self._base_url)
        written_at = _utcnow_iso()
        output = self.write_content_model_doc(pages, relationships, written_at)
        logger.info("Content model written to %s", output)
        return output

    # ------------------------------------------------------------------
    # Extraction
    # ------------------------------------------------------------------

    def extract_page_metadata(
        self, html_path: Path, url: str, category: str
    ) -> PageMetadata:
        """Parse a raw HTML file and extract structured metadata."""
        try:
            html_content = html_path.read_text(encoding="utf-8", errors="replace")
        except OSError as exc:
            raise AnalysisError(f"Cannot read file {html_path}.") from exc

        try:
            soup = BeautifulSoup(html_content, "lxml")
        except Exception as exc:
            raise AnalysisError(f"Cannot parse HTML in {html_path}.") from exc

        title = (soup.title.string or "").strip() if soup.title else ""
        h1_tag = soup.find("h1")
        h1 = (h1_tag.get_text(strip=True)) if h1_tag else ""

        headings: list[str] = []
        for tag in soup.find_all(["h2", "h3"]):
            text = tag.get_text(strip=True)
            if text:
                headings.append(text)

        meta_desc = ""
        meta_kw = ""
        for meta in soup.find_all("meta"):
            name = (meta.get("name") or "").lower()
            if name == "description":
                meta_desc = (meta.get("content") or "").strip()
            elif name == "keywords":
                meta_kw = (meta.get("content") or "").strip()

        base_netloc = urlparse(self._base_url).netloc
        internal_links: list[str] = []
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"].strip()
            if not href or href.startswith("#"):
                continue
            from urllib.parse import urljoin
            abs_url = urljoin(self._base_url, href.split("#")[0])
            parsed = urlparse(abs_url)
            if parsed.netloc == base_netloc and parsed.scheme in ("http", "https"):
                internal_links.append(abs_url)

        visible_text = self.extract_visible_text(soup)
        word_count = len(visible_text.split())

        return PageMetadata(
            url=url,
            slug=html_path.stem,
            category=category,
            title=title,
            h1=h1,
            headings=headings,
            meta_description=meta_desc,
            meta_keywords=meta_kw,
            internal_links=list(dict.fromkeys(internal_links)),
            word_count=word_count,
            source_file=str(html_path.relative_to(_PROJECT_ROOT) if html_path.is_relative_to(_PROJECT_ROOT) else html_path),
            parsed_at=_utcnow_iso(),
        )

    def extract_relationships(
        self, pages: list[PageMetadata], base_url: str
    ) -> list[ContentRelationship]:
        """Build cross-page relationships from internal_links on all pages."""
        known_urls = {p.url: p for p in pages}
        relationships: list[ContentRelationship] = []

        for page in pages:
            for linked_url in page.internal_links:
                # Normalise for comparison
                normalised = linked_url.rstrip("/")
                if normalised == page.url.rstrip("/"):
                    continue  # skip self-links
                if normalised not in known_urls and linked_url not in known_urls:
                    continue  # skip links to pages not in our dataset

                target = known_urls.get(normalised) or known_urls.get(linked_url)
                if target is None:
                    continue

                # Find link text for this URL
                link_text = ""  # We don't have anchor text here; leave empty
                relationships.append(ContentRelationship(
                    from_url=page.url,
                    to_url=target.url,
                    from_category=page.category,
                    to_category=target.category,
                    link_text=link_text,
                ))

        return relationships

    def extract_visible_text(self, soup: BeautifulSoup) -> str:
        """Extract human-visible text, stripping scripts, styles, nav, footer."""
        for tag in soup.find_all(_STRIP_TAGS):
            tag.decompose()
        return " ".join(soup.get_text(separator=" ").split())

    # ------------------------------------------------------------------
    # Document generation
    # ------------------------------------------------------------------

    def write_content_model_doc(
        self,
        pages: list[PageMetadata],
        relationships: list[ContentRelationship],
        written_at: str,
    ) -> Path:
        """Write docs/specs/phase-1-content-model.md."""
        conditions = [p for p in pages if p.category == "conditions"]
        therapies = [p for p in pages if p.category == "therapies"]

        lines: list[str] = [
            "# Phase 1 Content Model",
            "",
            f"Generated: {written_at}",
            "",
            "## Summary",
            "",
            f"| Metric | Count |",
            f"|---|---|",
            f"| Total pages analysed | {len(pages)} |",
            f"| Conditions pages | {len(conditions)} |",
            f"| Therapies pages | {len(therapies)} |",
            f"| Cross-page relationships | {len(relationships)} |",
            "",
        ]

        # Per-category tables
        for category_name, category_pages in [("Conditions", conditions), ("Therapies", therapies)]:
            lines += [
                f"## {category_name} Pages",
                "",
                "| Slug | Title | H1 | Word Count | Internal Links | Meta Description |",
                "|---|---|---|---|---|---|",
            ]
            for p in sorted(category_pages, key=lambda x: x.slug):
                meta_short = (p.meta_description[:60] + "…") if len(p.meta_description) > 60 else p.meta_description
                lines.append(
                    f"| `{p.slug}` | {p.title or '_(missing)_'} | {p.h1 or '_(missing)_'} "
                    f"| {p.word_count} | {len(p.internal_links)} | {meta_short or '_(missing)_'} |"
                )
            lines.append("")

        # Common heading patterns
        lines += ["## Common Heading Patterns", ""]
        for category_name, category_pages in [("Conditions", conditions), ("Therapies", therapies)]:
            all_headings: list[str] = []
            for p in category_pages:
                all_headings.extend(p.headings)
            top = Counter(all_headings).most_common(10)
            lines += [f"### {category_name}", ""]
            if top:
                lines += ["| Heading | Occurrences |", "|---|---|"]
                for heading, count in top:
                    lines.append(f"| {heading} | {count} |")
            else:
                lines.append("_(no headings found)_")
            lines.append("")

        # Cross-page relationships
        lines += [
            "## Cross-Page Relationships",
            "",
            "| From | From Category | To | To Category |",
            "|---|---|---|---|",
        ]
        if relationships:
            for r in sorted(relationships, key=lambda x: (x.from_url, x.to_url)):
                from_slug = r.from_url.rstrip("/").split("/")[-1]
                to_slug = r.to_url.rstrip("/").split("/")[-1]
                lines.append(
                    f"| `{from_slug}` | {r.from_category} | `{to_slug}` | {r.to_category} |"
                )
        else:
            lines.append("_(no cross-page relationships detected)_")
        lines.append("")

        # Missing metadata
        lines += ["## Missing Metadata", ""]
        missing = [
            p for p in pages
            if not p.title or not p.h1 or not p.meta_description
        ]
        if missing:
            lines += ["| Slug | Category | Missing Fields |", "|---|---|---|"]
            for p in sorted(missing, key=lambda x: x.slug):
                missing_fields = []
                if not p.title:
                    missing_fields.append("title")
                if not p.h1:
                    missing_fields.append("h1")
                if not p.meta_description:
                    missing_fields.append("meta_description")
                lines.append(f"| `{p.slug}` | {p.category} | {', '.join(missing_fields)} |")
        else:
            lines.append("All pages have title, H1, and meta description.")
        lines.append("")

        self._output_path.parent.mkdir(parents=True, exist_ok=True)
        self._output_path.write_text("\n".join(lines), encoding="utf-8")
        return self._output_path
