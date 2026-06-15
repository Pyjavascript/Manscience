# Mansi AI — Dataset Structure Specification

| Field | Value |
|---|---|
| Document Type | Software Specification (Documentation Only) |
| Project | Mansi AI Chatbot |
| Phase | Phase 3+ — RAG Dataset Foundations |
| Audience | Software Engineers, Content/Data Owners |
| Status | Draft — Specification only. **No data files or ingestion code are created by this document.** |

---

## 1. Purpose of This Document

This document specifies the intended folder layout, file formats, metadata
fields, naming conventions, versioning, and cleaning guidelines for the
datasets that will feed the future RAG pipeline
(`docs/specs/rag-architecture.md`).

This is a **specification only**. No data ingestion code is added, and no
`data/` directory or files are created by this document — it documents the
intended structure so that future data work follows a consistent convention
from the start.

---

## 2. Intended Folder Layout

```
data/
    courses/
    blogs/
    practitioners/
    faqs/
    policies/
    screening_guides/
```

### 2.1 General Conventions (apply to all datasets)

- Each top-level folder under `data/` corresponds 1:1 to a "dataset" as
  referenced in `docs/specs/rag-architecture.md` (§3) and in the
  `source_dataset` field of chunk metadata.
- One file per record is recommended for datasets where individual items are
  frequently added/edited/removed independently (`courses`, `blogs`,
  `practitioners`, `faqs`). This makes diffs in version control
  reviewable per-item.
- Larger reference documents (`policies`, `screening_guides`) may use one
  file per document/section rather than one file per "record."
- All text content files should be UTF-8 encoded, with `LF` line endings.
- A top-level `data/README.md` (future) should briefly describe each
  subfolder and link to this specification.

---

## 3. Dataset: `courses`

### 3.1 Purpose

Catalog of courses offered, used by `POST /courses/recommend` and
personalized roadmap recommendations (`docs/specs/api-specification.md`
§7–8).

### 3.2 File Formats

- One file per course, format: **Markdown with YAML front matter** (`.md`)
  *or* a single structured file (`.json`/`.yaml`) per course — either is
  acceptable; Markdown-with-front-matter is recommended for human
  editability when descriptions are long.

Example (`data/courses/<course-id>.md`):

```markdown
---
id: intro-to-mindfulness
title: "Introduction to Mindfulness"
level: beginner
topics: [mindfulness, stress-management]
url: "https://example.com/courses/intro-to-mindfulness"
version: 1
updated_at: 2026-06-15
---

Course description goes here...
```

### 3.3 Metadata Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Stable, unique identifier. Used as `source_id` in RAG chunk metadata. |
| `title` | string | Yes | Course title. |
| `level` | string | No | One of `beginner`, `intermediate`, `advanced`. |
| `topics` | array of strings | No | Topic tags used for filtering/recommendations. |
| `url` | string | No | Link to the course (external site, LMS, etc.). |
| `version` | integer | Yes | Incremented on meaningful content changes (see §3.5). |
| `updated_at` | date (`YYYY-MM-DD`) | Yes | Last content update date. |

### 3.4 Naming Conventions

- File name: `<id>.md`, where `id` is `kebab-case`, derived from the title
  (e.g., `Introduction to Mindfulness` → `intro-to-mindfulness`).
- `id` must be globally unique within `data/courses/` and stable over time
  (do not reuse an `id` for a different course, even if the old course is
  removed) — this avoids `chunk_id` collisions in the future vector store
  (`docs/specs/rag-architecture.md` §6.2).

### 3.5 Versioning Recommendations

- Bump `version` (integer) whenever `title`, `description`, or `topics`
  change in a way that would meaningfully change retrieval/recommendation
  behavior. Cosmetic edits (typos) do not require a version bump.
- Update `updated_at` on every content change, regardless of version bump.
- Version history is otherwise tracked via git — no separate changelog file
  is required per course.

