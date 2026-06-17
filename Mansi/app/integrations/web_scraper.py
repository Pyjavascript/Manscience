"""HTTP client for respectful web scraping.

The only module permitted to import httpx directly. Implements rate limiting,
retry/backoff, robots.txt parsing, and sitemap XML extraction.
"""

from __future__ import annotations

import logging
import random
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

import httpx

from app.config.settings import settings

logger = logging.getLogger(__name__)

_RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}
_SITEMAP_NS = {
    "sm": "http://www.sitemaps.org/schemas/sitemap/0.9",
}


class ScraperError(Exception):
    """User-safe error: scrape operation failed after retries."""


class RobotsDisallowedError(ScraperError):
    """Raised when robots.txt explicitly disallows crawling the target path."""


@dataclass(frozen=True)
class FetchResult:
    url: str
    original_url: str
    status_code: int
    html: str
    content_type: str
    fetched_at: str
    redirect_chain: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class RobotsRules:
    base_url: str
    disallowed_paths: list[str] = field(default_factory=list)
    sitemap_urls: list[str] = field(default_factory=list)
    raw_text: str = ""


def _backoff_delay(attempt: int) -> float:
    """Exponential backoff: 2^(attempt-1) seconds + uniform jitter 0–0.5s."""
    return (2 ** (attempt - 1)) + random.uniform(0, 0.5)


def _is_retryable(status_code: int) -> bool:
    return status_code in _RETRYABLE_STATUS_CODES


def _parse_robots_txt(text: str, base_url: str) -> RobotsRules:
    """Parse robots.txt and extract User-agent: * rules and Sitemap: entries."""
    disallowed: list[str] = []
    sitemaps: list[str] = []

    in_star_block = False
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        if ":" not in line:
            continue

        directive, _, value = line.partition(":")
        directive = directive.strip().lower()
        value = value.strip()

        if directive == "user-agent":
            in_star_block = value == "*"
        elif directive == "disallow" and in_star_block and value:
            disallowed.append(value)
        elif directive == "sitemap" and value:
            sitemaps.append(value)

    return RobotsRules(
        base_url=base_url,
        disallowed_paths=disallowed,
        sitemap_urls=sitemaps,
        raw_text=text,
    )


