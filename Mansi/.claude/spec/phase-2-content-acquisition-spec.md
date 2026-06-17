# Phase 2: Content Acquisition & Normalisation Specification

**Project:** Mansi AI
**Phase:** 2 — Content Acquisition, Extraction & Normalised Storage
**Status:** Draft
**Version:** 1.0
**Date:** 2026-06-17
**Author:** Solutions Architecture
**Depends On:** Phase 1 — Content Discovery & Raw Storage

---

## 1. Executive Summary

Phase 2 operationalises the content pipeline for Mansi AI. Where Phase 1 produced a raw local dataset and a validated URL inventory, Phase 2 transforms that raw material into a structured, versioned, and retrieval-ready content store.

The objective is to accept a list of website URLs — initially the condition and therapy pages identified in Phase 1 — fetch their content in a controlled manner, extract meaningful structured fields, and persist both the raw and normalised forms to disk. The resulting dataset becomes the single source of truth for all downstream phases: retrieval, RAG, knowledge base expansion, and eventually CMS synchronisation.

Phase 2 is deliberately pipeline-oriented. It does not involve AI inference, semantic search, or embeddings. It ends when every known page is represented as a clean, versioned, normalised JSON document, and when the system is structurally capable of re-acquiring and updating that content as it changes.

---

## 2. Scope

### 2.1 In Scope

| Area | Description |
|---|---|
| URL Ingestion | Accept condition and therapy URLs as structured inputs |
| Content Fetching | Retrieve full page content from public-facing URLs via HTTP |
| Content Extraction | Parse HTML and extract structured fields (title, headings, body, metadata, links) |
| Content Normalisation | Transform extracted fields into a consistent, typed JSON schema |
| Raw Content Storage | Persist fetched HTML with metadata to `data/raw/` |
| Normalised Content Storage | Persist extracted structured documents to `data/normalized/` |
| Content Versioning | Track content changes across re-fetch runs with version identifiers |
| Future Webflow API readiness | Storage schema must accommodate CMS-sourced fields without restructuring |
| Future retrieval readiness | Normalised documents must be directly consumable by Phase 3 without transformation |

### 2.2 Out of Scope

| Area | Reason |
|---|---|
| RAG (Retrieval-Augmented Generation) | Phase 4 |
| Embeddings | Phase 4 |
| ChromaDB or any vector database | Phase 4 |
| Semantic Search | Phase 4 |
| Retrieval Engine | Phase 3 |
| Screening Questionnaires | Phase 5+ |
| Recommendation Engine | Phase 5+ |
| Admin Dashboard | Phase 6+ |
| LLM inference | Not required in this phase |
| Webflow CMS API live integration | Blocked — no credentials or collection IDs confirmed |
| Frontend or UI changes | Not applicable |
| Automatic crawling or sitemap traversal | Phase 1 responsibility — inputs arrive pre-validated |

---

## 3. Input Sources

### 3.1 Inputs to Phase 2

Phase 2 does not perform discovery. It consumes the outputs of Phase 1 as authoritative inputs.

| Input | Source | Location |
|---|---|---|
| Condition URL list | Phase 1 Discovery Output | `data/discovery/conditions_urls.txt` |
| Therapy URL list | Phase 1 Discovery Output | `data/discovery/therapies_urls.txt` |
| Full URL inventory (with status) | Phase 1 Discovery Output | `data/discovery/url_inventory.csv` |
| Content model reference | Phase 1 Analysis Output | `docs/specs/phase-1-content-model.md` |
| Condition-therapy relationship map | Phase 1 Analysis Output | Included in content model document |

### 3.2 URL Supply Mechanism

At Phase 2 launch, URLs are supplied as plain text files produced by Phase 1. Each file contains one absolute URL per line.

In future phases, the URL supply mechanism may evolve:

| Future Source | Phase | Notes |
|---|---|---|
| Webflow CMS API | TBD | Will provide collection item IDs and CMS-canonical URLs alongside HTML |
| Admin-supplied URL list | TBD | Manual additions for new pages not yet in the crawl inventory |
| Webhook-triggered updates | TBD | CMS publish events triggering targeted re-fetch of individual pages |

