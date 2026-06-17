"""Raw HTML acquisition for Mansi Phase 1 content collection.

Fetches raw HTML for each discovered URL and stores it to disk.
Resumable: already-fetched files are skipped. All outcomes (fetched, skipped,
failed) are streamed to acquisition_log.csv so the log survives interruption.
"""

from __future__ import annotations

import csv
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from app.integrations.web_scraper import ScraperError, WebScraper
from app.services.discovery_service import DiscoveredUrl

logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).parent.parent.parent
_DEFAULT_RAW_DIR = _PROJECT_ROOT / "data" / "raw"
_DEFAULT_LOG_PATH = _PROJECT_ROOT / "data" / "discovery" / "acquisition_log.csv"

_LOG_FIELDNAMES = [
    "url",
    "slug",
    "category",
    "status",
    "output_path",
    "fetched_at",
    "http_status",
    "content_length_bytes",
    "error_message",
]


class AcquisitionError(Exception):
    """User-safe error from the acquisition workflow."""


@dataclass(frozen=True)
class AcquisitionRecord:
    url: str
    slug: str
    category: str
    status: str           # "fetched" | "skipped" | "failed"
    output_path: str
    fetched_at: str       # ISO-8601 UTC; empty string if skipped/failed
    http_status: int | None
    content_length_bytes: int
    error_message: str    # empty string on success/skip


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class AcquisitionService:
    """Fetches and stores raw HTML for each discovered URL.

    Resumable: if the output .html file already exists and is non-empty, that
    URL is recorded as 'skipped' and not re-fetched.
    """

    def __init__(
        self,
        scraper: WebScraper | None = None,
        raw_dir: Path | None = None,
        log_path: Path | None = None,
    ) -> None:
        self._scraper = scraper or WebScraper()
        self._raw_dir = raw_dir or _DEFAULT_RAW_DIR
        self._log_path = log_path or _DEFAULT_LOG_PATH

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    def run(self, urls: list[DiscoveredUrl]) -> list[AcquisitionRecord]:
        """Fetch all URLs; write HTML files and stream rows to acquisition_log.csv.

        Per-URL failures are captured as status='failed' and never abort the run.

        Raises:
            AcquisitionError: only for catastrophic setup failures (cannot
                create output directories).
        """
        try:
            self._raw_dir.mkdir(parents=True, exist_ok=True)
            self._log_path.parent.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            raise AcquisitionError(
                "Cannot create output directories — check filesystem permissions."
            ) from exc

        # Reset the log for this run
        self._init_log()

        records: list[AcquisitionRecord] = []
        valid_urls = [d for d in urls if d.is_valid]
        logger.info("Acquisition starting: %d valid URLs to process.", len(valid_urls))

        for discovered in valid_urls:
            record = self.acquire_one(discovered)
            records.append(record)
            self.append_log_record(record)
            logger.info(
                "[%s] %s → %s",
                record.status.upper(),
                discovered.url,
                record.output_path or "(no file)",
            )

        fetched = sum(1 for r in records if r.status == "fetched")
        skipped = sum(1 for r in records if r.status == "skipped")
        failed = sum(1 for r in records if r.status == "failed")
        logger.info(
            "Acquisition complete: %d fetched, %d skipped, %d failed.",
            fetched,
            skipped,
            failed,
        )
        return records

    # ------------------------------------------------------------------
    # Per-URL logic
    # ------------------------------------------------------------------

    def acquire_one(self, discovered: DiscoveredUrl) -> AcquisitionRecord:
        """Fetch and save a single page. Never raises — captures failures in the record."""
        output_path = self.output_path_for(discovered)
        try:
            relative_path = str(output_path.relative_to(_PROJECT_ROOT))
        except ValueError:
            relative_path = str(output_path)

        if self.is_already_fetched(output_path):
            return AcquisitionRecord(
                url=discovered.url,
                slug=discovered.slug,
                category=discovered.category,
                status="skipped",
                output_path=relative_path,
                fetched_at="",
                http_status=None,
                content_length_bytes=output_path.stat().st_size,
                error_message="",
            )

        try:
            result = self._scraper.fetch(discovered.url)
            self.write_html(output_path, result.html)
            return AcquisitionRecord(
                url=discovered.url,
                slug=discovered.slug,
                category=discovered.category,
                status="fetched",
                output_path=relative_path,
                fetched_at=result.fetched_at,
                http_status=result.status_code,
                content_length_bytes=len(result.html.encode("utf-8")),
                error_message="",
            )
        except ScraperError as exc:
            logger.error("Fetch failed for %s: %s", discovered.url, exc)
            return AcquisitionRecord(
                url=discovered.url,
                slug=discovered.slug,
                category=discovered.category,
                status="failed",
                output_path="",
                fetched_at="",
                http_status=None,
                content_length_bytes=0,
                error_message=str(exc),
            )
        except Exception as exc:
            logger.exception("Unexpected error acquiring %s", discovered.url)
            return AcquisitionRecord(
                url=discovered.url,
                slug=discovered.slug,
                category=discovered.category,
                status="failed",
                output_path="",
                fetched_at="",
                http_status=None,
                content_length_bytes=0,
                error_message="Unexpected error — see logs for details.",
            )

    def is_already_fetched(self, output_path: Path) -> bool:
        """Return True if the output file exists and is non-empty."""
        return output_path.exists() and output_path.stat().st_size > 0

    def write_html(self, path: Path, html: str) -> None:
        """Write raw HTML to path, creating parent directories as needed."""
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(html, encoding="utf-8")
        except OSError as exc:
            raise AcquisitionError(f"Could not write HTML to {path}.") from exc

    def output_path_for(self, discovered: DiscoveredUrl) -> Path:
        """Compute data/raw/{category}/{slug}.html for a DiscoveredUrl."""
        return self._raw_dir / discovered.category / f"{discovered.slug}.html"

    # ------------------------------------------------------------------
    # Log management
    # ------------------------------------------------------------------

    def _init_log(self) -> None:
        """Write log file with headers (overwrites any previous log)."""
        with open(self._log_path, "w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=_LOG_FIELDNAMES)
            writer.writeheader()

    def append_log_record(self, record: AcquisitionRecord) -> None:
        """Append a single record row to the log CSV.

        Creates the file with headers if it does not yet exist (e.g., during
        tests that bypass _init_log).
        """
        file_exists = self._log_path.exists()
        with open(self._log_path, "a", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=_LOG_FIELDNAMES)
            if not file_exists:
                writer.writeheader()
            writer.writerow({
                "url": record.url,
                "slug": record.slug,
                "category": record.category,
                "status": record.status,
                "output_path": record.output_path,
                "fetched_at": record.fetched_at,
                "http_status": record.http_status if record.http_status is not None else "",
                "content_length_bytes": record.content_length_bytes,
                "error_message": record.error_message,
            })

    def write_log(self, records: list[AcquisitionRecord]) -> Path:
        """Write/overwrite the acquisition_log.csv with all records at once."""
        with open(self._log_path, "w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=_LOG_FIELDNAMES)
            writer.writeheader()
            for record in records:
                writer.writerow({
                    "url": record.url,
                    "slug": record.slug,
                    "category": record.category,
                    "status": record.status,
                    "output_path": record.output_path,
                    "fetched_at": record.fetched_at,
                    "http_status": record.http_status if record.http_status is not None else "",
                    "content_length_bytes": record.content_length_bytes,
                    "error_message": record.error_message,
                })
        return self._log_path
