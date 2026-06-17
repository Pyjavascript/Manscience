# Phase 1: Content Discovery & Acquisition Specification

**Project:** Mansi AI
**Phase:** 1 — Content Discovery & Raw Storage
**Status:** Draft
**Version:** 1.0
**Date:** 2026-06-17
**Author:** Solutions Architecture

---

## 1. Executive Summary

Phase 1 establishes the foundational content layer for Mansi AI. Before Mansi can answer questions about conditions or therapies, the team must first understand what content exists, where it lives, what structure it follows, and how to safely collect and store it.

This phase is deliberately narrow: it ends at raw content on disk. No retrieval, no embeddings, no AI involvement. The output of Phase 1 is a curated local dataset of raw page content and a validated content map — the minimum viable foundation for every subsequent phase.

The Mansi website currently contains two primary content domains:

- **Conditions** (e.g., ADHD, Autism, Anxiety)
- **Therapies** (e.g., CBT, Occupational Therapy, Speech Therapy)

Because no CMS schema is confirmed, no Webflow API credentials are available, and no collection IDs are known at this time, Phase 1 operates exclusively against public-facing URLs. This is the safest, most dependency-free path forward.

Phase 1 is complete when all pages are identified, all content is collected and stored locally, and the team has analysed the raw content well enough to define schemas for Phase 2.

---

## 2. Scope

### 2.1 In Scope

| Area | Description |
|---|---|
| URL Discovery | Identify all live condition and therapy page URLs |
| Content Acquisition | Collect page content from public URLs in a structured way |
| Raw Storage Design | Define folder structure and file naming for local storage |
| Content Analysis | Inspect and document content structure, fields, and relationships |
| Risk Documentation | Record unknowns, assumptions, and mitigation strategies |
| Success Criteria | Define measurable exit criteria for Phase 1 |

### 2.2 Out of Scope

| Area | Reason |
|---|---|
| RAG (Retrieval-Augmented Generation) | Phase 2+ |
| Embeddings | Phase 2+ |
| ChromaDB or any vector database | Phase 2+ |
| Screening questionnaires | Phase 3+ |
| Recommendation engine | Phase 3+ |
| User profiles or session personalisation | Phase 3+ |
| Webflow CMS API integration | Blocked — no credentials or collection IDs |
| Any LLM inference or chat functionality | Not required for content discovery |
| Frontend or UI changes | Not applicable to this phase |

---

## 3. Current Known Inputs

### 3.1 Known URL Patterns

The website follows predictable URL conventions:

| Content Type | URL Pattern | Example |
|---|---|---|
| Condition | `/conditions/{slug}` | `/conditions/adhd` |
| Condition | `/conditions/{slug}` | `/conditions/autism` |
| Therapy | `/therapies/{slug}` | `/therapies/cbt` |
| Therapy | `/therapies/{slug}` | `/therapies/occupational-therapy` |

> **Note:** The slug format (hyphenated lowercase) appears consistent but must be validated against the live site during discovery.

### 3.2 Known Starting Points

| Resource | Value |
|---|---|
| Base URL | To be confirmed from live site |
| Conditions Index | Assumed: `/conditions` or `/conditions/` |
| Therapies Index | Assumed: `/therapies` or `/therapies/` |
| Sitemap | To be checked: `/sitemap.xml` |
| Robots.txt | To be checked: `/robots.txt` |

### 3.3 Content Assumptions

- Pages are publicly accessible without authentication.
- Content is server-rendered HTML (not fully client-side rendered via JS).
- Index pages (listing all conditions / therapies) exist and link to individual pages.
- Each page has a consistent structure across all entries of the same type (all condition pages share a layout; all therapy pages share a layout).
- Internal links between conditions and therapies may exist (e.g., "CBT is recommended for Anxiety").

### 3.4 Known Unknowns and Risks

| Unknown | Risk Level | Notes |
|---|---|---|
| Total number of condition pages | Medium | Cannot be counted without discovery |
| Total number of therapy pages | Medium | Cannot be counted without discovery |
| Whether a sitemap exists | Low | Check `/sitemap.xml` first |
| Whether index pages list all entries | Medium | Index may paginate or lazy-load |
| Whether pages are JS-rendered | High | If rendered client-side, plain HTTP fetch will fail |
| Metadata availability (title, description) | Low | Likely present in `<head>` tags |
| Internal link structure | Medium | May reveal relationships between content types |
| Rate limiting or bot protection | Medium | Respectful crawling strategy required |

