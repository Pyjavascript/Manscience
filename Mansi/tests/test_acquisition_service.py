"""Tests for app/services/acquisition_service.py."""

from __future__ import annotations

import csv
from pathlib import Path

import pytest

from app.integrations.web_scraper import FetchResult, ScraperError
from app.services.acquisition_service import AcquisitionRecord, AcquisitionService
from app.services.discovery_service import DiscoveredUrl


# ---------------------------------------------------------------------------
# Fake scraper
# ---------------------------------------------------------------------------


class FakeScraper:
    """Controlled stand-in for WebScraper."""

    def __init__(
        self,
        html_map: dict[str, str] | None = None,
        fail_urls: set[str] | None = None,
    ) -> None:
        self._html_map = html_map or {}
        self._fail_urls = fail_urls or set()

    def fetch(self, url: str) -> FetchResult:
        if url in self._fail_urls:
            raise ScraperError(f"Simulated fetch failure for {url}")
        html = self._html_map.get(url, f"<html><body>Content for {url}</body></html>")
        return FetchResult(
            url=url,
            original_url=url,
            status_code=200,
            html=html,
            content_type="text/html",
            fetched_at="2026-06-17T10:00:00Z",
        )

    def close(self) -> None:
        pass


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_discovered(
    url: str = "https://example.com/conditions/adhd",
    slug: str = "adhd",
    category: str = "conditions",
    is_valid: bool = True,
) -> DiscoveredUrl:
    return DiscoveredUrl(
        url=url,
        source="sitemap",
        category=category,
        slug=slug,
        is_valid=is_valid,
        validated_at="2026-06-17T10:00:00Z",
        http_status=200 if is_valid else 404,
    )


# ---------------------------------------------------------------------------
# output_path_for
# ---------------------------------------------------------------------------


def test_output_path_for_conditions(tmp_path):
    svc = AcquisitionService(scraper=FakeScraper(), raw_dir=tmp_path / "raw", log_path=tmp_path / "log.csv")
    d = _make_discovered(slug="adhd", category="conditions")
    assert svc.output_path_for(d) == tmp_path / "raw" / "conditions" / "adhd.html"


def test_output_path_for_therapies(tmp_path):
    svc = AcquisitionService(scraper=FakeScraper(), raw_dir=tmp_path / "raw", log_path=tmp_path / "log.csv")
    d = _make_discovered(slug="cbt", category="therapies")
    assert svc.output_path_for(d) == tmp_path / "raw" / "therapies" / "cbt.html"


# ---------------------------------------------------------------------------
# is_already_fetched
# ---------------------------------------------------------------------------


def test_is_already_fetched_true_for_existing_nonempty_file(tmp_path):
    svc = AcquisitionService(scraper=FakeScraper(), raw_dir=tmp_path, log_path=tmp_path / "log.csv")
    f = tmp_path / "test.html"
    f.write_text("<html></html>", encoding="utf-8")
    assert svc.is_already_fetched(f) is True


def test_is_already_fetched_false_for_missing_file(tmp_path):
    svc = AcquisitionService(scraper=FakeScraper(), raw_dir=tmp_path, log_path=tmp_path / "log.csv")
    assert svc.is_already_fetched(tmp_path / "nonexistent.html") is False


def test_is_already_fetched_false_for_zero_byte_file(tmp_path):
    svc = AcquisitionService(scraper=FakeScraper(), raw_dir=tmp_path, log_path=tmp_path / "log.csv")
    f = tmp_path / "empty.html"
    f.write_bytes(b"")
    assert svc.is_already_fetched(f) is False


# ---------------------------------------------------------------------------
# acquire_one
# ---------------------------------------------------------------------------


def test_acquire_one_fetches_and_writes_html(tmp_path):
    raw_dir = tmp_path / "raw"
    svc = AcquisitionService(
        scraper=FakeScraper(html_map={"https://example.com/conditions/adhd": "<html>ADHD</html>"}),
        raw_dir=raw_dir,
        log_path=tmp_path / "log.csv",
    )
    d = _make_discovered()
    record = svc.acquire_one(d)

    assert record.status == "fetched"
    assert (raw_dir / "conditions" / "adhd.html").read_text(encoding="utf-8") == "<html>ADHD</html>"


def test_acquire_one_skips_already_fetched_file(tmp_path):
    raw_dir = tmp_path / "raw"
    html_file = raw_dir / "conditions" / "adhd.html"
    html_file.parent.mkdir(parents=True)
    html_file.write_text("<html>cached</html>", encoding="utf-8")

    svc = AcquisitionService(scraper=FakeScraper(), raw_dir=raw_dir, log_path=tmp_path / "log.csv")
    d = _make_discovered()
    record = svc.acquire_one(d)

    assert record.status == "skipped"


