from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

from flask import current_app, render_template, session, url_for

from supabase_storage import is_storage_object_path, resolve_public_image_url
from community_events_repository import (
    get_community_event_by_id,
    get_published_community_event_by_slug,
    list_all_community_events,
    list_published_community_events,
)
from community_highlights_repository import (
    get_community_highlight_by_id,
    get_published_community_highlight_by_slug,
    list_all_community_highlights,
    list_published_community_highlights,
)
from supabase_client import SupabaseConfigError, is_supabase_configured

PROJECT_ROOT = Path(__file__).resolve().parent.parent
COMMUNITY_HIGHLIGHTS_UPLOAD_DIR = (PROJECT_ROOT / "static" / "uploads" / "community-highlights").resolve()
COMMUNITY_EVENTS_UPLOAD_DIR = (PROJECT_ROOT / "static" / "uploads" / "events").resolve()
COMMUNITY_HIGHLIGHTS_STORAGE_PREFIX = "community-highlights"
COMMUNITY_EVENTS_STORAGE_PREFIX = "events"
COMMUNITY_HIGHLIGHT_CATEGORIES = (
    "Museum Programs",
    "School Engagement",
    "Public Activity",
    "Public Advisory",
)
COMMUNITY_HIGHLIGHT_STATUS_OPTIONS = (
    "active",
    "draft",
    "archived",
)
COMMUNITY_EVENT_CATEGORIES = (
    "Booked Tour (former Orientation)",
    "Community Gathering",
    "Student Activity",
    "Heritage Session",
    "Workshop",
)
COMMUNITY_EVENT_STATUS_OPTIONS = (
    "active",
    "draft",
    "archived",
)
COMMUNITY_HIGHLIGHT_CATEGORY_STYLES = {
    "Museum Programs": {"color": "#1E3A5F", "bg": "rgba(30, 58, 95, 0.1)"},
    "School Engagement": {"color": "#C5973A", "bg": "rgba(197, 151, 58, 0.1)"},
    "Public Activity": {"color": "#16A34A", "bg": "rgba(22, 163, 74, 0.1)"},
    "Public Advisory": {"color": "#DC2626", "bg": "rgba(220, 38, 38, 0.08)"},
}
COMMUNITY_EVENT_CATEGORY_STYLES = {
    "Booked Tour (former Orientation)": {"color": "#1E3A5F", "bg": "rgba(30, 58, 95, 0.1)"},
    "Community Gathering": {"color": "#16A34A", "bg": "rgba(22, 163, 74, 0.1)"},
    "Student Activity": {"color": "#C5973A", "bg": "rgba(197, 151, 58, 0.1)"},
    "Heritage Session": {"color": "#7C3AED", "bg": "rgba(124, 58, 237, 0.1)"},
    "Workshop": {"color": "#DC2626", "bg": "rgba(220, 38, 38, 0.08)"},
}


def format_community_date(raw_value: Any) -> str:
    raw_text = str(raw_value or "").strip()
    if not raw_text:
        return "Date unavailable"

    try:
        parsed = datetime.fromisoformat(raw_text.replace("Z", "+00:00"))
    except ValueError:
        try:
            parsed = datetime.strptime(raw_text, "%Y-%m-%d")
        except ValueError:
            return raw_text

    return parsed.strftime("%B %d, %Y")


def resolve_local_upload_image_url(upload_dir: Path, upload_folder_name: str, image_filename: Any) -> str | None:
    safe_filename = Path(str(image_filename or "")).name.strip()
    if not safe_filename:
        return None

    candidate_path = (upload_dir / safe_filename).resolve()
    if upload_dir not in candidate_path.parents and candidate_path != upload_dir:
        return None
    if not candidate_path.exists() or not candidate_path.is_file():
        return None

    return url_for("static", filename=f"uploads/{upload_folder_name}/{safe_filename}")


