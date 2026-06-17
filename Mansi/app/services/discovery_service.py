"""URL discovery pipeline for Mansi Phase 1 content collection.

Orchestrates: robots.txt → sitemap → index page fallback → URL validation →
writing url_inventory.csv, conditions_urls.txt, therapies_urls.txt, discovery_log.md.
"""

from __future__ import annotations

import csv
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

from app.config.settings import settings
from app.integrations.web_scraper import RobotsRules, WebScraper

logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).parent.parent.parent
_DEFAULT_OUTPUT_DIR = _PROJECT_ROOT / "data" / "discovery"

_CATEGORY_PATTERNS: dict[str, str] = {
    "/conditions/": "conditions",
    "/therapies/": "therapies",
}
_INDEX_PATHS: list[str] = ["/conditions", "/therapies"]


class DiscoveryError(Exception):
    """User-safe error from the discovery workflow."""


@dataclass(frozen=True)
class DiscoveredUrl:
    url: str
    source: str           # "sitemap" | "index_page" | "manual"
    category: str         # "conditions" | "therapies" | "unknown"
    slug: str
    is_valid: bool
    validated_at: str     # ISO-8601 UTC
    http_status: int | None


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class DiscoveryService:
    """Discovers all condition and therapy page URLs on the Mansi website."""

    def __init__(
        self,
        scraper: WebScraper | None = None,
        output_dir: Path | None = None,
    ) -> None:
        self._scraper = scraper or WebScraper()
        self._output_dir = output_dir or _DEFAULT_OUTPUT_DIR
        self._base_url = settings.website_base_url

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    def run(self) -> list[DiscoveredUrl]:
        """Execute the full discovery pipeline and write all output files.

        Raises:
            DiscoveryError: if the site is unreachable at startup.
        """
        started_at = _utcnow_iso()
        logger.info("Discovery started at %s against %s", started_at, self._base_url)

        self._output_dir.mkdir(parents=True, exist_ok=True)

        # Step 1: robots.txt
        try:
            robots = self._scraper.fetch_robots_txt()
        except Exception as exc:
            logger.exception("Could not fetch robots.txt")
            raise DiscoveryError("Site is unreachable — cannot start discovery.") from exc

        # Step 2: collect raw candidate URLs
        raw_urls: list[tuple[str, str]] = []  # (url, source)

        if robots.sitemap_urls:
            for sitemap_url in robots.sitemap_urls:
                try:
                    locs = self._scraper.fetch_sitemap(sitemap_url)
                    for loc in locs:
                        raw_urls.append((loc, "sitemap"))
                    logger.info("Sitemap %s yielded %d URLs.", sitemap_url, len(locs))
                except Exception:
                    logger.exception("Failed to fetch sitemap %s; skipping.", sitemap_url)
        else:
            logger.info("No sitemap found; falling back to index page crawl.")
            for path in _INDEX_PATHS:
                try:
                    links = self.crawl_index_page(path)
                    for link in links:
                        raw_urls.append((link, "index_page"))
                    logger.info("Index page %s yielded %d links.", path, len(links))
                except Exception:
                    logger.exception("Failed to crawl index page %s; skipping.", path)

        # Step 3: normalise, deduplicate, categorise
        seen: set[str] = set()
        categorised: list[tuple[str, str, str]] = []  # (url, source, category)
        for url, source in raw_urls:
            url = self._normalise_url(url)
            if not url or url in seen:
                continue
            category = self.categorize_url(url)
            if category == "unknown":
                continue
            if not self._scraper.is_allowed(url, robots):
                logger.debug("robots.txt disallows %s; skipping.", url)
                continue
            seen.add(url)
            categorised.append((url, source, category))

        logger.info("Found %d unique categorised URLs.", len(categorised))

        # Step 4: validate each URL with a HEAD request
        discovered: list[DiscoveredUrl] = []
        for url, source, category in categorised:
            is_valid, status = self.validate_url(url)
            discovered.append(DiscoveredUrl(
                url=url,
                source=source,
                category=category,
                slug=self.derive_slug(url),
                is_valid=is_valid,
                validated_at=_utcnow_iso(),
                http_status=status,
            ))

        # Step 5: write outputs
        self.write_inventory_csv(discovered)
        self.write_category_txt(discovered, "conditions")
        self.write_category_txt(discovered, "therapies")
        finished_at = _utcnow_iso()
        self.write_discovery_log(robots, discovered, started_at, finished_at)

        valid_count = sum(1 for d in discovered if d.is_valid)
        logger.info(
            "Discovery complete: %d URLs found, %d valid. Outputs in %s",
            len(discovered),
            valid_count,
            self._output_dir,
        )
        return discovered

    # ------------------------------------------------------------------
    # Discovery helpers
    # ------------------------------------------------------------------

    def crawl_index_page(self, path: str) -> list[str]:
        """Fetch base_url + path and extract all same-domain <a href> links."""
        from html.parser import HTMLParser

        url = self._base_url + path
        try:
            result = self._scraper.fetch(url)
        except Exception as exc:
            raise DiscoveryError(f"Could not crawl index page {path!r}.") from exc

        class _LinkExtractor(HTMLParser):
            def __init__(self) -> None:
                super().__init__()
                self.links: list[str] = []

            def handle_starttag(self, tag: str, attrs: list) -> None:
                if tag == "a":
                    for name, value in attrs:
                        if name == "href" and value:
                            self.links.append(value)

        parser = _LinkExtractor()
        parser.feed(result.html)

        base_netloc = urlparse(self._base_url).netloc
        absolute: list[str] = []
        for link in parser.links:
            abs_link = urljoin(self._base_url, link.split("#")[0].strip())
            parsed = urlparse(abs_link)
            if parsed.netloc == base_netloc and parsed.scheme in ("http", "https"):
                absolute.append(abs_link)

        return list(dict.fromkeys(absolute))  # deduplicate preserving order

    def categorize_url(self, url: str) -> str:
        """Return 'conditions', 'therapies', or 'unknown' based on URL path."""
        parsed = urlparse(url)
        path = parsed.path
        if not path.endswith("/"):
            path = path + "/"
        for pattern, category in _CATEGORY_PATTERNS.items():
            if path.startswith(pattern) and path != pattern:
                return category
        return "unknown"

    def derive_slug(self, url: str) -> str:
        """Extract the last path segment as the slug."""
        path = urlparse(url).path.rstrip("/")
        return path.split("/")[-1] if path else ""

    def validate_url(self, url: str) -> tuple[bool, int | None]:
        """Send a HEAD request; return (is_valid, status_code)."""
        try:
            response = self._scraper._client.head(url, follow_redirects=True)
            is_valid = response.status_code == 200
            return is_valid, response.status_code
        except Exception:
            logger.exception("HEAD request failed for %s", url)
            return False, None

    # ------------------------------------------------------------------
    # Output writers
    # ------------------------------------------------------------------

    def write_inventory_csv(self, urls: list[DiscoveredUrl]) -> Path:
        path = self._output_dir / "url_inventory.csv"
        fieldnames = ["url", "source", "category", "slug", "is_valid", "validated_at", "http_status"]
        with open(path, "w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=fieldnames)
            writer.writeheader()
            for d in urls:
                writer.writerow({
                    "url": d.url,
                    "source": d.source,
                    "category": d.category,
                    "slug": d.slug,
                    "is_valid": d.is_valid,
                    "validated_at": d.validated_at,
                    "http_status": d.http_status if d.http_status is not None else "",
                })
        logger.info("Wrote %d rows to %s", len(urls), path)
        return path

    def write_category_txt(self, urls: list[DiscoveredUrl], category: str) -> Path:
        path = self._output_dir / f"{category}_urls.txt"
        valid_urls = sorted(
            d.url for d in urls if d.category == category and d.is_valid
        )
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("\n".join(valid_urls))
            if valid_urls:
                fh.write("\n")
        logger.info("Wrote %d %s URLs to %s", len(valid_urls), category, path)
        return path

    def write_discovery_log(
        self,
        robots: RobotsRules,
        all_urls: list[DiscoveredUrl],
        started_at: str,
        finished_at: str,
    ) -> Path:
        path = self._output_dir / "discovery_log.md"

        conditions_valid = sum(1 for d in all_urls if d.category == "conditions" and d.is_valid)
        therapies_valid = sum(1 for d in all_urls if d.category == "therapies" and d.is_valid)
        unknown_count = sum(1 for d in all_urls if d.category == "unknown")
        invalid_count = sum(1 for d in all_urls if not d.is_valid)

        lines = [
            "# Discovery Log",
            "",
            f"- **Run started:** {started_at}",
            f"- **Run finished:** {finished_at}",
            f"- **Base URL:** {self._base_url}",
            "",
            "## robots.txt",
            f"- Disallow rules (User-agent: *): {len(robots.disallowed_paths)}",
            f"- Sitemap URLs found: {len(robots.sitemap_urls)}",
            "",
            "## URL Summary",
            f"- Total URLs discovered and categorised: {len(all_urls)}",
            f"- Conditions URLs (valid): {conditions_valid}",
            f"- Therapies URLs (valid): {therapies_valid}",
            f"- Unknown category (excluded): {unknown_count}",
            f"- Invalid URLs (non-200): {invalid_count}",
            "",
            "## Valid Conditions URLs",
        ]
        for d in sorted(all_urls, key=lambda x: x.url):
            if d.category == "conditions" and d.is_valid:
                lines.append(f"- {d.url} (slug: `{d.slug}`)")

        lines += ["", "## Valid Therapies URLs"]
        for d in sorted(all_urls, key=lambda x: x.url):
            if d.category == "therapies" and d.is_valid:
                lines.append(f"- {d.url} (slug: `{d.slug}`)")

        lines += ["", "## Invalid / Skipped URLs"]
        for d in sorted(all_urls, key=lambda x: x.url):
            if not d.is_valid:
                lines.append(f"- {d.url} (status: {d.http_status})")

        with open(path, "w", encoding="utf-8") as fh:
            fh.write("\n".join(lines) + "\n")

        logger.info("Wrote discovery log to %s", path)
        return path

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _normalise_url(self, url: str) -> str:
        """Lowercase scheme+host, strip trailing slash, strip fragment."""
        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                return ""
            normalised = parsed._replace(
                scheme=parsed.scheme.lower(),
                netloc=parsed.netloc.lower(),
                path=parsed.path.rstrip("/") or "/",
                fragment="",
            )
            return normalised.geturl()
        except Exception:
            return ""