def _extract_sitemap_locs(xml_text: str) -> tuple[list[str], bool]:
    """Parse sitemap XML. Returns (urls, is_index).

    is_index=True means the document contains <sitemap> elements (a sitemap
    index); is_index=False means it contains <url> elements (a regular sitemap).
    """
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        raise ScraperError(f"Failed to parse sitemap XML: {exc}") from exc

    tag = root.tag.lower()
    is_index = "sitemapindex" in tag

    urls: list[str] = []
    if is_index:
        for sitemap_el in root.iter():
            if sitemap_el.tag.endswith("}loc") or sitemap_el.tag == "loc":
                parent = sitemap_el.tag
                if loc := (sitemap_el.text or "").strip():
                    urls.append(loc)
        # Re-extract: iterate <sitemap> children's <loc> elements
        urls = []
        for child in root:
            for sub in child:
                local = sub.tag.split("}")[-1] if "}" in sub.tag else sub.tag
                if local == "loc" and (text := (sub.text or "").strip()):
                    urls.append(text)
    else:
        for url_el in root:
            for sub in url_el:
                local = sub.tag.split("}")[-1] if "}" in sub.tag else sub.tag
                if local == "loc" and (text := (sub.text or "").strip()):
                    urls.append(text)

    return urls, is_index


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class WebScraper:
    """HTTP client for respectful web scraping.

    Rate-limits every request, retries transient errors with exponential
    backoff, and surfaces only user-safe errors to callers.
    """

    def __init__(
        self,
        base_url: str | None = None,
        delay_seconds: float | None = None,
        timeout_seconds: int | None = None,
        user_agent: str | None = None,
        max_retries: int | None = None,
    ) -> None:
        self._base_url = (base_url or settings.website_base_url).rstrip("/")
        self._delay_seconds = delay_seconds if delay_seconds is not None else settings.scraper_delay_seconds
        self._timeout = timeout_seconds if timeout_seconds is not None else settings.scraper_timeout_seconds
        self._user_agent = user_agent or settings.scraper_user_agent
        self._max_retries = max_retries if max_retries is not None else settings.scraper_max_retries
        self._client = self._build_client()

    def _build_client(self) -> httpx.Client:
        return httpx.Client(
            headers={"User-Agent": self._user_agent},
            timeout=self._timeout,
            follow_redirects=True,
        )

    def close(self) -> None:
        self._client.close()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def fetch(self, url: str) -> FetchResult:
        """Fetch a URL, apply rate-limit delay, retry on transient errors.

        Raises:
            ScraperError: if the fetch fails after all retries.
        """
        self._apply_delay()
        response = self._fetch_with_retry(url)
        html = response.text
        return FetchResult(
            url=str(response.url),
            original_url=url,
            status_code=response.status_code,
            html=html,
            content_type=response.headers.get("content-type", ""),
            fetched_at=_utcnow_iso(),
            redirect_chain=[str(r.url) for r in response.history],
        )

    def fetch_robots_txt(self) -> RobotsRules:
        """Fetch and parse robots.txt. Returns empty rules on 404."""
        robots_url = f"{self._base_url}/robots.txt"
        try:
            self._apply_delay()
            response = self._client.get(robots_url)
        except Exception as exc:
            logger.exception("Network error fetching robots.txt at %s", robots_url)
            raise ScraperError("Could not fetch robots.txt — network error.") from exc

        if response.status_code == 404:
            logger.debug("robots.txt not found at %s; treating as allow-all.", robots_url)
            return RobotsRules(base_url=self._base_url)

        if response.status_code != 200:
            logger.warning(
                "Unexpected status %s fetching robots.txt; treating as allow-all.",
                response.status_code,
            )
            return RobotsRules(base_url=self._base_url)

        return _parse_robots_txt(response.text, self._base_url)

    def fetch_sitemap(self, sitemap_url: str) -> list[str]:
        """Fetch a sitemap XML and return all page URLs.

        Recurses exactly one level for sitemap index files.

        Raises:
            ScraperError: on network failure or XML parse error.
        """
        self._apply_delay()
        try:
            response = self._client.get(sitemap_url)
        except Exception as exc:
            logger.exception("Network error fetching sitemap at %s", sitemap_url)
            raise ScraperError("Could not fetch sitemap — network error.") from exc

        if response.status_code != 200:
            raise ScraperError(
                f"Sitemap returned unexpected status {response.status_code}."
            )

        urls, is_index = _extract_sitemap_locs(response.text)

        if not is_index:
            return urls

        # Sitemap index: fetch each child sitemap (one level only)
        all_urls: list[str] = []
        for child_url in urls:
            try:
                self._apply_delay()
                child_resp = self._client.get(child_url)
                if child_resp.status_code == 200:
                    child_locs, _ = _extract_sitemap_locs(child_resp.text)
                    all_urls.extend(child_locs)
                else:
                    logger.warning(
                        "Child sitemap %s returned %s; skipping.",
                        child_url,
                        child_resp.status_code,
                    )
            except Exception:
                logger.exception("Failed to fetch child sitemap %s; skipping.", child_url)

        return all_urls

    def is_allowed(self, url: str, robots: RobotsRules) -> bool:
        """Return True if the URL is allowed by the robots rules."""
        if not robots.disallowed_paths:
            return True
        parsed = urlparse(url)
        path = parsed.path
        for disallowed in robots.disallowed_paths:
            if path.startswith(disallowed):
                return False
        return True

    def validate_url(self, url: str) -> bool:
        """Return True if url is absolute and on the same domain as base_url."""
        parsed = urlparse(url)
        base_parsed = urlparse(self._base_url)
        return (
            parsed.scheme in ("http", "https")
            and bool(parsed.netloc)
            and parsed.netloc == base_parsed.netloc
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _fetch_with_retry(self, url: str) -> httpx.Response:
        last_exc: Exception | None = None
        for attempt in range(1, self._max_retries + 1):
            try:
                response = self._client.get(url)
                if _is_retryable(response.status_code) and attempt < self._max_retries:
                    delay = _backoff_delay(attempt)
                    logger.warning(
                        "HTTP %s from %s; retrying in %.1fs (attempt %d/%d).",
                        response.status_code,
                        url,
                        delay,
                        attempt,
                        self._max_retries,
                    )
                    time.sleep(delay)
                    continue
                if not response.is_success and not _is_retryable(response.status_code):
                    raise ScraperError(
                        f"Request to {url!r} failed with status {response.status_code}."
                    )
                return response
            except ScraperError:
                raise
            except Exception as exc:
                last_exc = exc
                if attempt < self._max_retries:
                    delay = _backoff_delay(attempt)
                    logger.warning(
                        "Network error fetching %s: %s; retrying in %.1fs (attempt %d/%d).",
                        url,
                        exc,
                        delay,
                        attempt,
                        self._max_retries,
                    )
                    time.sleep(delay)
                else:
                    logger.exception("All %d fetch attempts failed for %s.", self._max_retries, url)

        raise ScraperError(
            f"Failed to fetch {url!r} after {self._max_retries} attempts."
        ) from last_exc

    def _apply_delay(self) -> None:
        if self._delay_seconds > 0:
            time.sleep(self._delay_seconds)