Phase 2 storage and versioning design must not assume the current file-based input method is permanent.

### 3.3 URL Classification

All input URLs are pre-classified by Phase 1. Phase 2 uses this classification to route pages into the correct storage path.

| Classification | Expected Path Pattern | Storage Subdirectory |
|---|---|---|
| `condition` | `/conditions/{slug}` | `data/raw/conditions/`, `data/normalized/conditions/` |
| `therapy` | `/therapies/{slug}` | `data/raw/therapies/`, `data/normalized/therapies/` |

URLs with unknown classification must be logged and excluded from processing until reclassified.

---

## 4. Content Acquisition Architecture

### 4.1 System Overview

The Phase 2 pipeline consists of five sequential components. Each component has a single, well-defined responsibility. Components are decoupled — the output of each is a durable artifact on disk, not an in-memory handoff.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 2 PIPELINE                             │
│                                                                 │
│  ┌─────────────┐                                                │
│  │  URL Input  │  ← conditions_urls.txt, therapies_urls.txt    │
│  └──────┬──────┘                                                │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────┐                                                │
│  │   Fetcher   │  HTTP GET → raw HTML + response metadata       │
│  └──────┬──────┘                                                │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────┐                                                │
│  │   Parser    │  Parse HTML DOM → structured element tree      │
│  └──────┬──────┘                                                │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────┐                                           │
│  │ Content Extractor│  Map DOM → typed content fields           │
│  └──────┬───────────┘                                           │
│         │                                                       │
│         ├──────────────────────────────────────────────┐        │
│         ▼                                              ▼        │
│  ┌─────────────────┐                     ┌────────────────────┐ │
│  │  Raw Storage    │                     │ Normalised Storage │ │
│  │  data/raw/      │                     │ data/normalized/   │ │
│  └─────────────────┘                     └────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Component Responsibilities

#### 4.2.1 URL Input

| Responsibility | Detail |
|---|---|
| Load URL lists | Read from `conditions_urls.txt` and `therapies_urls.txt` |
| Validate format | Each line must be a valid absolute HTTPS URL |
| Deduplicate | Remove duplicate entries before passing to Fetcher |
| Log invalid entries | Record malformed URLs to the acquisition log without processing them |
| Classify each URL | Derive `page_type` (`condition` / `therapy`) and `slug` from URL path |

#### 4.2.2 Fetcher

| Responsibility | Detail |
|---|---|
| Issue HTTP GET requests | Fetch the full HTML body for each URL |
| Set identifying headers | Include a descriptive `User-Agent` string |
| Enforce timeouts | Abort requests that exceed a defined timeout threshold |
| Handle redirects | Follow HTTP 301/302 redirects; record both the original and final URL |
| Handle errors | Log HTTP 4xx and 5xx responses; do not proceed to Parser for failed fetches |
| Rate limiting | Enforce a configurable delay between consecutive requests |
| Retry logic | Retry on transient network errors (e.g. connection reset); do not retry on 404 |
| Capture metadata | Record HTTP status code, response size, final URL, and fetch timestamp |

#### 4.2.3 Parser

| Responsibility | Detail |
|---|---|
| Parse raw HTML | Construct a navigable DOM from the raw HTML string |
| Handle encoding | Normalise character encoding to UTF-8 |
| Isolate main content | Identify the primary content region of the page (e.g. `<main>`, `<article>`, or known CSS class) |
| Separate structural elements | Split the DOM into `<head>` (metadata) and `<body>` (content) regions |
| Flag parse errors | Record parsing failures (e.g. malformed HTML) without crashing the pipeline |

#### 4.2.4 Content Extractor

| Responsibility | Detail |
|---|---|
| Extract page metadata | Title, meta description, canonical URL, Open Graph tags |
| Extract heading structure | All `<h1>` through `<h3>` elements, in document order with nesting depth |
| Extract body content | All paragraph text from the main content region |
| Extract lists | Bulleted and numbered list items, preserving list type |
| Extract internal links | All `<a href>` elements pointing to other Mansi pages |
| Map to schema | Produce a typed, keyed document matching the Normalised Content Schema (Section 5) |
| Flag missing fields | Record which expected fields were absent on a given page |
| Sanitise content | Strip inline scripts, style attributes, and tracking pixels from extracted text |