---

## 4. Content Discovery Strategy

### 4.1 Overview

Discovery is the process of building a complete URL inventory before any content is collected. The goal is to produce a verified, deduplicated list of all condition and therapy page URLs.

Discovery must be completed before acquisition begins.

### 4.2 Discovery Workflow

```
START
  │
  ▼
Step 1: Check /robots.txt
  │  → Identify any disallowed paths
  │  → Confirm crawling is permitted
  │
  ▼
Step 2: Check /sitemap.xml
  │  → Extract all URLs matching /conditions/* and /therapies/*
  │  → If sitemap exists → go to Step 5
  │  → If sitemap does not exist → go to Step 3
  │
  ▼
Step 3: Fetch index pages
  │  → GET /conditions
  │  → GET /therapies
  │  → Extract all <a href> links matching known patterns
  │
  ▼
Step 4: Validate discovered URLs
  │  → Send HEAD request to each URL
  │  → Confirm HTTP 200 response
  │  → Remove 404 / redirects from list
  │
  ▼
Step 5: Compile URL inventory
  │  → conditions_urls.txt (one URL per line)
  │  → therapies_urls.txt (one URL per line)
  │  → url_inventory.csv (URL, type, status, discovered_at)
  │
  ▼
Step 6: Review and approve inventory
  │  → Human review before acquisition begins
  │  → Confirm no missing pages
  │
  ▼
END → Hand off to Content Acquisition
```

### 4.3 URL Classification Rules

During discovery, each URL is classified by the following rules:

| Pattern Match | Assigned Type | Example |
|---|---|---|
| `/conditions/{slug}` | `condition` | `/conditions/adhd` |
| `/therapies/{slug}` | `therapy` | `/therapies/cbt` |
| `/conditions/` (index) | `condition_index` | `/conditions/` |
| `/therapies/` (index) | `therapy_index` | `/therapies/` |
| Anything else | `unknown` | `/about`, `/blog` |

Only `condition` and `therapy` types proceed to acquisition.

### 4.4 Deduplication Rules

- Normalise all URLs to lowercase.
- Strip trailing slashes.
- Treat `http://` and `https://` as the same; always prefer `https://`.
- If the same slug appears via sitemap and index page, count it once.

### 4.5 Discovery Outputs

| Output File | Location | Description |
|---|---|---|
| URL Inventory CSV | `data/discovery/url_inventory.csv` | Full list with type, status, timestamp |
| Conditions URL list | `data/discovery/conditions_urls.txt` | One URL per line |
| Therapies URL list | `data/discovery/therapies_urls.txt` | One URL per line |
| Discovery Log | `data/discovery/discovery_log.md` | Notes, anomalies, decisions made |

---

## 5. Content Acquisition Strategy

### 5.1 Overview

Acquisition is the process of fetching the full HTML content of each discovered URL and saving it locally for analysis. No parsing or transformation occurs at this stage — raw HTML is stored exactly as received.

### 5.2 Acquisition Principles

| Principle | Rationale |
|---|---|
| Respectful rate limiting | Avoid overloading the server; add a delay between requests |
| No transformation at fetch time | Store raw HTML; parsing happens in analysis phase |
| Idempotent runs | Re-running acquisition should overwrite, not duplicate |
| Logging all requests | Record status code, timestamp, and response size per URL |
| Resumable | If acquisition is interrupted, re-run should skip already-fetched pages |

### 5.3 Per-Page Data to Capture

For each URL, the following must be captured and stored:

| Field | Source | Example |
|---|---|---|
| `source_url` | The requested URL | `https://mansi.co.uk/conditions/adhd` |
| `page_type` | Derived from URL pattern | `condition` |
| `slug` | Extracted from URL path | `adhd` |
| `raw_html` | Full HTTP response body | `<!DOCTYPE html>...` |
| `http_status` | HTTP response code | `200` |
| `fetched_at` | ISO 8601 timestamp | `2026-06-17T10:30:00Z` |
| `content_length` | Response size in bytes | `48291` |
| `page_title` | Extracted from `<title>` tag | `ADHD — Mansi` |

