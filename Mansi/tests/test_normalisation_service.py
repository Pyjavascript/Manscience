"""Tests for app/services/normalisation_service.py."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.services.normalisation_service import (
    NormalisationError,
    NormalisationService,
    _compute_hash,
    _sanitise,
)


# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------

_FULL_HTML = """
<!DOCTYPE html>
<html>
<head>
  <title>ADHD — Mansi</title>
  <meta name="description" content="Learn about ADHD.">
  <meta property="og:title" content="ADHD">
  <meta property="og:description" content="OG description.">
  <link rel="canonical" href="https://test.example.com/conditions/adhd">
</head>
<body>
  <nav><a href="/">Home</a></nav>
  <main>
    <h1>ADHD</h1>
    <h2>What is ADHD?</h2>
    <p>Attention Deficit Hyperactivity Disorder is a neurodevelopmental condition.</p>
    <h3>Symptoms</h3>
    <ul>
      <li>Inattention</li>
      <li>Hyperactivity</li>
      <li>Impulsivity</li>
    </ul>
    <ol>
      <li>Step one</li>
      <li>Step two</li>
    </ol>
    <p>Treatment options include therapy and medication.</p>
    <a href="/therapies/cbt">CBT for ADHD</a>
    <a href="/conditions/autism">See also: Autism</a>
  </main>
  <footer><p>Footer text</p></footer>
  <script>var x = 1;</script>