#### 4.2.5 Raw Storage

| Responsibility | Detail |
|---|---|
| Persist raw HTML | Write the unmodified HTTP response body to `data/raw/{type}/{slug}.html` |
| Write fetch metadata | Append one row per fetch to `data/raw/acquisition_log.csv` |
| Overwrite on re-run | Re-fetching the same URL replaces the existing file (idempotent) |
| Preserve fetch timestamp | The acquisition log records when each file was last written |

#### 4.2.6 Normalised Storage

| Responsibility | Detail |
|---|---|
| Persist normalised document | Write the extracted structured JSON to `data/normalized/{type}/{slug}.json` |
| Write version record | Append a versioning entry to `data/normalized/version_log.jsonl` |
| Overwrite current document | The `.json` file always reflects the most recent successful extraction |
| Preserve version history | The version log retains all previous versions with content hashes |

---

## 5. Content Extraction Strategy

### 5.1 Extraction Philosophy

Extraction does not interpret content. It maps HTML elements to schema fields. The decision of what a piece of content *means* is deferred to Phase 3 (Retrieval) and Phase 4 (RAG).

All extracted values are plain text unless the field is explicitly typed (e.g. arrays for headings and list items). No Markdown, no HTML entities, no tags in extracted text fields.

### 5.2 Normalised Content Schema

The following fields define the target schema for every extracted document. Fields marked `required` must be present for a document to be considered successfully extracted. Fields marked `optional` are recorded as `null` when absent.

| Field | Type | Required | Source in HTML |
|---|---|---|---|
| `slug` | string | required | Derived from URL path |
| `page_type` | string | required | Derived from URL classification |
| `source_url` | string | required | The original requested URL |
| `canonical_url` | string | optional | `<link rel="canonical">` |
| `page_title` | string | required | `<title>` tag |
| `meta_description` | string | optional | `<meta name="description">` |
| `og_title` | string | optional | `<meta property="og:title">` |
| `og_description` | string | optional | `<meta property="og:description">` |
| `h1` | string | required | First `<h1>` in `<main>` or `<body>` |
| `headings` | array of objects | required | All `<h1>`–`<h3>` with `level` and `text` |
| `body_paragraphs` | array of strings | required | All `<p>` text in main content area |
| `lists` | array of objects | optional | All `<ul>` / `<ol>` with `list_type` and `items` array |
| `internal_links` | array of objects | optional | All `<a href>` targeting `/conditions/*` or `/therapies/*` |
| `extracted_at` | ISO 8601 datetime | required | Timestamp of extraction run |
| `extraction_version` | string | required | Version identifier of the extractor (e.g. `v1`) |
| `fetch_http_status` | integer | required | HTTP status code from Fetcher |
| `content_length_bytes` | integer | required | Raw HTML byte count |

### 5.3 Field Extraction Details

#### Page Title

- Source: `<title>` tag content.
- Strip the site name suffix if present (e.g. `"ADHD — Mansi"` → `"ADHD"`).
- If no `<title>` is present, fall back to the `<h1>` value.
- Record the raw `<title>` value separately as `raw_page_title` for auditing.

#### Headings

- Extract all `<h1>`, `<h2>`, and `<h3>` elements within the main content region.
- Preserve document order.
- Store each heading as an object with `level` (integer 1–3) and `text` (string).
- Strip any inline HTML from heading text (e.g. `<span>`, `<strong>`).

#### Body Paragraphs

- Extract all `<p>` elements within the main content region.
- Each paragraph is a plain text string.
- Ignore `<p>` elements that contain only whitespace or a single link (navigation noise).
- Preserve paragraph order.

#### Lists

- Extract all `<ul>` and `<ol>` elements within the main content region.
- For each list, record `list_type` (`unordered` or `ordered`) and an array of `items` (plain text strings).
- Nested lists are flattened to a single depth for Phase 2. Nested structure may be preserved in Phase 3 if required.

#### Internal Links