### 5.4 Extraction Flow

```
FOR EACH URL in url_inventory.csv WHERE status = "confirmed"
  │
  ▼
Send HTTP GET request
  │  → Set User-Agent header to identify the crawler
  │  → Set timeout (e.g. 10 seconds)
  │
  ▼
Check response
  │  → If HTTP 200 → proceed
  │  → If HTTP 301/302 → follow redirect, log final URL
  │  → If HTTP 404/500 → log error, skip, flag for review
  │
  ▼
Store raw HTML to disk
  │  → Path: data/raw/{type}/{slug}.html
  │
  ▼
Write metadata entry to acquisition log
  │  → Path: data/discovery/acquisition_log.csv
  │
  ▼
Wait (rate limit delay)
  │
  ▼
NEXT URL
```

### 5.5 Metadata Record Structure

Each acquired page produces one row in `acquisition_log.csv`:

| Column | Type | Description |
|---|---|---|
| `slug` | string | URL slug (e.g. `adhd`) |
| `page_type` | string | `condition` or `therapy` |
| `source_url` | string | Full URL fetched |
| `http_status` | integer | HTTP response code |
| `content_length_bytes` | integer | Size of raw HTML |
| `page_title` | string | `<title>` tag content |
| `fetched_at` | datetime | ISO 8601 UTC timestamp |
| `fetch_success` | boolean | `true` if HTTP 200 |
| `notes` | string | Any anomalies or redirects |

---

## 6. Raw Storage Design

### 6.1 Directory Structure

```
data/
├── discovery/
│   ├── url_inventory.csv          ← All discovered URLs with type and status
│   ├── conditions_urls.txt        ← One condition URL per line
│   ├── therapies_urls.txt         ← One therapy URL per line
│   ├── acquisition_log.csv        ← Per-page fetch results and metadata
│   └── discovery_log.md           ← Human-written notes on discovery process
│
└── raw/
    ├── conditions/
    │   ├── adhd.html
    │   ├── autism.html
    │   ├── anxiety.html
    │   └── {slug}.html            ← One file per condition page
    │
    └── therapies/
        ├── cbt.html
        ├── occupational-therapy.html
        └── {slug}.html            ← One file per therapy page
```

### 6.2 File Naming Convention

| Rule | Detail |
|---|---|
| Format | `{slug}.html` |
| Slug source | Extracted directly from URL path segment |
| Case | Always lowercase |
| Separator | Hyphens (matching URL slug) |
| No version numbers | Overwrite on re-run |

**Examples:**

| URL | Stored As |
|---|---|
| `/conditions/adhd` | `data/raw/conditions/adhd.html` |
| `/conditions/autism-spectrum-disorder` | `data/raw/conditions/autism-spectrum-disorder.html` |
| `/therapies/cbt` | `data/raw/therapies/cbt.html` |
| `/therapies/occupational-therapy` | `data/raw/therapies/occupational-therapy.html` |

### 6.3 Storage Rules

| Rule | Rationale |
|---|---|
| Store raw HTML only — no parsing | Preserve original for re-analysis |
| One file per page | Enables selective re-fetch |
| Overwrite on re-run | Keeps storage clean; no duplicates |
| No binary assets | Do not store images, CSS, JS |
| UTF-8 encoding | Normalise all stored files to UTF-8 |

### 6.4 Storage Size Estimate

| Content Type | Estimated Pages | Avg HTML Size | Estimated Total |
|---|---|---|---|
| Conditions | 20–60 pages | ~50 KB | ~3 MB |
| Therapies | 10–30 pages | ~50 KB | ~1.5 MB |
| **Total** | **30–90 pages** | — | **< 10 MB** |

Storage requirements are minimal. No infrastructure beyond local filesystem is required for Phase 1.

---

## 7. Content Analysis Process

### 7.1 Purpose

Content analysis happens after all raw HTML is collected. The goal is to inspect the actual content structure so the team can define validated schemas before Phase 2 begins.

Analysis is a human-led process. The output is a documented content model that reflects what the website actually contains — not what was assumed.

### 7.2 What to Inspect

For each content type (conditions and therapies), the team must inspect:

#### Page Structure Elements