def resolve_community_upload_image_url(image_filename: Any, *, upload_dir: Path, upload_folder_name: str, storage_prefix: str) -> str | None:
    normalized_value = str(image_filename or "").strip()
    if not normalized_value:
        return None

    if normalized_value.startswith(("http://", "https://")):
        return normalized_value

    if is_storage_object_path(normalized_value, folder_prefix=storage_prefix):
        remote_url = resolve_public_image_url(normalized_value)
        if remote_url:
            return remote_url

    static_upload_prefix = f"uploads/{upload_folder_name}/"
    normalized_static_path = normalized_value.lstrip("/")
    if normalized_static_path.startswith(static_upload_prefix):
        return url_for("static", filename=normalized_static_path)

    return resolve_local_upload_image_url(upload_dir, upload_folder_name, normalized_value)


def prepare_community_highlight_item(item: dict[str, Any] | None) -> dict[str, Any]:
    prepared = dict(item or {})
    raw_status = str(prepared.get("status") or "").strip().lower()
    status = raw_status if raw_status in COMMUNITY_HIGHLIGHT_STATUS_OPTIONS else ("active" if prepared.get("is_published") else "draft")
    category = str(prepared.get("category") or COMMUNITY_HIGHLIGHT_CATEGORIES[0]).strip() or COMMUNITY_HIGHLIGHT_CATEGORIES[0]
    category_style = COMMUNITY_HIGHLIGHT_CATEGORY_STYLES.get(category, COMMUNITY_HIGHLIGHT_CATEGORY_STYLES[COMMUNITY_HIGHLIGHT_CATEGORIES[0]])
    word_count = len(str(prepared.get("long_description") or "").split())
    estimated_read_minutes = max(1, round(word_count / 180))
    prepared["display_date"] = format_community_date(prepared.get("event_date"))
    prepared["detail_url"] = url_for("community_highlight_detail", slug=prepared.get("slug", ""))
    prepared["image_url"] = resolve_community_upload_image_url(
        prepared.get("image_filename"),
        upload_dir=COMMUNITY_HIGHLIGHTS_UPLOAD_DIR,
        upload_folder_name="community-highlights",
        storage_prefix=COMMUNITY_HIGHLIGHTS_STORAGE_PREFIX,
    )
    prepared["category"] = category
    prepared["category_color"] = category_style["color"]
    prepared["category_bg"] = category_style["bg"]
    prepared["status"] = status
    prepared["short_description_tl"] = str(prepared.get("short_description_tl") or "").strip()
    prepared["long_description_tl"] = str(prepared.get("long_description_tl") or "").strip()
    prepared["is_featured"] = bool(prepared.get("is_featured")) and status == "active"
    prepared["estimated_read_minutes"] = estimated_read_minutes
    prepared["estimated_read_label"] = f"{estimated_read_minutes} min read"
    return prepared