- Collect all `<a href>` elements where the `href` targets the same domain and matches `/conditions/*` or `/therapies/*`.
- For each, record `href` (relative path), `anchor_text` (link display text), and `target_type` (`condition` or `therapy`).
- This is the mechanism by which condition-to-therapy relationships are preserved in the normalised store.

#### Metadata

- Extract `<meta name="description">` content.
- Extract Open Graph tags: `og:title`, `og:description`.
- Extract `<link rel="canonical">` href.
- All metadata fields are treated as optional; their absence is logged but does not block extraction.

### 5.4 Content Sanitisation Rules

Before any field value is stored, apply the following sanitisation:

| Rule | Detail |
|---|---|
| Strip HTML tags | No tags in extracted text fields |
| Decode HTML entities | Convert `&amp;`, `&nbsp;`, `&#x27;` etc. to plain characters |
| Collapse whitespace | Replace multiple spaces and newlines with a single space |
| Trim leading/trailing whitespace | All field values are trimmed |
| Remove zero-width characters | Strip `​`, ` `, and similar invisible characters |
| No script or style content | Extractor must never include `<script>` or `<style>` content in text fields |

---

## 6. Storage Architecture

### 6.1 Overview

Phase 2 maintains two parallel storage layers for every acquired page. This dual-layer approach is intentional and serves distinct purposes.

```
data/
├── discovery/                         ← Phase 1 outputs (read-only in Phase 2)
│   ├── url_inventory.csv
│   ├── conditions_urls.txt
│   ├── therapies_urls.txt
│   ├── acquisition_log.csv
│   └── discovery_log.md
│
├── raw/                               ← Phase 2: Raw HTML storage
│   ├── acquisition_log.csv            ← Phase 2 fetch log (appended per run)
│   ├── conditions/
│   │   ├── adhd.html
│   │   ├── autism.html
│   │   └── {slug}.html
│   └── therapies/
│       ├── cbt.html
│       ├── occupational-therapy.html
│       └── {slug}.html
│
└── normalized/                        ← Phase 2: Extracted structured content
    ├── version_log.jsonl              ← Append-only version history
    ├── conditions/
    │   ├── adhd.json
    │   ├── autism.json
    │   └── {slug}.json
    └── therapies/
        ├── cbt.json
        ├── occupational-therapy.json
        └── {slug}.json
```

### 6.2 Raw Content Storage (`data/raw/`)

#### Purpose

The raw layer is the archive. It contains the unmodified HTTP response body exactly as received from the server. Its purpose is to:

1. Provide a ground-truth record that cannot be affected by changes to the extraction logic.
2. Allow re-extraction from previously fetched content without making new HTTP requests.
3. Support auditing and debugging — if a normalised document looks wrong, the raw HTML is the authoritative reference.

#### File Naming

| Rule | Detail |
|---|---|
| Format | `{slug}.html` |
| Case | Always lowercase |
| Slug source | Extracted from URL path segment |
| Separator | Hyphens (matching URL slug convention) |
| Encoding | UTF-8 |
| On re-fetch | Overwrite existing file |

#### Raw Acquisition Log (`data/raw/acquisition_log.csv`)

One row per fetch attempt. Appended, never overwritten. All runs are preserved.

| Column | Type | Description |
|---|---|---|
| `run_id` | string | Unique identifier for the acquisition run (e.g. `run-20260617-001`) |
| `slug` | string | URL slug |
| `page_type` | string | `condition` or `therapy` |
| `source_url` | string | Requested URL |
| `final_url` | string | URL after redirect resolution |
| `http_status` | integer | HTTP response code |
| `content_length_bytes` | integer | Raw HTML byte count |
| `page_title` | string | `<title>` tag content (before normalisation) |
| `fetched_at` | datetime | ISO 8601 UTC timestamp |
| `fetch_success` | boolean | `true` if HTTP 200 was received |
| `error_message` | string | Error description if fetch failed; null otherwise |

### 6.3 Normalised Content Storage (`data/normalized/`)

#### Purpose

The normalised layer is the operational dataset. It contains structured, typed, sanitised JSON documents ready for consumption by downstream phases. Its purpose is to:

1. Provide a stable, schema-consistent interface to Phase 3 (Retrieval) and Phase 4 (RAG).
2. Decouple downstream phases from HTML structure — they never need to parse HTML.
3. Enable efficient content comparison for versioning — JSON diffs are meaningful; HTML diffs are noisy.

#### File Naming

| Rule | Detail |
|---|---|
| Format | `{slug}.json` |
| Case | Always lowercase |
| On re-extraction | Overwrite current document; version record written to `version_log.jsonl` |

#### Why Both Layers Are Required

| Concern | Raw Layer | Normalised Layer |
|---|---|---|
| Audit trail | Full original HTML preserved | N/A |
| Re-extraction without re-fetch | Possible — re-parse raw HTML | N/A |
| CMS field reconciliation | Raw HTML shows what was served | N/A |
| Downstream consumption | Cannot be consumed directly | Structured JSON; directly consumable |
| Schema evolution | No schema — adapts automatically | Schema is explicit and versioned |
| Content diffing | HTML diffs are impractical | JSON diffs are meaningful |
| Storage efficiency | Larger (full HTML) | Smaller (extracted fields only) |

Removing either layer would create an unrecoverable gap. The raw layer ensures extraction can be repeated with improved logic. The normalised layer ensures downstream phases are not blocked on HTML parsing.

---

## 7. Content Versioning Strategy

### 7.1 Why Versioning Is Required

Website content changes. Conditions pages may be updated with new clinical information. Therapy pages may gain or lose sections. Slug-for-slug comparison between re-fetch runs must be possible to:

- Detect content drift.
- Trigger selective re-extraction without re-fetching unchanged pages.
- Support rollback to a prior version if an extraction error is discovered.
- Provide an audit trail for content governance.

### 7.2 Version Identifier Design

Each normalised document carries an `extraction_version` field (the extractor version, e.g. `v1`) and a `content_hash` field (a deterministic hash of the extracted content fields).

The `content_hash` is computed from the normalised content fields only — it excludes timestamps and technical metadata so that a re-fetch of unchanged content produces an identical hash.

| Field | Type | Description |
|---|---|---|
| `content_hash` | string | SHA-256 hash of the content fields (excludes `extracted_at`, `run_id`) |
| `extraction_version` | string | Version tag of the extractor used (e.g. `v1`) |

### 7.3 Version Log (`data/normalized/version_log.jsonl`)

The version log is an append-only JSONL file (one JSON object per line). Every successful extraction appends one record, regardless of whether the content changed.

| Field | Type | Description |
|---|---|---|
| `slug` | string | Page slug |
| `page_type` | string | `condition` or `therapy` |
| `run_id` | string | Acquisition run identifier |
| `content_hash` | string | Hash of the normalised content at this extraction |
| `previous_hash` | string | Hash of the prior version; null on first extraction |
| `content_changed` | boolean | `true` if `content_hash` differs from `previous_hash` |
| `extracted_at` | datetime | ISO 8601 UTC timestamp |
| `extraction_version` | string | Extractor version used |

### 7.4 Re-fetch Process

When content is re-acquired (e.g. periodic refresh or triggered by a detected change):

```
Re-Fetch Trigger
  │
  ▼
Fetch URL → store raw HTML (overwrite)
  │
  ▼
Re-extract → produce new normalised document
  │
  ▼
Compute content_hash of new document
  │
  ▼
Compare with previous_hash from version_log
  │
  ├── UNCHANGED → skip overwrite of .json; append version_log with content_changed = false
  │
  └── CHANGED → overwrite .json; append version_log with content_changed = true
```

### 7.5 Rollback Considerations

The current phase stores only the latest version of each normalised document. Rollback to a prior version requires:

1. Re-running the extractor against the raw HTML from the prior fetch run.
2. Raw HTML files are overwritten on re-fetch — only the most recent raw HTML is available.

**Implication:** If rollback to an older content state is a firm requirement, the raw storage strategy must be extended to retain prior raw HTML files by run ID (e.g. `data/raw/conditions/adhd_run-20260617-001.html`). This decision is deferred to implementation; both options are architecturally compatible with this specification.

---