| Element | What to Look For |
|---|---|
| `<title>` | Format of page title; does it include the site name? |
| `<h1>` | Is there exactly one H1? What is its format? |
| `<h2>` / `<h3>` | What section headings are used consistently across pages? |
| `<meta name="description">` | Is a meta description present and meaningful? |
| `<meta property="og:*">` | Open Graph tags — may expose structured title, description, image |
| Canonical URL | `<link rel="canonical">` — confirms the authoritative URL |

#### Content Body Elements

| Element | What to Look For |
|---|---|
| Main content area | What CSS class or HTML element wraps the primary content? |
| Rich text blocks | Paragraphs, bullet lists, numbered lists within the page body |
| Definition/summary sections | Is there a short summary block at the top of each page? |
| Symptom lists | Are symptoms presented as lists, or embedded in prose? |
| CTA blocks | Are there "Book a session" or "Talk to a practitioner" blocks? |
| FAQ sections | Are FAQs structured (accordion, `<details>`, etc.)? |

#### Relationship and Link Elements

| Element | What to Look For |
|---|---|
| Internal links to conditions | Does a therapy page link to related condition pages? |
| Internal links to therapies | Does a condition page link to recommended therapy pages? |
| Breadcrumbs | Are breadcrumbs present and parseable? |
| Related content widgets | "You might also be interested in" sections |

### 7.3 Analysis Workflow

```
For each content type (conditions, therapies):
  │
  ▼
Step 1: Select 3–5 sample pages
  │  → Pick variety: short pages, long pages, well-known entries
  │
  ▼
Step 2: Inspect raw HTML manually
  │  → Open file from data/raw/
  │  → Identify repeating structure across samples
  │
  ▼
Step 3: Document consistent fields
  │  → Record: field name, HTML location, example value, consistency (always/sometimes/never)
  │
  ▼
Step 4: Identify inconsistencies
  │  → Fields that exist on some pages but not others
  │  → Flag as "optional" fields
  │
  ▼
Step 5: Map relationships
  │  → Document all internal links between conditions and therapies
  │  → Create relationship table
  │
  ▼
Step 6: Produce Content Model Document
  │  → Path: docs/specs/phase-1-content-model.md
  │  → One section per content type
  │  → Field-by-field documentation with examples
  │
  ▼
END → Ready to define Phase 2 schemas
```

### 7.4 Content Model Output Format

For each discovered field, document the following:

| Column | Description |
|---|---|
| Field Name | Human-readable name (e.g. `page_title`) |
| HTML Source | Where in the HTML it is found (e.g. `<title>` tag) |
| Present | `always` / `sometimes` / `never` |
| Example Value | Actual value from a real page |
| Notes | Edge cases, formatting variations |

### 7.5 Relationship Mapping

Produce a relationship table listing which conditions are linked to which therapies:

| Condition Slug | Linked Therapy Slugs |
|---|---|
| `adhd` | `cbt`, `occupational-therapy` |
| `autism` | `occupational-therapy`, `speech-therapy` |
| *(to be populated during analysis)* | |

This table becomes a core input to Phase 2 RAG schema design.

---

## 8. Risks and Assumptions

### 8.1 Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Pages are JS-rendered (React/Next.js SPA) | Medium | High | Test with plain HTTP GET first; if HTML is empty, a headless browser approach will be required |
| Index page does not list all entries | Medium | High | Cross-reference sitemap; manually verify count |
| No sitemap exists | Low | Medium | Fall back to index page crawl |
| Rate limiting or Cloudflare bot protection | Medium | Medium | Add request delays; use standard browser User-Agent; retry with backoff |
| Page structure changes during Phase 1 | Low | Medium | Lock down analysis to a specific fetch date; re-fetch if structure changes |
| Some condition/therapy pages are draft or unlisted | Low | Low | Document as known gap; flag for CMS access when available |
| Webflow CMS API access never materialises | Low | Low | Phase 1 does not depend on CMS API; Phase 2 design should accommodate both paths |

### 8.2 Assumptions

| # | Assumption |
|---|---|
| A1 | All target pages are publicly accessible via HTTPS without login |
| A2 | URL slugs are stable and will not change during Phase 1 |
| A3 | The website domain is consistent (single domain, no subdomains for content) |
| A4 | HTML pages are server-rendered and return full content in the initial HTTP response |
| A5 | The site does not prohibit automated access in its `robots.txt` |
| A6 | Condition and therapy pages follow a consistent layout within their content type |
| A7 | No authentication or session cookie is required to view content pages |
| A8 | Internal links between conditions and therapies are present in the HTML body |

