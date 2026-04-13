from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any, Callable

from flask import current_app, render_template, session, url_for

from exhibits_repository import get_exhibit_by_id, get_published_exhibit_by_slug, list_all_exhibits, list_published_exhibits
from supabase_client import SupabaseConfigError, is_supabase_configured

PROJECT_ROOT = Path(__file__).resolve().parent.parent
EXHIBITS_UPLOAD_DIR = (PROJECT_ROOT / "static" / "uploads" / "exhibits").resolve()


def format_exhibit_date(raw_value: Any) -> str:
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


def resolve_exhibit_image_url(image_filename: Any) -> str | None:
    return resolve_local_upload_image_url(EXHIBITS_UPLOAD_DIR, "exhibits", image_filename)


def prepare_exhibit_item(item: dict[str, Any] | None) -> dict[str, Any]:
    prepared = dict(item or {})
    prepared["display_date"] = format_exhibit_date(prepared.get("event_date"))
    prepared["detail_url"] = url_for("current_exhibits_news_detail", slug=prepared.get("slug", ""))
    prepared["image_url"] = resolve_exhibit_image_url(prepared.get("image_filename"))
    return prepared


def prepare_exhibit_items(items: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    return [prepare_exhibit_item(item) for item in list(items or [])]


def load_landing_exhibits(limit: int | None = None) -> list[dict[str, Any]]:
    if not is_supabase_configured():
        return []

    try:
        return prepare_exhibit_items(list_published_exhibits(limit=limit))
    except SupabaseConfigError:
        current_app.logger.warning("Supabase exhibits integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        current_app.logger.exception("Failed to load exhibits from Supabase: %s", exc)

    return []


def load_published_exhibit(slug: str) -> dict[str, Any] | None:
    if not is_supabase_configured():
        return None

    try:
        exhibit_item = get_published_exhibit_by_slug(slug)
        if exhibit_item is None:
            return None
        return prepare_exhibit_item(exhibit_item)
    except SupabaseConfigError:
        current_app.logger.warning("Supabase exhibits integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        current_app.logger.exception("Failed to load exhibit '%s' from Supabase: %s", slug, exc)

    return None


def load_admin_exhibits() -> list[dict[str, Any]]:
    if not is_supabase_configured():
        return []

    try:
        return prepare_exhibit_items(list_all_exhibits())
    except SupabaseConfigError:
        current_app.logger.warning("Supabase exhibits integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        current_app.logger.exception("Failed to load admin exhibits from Supabase: %s", exc)

    return []


def load_admin_exhibit(exhibit_id: int) -> dict[str, Any] | None:
    if not is_supabase_configured():
        return None

    try:
        exhibit_item = get_exhibit_by_id(exhibit_id)
        if exhibit_item is None:
            return None
        return prepare_exhibit_item(exhibit_item)
    except SupabaseConfigError:
        current_app.logger.warning("Supabase exhibits integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        current_app.logger.exception("Failed to load admin exhibit '%s' from Supabase: %s", exhibit_id, exc)

    return None


def build_unique_exhibit_slug(title: str, *, current_id: int | None, slugify_text: Callable[[str, str], str]) -> str:
    base_slug = slugify_text(title, fallback="exhibit")
    try:
        existing_items = list_all_exhibits() if is_supabase_configured() else []
    except Exception:
        existing_items = []

    existing_slugs = {
        str(item.get("slug") or "").strip().lower()
        for item in existing_items
        if item.get("id") != current_id
    }

    slug = base_slug
    counter = 2
    while slug in existing_slugs:
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


def build_exhibit_form_state(source: dict[str, Any] | None = None) -> dict[str, Any]:
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


def get_exhibits_status_message(status_key: Any) -> str | None:
    mapping = {
        "created": "Exhibit card created successfully.",
        "updated": "Exhibit card updated successfully.",
        "deleted": "Exhibit card deleted successfully.",
    }
    return mapping.get(str(status_key or "").strip().lower())


def render_admin_exhibit_form(
    *,
    ensure_admin_csrf_token,
    admin_session_user_key: str,
    admin_username: str,
    form_title: str,
    submit_label: str,
    form_action: str,
    exhibit_form: dict[str, Any],
    error_message: str | None = None,
):
    csrf_token = ensure_admin_csrf_token()
    current_admin_username = session.get(admin_session_user_key, admin_username)
    return render_template(
        "admin/AdminExhibitForm.html",
        csrf_token=csrf_token,
        admin_username=current_admin_username,
        form_title=form_title,
        submit_label=submit_label,
        form_action=form_action,
        exhibit_form=exhibit_form,
        error_message=error_message,
    )
