"""Phase 2 content normalisation for Mansi AI.

Reads raw HTML files from data/raw/, extracts a rich structured schema per
the Phase 2 spec, and writes versioned JSON documents to data/normalized/.
Makes no HTTP requests — operates purely on local files.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup, Tag

from app.config.settings import settings

logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).parent.parent.parent
_DEFAULT_RAW_DIR = _PROJECT_ROOT / "data" / "raw"
_DEFAULT_NORMALIZED_DIR = _PROJECT_ROOT / "data" / "normalized"
_VERSION_LOG_FILENAME = "version_log.jsonl"
_EXTRACTION_VERSION = "v1"

_SITE_SUFFIX_RE = re.compile(r"\s*[|—\-–]\s*\S.*$")
_ZERO_WIDTH_RE = re.compile(r"[​‌‍﻿­]")


class NormalisationError(Exception):
    """User-safe error from the normalisation workflow."""


@dataclass(frozen=True)
class NormalisationRecord:
    slug: str
    page_type: str
    status: str           # "normalised" | "unchanged" | "failed"
    output_path: str
    content_changed: bool
    error_message: str


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _sanitise(text: str) -> str:
    """Strip zero-width chars, collapse whitespace, trim."""
    text = _ZERO_WIDTH_RE.sub("", text)
    return " ".join(text.split()).strip()


def _compute_hash(content_fields: dict) -> str:
    canonical = json.dumps(content_fields, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _main_content_region(soup: BeautifulSoup) -> Tag:
    """Return <main> → <article> → <body> as the primary content element."""
    for selector in ("main", "article"):
        found = soup.find(selector)
        if found:
            return found
    return soup.body or soup


class NormalisationService:
    """Reads raw HTML, extracts Phase 2 schema, writes versioned JSON.

    Fully independent: no HTTP calls. Reads from data/raw/, writes to
    data/normalized/. Per-file failures are captured; the run never aborts.
    """

    def __init__(
        self,
        raw_dir: Path | None = None,
        normalized_dir: Path | None = None,
    ) -> None:
        self._raw_dir = raw_dir or _DEFAULT_RAW_DIR
        self._normalized_dir = normalized_dir or _DEFAULT_NORMALIZED_DIR
        self._base_url = settings.website_base_url
        self._version_log_path = self._normalized_dir / _VERSION_LOG_FILENAME

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    def run(self) -> list[NormalisationRecord]:
        """Normalise all raw HTML files; write JSON documents and version log.

        Per-file failures are captured as status='failed' and never abort the run.

        Raises:
            NormalisationError: only for setup failures (missing raw_dir or
                cannot create normalized dir).
        """
        if not self._raw_dir.exists():
            raise NormalisationError(
                f"Raw data directory '{self._raw_dir}' does not exist. "
                "Run the acquisition step first."
            )

        html_files = sorted(self._raw_dir.glob("**/*.html"))
        if not html_files:
            raise NormalisationError(
                f"No .html files found in '{self._raw_dir}'. "
                "Run the acquisition step first."
            )

        try:
            self._normalized_dir.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            raise NormalisationError(
                "Cannot create normalised output directory — check filesystem permissions."
            ) from exc

        previous_hashes = self._load_previous_hashes()
        run_id = f"run-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"

        records: list[NormalisationRecord] = []
        logger.info("Normalisation starting: %d HTML files to process.", len(html_files))

        for html_path in html_files:
            page_type = html_path.parent.name  # "conditions" or "therapies"
            slug = html_path.stem
            record = self._normalise_one(html_path, page_type, slug, previous_hashes, run_id)
            records.append(record)
            logger.info("[%s] %s/%s", record.status.upper(), page_type, slug)

        normalised = sum(1 for r in records if r.status == "normalised")
        unchanged = sum(1 for r in records if r.status == "unchanged")
        failed = sum(1 for r in records if r.status == "failed")
        logger.info(
            "Normalisation complete: %d normalised, %d unchanged, %d failed.",
            normalised,
            unchanged,
            failed,
        )
        return records

    # ------------------------------------------------------------------
    # Per-file logic
    # ------------------------------------------------------------------

    def _normalise_one(
        self,
        html_path: Path,
        page_type: str,
        slug: str,
        previous_hashes: dict[str, str],
        run_id: str,
    ) -> NormalisationRecord:
        """Extract, hash, and persist one page. Never raises."""
        output_path = self._normalized_dir / page_type / f"{slug}.json"
        try:
            relative_path = str(output_path.relative_to(_PROJECT_ROOT))
        except ValueError:
            relative_path = str(output_path)

        try:
            doc = self.extract_document(html_path, page_type, slug)
        except Exception as exc:
            logger.error("Extraction failed for %s/%s: %s", page_type, slug, exc)
            return NormalisationRecord(
                slug=slug,
                page_type=page_type,
                status="failed",
                output_path="",
                content_changed=False,
                error_message=str(exc),
            )

        key = f"{page_type}/{slug}"
        previous_hash = previous_hashes.get(key)
        content_changed = doc["content_hash"] != previous_hash

        version_entry = {
            "slug": slug,
            "page_type": page_type,
            "run_id": run_id,
            "content_hash": doc["content_hash"],
            "previous_hash": previous_hash,
            "content_changed": content_changed,
            "extracted_at": doc["extracted_at"],
            "extraction_version": doc["extraction_version"],
        }

        try:
            if content_changed:
                output_path.parent.mkdir(parents=True, exist_ok=True)
                output_path.write_text(
                    json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8"
                )
            self._append_version_log(version_entry)
            previous_hashes[key] = doc["content_hash"]
        except OSError as exc:
            logger.error("Write failed for %s/%s: %s", page_type, slug, exc)
            return NormalisationRecord(
                slug=slug,
                page_type=page_type,
                status="failed",
                output_path="",
                content_changed=content_changed,
                error_message=f"Write error: {exc}",
            )

        status = "normalised" if content_changed else "unchanged"
        return NormalisationRecord(
            slug=slug,
            page_type=page_type,
            status=status,
            output_path=relative_path,
            content_changed=content_changed,
            error_message="",
        )

    def extract_document(self, html_path: Path, page_type: str, slug: str) -> dict:
        """Parse a raw HTML file and return a normalised document dict."""
        try:
            html_content = html_path.read_text(encoding="utf-8", errors="replace")
        except OSError as exc:
            raise NormalisationError(f"Cannot read file {html_path}.") from exc

        content_length_bytes = html_path.stat().st_size

        try:
            soup = BeautifulSoup(html_content, "lxml")
        except Exception as exc:
            raise NormalisationError(f"Cannot parse HTML in {html_path}.") from exc

        source_url = f"{self._base_url}/{page_type}/{slug}"
        region = _main_content_region(soup)

        # --- Metadata (from <head>) ---
        raw_page_title = (soup.title.string or "").strip() if soup.title else ""
        page_title = _sanitise(_SITE_SUFFIX_RE.sub("", raw_page_title)) or raw_page_title

        canonical_url: str | None = None
        link_canon = soup.find("link", rel="canonical")
        if link_canon and link_canon.get("href"):
            canonical_url = link_canon["href"].strip() or None

        meta_description: str | None = None
        og_title: str | None = None
        og_description: str | None = None
        for meta in soup.find_all("meta"):
            name = (meta.get("name") or "").lower()
            prop = (meta.get("property") or "").lower()
            content_val = (meta.get("content") or "").strip()
            if name == "description":
                meta_description = content_val or None
            elif prop == "og:title":
                og_title = content_val or None
            elif prop == "og:description":
                og_description = content_val or None

        # --- H1 (prefer from main region; fall back to anywhere in body) ---
        h1_tag = region.find("h1")
        h1 = _sanitise(h1_tag.get_text()) if h1_tag else ""
        if not h1:
            fallback_h1 = soup.find("h1")
            h1 = _sanitise(fallback_h1.get_text()) if fallback_h1 else ""

        # --- Headings (h1–h3, document order, from main region) ---
        headings: list[dict] = []
        for tag in region.find_all(["h1", "h2", "h3"]):
            text = _sanitise(tag.get_text())
            if text:
                headings.append({"level": int(tag.name[1]), "text": text})

        # --- Body paragraphs (noise-filtered) ---
        body_paragraphs: list[str] = []
        for p in region.find_all("p"):
            text = _sanitise(p.get_text())
            if not text:
                continue
            # Skip paragraphs that are only a single short link (navigation noise)
            direct_children = [c for c in p.children if getattr(c, "name", None)]
            if (
                len(direct_children) == 1
                and direct_children[0].name == "a"
                and len(text.split()) <= 5
            ):
                continue
            body_paragraphs.append(text)

        # --- Lists (ul / ol, direct items only) ---
        lists: list[dict] = []
        for lst in region.find_all(["ul", "ol"]):
            list_type = "ordered" if lst.name == "ol" else "unordered"
            items: list[str] = []
            for li in lst.find_all("li", recursive=False):
                item_text = _sanitise(li.get_text())
                if item_text:
                    items.append(item_text)
            if items:
                lists.append({"list_type": list_type, "items": items})

        # --- Internal links (conditions / therapies only) ---
        base_netloc = urlparse(self._base_url).netloc
        internal_links: list[dict] = []
        seen: set[str] = set()
        for a_tag in region.find_all("a", href=True):
            href = a_tag["href"].strip()
            if not href or href.startswith("#"):
                continue
            abs_url = urljoin(self._base_url, href.split("#")[0])
            parsed = urlparse(abs_url)
            if parsed.netloc != base_netloc or parsed.scheme not in ("http", "https"):
                continue
            path = parsed.path.rstrip("/")
            if path in seen:
                continue
            seen.add(path)
            anchor_text = _sanitise(a_tag.get_text())
            if path.startswith("/conditions/"):
                target_type = "condition"
            elif path.startswith("/therapies/"):
                target_type = "therapy"
            else:
                continue
            internal_links.append({
                "href": path,
                "anchor_text": anchor_text,
                "target_type": target_type,
            })

        extraction_complete = bool(h1 and page_title and body_paragraphs)

        # Hash only semantic content fields; exclude timestamps and technical metadata
        content_fields: dict = {
            "slug": slug,
            "page_type": page_type,
            "source_url": source_url,
            "canonical_url": canonical_url,
            "page_title": page_title,
            "raw_page_title": raw_page_title,
            "meta_description": meta_description,
            "og_title": og_title,
            "og_description": og_description,
            "h1": h1,
            "headings": headings,
            "body_paragraphs": body_paragraphs,
            "lists": lists,
            "internal_links": internal_links,
        }
        content_hash = _compute_hash(content_fields)

        return {
            **content_fields,
            "extracted_at": _utcnow_iso(),
            "extraction_version": _EXTRACTION_VERSION,
            "fetch_http_status": None,
            "content_length_bytes": content_length_bytes,
            "content_hash": content_hash,
            "extraction_complete": extraction_complete,
        }

    # ------------------------------------------------------------------
    # Version log
    # ------------------------------------------------------------------

    def _load_previous_hashes(self) -> dict[str, str]:
        """Build {page_type/slug: last_content_hash} from the version log."""
        if not self._version_log_path.exists():
            return {}
        hashes: dict[str, str] = {}
        try:
            for line in self._version_log_path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                    key = f"{entry['page_type']}/{entry['slug']}"
                    hashes[key] = entry["content_hash"]
                except (json.JSONDecodeError, KeyError):
                    pass
        except OSError:
            pass
        return hashes

    def _append_version_log(self, entry: dict) -> None:
        """Append one JSON line to version_log.jsonl."""
        try:
            with open(self._version_log_path, "a", encoding="utf-8") as fh:
                fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
        except OSError as exc:
            logger.warning("Could not write version log: %s", exc)
