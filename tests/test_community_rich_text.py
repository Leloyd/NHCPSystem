from community_content.rich_text import (
    community_rich_text_plain_text,
    sanitize_community_rich_text,
)


def test_plain_text_becomes_paragraphs_and_preserves_line_breaks():
    result = sanitize_community_rich_text("First line\nSecond line\n\nAnother paragraph")

    assert result == "<p>First line<br>Second line</p><p>Another paragraph</p>"


def test_supported_formatting_and_alignment_are_preserved():
    result = sanitize_community_rich_text(
        '<h2 style="text-align: center">Heading</h2>'
        '<p><b>Bold</b> and <i>italic</i></p>'
        '<ul><li>First item</li></ul>'
    )

    assert '<h2 class="community-rich-text__align-center">Heading</h2>' in result
    assert "<strong>Bold</strong>" in result
    assert "<em>italic</em>" in result
    assert "<ul><li>First item</li></ul>" in result


def test_newlines_survive_when_description_contains_inline_formatting():
    result = sanitize_community_rich_text(
        "To <strong>help</strong> improve coordination.\n\n"
        "This advisory supports visitors."
    )

    assert result == (
        "<p>To <strong>help</strong> improve coordination.<br><br>"
        "This advisory supports visitors.</p>"
    )


def test_scripts_event_handlers_and_unsafe_links_are_removed():
    result = sanitize_community_rich_text(
        '<p onclick="alert(1)">Safe text</p>'
        '<script>alert(2)</script>'
        '<a href="javascript:alert(3)" style="color:red">Bad link</a>'
        '<a href="https://example.com" target="_blank">Good link</a>'
    )

    assert "onclick" not in result
    assert "script" not in result
    assert "alert(2)" not in result
    assert "javascript:" not in result
    assert "color:red" not in result
    assert '<a href="https://example.com">Good link</a>' in result


def test_plain_text_extraction_ignores_markup_and_keeps_word_boundaries():
    rich_text = "<h2>Community Day</h2><p>Preserving <strong>local memory</strong>.</p>"

    assert community_rich_text_plain_text(rich_text) == "Community Day Preserving local memory."