## 8. Error Handling Strategy

### 8.1 Error Categories

| Category | Example | Handling |
|---|---|---|
| Missing page | HTTP 404 | Log to acquisition log with `fetch_success = false`; skip extraction; flag for review |
| Broken URL | DNS resolution failure, connection refused | Log error; retry once with backoff; mark as `fetch_success = false` on second failure |
| Empty page | HTTP 200 but empty or whitespace-only body | Log with `content_length_bytes = 0`; do not extract; flag for review |
| Partial content | Page loads but main content region is absent | Proceed with extraction; populate available fields; mark `extraction_complete = false` |
| JS-rendered content | HTTP 200 but meaningful content absent from HTML body | Detected by low word count or absent `<h1>`; log warning; flag for headless browser escalation |
| Future CMS schema changes | Extraction selectors no longer match page structure | Field-level flagging — record missing fields without crashing; trigger extractor review alert |
| Rate limiting | HTTP 429 Too Many Requests | Back off for a configurable duration; retry; log the event |
| SSL / TLS errors | Certificate validation failure | Log and skip; do not disable certificate validation |
| Encoding errors | Non-UTF-8 content | Attempt encoding detection; fall back to UTF-8 with replacement characters; log |

### 8.2 Error Disposition

| Outcome | Next Action |
|---|---|
| Fetch failure | Logged; page skipped; human review required before re-run |
| Partial extraction | Document saved with available fields; `extraction_complete = false` flag set |
| Total extraction failure | Document not written; error appended to `version_log.jsonl`; human review required |
| Repeated failures (same URL, 3+ runs) | Escalated in acquisition log; excluded from subsequent automated runs until resolved |

### 8.3 Resilience Principles

- The pipeline must be fully resumable. A run interrupted at any point can be restarted without re-processing already-completed pages.
- No error in a single page must abort the pipeline. Pages are processed independently.
- All errors are logged with enough context to diagnose the failure without re-running the pipeline.

---

## 9. Security Considerations

### 9.1 Rate Limiting

| Concern | Design Decision |
|---|---|
| Server overload | Enforce a minimum delay between requests (configurable; default: 1–2 seconds) |
| Burst prevention | No parallel fetches; requests are issued sequentially |
| Respect `robots.txt` | Check `robots.txt` before any acquisition run begins; do not fetch disallowed paths |
| Retry storms | Exponential backoff on transient failures; maximum retry count enforced |

### 9.2 Data Validation

| Concern | Design Decision |
|---|---|
| Malformed HTML | Parser must handle broken HTML without crashing; log parse warnings |
| Unexpected schema | Extractor must not assume fields are present; missing fields are null, not errors |
| Oversized responses | Responses exceeding a configurable size threshold (e.g. 5 MB) are logged and skipped |
| Non-HTML responses | If `Content-Type` is not `text/html`, log and skip |

### 9.3 Content Sanitisation

| Concern | Design Decision |
|---|---|
| Script injection | Strip all `<script>` elements before extraction; never store script content |
| Style noise | Strip all `<style>` elements; inline `style=""` attributes removed from extracted text |
| Tracking pixels | Exclude `<img>` elements from text extraction |
| PII in content | Phase 2 does not handle user-submitted content; public page content only; no PII expected |

### 9.4 Future API Token Management

When Webflow CMS API access is established, the following security requirements apply:

| Requirement | Detail |
|---|---|
| API token storage | Stored in environment variables only; never in source code or committed files |
| Token scope | Request minimum-privilege API token (read-only, content collection access only) |
| Token rotation | Design must support token rotation without pipeline downtime |
| Audit logging | All API calls must be logged with timestamp, endpoint, and response status |
| Secret management | In production, tokens must be stored in a secrets manager, not `.env` files |

---

## 10. Future Integration Readiness

### 10.1 Phase 3 — Retrieval Layer

Phase 3 will build a retrieval mechanism over the normalised content store produced in Phase 2. For Phase 3 to function without requiring changes to the Phase 2 outputs:

| Requirement | How Phase 2 Satisfies It |
|---|---|
| Stable schema | Normalised JSON schema is versioned and documented; Phase 3 can rely on field presence |
| Content type classification | Every document carries `page_type` (`condition` / `therapy`) for filtered retrieval |
| Internal link relationships | `internal_links` field maps conditions to therapies, enabling graph-style queries |
| Slug-based addressing | Every document is addressable by `{page_type}/{slug}`; Phase 3 can build indexes on this |
| Content completeness flag | `extraction_complete` field allows Phase 3 to filter out incomplete documents |

### 10.2 Phase 4 — RAG Layer

Phase 4 will chunk normalised documents, generate embeddings, and store them in a vector database. For Phase 4 to function without requiring changes to Phase 2 outputs:

| Requirement | How Phase 2 Satisfies It |
|---|---|
| Clean plain text | All body content is sanitised plain text; no HTML tags or entities |
| Structured sections | Heading hierarchy and paragraph arrays make section-based chunking straightforward |
| Metadata for filtering | `page_type`, `slug`, `page_title`, and `source_url` are first-class fields available as vector store metadata |
| Relationship awareness | `internal_links` enables cross-document context in RAG prompts |
| Versioned documents | `content_hash` allows Phase 4 to detect which embeddings need to be regenerated on content change |

### 10.3 Phase 5 — Knowledge Base Expansion

Phase 5 is expected to add new content types beyond conditions and therapies (e.g. practitioner profiles, blog articles, FAQs). The Phase 2 design accommodates this through:

| Design Choice | Future Benefit |
|---|---|
| `page_type` is a string, not an enum | New content types can be added without schema changes |
| Storage paths are `{type}/{slug}` | New directories (`data/normalized/practitioners/`) integrate without restructuring |
| Extractor is field-mapping logic, not page-specific | Extractor can be extended with new field mappings for new content types |
| Version log is type-agnostic | Version tracking works for any `page_type` value |

### 10.4 Webflow CMS API Integration

When CMS API access is established, Phase 2 is designed to accommodate it as a parallel input channel:

| CMS API Field | Mapping to Phase 2 Schema |
|---|---|
| CMS Item ID | Added as `cms_item_id` field (optional; null for HTML-sourced documents) |
| Collection ID | Added as `cms_collection_id` field |
| Published status | Added as `cms_published` boolean |
| Last Updated (CMS) | Added as `cms_last_updated` datetime |
| Draft content | Excluded from the normalised store unless explicitly opted in |

The storage schema is designed to be additive. CMS fields are optional extensions — their presence or absence does not break existing downstream consumers.

---

## 11. Success Criteria

Phase 2 is considered complete when all of the following criteria are met:

| # | Criterion | Verification Method |
|---|---|---|
| SC-01 | All condition URLs from Phase 1 inventory are processed | `acquisition_log.csv` contains one row per condition URL with `fetch_success = true` or documented failure |
| SC-02 | All therapy URLs from Phase 1 inventory are processed | `acquisition_log.csv` contains one row per therapy URL with `fetch_success = true` or documented failure |
| SC-03 | Raw HTML is stored for every successfully fetched page | `data/raw/conditions/` and `data/raw/therapies/` contain one `.html` file per successful fetch |
| SC-04 | Normalised JSON is produced for every successfully extracted page | `data/normalized/conditions/` and `data/normalized/therapies/` contain one `.json` file per page |
| SC-05 | All normalised documents conform to the schema defined in Section 5.2 | Schema validation passes for all `.json` files in `data/normalized/` |
| SC-06 | Version log is populated for all extracted documents | `data/normalized/version_log.jsonl` contains one entry per extraction with correct hash values |
| SC-07 | All fetch and extraction errors are logged with sufficient detail | No unlogged failures; `acquisition_log.csv` covers all attempted URLs |
| SC-08 | Pipeline can be re-run idempotently | Second run on the same URL set produces identical outputs (same hashes) for unchanged content |
| SC-09 | Future integration fields are present in schema | All schema fields defined in Sections 10.1–10.4 are documented and represented in at least one example document |
| SC-10 | Phase 3 readiness confirmed | Phase 3 lead has reviewed `data/normalized/` and confirmed the schema meets retrieval requirements |

---

## 12. Deliverables