### 3.6 Cleaning Guidelines

- Descriptions should be plain prose (no embedded HTML/JS).
- `topics` should be drawn from a controlled, documented vocabulary once one
  exists (future: `data/courses/_topics.md` or similar) to avoid tag
  fragmentation (e.g., `stress-management` vs. `stress_management` vs.
  `Stress Management`).
- Remove marketing boilerplate/CTAs not useful for retrieval (e.g.,
  "Enroll now!" banners) — keep descriptions informative.

---

## 4. Dataset: `blogs`

### 4.1 Purpose

Articles/blog posts used by `POST /research/search` and general chat
grounding (`docs/specs/rag-architecture.md` §3).

### 4.2 File Formats

- One file per post, format: **Markdown with YAML front matter** (`.md`).

Example (`data/blogs/<slug>.md`):

```markdown
---
id: managing-everyday-stress
title: "Managing Everyday Stress"
author: "string"
tags: [stress, wellbeing]
published_at: 2026-05-01
updated_at: 2026-05-01
version: 1
url: "https://example.com/blog/managing-everyday-stress"
---

Article body in Markdown...
```

### 4.3 Metadata Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Stable, unique identifier (slug). |
| `title` | string | Yes | Article title. |
| `author` | string | No | Author name or attribution. |
| `tags` | array of strings | No | Topic tags. |
| `published_at` | date | No | Original publish date. |
| `updated_at` | date | Yes | Last content update date. |
| `version` | integer | Yes | Incremented on meaningful content changes. |
| `url` | string | No | Canonical link, if published elsewhere. |

### 4.4 Naming Conventions

- File name: `<id>.md`, where `id` is a URL-safe `kebab-case` slug.
- Slugs must be unique and stable (do not rename on edit; only on
  republishing under a deliberately new identity).

### 4.5 Versioning Recommendations

- Bump `version` on substantive content edits (not typo fixes).
- `published_at` is immutable once set; `updated_at` reflects the latest
  edit.

### 4.6 Cleaning Guidelines

- Strip tracking parameters from any embedded links.
- Normalize headings (one `#` H1 matching `title`, then `##`/`###` for
  sections) so section-based chunking (`docs/specs/rag-architecture.md`
  §4.2) produces clean chunks.
- Avoid embedding large images/binary content inline — link out instead,
  since RAG operates on text.

---

## 5. Dataset: `practitioners`

### 5.1 Purpose

Directory of practitioners (specialties, bios, booking/contact info), used
for roadmap follow-up and profile-related recommendations
(`docs/specs/rag-architecture.md` §3).

### 5.2 File Formats

- One file per practitioner, format: **YAML or JSON** (structured data;
  bios may be short enough that Markdown front matter is unnecessary, but
  Markdown-with-front-matter is also acceptable for consistency with other
  datasets).

Example (`data/practitioners/<id>.yaml`):

```yaml
id: jane-doe
name: "Jane Doe"
specialties: [nutrition, sleep]
bio: >
  Short biography text describing background and approach.
contact:
  booking_url: "https://example.com/book/jane-doe"
version: 1
updated_at: 2026-06-01
```

### 5.3 Metadata Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Stable, unique identifier. |
| `name` | string | Yes | Practitioner's display name. |
| `specialties` | array of strings | No | Specialty/topic tags. |
| `bio` | string | No | Short biography/description text (the retrievable content). |
| `contact.booking_url` | string | No | Link for booking/contact. |
| `version` | integer | Yes | Incremented on meaningful content changes. |
| `updated_at` | date | Yes | Last content update date. |

### 5.4 Naming Conventions

- File name: `<id>.yaml` (or `.json`), `id` in `kebab-case`, derived from
  the practitioner's name, with a numeric suffix if collisions occur
  (e.g., `jane-doe-2`).

### 5.5 Versioning Recommendations

