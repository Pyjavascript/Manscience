"""Tests for app/integrations/web_scraper.py."""

from __future__ import annotations

import time
from unittest.mock import MagicMock, patch

import pytest

from app.integrations.web_scraper import (
    FetchResult,
    RobotsRules,
    ScraperError,
    WebScraper,
    _backoff_delay,
    _extract_sitemap_locs,
    _is_retryable,
    _parse_robots_txt,
)


# ---------------------------------------------------------------------------
# Module-level helper tests (no network)
# ---------------------------------------------------------------------------


def test_backoff_delay_increases_with_attempt():
    d1 = _backoff_delay(1)
    d2 = _backoff_delay(2)
    d3 = _backoff_delay(3)
    # Base values: 1, 2, 4 — with jitter the later ones should be larger
    assert d1 < d3
    assert d2 < d3


def test_is_retryable_true_for_5xx_and_429():
    for code in (429, 500, 502, 503, 504):
        assert _is_retryable(code) is True


def test_is_retryable_false_for_200_and_404():
    for code in (200, 301, 400, 404):
        assert _is_retryable(code) is False


def test_parse_robots_txt_extracts_disallow_and_sitemap():
    text = (
        "User-agent: *\n"
        "Disallow: /admin/\n"
        "Disallow: /private/\n"
        "\n"
        "Sitemap: https://example.com/sitemap.xml\n"
    )
    rules = _parse_robots_txt(text, "https://example.com")
    assert rules.disallowed_paths == ["/admin/", "/private/"]
    assert rules.sitemap_urls == ["https://example.com/sitemap.xml"]


def test_parse_robots_txt_ignores_non_star_user_agent():
    text = (
        "User-agent: Googlebot\n"
        "Disallow: /secret/\n"
        "\n"
        "User-agent: *\n"
        "Disallow: /public-disallow/\n"
    )
    rules = _parse_robots_txt(text, "https://example.com")
    assert "/secret/" not in rules.disallowed_paths
    assert "/public-disallow/" in rules.disallowed_paths


def test_parse_robots_txt_empty_returns_no_rules():
    rules = _parse_robots_txt("", "https://example.com")
    assert rules.disallowed_paths == []
    assert rules.sitemap_urls == []


def test_extract_sitemap_locs_regular_sitemap():
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        "  <url><loc>https://example.com/conditions/adhd</loc></url>"
        "  <url><loc>https://example.com/therapies/cbt</loc></url>"
        "</urlset>"
    )
    urls, is_index = _extract_sitemap_locs(xml)
    assert is_index is False
    assert "https://example.com/conditions/adhd" in urls
    assert "https://example.com/therapies/cbt" in urls


def test_extract_sitemap_locs_index_sitemap():
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        "  <sitemap><loc>https://example.com/sitemap-conditions.xml</loc></sitemap>"
        "  <sitemap><loc>https://example.com/sitemap-therapies.xml</loc></sitemap>"
        "</sitemapindex>"
    )
    urls, is_index = _extract_sitemap_locs(xml)
    assert is_index is True
    assert len(urls) == 2


def test_extract_sitemap_locs_raises_on_invalid_xml():
    with pytest.raises(ScraperError, match="parse sitemap XML"):
        _extract_sitemap_locs("not xml at all <<<")


# ---------------------------------------------------------------------------
# WebScraper unit tests (httpx patched)
# ---------------------------------------------------------------------------


def _make_mock_response(status_code: int = 200, text: str = "<html></html>",
                        content_type: str = "text/html", url: str = "https://example.com/") -> MagicMock:
    resp = MagicMock()
    resp.status_code = status_code
    resp.text = text
    resp.url = url
    resp.history = []
    resp.headers = {"content-type": content_type}
    resp.is_success = (200 <= status_code < 300)
    return resp