def prepare_community_highlight_items(items: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    return [prepare_community_highlight_item(item) for item in list(items or [])]


def prepare_community_event_item(item: dict[str, Any] | None) -> dict[str, Any]:
    prepared = dict(item or {})
    raw_status = str(prepared.get("status") or "").strip().lower()
    status = raw_status if raw_status in COMMUNITY_EVENT_STATUS_OPTIONS else ("active" if prepared.get("is_published") else "draft")
    category = str(prepared.get("category") or COMMUNITY_EVENT_CATEGORIES[0]).strip() or COMMUNITY_EVENT_CATEGORIES[0]
    category_style = COMMUNITY_EVENT_CATEGORY_STYLES.get(category, COMMUNITY_EVENT_CATEGORY_STYLES[COMMUNITY_EVENT_CATEGORIES[0]])
    event_time = str(prepared.get("event_time") or "").strip()
    location = str(prepared.get("location") or "").strip()
    short_description = str(prepared.get("short_description") or "").strip()
    prepared["display_date"] = format_community_date(prepared.get("event_date"))
    prepared["detail_url"] = url_for("community_event_detail", slug=prepared.get("slug", ""))
    prepared["category"] = category
    prepared["category_color"] = category_style["color"]
    prepared["category_bg"] = category_style["bg"]
    prepared["status"] = status
    prepared["event_time"] = event_time
    prepared["location"] = location
    prepared["date"] = str(prepared.get("event_date") or "").strip()
    prepared["time"] = event_time
    prepared["description"] = short_description
    return prepared


def prepare_community_event_items(items: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    return [prepare_community_event_item(item) for item in list(items or [])]


def load_news_community_highlights(limit: int | None = None) -> list[dict[str, Any]]:
    if not is_supabase_configured():
        return []

    try:
        return prepare_community_highlight_items(list_published_community_highlights(limit=limit))
    except SupabaseConfigError:
        current_app.logger.warning("Supabase community highlights integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        current_app.logger.exception("Failed to load community highlights from Supabase: %s", exc)

    return []


def load_news_community_events(limit: int | None = None) -> list[dict[str, Any]]:
    if not is_supabase_configured():
        return []

    try:
        return prepare_community_event_items(list_published_community_events(limit=limit))
    except SupabaseConfigError:
        current_app.logger.warning("Supabase community events integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        current_app.logger.exception("Failed to load community events from Supabase: %s", exc)

    return []


def load_published_community_highlight(slug: str) -> dict[str, Any] | None:
    if not is_supabase_configured():
        return None

    try:
        highlight_item = get_published_community_highlight_by_slug(slug)
        if highlight_item is None:
            return None
        return prepare_community_highlight_item(highlight_item)
    except SupabaseConfigError:
        current_app.logger.warning("Supabase community highlights integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        current_app.logger.exception("Failed to load community highlight '%s' from Supabase: %s", slug, exc)

    return None


def load_published_community_event(slug: str) -> dict[str, Any] | None:
    if not is_supabase_configured():
        return None

    try:
        event_item = get_published_community_event_by_slug(slug)
        if event_item is None:
            return None
        return prepare_community_event_item(event_item)
    except SupabaseConfigError:
        current_app.logger.warning("Supabase community events integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        current_app.logger.exception("Failed to load community event '%s' from Supabase: %s", slug, exc)

    return None


def load_admin_community_highlights() -> list[dict[str, Any]]:
    if not is_supabase_configured():
        return []

    try:
        return prepare_community_highlight_items(list_all_community_highlights())
    except SupabaseConfigError:
        current_app.logger.warning("Supabase community highlights integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        current_app.logger.exception("Failed to load admin community highlights from Supabase: %s", exc)

    return []


def load_admin_community_highlight(highlight_id: int) -> dict[str, Any] | None:
    if not is_supabase_configured():
        return None

    try:
        highlight_item = get_community_highlight_by_id(highlight_id)
        if highlight_item is None:
            return None
        return prepare_community_highlight_item(highlight_item)
    except SupabaseConfigError:
        current_app.logger.warning("Supabase community highlights integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        current_app.logger.exception("Failed to load admin community highlight '%s' from Supabase: %s", highlight_id, exc)

    return None


def load_admin_community_events() -> list[dict[str, Any]]:
    if not is_supabase_configured():
        return []

    try:
        return prepare_community_event_items(list_all_community_events())
    except SupabaseConfigError:
        current_app.logger.warning("Supabase community events integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        current_app.logger.exception("Failed to load admin community events from Supabase: %s", exc)

    return []


def load_admin_community_event(event_id: int) -> dict[str, Any] | None:
    if not is_supabase_configured():
        return None

    try:
        event_item = get_community_event_by_id(event_id)
        if event_item is None:
            return None
        return prepare_community_event_item(event_item)
    except SupabaseConfigError:
        current_app.logger.warning("Supabase community events integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        current_app.logger.exception("Failed to load admin community event '%s' from Supabase: %s", event_id, exc)

    return None


def build_community_highlight_form_state(source: dict[str, Any] | None = None) -> dict[str, Any]:
    source = source or {}
    raw_category = str(source.get("category") or "").strip()
    raw_status = str(source.get("status") or "").strip().lower()
    return {
        "title": str(source.get("title") or "").strip(),
        "category": raw_category if raw_category in COMMUNITY_HIGHLIGHT_CATEGORIES else COMMUNITY_HIGHLIGHT_CATEGORIES[0],
        "status": raw_status if raw_status in COMMUNITY_HIGHLIGHT_STATUS_OPTIONS else "draft",
        "event_date": str(source.get("event_date") or "").strip(),
        "short_description": str(source.get("short_description") or "").strip(),
        "long_description": str(source.get("long_description") or "").strip(),
        "short_description_tl": str(source.get("short_description_tl") or "").strip(),
        "long_description_tl": str(source.get("long_description_tl") or "").strip(),
        "is_published": bool(source.get("is_published")),
        "is_featured": bool(source.get("is_featured")),
        "image_filename": str(source.get("image_filename") or "").strip(),
        "image_url": source.get("image_url"),
    }


def build_community_event_form_state(source: dict[str, Any] | None = None) -> dict[str, Any]:
    source = source or {}
    raw_category = str(source.get("category") or "").strip()
    raw_status = str(source.get("status") or "").strip().lower()
    return {
        "title": str(source.get("title") or "").strip(),
        "category": raw_category if raw_category in COMMUNITY_EVENT_CATEGORIES else COMMUNITY_EVENT_CATEGORIES[0],
        "status": raw_status if raw_status in COMMUNITY_EVENT_STATUS_OPTIONS else "draft",
        "event_date": str(source.get("event_date") or "").strip(),
        "event_time": str(source.get("event_time") or "").strip(),
        "location": str(source.get("location") or "").strip(),
        "short_description": str(source.get("short_description") or "").strip(),
        "is_published": bool(source.get("is_published")),
    }


def get_community_highlights_status_message(status_key: Any) -> str | None:
    mapping = {
        "created": "Community highlight created successfully.",
        "updated": "Community highlight updated successfully.",
        "archived": "Community highlight archived successfully.",
        "featured": "Community highlight marked as featured.",
        "unfeatured": "Community highlight removed from the featured slot.",
    }
    return mapping.get(str(status_key or "").strip().lower())


def get_community_events_status_message(status_key: Any) -> str | None:
    mapping = {
        "created": "Event card created successfully.",
        "updated": "Event card updated successfully.",
        "archived": "Event card archived successfully.",
    }
    return mapping.get(str(status_key or "").strip().lower())


def render_admin_community_highlight_form(
    *,
    ensure_admin_csrf_token,
    admin_session_user_key: str,
    admin_username: str,
    form_title: str,
    submit_label: str,
    form_action: str,
    highlight_form: dict[str, Any],
    error_message: str | None = None,
):
    csrf_token = ensure_admin_csrf_token()
    current_admin_username = session.get(admin_session_user_key, admin_username)
    return render_template(
        "admin/AdminCommunityHighlightForm.html",
        csrf_token=csrf_token,
        admin_username=current_admin_username,
        form_title=form_title,
        submit_label=submit_label,
        form_action=form_action,
        highlight_form=highlight_form,
        category_options=COMMUNITY_HIGHLIGHT_CATEGORIES,
        status_options=COMMUNITY_HIGHLIGHT_STATUS_OPTIONS,
        error_message=error_message,
    )


def render_admin_event_form(
    *,
    ensure_admin_csrf_token,
    admin_session_user_key: str,
    admin_username: str,
    form_title: str,
    submit_label: str,
    form_action: str,
    event_form: dict[str, Any],
    error_message: str | None = None,
):
    csrf_token = ensure_admin_csrf_token()
    current_admin_username = session.get(admin_session_user_key, admin_username)
    return render_template(
        "admin/AdminEventForm.html",
        csrf_token=csrf_token,
        admin_username=current_admin_username,
        form_title=form_title,
        submit_label=submit_label,
        form_action=form_action,
        event_form=event_form,
        category_options=COMMUNITY_EVENT_CATEGORIES,
        status_options=COMMUNITY_EVENT_STATUS_OPTIONS,
        error_message=error_message,
    )