- Bump `version` when `specialties` or `bio` change meaningfully.
- Removing a practitioner: prefer marking inactive (e.g., an `active: false`
  field) over deleting the file outright, to preserve historical references
  if any roadmap/profile data points to this `id` — exact retention policy
  to be defined alongside the future database/persistence layer.

### 5.6 Cleaning Guidelines

- No personally sensitive information beyond what the practitioner has
  consented to publish professionally.
- `specialties` should align with the same controlled vocabulary used for
  `courses.topics` and `blogs.tags` where overlapping concepts exist, to
  support cross-dataset retrieval consistency.

---

## 6. Dataset: `faqs`

### 6.1 Purpose

Frequently asked questions and answers, used for general chat grounding
(`docs/specs/rag-architecture.md` §3) to reduce reliance on LLM-only answers
for common questions.

### 6.2 File Formats

- One file per FAQ entry **or** a small number of files grouping related
  FAQs by topic, format: **Markdown with YAML front matter** or
  **YAML list**. Recommended: one file per topic group containing a list of
  Q&A pairs, since individual FAQs are typically very short.

Example (`data/faqs/general.yaml`):

```yaml
topic: general
version: 1
updated_at: 2026-06-01
items:
  - id: general-001
    question: "What is Mansi?"
    answer: "Plain-text answer..."
    tags: [about]
```

### 6.3 Metadata Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `topic` | string | Yes (file-level) | Grouping topic for the file (e.g., `general`, `billing`). |
| `version` | integer | Yes (file-level) | Incremented when any item in the file changes meaningfully. |
| `updated_at` | date | Yes (file-level) | Last update date for the file. |
| `items[].id` | string | Yes | Stable, unique identifier per Q&A pair, unique across all `faqs` files. |
| `items[].question` | string | Yes | The question text. |
| `items[].answer` | string | Yes | The answer text (the retrievable content, paired with `question`). |
| `items[].tags` | array of strings | No | Topic tags. |

### 6.4 Naming Conventions

- File name: `<topic>.yaml`, `topic` in `kebab-case` (or lower snake_case
  consistently — pick one convention project-wide; `kebab-case` recommended
  to match other datasets).
- `items[].id` format: `<topic>-NNN` (zero-padded sequence), unique across
  the entire `faqs` dataset.

### 6.5 Versioning Recommendations

- Bump the file-level `version` whenever any `items[]` entry is added,
  removed, or meaningfully edited.
- Do not reuse an `items[].id` after an entry is removed.

### 6.6 Cleaning Guidelines

