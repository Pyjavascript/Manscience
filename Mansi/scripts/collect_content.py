"""Content collection and normalisation for Mansi AI.

Run this to populate Mansi's local knowledge base with structured content
from the Mansi website. The collected content is what Mansi will use to
answer user questions about conditions and therapies in any conversation.

Usage:
    python scripts/collect_content.py

Steps run automatically in sequence:
    1. Discover all condition and therapy page URLs
    2. Fetch and store the raw HTML for each page
    3. Analyse the content and write a content model summary
    4. Normalise raw HTML into versioned structured JSON

Output is written to:
    data/discovery/   — URL inventory and acquisition log
    data/raw/         — Raw HTML files (one per page)
    data/normalized/  — Normalised JSON documents (one per page)
    docs/specs/phase-1-content-model.md  — Content structure summary
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

# Allow `from app.*` imports when run directly as a script.
_PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(_PROJECT_ROOT))

from app.config.settings import ConfigurationError, settings  # noqa: E402
from app.integrations.web_scraper import WebScraper  # noqa: E402
from app.services.acquisition_service import AcquisitionError, AcquisitionService  # noqa: E402
from app.services.analysis_service import AnalysisError, AnalysisService  # noqa: E402
from app.services.discovery_service import DiscoveryError, DiscoveryService  # noqa: E402
from app.services.normalisation_service import NormalisationError, NormalisationService  # noqa: E402


def _setup_logging() -> None:
    logging.basicConfig(
        level=getattr(logging, settings.log_level, logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )


def main() -> None:
    try:
        _setup_logging()
    except ConfigurationError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        sys.exit(1)

    logger = logging.getLogger("collect_content")
    logger.info("Starting Mansi content collection from %s", settings.website_base_url)

    scraper = WebScraper()

    try:
        # Step 1: Discover URLs
        logger.info("--- Step 1/3: URL Discovery ---")
        discovery = DiscoveryService(scraper=scraper)
        discovered = discovery.run()
        valid = [d for d in discovered if d.is_valid]
        logger.info(
            "Discovered %d valid pages (%d conditions, %d therapies).",
            len(valid),
            sum(1 for d in valid if d.category == "conditions"),
            sum(1 for d in valid if d.category == "therapies"),
        )

        # Step 2: Acquire raw HTML
        logger.info("--- Step 2/3: Content Acquisition ---")
        acquisition = AcquisitionService(scraper=scraper)
        records = acquisition.run(discovered)
        fetched = sum(1 for r in records if r.status == "fetched")
        skipped = sum(1 for r in records if r.status == "skipped")
        failed = sum(1 for r in records if r.status == "failed")
        logger.info(
            "Acquisition done: %d fetched, %d skipped (already had), %d failed.",
            fetched,
            skipped,
            failed,
        )

        # Step 3: Analyse content structure
        logger.info("--- Step 3/4: Content Analysis ---")
        analysis = AnalysisService()
        output = analysis.run()
        logger.info("Content model written to %s", output)

        # Step 4: Normalise raw HTML into versioned structured JSON
        logger.info("--- Step 4/4: Content Normalisation ---")
        normalisation = NormalisationService()
        norm_records = normalisation.run()
        norm_done = sum(1 for r in norm_records if r.status == "normalised")
        norm_unchanged = sum(1 for r in norm_records if r.status == "unchanged")
        norm_failed = sum(1 for r in norm_records if r.status == "failed")
        logger.info(
            "Normalisation done: %d normalised, %d unchanged, %d failed.",
            norm_done,
            norm_unchanged,
            norm_failed,
        )

        logger.info(
            "Collection complete. Mansi now has %d pages ready for use "
            "(%d normalised JSON documents).",
            fetched + skipped,
            norm_done + norm_unchanged,
        )

    except DiscoveryError as exc:
        logger.error("Discovery failed: %s", exc)
        sys.exit(1)
    except AcquisitionError as exc:
        logger.error("Acquisition failed: %s", exc)
        sys.exit(1)
    except AnalysisError as exc:
        logger.error("Analysis failed: %s", exc)
        sys.exit(1)
    except NormalisationError as exc:
        logger.error("Normalisation failed: %s", exc)
        sys.exit(1)
    except Exception:
        logger.exception("Unexpected error during content collection.")
        sys.exit(1)
    finally:
        scraper.close()


if __name__ == "__main__":
    main()
