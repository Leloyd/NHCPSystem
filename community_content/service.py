from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

from flask import current_app, render_template, session, url_for

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
from upload_paths import get_legacy_public_upload_dir, resolve_existing_public_upload_path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
COMMUNITY_HIGHLIGHTS_UPLOAD_DIR = get_legacy_public_upload_dir("community-highlights")
COMMUNITY_EVENTS_UPLOAD_DIR = get_legacy_public_upload_dir("events")
COMMUNITY_HIGHLIGHT_CATEGORIES = (
    "Education Program",
    "Community Activity",
    "Public Advisory",
)


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

    candidate_path = resolve_existing_public_upload_path(upload_folder_name, safe_filename)
    if candidate_path is None:
        return None

    return url_for("public_uploaded_file", upload_folder=upload_folder_name, filename=safe_filename)


def prepare_community_highlight_item(item: dict[str, Any] | None) -> dict[str, Any]:
    prepared = dict(item or {})
    prepared["display_date"] = format_community_date(prepared.get("event_date"))
    prepared["detail_url"] = url_for("community_highlight_detail", slug=prepared.get("slug", ""))
    prepared["image_url"] = resolve_local_upload_image_url(
        COMMUNITY_HIGHLIGHTS_UPLOAD_DIR,
        "community-highlights",
        prepared.get("image_filename"),
    )
    prepared["category"] = str(prepared.get("category") or COMMUNITY_HIGHLIGHT_CATEGORIES[0]).strip() or COMMUNITY_HIGHLIGHT_CATEGORIES[0]
    return prepared


def prepare_community_highlight_items(items: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    return [prepare_community_highlight_item(item) for item in list(items or [])]


def prepare_community_event_item(item: dict[str, Any] | None) -> dict[str, Any]:
    prepared = dict(item or {})
    prepared["display_date"] = format_community_date(prepared.get("event_date"))
    prepared["detail_url"] = url_for("community_event_detail", slug=prepared.get("slug", ""))
    prepared["image_url"] = resolve_local_upload_image_url(
        COMMUNITY_EVENTS_UPLOAD_DIR,
        "events",
        prepared.get("image_filename"),
    )
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
    return {
        "title": str(source.get("title") or "").strip(),
        "category": raw_category if raw_category in COMMUNITY_HIGHLIGHT_CATEGORIES else COMMUNITY_HIGHLIGHT_CATEGORIES[0],
        "event_date": str(source.get("event_date") or "").strip(),
        "short_description": str(source.get("short_description") or "").strip(),
        "long_description": str(source.get("long_description") or "").strip(),
        "is_published": bool(source.get("is_published")),
        "image_filename": str(source.get("image_filename") or "").strip(),
        "image_url": source.get("image_url"),
    }


def build_community_event_form_state(source: dict[str, Any] | None = None) -> dict[str, Any]:
    source = source or {}
    return {
        "title": str(source.get("title") or "").strip(),
        "event_date": str(source.get("event_date") or "").strip(),
        "short_description": str(source.get("short_description") or "").strip(),
        "long_description": str(source.get("long_description") or "").strip(),
        "is_published": bool(source.get("is_published")),
        "image_filename": str(source.get("image_filename") or "").strip(),
        "image_url": source.get("image_url"),
    }


def get_community_highlights_status_message(status_key: Any) -> str | None:
    mapping = {
        "created": "Community highlight created successfully.",
        "updated": "Community highlight updated successfully.",
        "deleted": "Community highlight deleted successfully.",
    }
    return mapping.get(str(status_key or "").strip().lower())


def get_community_events_status_message(status_key: Any) -> str | None:
    mapping = {
        "created": "Event card created successfully.",
        "updated": "Event card updated successfully.",
        "deleted": "Event card deleted successfully.",
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
        error_message=error_message,
    )
