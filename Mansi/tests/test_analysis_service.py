"""Tests for app/services/analysis_service.py."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.services.analysis_service import (
    AnalysisError,
    AnalysisService,
    ContentRelationship,
    PageMetadata,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


_SAMPLE_HTML = """
<!DOCTYPE html>
<html>
<head>
  <title>ADHD | Mansi</title>
  <meta name="description" content="Learn about ADHD symptoms and treatments.">
  <meta name="keywords" content="adhd, attention, focus">
</head>
<body>
  <nav><a href="/">Home</a></nav>
  <h1>ADHD</h1>
  <h2>What is ADHD?</h2>
  <p>Attention Deficit Hyperactivity Disorder is a condition.</p>
  <h2>Symptoms</h2>
  <ul><li>Inattention</li><li>Hyperactivity</li></ul>
  <h3>In children</h3>
  <p>More common in boys.</p>
  <a href="/therapies/cbt">CBT for ADHD</a>
  <a href="/conditions/autism">See Autism</a>
  <footer><p>Footer text</p></footer>
  <script>var x = 1;</script>
</body>
</html>
"""

_MINIMAL_HTML = "<html><body><p>Hello world.</p></body></html>"


def _write_html(directory: Path, slug: str, html: str = _SAMPLE_HTML) -> Path:
    path = directory / f"{slug}.html"
    path.write_text(html, encoding="utf-8")
    return path


# ---------------------------------------------------------------------------
# extract_page_metadata
# ---------------------------------------------------------------------------


def test_extract_page_metadata_returns_correct_title_and_h1(tmp_path):
    html_dir = tmp_path / "conditions"
    html_dir.mkdir()
    html_path = _write_html(html_dir, "adhd")

    svc = AnalysisService(raw_dir=tmp_path, output_path=tmp_path / "model.md")
    metadata = svc.extract_page_metadata(html_path, "https://example.com/conditions/adhd", "conditions")

    assert metadata.title == "ADHD | Mansi"
    assert metadata.h1 == "ADHD"


def test_extract_page_metadata_returns_headings_in_order(tmp_path):
    html_dir = tmp_path / "conditions"
    html_dir.mkdir()
    html_path = _write_html(html_dir, "adhd")

    svc = AnalysisService(raw_dir=tmp_path, output_path=tmp_path / "model.md")
    metadata = svc.extract_page_metadata(html_path, "https://example.com/conditions/adhd", "conditions")

    assert "What is ADHD?" in metadata.headings
    assert "Symptoms" in metadata.headings
    assert "In children" in metadata.headings


def test_extract_page_metadata_captures_meta_description(tmp_path):
    html_dir = tmp_path / "conditions"
    html_dir.mkdir()
    html_path = _write_html(html_dir, "adhd")

    svc = AnalysisService(raw_dir=tmp_path, output_path=tmp_path / "model.md")
    metadata = svc.extract_page_metadata(html_path, "https://example.com/conditions/adhd", "conditions")

    assert "ADHD symptoms" in metadata.meta_description


def test_extract_page_metadata_handles_missing_h1_gracefully(tmp_path):
    html_dir = tmp_path / "conditions"
    html_dir.mkdir()
    html_path = _write_html(html_dir, "noh1", "<html><body><h2>Section</h2></body></html>")

    svc = AnalysisService(raw_dir=tmp_path, output_path=tmp_path / "model.md")
    metadata = svc.extract_page_metadata(html_path, "https://example.com/conditions/noh1", "conditions")

    assert metadata.h1 == ""


def test_extract_page_metadata_counts_words(tmp_path):
    html_dir = tmp_path / "conditions"
    html_dir.mkdir()
    html_path = _write_html(html_dir, "adhd")

    svc = AnalysisService(raw_dir=tmp_path, output_path=tmp_path / "model.md")
    metadata = svc.extract_page_metadata(html_path, "https://example.com/conditions/adhd", "conditions")

    assert metadata.word_count > 0


def test_extract_page_metadata_captures_internal_links(tmp_path):
    html_dir = tmp_path / "conditions"
    html_dir.mkdir()
    html_path = _write_html(html_dir, "adhd")

    svc = AnalysisService(raw_dir=tmp_path, output_path=tmp_path / "model.md")
    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(svc, "_base_url", "https://example.com")
        metadata = svc.extract_page_metadata(html_path, "https://example.com/conditions/adhd", "conditions")

    assert any("therapies/cbt" in link for link in metadata.internal_links)


# ---------------------------------------------------------------------------
# extract_visible_text
# ---------------------------------------------------------------------------


def test_extract_visible_text_strips_scripts_and_styles(tmp_path):
    from bs4 import BeautifulSoup
    html = "<html><body><script>alert(1)</script><p>Hello</p><style>.x{}</style></body></html>"
    soup = BeautifulSoup(html, "lxml")
    svc = AnalysisService(raw_dir=tmp_path, output_path=tmp_path / "model.md")
    text = svc.extract_visible_text(soup)
    assert "alert" not in text
    assert "Hello" in text


def test_extract_visible_text_strips_nav_and_footer(tmp_path):
    from bs4 import BeautifulSoup
    html = "<html><body><nav>Nav content</nav><main><p>Main content</p></main><footer>Footer</footer></body></html>"
    soup = BeautifulSoup(html, "lxml")
    svc = AnalysisService(raw_dir=tmp_path, output_path=tmp_path / "model.md")
    text = svc.extract_visible_text(soup)
    assert "Nav content" not in text
    assert "Footer" not in text
    assert "Main content" in text


# ---------------------------------------------------------------------------
# extract_relationships
# ---------------------------------------------------------------------------


def _make_page(url: str, category: str, slug: str, internal_links: list[str] | None = None) -> PageMetadata:
    return PageMetadata(
        url=url,
        slug=slug,
        category=category,
        title=f"{slug} title",
        h1=slug,
        internal_links=internal_links or [],
    )


def test_extract_relationships_identifies_cross_page_links(tmp_path):
    adhd = _make_page(
        "https://example.com/conditions/adhd",
        "conditions",
        "adhd",
        internal_links=["https://example.com/therapies/cbt"],
    )
    cbt = _make_page("https://example.com/therapies/cbt", "therapies", "cbt")
    svc = AnalysisService(raw_dir=tmp_path, output_path=tmp_path / "model.md")
    rels = svc.extract_relationships([adhd, cbt], "https://example.com")

    assert len(rels) == 1
    assert rels[0].from_category == "conditions"
    assert rels[0].to_category == "therapies"


def test_extract_relationships_excludes_self_links(tmp_path):
    adhd = _make_page(
        "https://example.com/conditions/adhd",
        "conditions",
        "adhd",
        internal_links=["https://example.com/conditions/adhd"],
    )
    svc = AnalysisService(raw_dir=tmp_path, output_path=tmp_path / "model.md")
    rels = svc.extract_relationships([adhd], "https://example.com")
    assert rels == []


def test_extract_relationships_excludes_links_to_unknown_pages(tmp_path):
    adhd = _make_page(
        "https://example.com/conditions/adhd",
        "conditions",
        "adhd",
        internal_links=["https://example.com/about"],
    )
    svc = AnalysisService(raw_dir=tmp_path, output_path=tmp_path / "model.md")
    rels = svc.extract_relationships([adhd], "https://example.com")
    assert rels == []


# ---------------------------------------------------------------------------
# run()
# ---------------------------------------------------------------------------


def test_run_raises_analysis_error_when_raw_dir_missing(tmp_path):
    svc = AnalysisService(raw_dir=tmp_path / "nonexistent", output_path=tmp_path / "model.md")
    with pytest.raises(AnalysisError, match="does not exist"):
        svc.run()


def test_run_raises_analysis_error_when_no_html_files(tmp_path):
    raw_dir = tmp_path / "raw"
    raw_dir.mkdir()
    svc = AnalysisService(raw_dir=raw_dir, output_path=tmp_path / "model.md")
    with pytest.raises(AnalysisError, match="No .html files"):
        svc.run()


def test_run_writes_content_model_md(tmp_path):
    raw_dir = tmp_path / "raw"
    (raw_dir / "conditions").mkdir(parents=True)
    (raw_dir / "therapies").mkdir(parents=True)
    _write_html(raw_dir / "conditions", "adhd")
    _write_html(raw_dir / "therapies", "cbt", "<html><head><title>CBT</title></head><body><h1>CBT</h1></body></html>")

    output_path = tmp_path / "model.md"
    svc = AnalysisService(raw_dir=raw_dir, output_path=output_path)

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(svc, "_base_url", "https://example.com")
        result = svc.run()

    assert result == output_path
    assert output_path.exists()
    content = output_path.read_text(encoding="utf-8")
    assert "# Phase 1 Content Model" in content
    assert "## Conditions Pages" in content
    assert "## Therapies Pages" in content
    assert "## Cross-Page Relationships" in content


def test_run_includes_summary_counts(tmp_path):
    raw_dir = tmp_path / "raw"
    (raw_dir / "conditions").mkdir(parents=True)
    _write_html(raw_dir / "conditions", "adhd")
    _write_html(raw_dir / "conditions", "autism")

    output_path = tmp_path / "model.md"
    svc = AnalysisService(raw_dir=raw_dir, output_path=output_path)

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(svc, "_base_url", "https://example.com")
        svc.run()

    content = output_path.read_text(encoding="utf-8")
    assert "| Total pages analysed | 2 |" in content
    assert "| Conditions pages | 2 |" in content
