# Phase 2 Implementation Plan: Content Acquisition & Normalisation

## Context

The Phase 2 spec (`.claude/spec/phase-2-content-acquisition-spec.md`) defines a normalisation pipeline on top of the existing Phase 1 infrastructure. Phase 1 already handles discovery, raw HTML fetching, and basic content analysis. Phase 2's new work is a `NormalisationService` that reads raw HTML, extracts a rich schema, and writes versioned JSON to `data/normalized/`.

The existing codebase already provides:
- `app/integrations/web_scraper.py` — HTTP fetching (reused as-is)
- `app/services/acquisition_service.py` — writes `data/raw/{category}/{slug}.html`
- `app/services/analysis_service.py` — BeautifulSoup parsing patterns to follow
- `scripts/collect_content.py` — orchestration script to extend with Step 4

---

## Files to Create

### 1. `app/services/normalisation_service.py` ← core new service

**Responsibilities:**
- Read raw HTML from `data/raw/{category}/{slug}.html`
- Parse with BeautifulSoup (lxml, same as `analysis_service.py`)
- Extract all Phase 2 schema fields:
  - `slug`, `page_type`, `source_url`, `canonical_url`
  - `page_title` (stripped of site suffix " — Mansi"), `raw_page_title`
  - `meta_description`, `og_title`, `og_description`
  - `h1` (first h1 in main/body)
  - `headings` → `[{"level": int, "text": str}, ...]` (h1–h3, document order)
  - `body_paragraphs` → `[str, ...]` (p tags in main content, noise-filtered)
  - `lists` → `[{"list_type": "unordered"|"ordered", "items": [str]}, ...]`
  - `internal_links` → `[{"href": str, "anchor_text": str, "target_type": str}, ...]`
  - `extracted_at`, `extraction_version` (`"v1"`)
  - `fetch_http_status`, `content_length_bytes` (from html file stat)
  - `content_hash` (SHA-256 of canonical JSON of content fields, excluding timestamps)
  - `extraction_complete` (True only if h1, page_title, and body_paragraphs are non-empty)
- Write JSON to `data/normalized/{category}/{slug}.json` (overwrite)
- Append one record to `data/normalized/version_log.jsonl` per extraction

**Key dataclasses:**
```
NormalisedPage  — frozen dataclass, all schema fields
NormalisationRecord — result per file: slug, category, status, output_path, content_changed
```

**Error handling:** Per-file failures are captured in the record (`status="failed"`); never abort the run. Follows same resilience pattern as `AcquisitionService.acquire_one()`.

**Content hash:** SHA-256 of `json.dumps(content_fields, sort_keys=True)` where `content_fields` excludes `extracted_at`, `extraction_version`, `fetch_http_status`, `content_length_bytes`.

**Version log entry per extraction:**
```json
{"slug": "adhd", "page_type": "conditions", "run_id": "...", "content_hash": "...", "previous_hash": "...", "content_changed": true, "extracted_at": "...", "extraction_version": "v1"}
```
Previous hash is read from the last line in version_log.jsonl for this slug (or null on first run).

### 2. `data/normalized/conditions/.gitkeep`
### 3. `data/normalized/therapies/.gitkeep`

### 4. `tests/test_normalisation_service.py`

Tests following existing patterns in `tests/test_analysis_service.py`:
- `test_normalise_one_extracts_required_fields` — minimal valid HTML
- `test_normalise_one_handles_missing_optional_fields` — missing og tags, canonical, etc.
- `test_extraction_complete_false_when_h1_missing`
- `test_content_hash_stable_across_runs` — same input → same hash
- `test_content_hash_changes_when_content_changes`
- `test_version_log_appended` — first run: previous_hash=None; second run: previous_hash set
- `test_content_changed_false_when_unchanged`
- `test_run_skips_failed_file_and_continues` — one bad file doesn't abort
- `test_body_paragraph_noise_filtered` — whitespace-only p tags excluded
- `test_internal_links_classified_correctly` — condition vs therapy hrefs
- `test_lists_extracted_ul_and_ol`
- `test_sanitisation_strips_html_entities`

## Files to Modify

### 5. `scripts/collect_content.py`

Add Step 4 after the existing Step 3 (Analysis):

```python
# Step 4: Normalise content
logger.info("--- Step 4/4: Content Normalisation ---")
from app.services.normalisation_service import NormalisationError, NormalisationService
normalisation = NormalisationService()
norm_records = normalisation.run()
# log counts: normalised / unchanged / failed
```

Also update the step labels (Step 3/3 → Step 3/4) and final summary line.

### 6. `.claude/plan/phase-2-content-acquisition-plan.md`

Save a copy of this plan to the project's `.claude/plan/` directory.

---

## Implementation Order

1. Create `data/normalized/conditions/.gitkeep` and `data/normalized/therapies/.gitkeep`
2. Implement `app/services/normalisation_service.py`
3. Write `tests/test_normalisation_service.py`
4. Update `scripts/collect_content.py`
5. Save plan copy to `.claude/plan/phase-2-content-acquisition-plan.md`

---

## Patterns to Follow

| Pattern | Source |
|---|---|
| Frozen dataclass for result records | `AcquisitionService` → `AcquisitionRecord` |
| BeautifulSoup lxml parsing | `AnalysisService.extract_page_metadata()` |
| `_utcnow_iso()` helper | Both existing services |
| Per-item failure capture, never abort | `AcquisitionService.acquire_one()` |
| `_PROJECT_ROOT = Path(__file__).parent.parent.parent` | All services |
| Custom `XxxError(Exception)` | All services |
| `settings.website_base_url` for URL construction | `AnalysisService` |

---

## Verification

1. Run existing tests: `python -m pytest tests/ -v` — must all pass (no regressions)
2. Run new tests: `python -m pytest tests/test_normalisation_service.py -v`
3. Confirm `data/normalized/` directories exist
4. Run `python scripts/collect_content.py --help` (or dry check) to confirm import succeeds
5. If raw HTML files are present, run `python scripts/collect_content.py` and verify:
   - `data/normalized/conditions/*.json` and `data/normalized/therapies/*.json` are created
   - `data/normalized/version_log.jsonl` has one entry per page
   - Each JSON conforms to the schema (slug, page_type, content_hash, extraction_complete all present)