def test_acquire_one_records_failed_fetch(tmp_path):
    svc = AcquisitionService(
        scraper=FakeScraper(fail_urls={"https://example.com/conditions/adhd"}),
        raw_dir=tmp_path / "raw",
        log_path=tmp_path / "log.csv",
    )
    d = _make_discovered()
    record = svc.acquire_one(d)

    assert record.status == "failed"
    assert record.error_message != ""


# ---------------------------------------------------------------------------
# run()
# ---------------------------------------------------------------------------


def test_run_fetches_all_valid_urls(tmp_path):
    raw_dir = tmp_path / "raw"
    urls = [
        _make_discovered("https://example.com/conditions/adhd", "adhd", "conditions"),
        _make_discovered("https://example.com/therapies/cbt", "cbt", "therapies"),
    ]
    svc = AcquisitionService(scraper=FakeScraper(), raw_dir=raw_dir, log_path=tmp_path / "log.csv")
    records = svc.run(urls)

    assert len(records) == 2
    assert all(r.status == "fetched" for r in records)
    assert (raw_dir / "conditions" / "adhd.html").exists()
    assert (raw_dir / "therapies" / "cbt.html").exists()


def test_run_skips_invalid_urls(tmp_path):
    """URLs with is_valid=False are not fetched."""
    urls = [_make_discovered(is_valid=False)]
    svc = AcquisitionService(scraper=FakeScraper(), raw_dir=tmp_path / "raw", log_path=tmp_path / "log.csv")
    records = svc.run(urls)
    assert records == []


def test_run_does_not_abort_on_per_url_failure(tmp_path):
    """A failing URL records status='failed' but does not stop other URLs."""
    raw_dir = tmp_path / "raw"
    urls = [
        _make_discovered("https://example.com/conditions/adhd", "adhd", "conditions"),
        _make_discovered("https://example.com/conditions/autism", "autism", "conditions"),
    ]
    svc = AcquisitionService(
        scraper=FakeScraper(fail_urls={"https://example.com/conditions/adhd"}),
        raw_dir=raw_dir,
        log_path=tmp_path / "log.csv",
    )
    records = svc.run(urls)

    statuses = {r.slug: r.status for r in records}
    assert statuses["adhd"] == "failed"
    assert statuses["autism"] == "fetched"


def test_run_writes_acquisition_log_csv(tmp_path):
    raw_dir = tmp_path / "raw"
    log_path = tmp_path / "log.csv"
    urls = [_make_discovered()]
    svc = AcquisitionService(scraper=FakeScraper(), raw_dir=raw_dir, log_path=log_path)
    svc.run(urls)

    assert log_path.exists()
    with open(log_path, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    assert len(rows) == 1
    assert rows[0]["slug"] == "adhd"
    assert rows[0]["status"] == "fetched"


# ---------------------------------------------------------------------------
# append_log_record
# ---------------------------------------------------------------------------


def test_append_log_record_creates_file_with_headers_if_missing(tmp_path):
    log_path = tmp_path / "log.csv"
    svc = AcquisitionService(scraper=FakeScraper(), raw_dir=tmp_path, log_path=log_path)
    record = AcquisitionRecord(
        url="https://example.com/conditions/adhd",
        slug="adhd",
        category="conditions",
        status="fetched",
        output_path="data/raw/conditions/adhd.html",
        fetched_at="2026-06-17T10:00:00Z",
        http_status=200,
        content_length_bytes=1024,
        error_message="",
    )
    svc.append_log_record(record)

    with open(log_path, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    assert len(rows) == 1
    assert rows[0]["slug"] == "adhd"


def test_append_log_record_does_not_repeat_headers(tmp_path):
    log_path = tmp_path / "log.csv"
    svc = AcquisitionService(scraper=FakeScraper(), raw_dir=tmp_path, log_path=log_path)

    def _make_record(slug: str) -> AcquisitionRecord:
        return AcquisitionRecord(
            url=f"https://example.com/conditions/{slug}",
            slug=slug,
            category="conditions",
            status="fetched",
            output_path=f"data/raw/conditions/{slug}.html",
            fetched_at="2026-06-17T10:00:00Z",
            http_status=200,
            content_length_bytes=100,
            error_message="",
        )

    svc.append_log_record(_make_record("adhd"))
    svc.append_log_record(_make_record("autism"))

    with open(log_path, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    assert len(rows) == 2
