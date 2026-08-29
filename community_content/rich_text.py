from __future__ import annotations

import html
import re
from html.parser import HTMLParser
from urllib.parse import urlsplit


COMMUNITY_RICH_TEXT_MAX_LENGTH = 50_000

_BLOCK_TAGS = {"p", "h2", "h3", "h4", "blockquote", "ul", "ol", "li"}
_TAG_ALIASES = {
    "b": "strong",
    "i": "em",
    "strike": "s",
    "div": "p",
}
_ALLOWED_TAGS = _BLOCK_TAGS | {"br", "strong", "em", "u", "s", "a"}
_DROP_WITH_CONTENT = {"script", "style", "iframe", "object", "embed", "svg", "math", "template"}
_ALIGNMENT_CLASSES = {
    "left": "community-rich-text__align-left",
    "center": "community-rich-text__align-center",
    "right": "community-rich-text__align-right",
    "justify": "community-rich-text__align-justify",
}
_RICH_TAG_PATTERN = re.compile(
    r"<\s*/?\s*(?:p|div|br|strong|b|em|i|u|s|strike|h2|h3|h4|blockquote|ul|ol|li|a)(?:\s|/?>)",
    re.IGNORECASE,
)
_TEXT_ALIGN_PATTERN = re.compile(r"(?:^|;)\s*text-align\s*:\s*(left|center|right|justify)\s*(?:;|$)", re.IGNORECASE)


def _safe_link(raw_value: str) -> str:
    value = "".join(character for character in str(raw_value or "").strip() if ord(character) >= 32)
    if not value:
        return ""
    if value.startswith("#") or (value.startswith("/") and not value.startswith("//")):
        return value

    try:
        parsed = urlsplit(value)
    except ValueError:
        return ""
    return value if parsed.scheme.lower() in {"http", "https", "mailto"} else ""


def _alignment_class(attributes: dict[str, str]) -> str:
    alignment = str(attributes.get("align") or "").strip().lower()
    if not alignment:
        match = _TEXT_ALIGN_PATTERN.search(str(attributes.get("style") or ""))
        alignment = match.group(1).lower() if match else ""
    return _ALIGNMENT_CLASSES.get(alignment, "")


class _CommunityRichTextSanitizer(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.output: list[str] = []
        self.open_tags: list[str] = []
        self.suppressed_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        normalized_tag = str(tag or "").lower()
        if self.suppressed_depth:
            if normalized_tag in _DROP_WITH_CONTENT:
                self.suppressed_depth += 1
            return
        if normalized_tag in _DROP_WITH_CONTENT:
            self.suppressed_depth = 1
            return

        normalized_tag = _TAG_ALIASES.get(normalized_tag, normalized_tag)
        if normalized_tag not in _ALLOWED_TAGS:
            return
        if normalized_tag == "br":
            self.output.append("<br>")
            return

        attributes = {str(key or "").lower(): str(value or "") for key, value in attrs}
        safe_attributes: list[str] = []
        if normalized_tag in _BLOCK_TAGS:
            class_name = _alignment_class(attributes)
            if class_name:
                safe_attributes.append(f'class="{class_name}"')
        elif normalized_tag == "a":
            href = _safe_link(attributes.get("href", ""))
            if href:
                safe_attributes.append(f'href="{html.escape(href, quote=True)}"')

        suffix = f" {' '.join(safe_attributes)}" if safe_attributes else ""
        self.output.append(f"<{normalized_tag}{suffix}>")
        self.open_tags.append(normalized_tag)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        normalized_tag = _TAG_ALIASES.get(str(tag or "").lower(), str(tag or "").lower())
        if normalized_tag != "br":
            self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        normalized_tag = str(tag or "").lower()
        if self.suppressed_depth:
            if normalized_tag in _DROP_WITH_CONTENT:
                self.suppressed_depth -= 1
            return

        normalized_tag = _TAG_ALIASES.get(normalized_tag, normalized_tag)
        if normalized_tag not in self.open_tags:
            return
        while self.open_tags:
            open_tag = self.open_tags.pop()
            self.output.append(f"</{open_tag}>")
            if open_tag == normalized_tag:
                break

    def handle_data(self, data: str) -> None:
        if not self.suppressed_depth:
            self.output.append(html.escape(str(data or ""), quote=False))

    def handle_comment(self, data: str) -> None:
        return

    def sanitized_html(self) -> str:
        while self.open_tags:
            self.output.append(f"</{self.open_tags.pop()}>")
        return "".join(self.output).strip()


class _CommunityRichTextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.output: list[str] = []
        self.suppressed_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        normalized_tag = str(tag or "").lower()
        if self.suppressed_depth:
            if normalized_tag in _DROP_WITH_CONTENT:
                self.suppressed_depth += 1
            return
        if normalized_tag in _DROP_WITH_CONTENT:
            self.suppressed_depth = 1
        elif normalized_tag == "br":
            self.output.append("\n")

    def handle_endtag(self, tag: str) -> None:
        normalized_tag = str(tag or "").lower()
        if self.suppressed_depth:
            if normalized_tag in _DROP_WITH_CONTENT:
                self.suppressed_depth -= 1
            return
        normalized_tag = _TAG_ALIASES.get(normalized_tag, normalized_tag)
        if normalized_tag in _BLOCK_TAGS:
            self.output.append("\n")

    def handle_data(self, data: str) -> None:
        if not self.suppressed_depth:
            self.output.append(str(data or ""))


def sanitize_community_rich_text(value: object) -> str:
    raw_value = str(value or "").strip()
    if not raw_value:
        return ""

    if not _RICH_TAG_PATTERN.search(raw_value):
        paragraphs = []
        for paragraph in re.split(r"\n\s*\n", raw_value):
            escaped_paragraph = html.escape(paragraph.strip(), quote=False).replace("\n", "<br>")
            if escaped_paragraph:
                paragraphs.append(f"<p>{escaped_paragraph}</p>")
        return "".join(paragraphs)

    parser = _CommunityRichTextSanitizer()
    parser.feed(raw_value)
    parser.close()
    return parser.sanitized_html()


def community_rich_text_plain_text(value: object) -> str:
    parser = _CommunityRichTextExtractor()
    parser.feed(str(value or ""))
    parser.close()
    return re.sub(r"\s+", " ", "".join(parser.output)).strip()