The following artifacts are produced by Phase 2 upon completion:

### 12.1 Data Deliverables

| Deliverable | Location | Description |
|---|---|---|
| Raw HTML files (all conditions) | `data/raw/conditions/{slug}.html` | Unmodified HTTP response bodies |
| Raw HTML files (all therapies) | `data/raw/therapies/{slug}.html` | Unmodified HTTP response bodies |
| Phase 2 acquisition log | `data/raw/acquisition_log.csv` | Per-fetch results for all Phase 2 runs |
| Normalised JSON (all conditions) | `data/normalized/conditions/{slug}.json` | Structured extracted content per condition |
| Normalised JSON (all therapies) | `data/normalized/therapies/{slug}.json` | Structured extracted content per therapy |
| Version log | `data/normalized/version_log.jsonl` | Append-only history of all extraction runs |

### 12.2 Documentation Deliverables

| Deliverable | Location | Description |
|---|---|---|
| This specification document | `.claude/spec/phase-2-content-acquisition-spec.md` | Architecture and design record for Phase 2 |
| Phase 3 handoff notes | To be created at Phase 2 close | Confirmed schema, known gaps, open questions for Phase 3 |

### 12.3 Design Decisions Record

| Decision | Rationale | Alternative Considered |
|---|---|---|
| Dual storage layers (raw + normalised) | Decouples archival from operational use; enables re-extraction | Single normalised store — rejected because raw source is lost |
| Append-only version log (JSONL) | Simple, auditable, human-readable, no database required | SQLite version table — deferred to Phase 3+ |
| JSON as normalised format | Directly consumable by Python, directly loadable into vector stores | Parquet / CSV — rejected as less readable and less flexible for nested fields |
| Sequential fetch (no parallelism) | Avoids rate limiting and simplifies error handling | Parallel fetching — deferred; can be added without schema changes |
| Content hash on normalised fields only | Ensures hash is content-sensitive, not time-sensitive | Hash on raw HTML — rejected as unstable (ads, timestamps in HTML inflate false change detection) |
| `extraction_complete` flag | Allows downstream phases to filter without re-running validation | Separate "incomplete" directory — rejected as more complex to manage |

---

## 13. Risks and Assumptions

### 13.1 Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Phase 1 URL inventory is incomplete | Low | High | Phase 2 processes exactly what Phase 1 produced; any gaps are Phase 1 failures, not Phase 2 |
| Page structure has changed since Phase 1 discovery | Medium | Medium | Re-extraction from fresh raw HTML detects structural changes; flag for extractor update |
| JS-rendered pages produce empty extraction | Medium | High | Detect by low word count; escalate to headless browser approach; document as known gap |
| Content model from Phase 1 does not match actual HTML structure | Medium | Medium | Extraction is field-by-field; individual field failures do not block the full extraction |
| Webflow CMS API never becomes available | Low | Low | Phase 2 does not depend on CMS API; HTML-sourced content is self-sufficient |
| Volume of pages grows significantly beyond Phase 1 estimate | Low | Low | Pipeline is file-based and scales linearly; no infrastructure changes required |
| Extractor logic requires changes after content model review | Medium | Medium | Extractor version field allows re-extraction of all pages with updated logic against existing raw HTML |

### 13.2 Assumptions

| # | Assumption |
|---|---|
| A1 | Phase 1 success criteria SC-01 through SC-09 are all met before Phase 2 begins |
| A2 | All URLs in the Phase 1 inventory are still live and accessible at Phase 2 start |
| A3 | The content model produced in Phase 1 (`docs/specs/phase-1-content-model.md`) is accurate and reviewed |
| A4 | Pages are server-rendered HTML — no headless browser required |
| A5 | No authentication is required to access any page in the URL inventory |
| A6 | The `data/` directory is writable and has sufficient disk space (< 100 MB required) |
| A7 | The extraction schema defined in Section 5.2 will be stable for the duration of Phase 2 |
| A8 | CMS API credentials and collection IDs will not be available during Phase 2 |

---

*End of Specification — Phase 2: Content Acquisition & Normalisation*

*Document Version: 1.0 | Last Updated: 2026-06-17*
