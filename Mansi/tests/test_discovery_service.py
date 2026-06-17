"""Tests for app/services/discovery_service.py."""

from __future__ import annotations

import csv
from pathlib import Path

import pytest

from app.integrations.web_scraper import FetchResult, RobotsRules
from app.services.discovery_service import (
    DiscoveredUrl,
    DiscoveryError,
    DiscoveryService,
)


# ---------------------------------------------------------------------------
# Fake scraper
# ---------------------------------------------------------------------------


class FakeScraper:
    """Controlled stand-in for WebScraper — no real HTTP requests."""

    def __init__(
        self,
        robots: RobotsRules | None = None,
        sitemap_urls_map: dict[str, list[str]] | None = None,
        index_html: dict[str, str] | None = None,
        head_status: int = 200,
    ) -> None:
        self._robots = robots or RobotsRules(base_url="https://example.com")
        self._sitemap_map = sitemap_urls_map or {}
        self._index_html = index_html or {}
        self._head_status = head_status
        self._client = _FakeHttpxClient(head_status)

    def fetch_robots_txt(self) -> RobotsRules:
        return self._robots

    def fetch_sitemap(self, url: str) -> list[str]:
        return self._sitemap_map.get(url, [])

    def fetch(self, url: str) -> FetchResult:
        html = self._index_html.get(url, "<html><body><a href='/conditions/adhd'>ADHD</a></body></html>")
        return FetchResult(
            url=url,
            original_url=url,
            status_code=200,
            html=html,
            content_type="text/html",
            fetched_at="2026-06-17T10:00:00Z",
        )

    def is_allowed(self, url: str, robots: RobotsRules) -> bool:
        for path in robots.disallowed_paths:
            from urllib.parse import urlparse
            if urlparse(url).path.startswith(path):
                return False
        return True

    def validate_url(self, url: str) -> bool:
        return True

    def close(self) -> None:
        pass


class _FakeHttpxClient:
    def __init__(self, status: int = 200) -> None:
        self._status = status

    def head(self, url: str, **kwargs) -> "_FakeResponse":
        return _FakeResponse(self._status)


class _FakeResponse:
    def __init__(self, status_code: int) -> None:
        self.status_code = status_code


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def output_dir(tmp_path: Path) -> Path:
    d = tmp_path / "discovery"
    d.mkdir()
    return d


def _make_robots_with_sitemap(sitemap_url: str = "https://example.com/sitemap.xml") -> RobotsRules:
    return RobotsRules(
        base_url="https://example.com",
        sitemap_urls=[sitemap_url],
    )


def _make_condition_therapy_sitemap_urls() -> list[str]:
    return [
        "https://example.com/conditions/adhd",
        "https://example.com/conditions/autism",
        "https://example.com/therapies/cbt",
    ]


# ---------------------------------------------------------------------------
# categorize_url tests
# ---------------------------------------------------------------------------


def test_categorize_url_conditions(output_dir):
    svc = DiscoveryService(scraper=FakeScraper(), output_dir=output_dir)
    assert svc.categorize_url("https://example.com/conditions/adhd") == "conditions"


def test_categorize_url_therapies(output_dir):
    svc = DiscoveryService(scraper=FakeScraper(), output_dir=output_dir)
    assert svc.categorize_url("https://example.com/therapies/cbt") == "therapies"


def test_categorize_url_unknown(output_dir):
    svc = DiscoveryService(scraper=FakeScraper(), output_dir=output_dir)
    assert svc.categorize_url("https://example.com/about") == "unknown"


def test_categorize_url_index_page_is_unknown(output_dir):
    svc = DiscoveryService(scraper=FakeScraper(), output_dir=output_dir)
    # /conditions/ with nothing after is just the index, not a content page
    assert svc.categorize_url("https://example.com/conditions/") == "unknown"


# ---------------------------------------------------------------------------
# derive_slug tests
# ---------------------------------------------------------------------------


def test_derive_slug_extracts_last_segment(output_dir):
    svc = DiscoveryService(scraper=FakeScraper(), output_dir=output_dir)
    assert svc.derive_slug("https://example.com/conditions/adhd") == "adhd"