### 8.3 Dependency on Future CMS Access

Phase 1 deliberately avoids any dependency on Webflow CMS API access. If and when API access becomes available, the following data points will supplement (not replace) what was collected in Phase 1:

| CMS Field | Value to Phase 2 |
|---|---|
| Collection IDs | Required for automated CMS sync in future phases |
| Item IDs | Enables linking content items without URL parsing |
| Draft / Published status | Ensures only published content enters the knowledge base |
| Last Updated timestamp | Enables incremental content refresh |

The Phase 1 content model document should include a column noting which fields are expected to come from the CMS API vs. which are derivable from public HTML.

---

## 9. Success Criteria

Phase 1 is considered complete when all of the following criteria are met:

| # | Criterion | Verification Method |
|---|---|---|
| SC-01 | All condition page URLs are identified and confirmed accessible | `url_inventory.csv` contains all condition entries with `http_status = 200` |
| SC-02 | All therapy page URLs are identified and confirmed accessible | `url_inventory.csv` contains all therapy entries with `http_status = 200` |
| SC-03 | Raw HTML is stored locally for every confirmed URL | `data/raw/conditions/` and `data/raw/therapies/` contain one `.html` file per URL |
| SC-04 | Acquisition log is complete with no unresolved fetch errors | `acquisition_log.csv` shows `fetch_success = true` for all entries, or errors are documented with resolution |
| SC-05 | Content analysis is complete for all condition pages | `docs/specs/phase-1-content-model.md` documents all fields with `present` classification |
| SC-06 | Content analysis is complete for all therapy pages | Same document covers therapy content type with full field list |
| SC-07 | Condition-to-therapy relationship map is produced | Relationship table is populated and reviewed |
| SC-08 | All risks and assumptions are reviewed and signed off | Risk table in this document is updated with current status |
| SC-09 | Phase 2 handoff document is drafted | `docs/specs/phase-2-handoff.md` exists (see Section 10) |

---

## 10. Future Handoff

Before Phase 2 (schema design, chunking strategy, embeddings, and vector storage) begins, the following information must be ready and validated.

### 10.1 Required Handoff Deliverables

| Deliverable | Location | Owned By |
|---|---|---|
| URL inventory (all pages confirmed) | `data/discovery/url_inventory.csv` | Engineering |
| Acquisition log (all fetches logged) | `data/discovery/acquisition_log.csv` | Engineering |
| Raw HTML files (all pages) | `data/raw/` | Engineering |
| Content model document | `docs/specs/phase-1-content-model.md` | Solutions Architecture |
| Condition-therapy relationship map | Included in content model document | Solutions Architecture |
| Risk register (updated) | This document, Section 8 | Solutions Architecture |
| Discovery log (human notes) | `data/discovery/discovery_log.md` | Engineering |

### 10.2 Questions Phase 2 Must Answer

The following decisions are deliberately deferred to Phase 2. Phase 1 must produce enough information for Phase 2 to answer them:

| Question | Information Needed From Phase 1 |
|---|---|
| How should condition pages be chunked for retrieval? | Content model showing heading structure and section lengths |
| Which fields should be indexed as metadata vs. embedded as content? | Field list with `always/sometimes` classification |
| How should condition-therapy relationships be represented in the vector store? | Relationship map |
| What is the average content length per page type? | Acquisition log with `content_length_bytes` |
| Are there any content outliers (very short or very long pages)? | Acquisition log + manual review notes |
| Can the Webflow CMS API supplement public HTML? | Status of CMS access request at Phase 2 start |

### 10.3 Handoff Readiness Checklist

Phase 2 may begin only when the following checklist is fully checked off:

- [ ] All Phase 1 success criteria (SC-01 through SC-09) are met
- [ ] Content model document has been reviewed and approved
- [ ] No unresolved high-impact risks remain open
- [ ] Raw data directory is accessible to the Phase 2 team
- [ ] Phase 2 lead has reviewed this specification document

---

*End of Specification — Phase 1: Content Discovery & Acquisition*

*Document Version: 1.0 | Last Updated: 2026-06-17*