</body>
</html>
"""

_MINIMAL_HTML = (
    "<html><head><title>CBT</title></head><body><main>"
    "<h1>CBT</h1><p>Cognitive Behavioural Therapy is an evidence-based treatment.</p>"
    "</main></body></html>"
)

_NO_H1_HTML = (
    "<html><body><main>"
    "<p>Some content here for testing purposes only.</p>"
    "</main></body></html>"
)

_ENTITY_HTML = (
    "<html><body><main>"
    "<h1>Test &amp; More</h1>"
    "<p>It&rsquo;s a test &amp; it works correctly.</p>"
    "</main></body></html>"
)

_NOISE_PARA_HTML = (
    "<html><body><main>"
    "<h1>Title</h1>"
    "<p>   </p>"
    "<p><a href='/therapies/cbt'>CBT</a></p>"
    "<p>Real content here for testing purposes.</p>"
    "</main></body></html>"
)


def _write_html(directory: Path, slug: str, html: str = _FULL_HTML) -> Path:
    path = directory / f"{slug}.html"
    path.write_text(html, encoding="utf-8")
    return path


def _make_service(tmp_path: Path) -> NormalisationService:
    svc = NormalisationService(
        raw_dir=tmp_path / "raw",
        normalized_dir=tmp_path / "normalized",
    )
    svc._base_url = "https://test.example.com"
    return svc


# ---------------------------------------------------------------------------
# _sanitise
# ---------------------------------------------------------------------------


def test_sanitise_collapses_whitespace():
    assert _sanitise("  hello   world  ") == "hello world"


def test_sanitise_removes_zero_width_chars():
    assert _sanitise("hel​lo") == "hello"


# ---------------------------------------------------------------------------
# extract_document — required fields
# ---------------------------------------------------------------------------


def test_extract_document_has_all_required_fields(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)
    html_path = _write_html(raw_dir, "adhd")

    doc = svc.extract_document(html_path, "conditions", "adhd")

    required = (
        "slug", "page_type", "source_url", "page_title", "raw_page_title",
        "h1", "headings", "body_paragraphs", "lists", "internal_links",
        "extracted_at", "extraction_version", "content_hash",
        "extraction_complete", "content_length_bytes", "fetch_http_status",
        "canonical_url", "meta_description", "og_title", "og_description",
    )
    for field in required:
        assert field in doc, f"Missing field: {field}"


def test_extract_document_slug_and_page_type(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)
    html_path = _write_html(raw_dir, "adhd")

    doc = svc.extract_document(html_path, "conditions", "adhd")

    assert doc["slug"] == "adhd"
    assert doc["page_type"] == "conditions"
    assert doc["source_url"] == "https://test.example.com/conditions/adhd"


def test_extract_document_extraction_version(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)
    html_path = _write_html(raw_dir, "adhd")

    doc = svc.extract_document(html_path, "conditions", "adhd")
    assert doc["extraction_version"] == "v1"


# ---------------------------------------------------------------------------
# extract_document — title
# ---------------------------------------------------------------------------


def test_title_stripped_of_em_dash_suffix(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)
    html_path = _write_html(raw_dir, "adhd")

    doc = svc.extract_document(html_path, "conditions", "adhd")

    assert doc["page_title"] == "ADHD"
    assert doc["raw_page_title"] == "ADHD — Mansi"


def test_title_stripped_of_pipe_suffix(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)
    html = "<html><head><title>Anxiety | Mansi Health</title></head><body><main><h1>Anxiety</h1><p>Content.</p></main></body></html>"
    html_path = _write_html(raw_dir, "anxiety", html)

    doc = svc.extract_document(html_path, "conditions", "anxiety")
    assert doc["page_title"] == "Anxiety"


# ---------------------------------------------------------------------------
# extract_document — h1 and headings
# ---------------------------------------------------------------------------


def test_h1_extracted(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)
    html_path = _write_html(raw_dir, "adhd")

    doc = svc.extract_document(html_path, "conditions", "adhd")
    assert doc["h1"] == "ADHD"


def test_h1_empty_when_absent(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)
    html_path = _write_html(raw_dir, "noh1", _NO_H1_HTML)

    doc = svc.extract_document(html_path, "conditions", "noh1")
    assert doc["h1"] == ""


def test_headings_ordered_with_levels(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)
    html_path = _write_html(raw_dir, "adhd")

    doc = svc.extract_document(html_path, "conditions", "adhd")

    assert {"level": 1, "text": "ADHD"} in doc["headings"]
    assert {"level": 2, "text": "What is ADHD?"} in doc["headings"]
    assert {"level": 3, "text": "Symptoms"} in doc["headings"]


# ---------------------------------------------------------------------------
# extract_document — body paragraphs
# ---------------------------------------------------------------------------


def test_body_paragraphs_extracted(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)
    html_path = _write_html(raw_dir, "adhd")

    doc = svc.extract_document(html_path, "conditions", "adhd")

    assert isinstance(doc["body_paragraphs"], list)
    assert any("Attention Deficit" in p for p in doc["body_paragraphs"])
    assert any("Treatment" in p for p in doc["body_paragraphs"])


def test_body_paragraph_whitespace_only_filtered(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)
    html_path = _write_html(raw_dir, "noise", _NOISE_PARA_HTML)

    doc = svc.extract_document(html_path, "conditions", "noise")

    assert all(p.strip() for p in doc["body_paragraphs"])
    assert any("Real content" in p for p in doc["body_paragraphs"])


# ---------------------------------------------------------------------------
# extract_document — lists
# ---------------------------------------------------------------------------


def test_lists_extracted_ul_and_ol(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)
    html_path = _write_html(raw_dir, "adhd")

    doc = svc.extract_document(html_path, "conditions", "adhd")

    list_types = {lst["list_type"] for lst in doc["lists"]}
    assert "unordered" in list_types
    assert "ordered" in list_types


def test_unordered_list_items_extracted(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)
    html_path = _write_html(raw_dir, "adhd")

    doc = svc.extract_document(html_path, "conditions", "adhd")

    ul = next(l for l in doc["lists"] if l["list_type"] == "unordered")
    assert "Inattention" in ul["items"]
    assert "Hyperactivity" in ul["items"]


# ---------------------------------------------------------------------------
# extract_document — internal links
# ---------------------------------------------------------------------------


def test_internal_links_classified_correctly(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)
    html_path = _write_html(raw_dir, "adhd")

    doc = svc.extract_document(html_path, "conditions", "adhd")

    target_types = {link["target_type"] for link in doc["internal_links"]}
    assert "therapy" in target_types
    assert "condition" in target_types


def test_internal_links_exclude_homepage(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)
    html_path = _write_html(raw_dir, "adhd")

    doc = svc.extract_document(html_path, "conditions", "adhd")

    hrefs = {link["href"] for link in doc["internal_links"]}
    assert "/" not in hrefs
    assert "" not in hrefs


# ---------------------------------------------------------------------------
# extract_document — optional metadata fields
# ---------------------------------------------------------------------------


def test_canonical_url_extracted(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)
    html_path = _write_html(raw_dir, "adhd")

    doc = svc.extract_document(html_path, "conditions", "adhd")
    assert doc["canonical_url"] == "https://test.example.com/conditions/adhd"


def test_og_tags_extracted(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)
    html_path = _write_html(raw_dir, "adhd")

    doc = svc.extract_document(html_path, "conditions", "adhd")
    assert doc["og_title"] == "ADHD"
    assert doc["og_description"] == "OG description."


def test_missing_optional_fields_are_none(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "therapies"
    raw_dir.mkdir(parents=True)
    html_path = _write_html(raw_dir, "cbt", _MINIMAL_HTML)

    doc = svc.extract_document(html_path, "therapies", "cbt")

    assert doc["canonical_url"] is None
    assert doc["meta_description"] is None
    assert doc["og_title"] is None
    assert doc["og_description"] is None


# ---------------------------------------------------------------------------
# extract_document — extraction_complete flag
# ---------------------------------------------------------------------------


def test_extraction_complete_true_when_h1_title_and_paragraphs_present(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "therapies"
    raw_dir.mkdir(parents=True)
    html_path = _write_html(raw_dir, "cbt", _MINIMAL_HTML)

    doc = svc.extract_document(html_path, "therapies", "cbt")
    assert doc["extraction_complete"] is True


def test_extraction_complete_false_when_h1_missing(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)
    html_path = _write_html(raw_dir, "noh1", _NO_H1_HTML)

    doc = svc.extract_document(html_path, "conditions", "noh1")
    assert doc["extraction_complete"] is False


# ---------------------------------------------------------------------------
# extract_document — sanitisation
# ---------------------------------------------------------------------------


def test_sanitisation_decodes_html_entities(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)
    html_path = _write_html(raw_dir, "entity", _ENTITY_HTML)

    doc = svc.extract_document(html_path, "conditions", "entity")

    assert doc["h1"] == "Test & More"
    assert "&amp;" not in doc["h1"]
    assert "&rsquo;" not in " ".join(doc["body_paragraphs"])


# ---------------------------------------------------------------------------
# Content hash
# ---------------------------------------------------------------------------


def test_content_hash_stable_across_runs(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)
    html_path = _write_html(raw_dir, "adhd")

    doc1 = svc.extract_document(html_path, "conditions", "adhd")
    doc2 = svc.extract_document(html_path, "conditions", "adhd")

    assert doc1["content_hash"] == doc2["content_hash"]


def test_content_hash_changes_when_content_changes(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)

    html_path = _write_html(raw_dir, "adhd", _FULL_HTML)
    doc1 = svc.extract_document(html_path, "conditions", "adhd")

    html_path.write_text(_MINIMAL_HTML.replace("CBT", "ADHD"), encoding="utf-8")
    doc2 = svc.extract_document(html_path, "conditions", "adhd")

    assert doc1["content_hash"] != doc2["content_hash"]


def test_content_hash_excludes_extracted_at(tmp_path):
    """Same content with different timestamps must produce the same hash."""
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)
    html_path = _write_html(raw_dir, "adhd")

    doc1 = svc.extract_document(html_path, "conditions", "adhd")
    doc2 = svc.extract_document(html_path, "conditions", "adhd")

    assert doc1["content_hash"] == doc2["content_hash"]
    # Timestamps may or may not differ depending on timing, but hash must be equal
    assert doc1["content_hash"] == doc2["content_hash"]


# ---------------------------------------------------------------------------
# Version log
# ---------------------------------------------------------------------------


def test_version_log_written_after_first_run(tmp_path):
    svc = _make_service(tmp_path)
    (tmp_path / "raw" / "conditions").mkdir(parents=True)
    _write_html(tmp_path / "raw" / "conditions", "adhd")

    svc.run()

    log_path = tmp_path / "normalized" / "version_log.jsonl"
    assert log_path.exists()
    entry = json.loads(log_path.read_text(encoding="utf-8").splitlines()[0])
    assert entry["slug"] == "adhd"
    assert entry["page_type"] == "conditions"
    assert entry["previous_hash"] is None
    assert entry["content_changed"] is True


def test_version_log_second_run_unchanged(tmp_path):
    svc = _make_service(tmp_path)
    (tmp_path / "raw" / "conditions").mkdir(parents=True)
    _write_html(tmp_path / "raw" / "conditions", "adhd")

    svc.run()
    svc.run()

    lines = (tmp_path / "normalized" / "version_log.jsonl").read_text(encoding="utf-8").splitlines()
    assert len(lines) == 2
    second = json.loads(lines[1])
    assert second["content_changed"] is False
    assert second["previous_hash"] is not None


def test_version_log_detects_content_change(tmp_path):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)
    html_path = _write_html(raw_dir, "adhd", _FULL_HTML)

    svc.run()

    html_path.write_text(_MINIMAL_HTML.replace("CBT", "ADHD"), encoding="utf-8")
    svc.run()

    lines = (tmp_path / "normalized" / "version_log.jsonl").read_text(encoding="utf-8").splitlines()
    second = json.loads(lines[1])
    assert second["content_changed"] is True


# ---------------------------------------------------------------------------
# run() — output files and records
# ---------------------------------------------------------------------------


def test_run_writes_json_to_normalized_dir(tmp_path):
    svc = _make_service(tmp_path)
    (tmp_path / "raw" / "conditions").mkdir(parents=True)
    _write_html(tmp_path / "raw" / "conditions", "adhd")

    svc.run()

    json_path = tmp_path / "normalized" / "conditions" / "adhd.json"
    assert json_path.exists()
    doc = json.loads(json_path.read_text(encoding="utf-8"))
    assert doc["slug"] == "adhd"
    assert doc["page_type"] == "conditions"
    assert "content_hash" in doc


def test_run_returns_normalised_record(tmp_path):
    svc = _make_service(tmp_path)
    (tmp_path / "raw" / "therapies").mkdir(parents=True)
    _write_html(tmp_path / "raw" / "therapies", "cbt", _MINIMAL_HTML)

    records = svc.run()

    assert len(records) == 1
    assert records[0].status == "normalised"
    assert records[0].slug == "cbt"
    assert records[0].content_changed is True


def test_run_returns_unchanged_status_on_identical_second_run(tmp_path):
    svc = _make_service(tmp_path)
    (tmp_path / "raw" / "conditions").mkdir(parents=True)
    _write_html(tmp_path / "raw" / "conditions", "adhd")

    svc.run()
    records = svc.run()

    assert records[0].status == "unchanged"
    assert records[0].content_changed is False


def test_run_processes_both_conditions_and_therapies(tmp_path):
    svc = _make_service(tmp_path)
    (tmp_path / "raw" / "conditions").mkdir(parents=True)
    (tmp_path / "raw" / "therapies").mkdir(parents=True)
    _write_html(tmp_path / "raw" / "conditions", "adhd")
    _write_html(tmp_path / "raw" / "therapies", "cbt", _MINIMAL_HTML)

    records = svc.run()

    slugs = {r.slug for r in records}
    assert "adhd" in slugs
    assert "cbt" in slugs


def test_run_continues_after_one_file_fails(tmp_path, monkeypatch):
    svc = _make_service(tmp_path)
    raw_dir = tmp_path / "raw" / "conditions"
    raw_dir.mkdir(parents=True)
    _write_html(raw_dir, "bad")
    _write_html(raw_dir, "good")

    original_extract = svc.extract_document

    def patched_extract(html_path, page_type, slug):
        if slug == "bad":
            raise RuntimeError("Simulated extraction failure")
        return original_extract(html_path, page_type, slug)

    monkeypatch.setattr(svc, "extract_document", patched_extract)
    records = svc.run()

    by_slug = {r.slug: r for r in records}
    assert by_slug["bad"].status == "failed"
    assert by_slug["good"].status == "normalised"


# ---------------------------------------------------------------------------
# run() — error cases
# ---------------------------------------------------------------------------


def test_run_raises_when_raw_dir_missing(tmp_path):
    svc = _make_service(tmp_path)
    with pytest.raises(NormalisationError, match="does not exist"):
        svc.run()


def test_run_raises_when_no_html_files(tmp_path):
    svc = _make_service(tmp_path)
    (tmp_path / "raw").mkdir()
    with pytest.raises(NormalisationError, match="No .html files"):
        svc.run()