@pytest.fixture
def scraper():
    with patch("app.integrations.web_scraper.settings") as mock_settings:
        mock_settings.website_base_url = "https://example.com"
        mock_settings.scraper_delay_seconds = 0  # no delay in tests
        mock_settings.scraper_timeout_seconds = 5
        mock_settings.scraper_user_agent = "TestBot/1.0"
        mock_settings.scraper_max_retries = 3
        with patch("app.integrations.web_scraper.httpx.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client_cls.return_value = mock_client
            s = WebScraper(
                base_url="https://example.com",
                delay_seconds=0,
                timeout_seconds=5,
                user_agent="TestBot/1.0",
                max_retries=3,
            )
            s._client = mock_client
            yield s, mock_client


def test_fetch_success_returns_fetch_result(scraper):
    s, mock_client = scraper
    mock_client.get.return_value = _make_mock_response(200, "<html>hello</html>")

    result = s.fetch("https://example.com/conditions/adhd")

    assert isinstance(result, FetchResult)
    assert result.status_code == 200
    assert result.html == "<html>hello</html>"
    assert result.original_url == "https://example.com/conditions/adhd"


def test_fetch_404_raises_scraper_error_immediately(scraper):
    s, mock_client = scraper
    mock_client.get.return_value = _make_mock_response(404)

    with pytest.raises(ScraperError):
        s.fetch("https://example.com/missing")


def test_fetch_retries_on_500_then_succeeds(scraper):
    s, mock_client = scraper
    s._max_retries = 3
    mock_client.get.side_effect = [
        _make_mock_response(500),
        _make_mock_response(200, "<html>ok</html>"),
    ]

    with patch("app.integrations.web_scraper.time.sleep"):
        result = s.fetch("https://example.com/page")

    assert result.status_code == 200
    assert mock_client.get.call_count == 2


def test_fetch_retries_exhausted_raises_scraper_error(scraper):
    s, mock_client = scraper
    s._max_retries = 2
    mock_client.get.side_effect = ConnectionError("timeout")

    with patch("app.integrations.web_scraper.time.sleep"):
        with pytest.raises(ScraperError):
            s.fetch("https://example.com/page")

    assert mock_client.get.call_count == 2


def test_fetch_robots_txt_success(scraper):
    s, mock_client = scraper
    robots_text = "User-agent: *\nDisallow: /admin/\nSitemap: https://example.com/sitemap.xml\n"
    mock_client.get.return_value = _make_mock_response(200, robots_text)

    rules = s.fetch_robots_txt()

    assert "/admin/" in rules.disallowed_paths
    assert "https://example.com/sitemap.xml" in rules.sitemap_urls


def test_fetch_robots_txt_404_returns_empty_rules(scraper):
    s, mock_client = scraper
    mock_client.get.return_value = _make_mock_response(404)

    rules = s.fetch_robots_txt()

    assert rules.disallowed_paths == []
    assert rules.sitemap_urls == []


def test_fetch_robots_txt_network_error_raises_scraper_error(scraper):
    s, mock_client = scraper
    mock_client.get.side_effect = ConnectionError("no network")

    with pytest.raises(ScraperError, match="robots.txt"):
        s.fetch_robots_txt()


def test_is_allowed_returns_true_for_allowed_path(scraper):
    s, _ = scraper
    rules = RobotsRules(
        base_url="https://example.com",
        disallowed_paths=["/admin/"],
    )
    assert s.is_allowed("https://example.com/conditions/adhd", rules) is True


def test_is_allowed_returns_false_for_disallowed_path(scraper):
    s, _ = scraper
    rules = RobotsRules(
        base_url="https://example.com",
        disallowed_paths=["/admin/"],
    )
    assert s.is_allowed("https://example.com/admin/dashboard", rules) is False


def test_is_allowed_returns_true_when_no_rules(scraper):
    s, _ = scraper
    rules = RobotsRules(base_url="https://example.com")
    assert s.is_allowed("https://example.com/anything", rules) is True


def test_validate_url_accepts_same_domain(scraper):
    s, _ = scraper
    assert s.validate_url("https://example.com/conditions/adhd") is True


def test_validate_url_rejects_different_domain(scraper):
    s, _ = scraper
    assert s.validate_url("https://other.com/conditions/adhd") is False


def test_validate_url_rejects_relative_url(scraper):
    s, _ = scraper
    assert s.validate_url("/conditions/adhd") is False