- Answers should be self-contained (understandable without seeing the
  question elsewhere) since they may be retrieved/chunked together with the
  question (§4.2 of `docs/specs/rag-architecture.md` — "one chunk per Q&A
  pair").
- Avoid duplicate/near-duplicate questions across topic files; consolidate
  instead.

---

## 7. Dataset: `policies`

### 7.1 Purpose

Organizational/legal/operational policy documents (e.g., privacy policy,
terms of use, usage guidelines), used for chat grounding on policy-related
questions (`docs/specs/rag-architecture.md` §3).

### 7.2 File Formats

- One file per policy document, format: **Markdown with YAML front matter**,
  structured with clear `##`/`###` headings to support section-based
  chunking (`docs/specs/rag-architecture.md` §4.2).

Example (`data/policies/privacy-policy.md`):

```markdown
---
id: privacy-policy
title: "Privacy Policy"
version: 3
effective_date: 2026-01-01
updated_at: 2026-01-01
---

## Overview
...

## Data We Collect
...
```

### 7.3 Metadata Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Stable, unique identifier. |
| `title` | string | Yes | Document title. |
| `version` | integer | Yes | Incremented on any substantive policy change. |
| `effective_date` | date | Yes | Date the current version takes effect. |
| `updated_at` | date | Yes | Last edit date (may equal `effective_date`). |

### 7.4 Naming Conventions

- File name: `<id>.md`, `id` in `kebab-case` matching the document title
  (e.g., `privacy-policy`, `terms-of-use`).

### 7.5 Versioning Recommendations

- Policy documents require **strict** versioning given their legal/
  compliance nature: every substantive change increments `version` and
  updates `effective_date`/`updated_at`.
- Prior versions should be retained in git history (do not rewrite history
  to remove old policy text) — version control itself serves as the audit
  trail.
- Consider a future `superseded_by` field if a policy is replaced by a
  differently-named document.

### 7.6 Cleaning Guidelines

- Headings must be descriptive and consistent in structure across policy
  documents to aid section-based chunking.
- Avoid embedding legal disclaimers as boilerplate repeated in every chunk —
  keep them in a dedicated section so retrieval doesn't surface the same
  disclaimer repeatedly across unrelated chunks.

---

## 8. Dataset: `screening_guides`

### 8.1 Purpose

Reference material informing the design of roadmap questionnaires (Q1/Q2,
`docs/specs/api-specification.md` §7, and
`docs/planning/Q1_Questions.md` / `docs/planning/Q2_Questions.md`). Per the
RAG architecture spec (§3), this dataset informs question design rather than
being retrieved directly at chat time in the initial scope.

**No medical/screening content is defined by this document** — this section
only specifies the *structure* for such content if/when it is authored.

### 8.2 File Formats

- One file per guide/topic, format: **Markdown with YAML front matter**,
  structured with `##`/`###` headings (section-based chunking, consistent
  with `policies`).

Example (`data/screening_guides/<id>.md`):

```markdown
---
id: example-guide
title: "Example Screening Guide"
version: 1
updated_at: 2026-06-01
source: "string (citation/reference, if applicable)"
---

## Purpose
...

## Guidance
...
```

### 8.3 Metadata Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Stable, unique identifier. |
| `title` | string | Yes | Guide title. |
| `version` | integer | Yes | Incremented on substantive content changes. |
| `updated_at` | date | Yes | Last edit date. |
| `source` | string | No | Citation/reference for the guide's origin, if based on external material. |

### 8.4 Naming Conventions

- File name: `<id>.md`, `id` in `kebab-case`.

### 8.5 Versioning Recommendations

- Same strict versioning as `policies` (§7.5) given the sensitivity of
  screening-related content — every substantive change increments `version`
  and `updated_at`, with prior versions retained in git history.

### 8.6 Cleaning Guidelines

- Content authored here must come from reviewed, attributed sources
  (`source` field) — this dataset must not contain ad hoc or unreviewed
  screening/medical content.
- Any content with clinical/diagnostic implications requires sign-off from a
  qualified reviewer before being added — this is a content governance
  requirement, not something enforced by file structure, and is called out
  here so future contributors are aware before populating this folder.

---

## 9. Cross-Dataset Conventions Summary

| Convention | Applies To | Rule |
|---|---|---|
| `id` field | All datasets | Stable, unique within the dataset, `kebab-case`, never reused after deletion. |
| `version` field | All datasets | Integer, incremented on substantive content changes. |
| `updated_at` field | All datasets | `YYYY-MM-DD`, updated on every content change. |
| Tag vocabulary (`topics`/`tags`/`specialties`) | `courses`, `blogs`, `practitioners`, `faqs` | Should share a controlled vocabulary where concepts overlap (future: a shared tag glossary). |
| Encoding | All datasets | UTF-8, `LF` line endings. |
| Source attribution | `screening_guides`, `policies` | `source` (screening guides) / `effective_date` (policies) for provenance and audit. |

---

## 10. Explicitly Out of Scope (per this document)

- No `data/` directory or files are created.
- No ingestion, parsing, or validation code is added.
- No content (course descriptions, blog posts, FAQs, policy text, screening
  guide content) is authored — see `docs/planning/` for content planning
  placeholders.

---

*End of Specification — implementation not yet performed.*