def test_derive_slug_strips_trailing_slash(output_dir):
    svc = DiscoveryService(scraper=FakeScraper(), output_dir=output_dir)
    assert svc.derive_slug("https://example.com/therapies/cbt/") == "cbt"


# ---------------------------------------------------------------------------
# run() output file tests
# ---------------------------------------------------------------------------


def test_run_writes_url_inventory_csv(output_dir):
    robots = _make_robots_with_sitemap()
    urls = _make_condition_therapy_sitemap_urls()
    scraper = FakeScraper(robots=robots, sitemap_urls_map={"https://example.com/sitemap.xml": urls})

    svc = DiscoveryService(scraper=scraper, output_dir=output_dir)
    svc.run()

    csv_path = output_dir / "url_inventory.csv"
    assert csv_path.exists()
    with open(csv_path, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    assert len(rows) == 3
    slugs = {r["slug"] for r in rows}
    assert "adhd" in slugs
    assert "cbt" in slugs


def test_run_writes_conditions_txt_with_valid_urls_only(output_dir):
    robots = _make_robots_with_sitemap()
    scraper = FakeScraper(
        robots=robots,
        sitemap_urls_map={"https://example.com/sitemap.xml": _make_condition_therapy_sitemap_urls()},
        head_status=200,
    )

    svc = DiscoveryService(scraper=scraper, output_dir=output_dir)
    svc.run()

    txt = (output_dir / "conditions_urls.txt").read_text(encoding="utf-8")
    assert "conditions/adhd" in txt
    assert "conditions/autism" in txt
    assert "therapies/cbt" not in txt


def test_run_writes_therapies_txt(output_dir):
    robots = _make_robots_with_sitemap()
    scraper = FakeScraper(
        robots=robots,
        sitemap_urls_map={"https://example.com/sitemap.xml": _make_condition_therapy_sitemap_urls()},
    )

    svc = DiscoveryService(scraper=scraper, output_dir=output_dir)
    svc.run()

    txt = (output_dir / "therapies_urls.txt").read_text(encoding="utf-8")
    assert "therapies/cbt" in txt
    assert "conditions/adhd" not in txt


def test_run_writes_discovery_log_md(output_dir):
    robots = _make_robots_with_sitemap()
    scraper = FakeScraper(
        robots=robots,
        sitemap_urls_map={"https://example.com/sitemap.xml": _make_condition_therapy_sitemap_urls()},
    )

    svc = DiscoveryService(scraper=scraper, output_dir=output_dir)
    svc.run()

    log = (output_dir / "discovery_log.md").read_text(encoding="utf-8")
    assert "# Discovery Log" in log
    assert "Conditions URLs (valid)" in log


def test_run_falls_back_to_index_crawl_when_no_sitemap(output_dir):
    """When robots.txt has no sitemap, index pages are crawled."""
    robots = RobotsRules(base_url="https://example.com")  # no sitemap_urls
    index_html = {
        "https://example.com/conditions": (
            "<html><body>"
            "<a href='/conditions/anxiety'>Anxiety</a>"
            "<a href='/conditions/ocd'>OCD</a>"
            "</body></html>"
        ),
        "https://example.com/therapies": (
            "<html><body>"
            "<a href='/therapies/dbt'>DBT</a>"
            "</body></html>"
        ),
    }
    scraper = FakeScraper(robots=robots, index_html=index_html)

    svc = DiscoveryService(scraper=scraper, output_dir=output_dir)

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(svc, "_base_url", "https://example.com")
        discovered = svc.run()

    slugs = {d.slug for d in discovered}
    assert "anxiety" in slugs
    assert "dbt" in slugs


def test_run_filters_invalid_urls_from_txt(output_dir):
    """URLs that fail HEAD validation (non-200) are excluded from txt files."""
    robots = _make_robots_with_sitemap()
    scraper = FakeScraper(
        robots=robots,
        sitemap_urls_map={"https://example.com/sitemap.xml": _make_condition_therapy_sitemap_urls()},
        head_status=404,  # all fail validation
    )

    svc = DiscoveryService(scraper=scraper, output_dir=output_dir)
    svc.run()

    txt = (output_dir / "conditions_urls.txt").read_text(encoding="utf-8").strip()
    assert txt == ""
