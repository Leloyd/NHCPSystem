from __future__ import annotations

from pathlib import Path
from typing import Any

from flask import current_app, render_template, session, url_for

from exhibits_content.service import resolve_local_upload_image_url
from online_gallery_repository import (
    get_online_gallery_item_by_id,
    list_active_online_gallery_categories,
    list_all_online_gallery_categories,
    list_all_online_gallery_items,
    list_published_online_gallery_items,
)
from supabase_client import SupabaseConfigError, is_supabase_configured
from upload_paths import get_legacy_public_upload_dir

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ONLINE_GALLERY_UPLOAD_DIR = get_legacy_public_upload_dir("online-gallery")
ONLINE_GALLERY_DEFAULT_CATEGORIES = [
    "Mga Rehiyunal na Kaugalian (Regional Customs)",
    "Mga Paniniwala sa Buong Bansa (Beliefs Across the Nation)",
    "Kasaysayan (History)",
    "Materyales (Materials)",
]
ONLINE_GALLERY_DEFAULT_CATEGORY_SLUGS = {
    "mga-rehiyunal-na-kaugalian-regional-customs": "Mga Rehiyunal na Kaugalian (Regional Customs)",
    "mga-paniniwala-sa-buong-bansa-beliefs-across-the-nation": "Mga Paniniwala sa Buong Bansa (Beliefs Across the Nation)",
    "kasaysayan-history": "Kasaysayan (History)",
    "materyales-materials": "Materyales (Materials)",
}


def resolve_online_gallery_image_url(image_filename: Any) -> str | None:
    return resolve_local_upload_image_url(ONLINE_GALLERY_UPLOAD_DIR, "online-gallery", image_filename)


def _prepare_tags(raw_tags: Any) -> list[str]:
    if isinstance(raw_tags, list):
        return [str(tag).strip() for tag in raw_tags if str(tag).strip()]

    if isinstance(raw_tags, str):
        return [part.strip() for part in raw_tags.split(",") if part.strip()]

    return []


def _normalize_category_name(raw_value: Any, categories_by_id: dict[int, str]) -> str:
    if isinstance(raw_value, int):
        return categories_by_id.get(raw_value, "")

    try:
        numeric_id = int(raw_value)
    except (TypeError, ValueError):
        numeric_id = None

    if numeric_id is not None:
        return categories_by_id.get(numeric_id, "")

    raw_text = str(raw_value or "").strip()
    if raw_text in ONLINE_GALLERY_DEFAULT_CATEGORIES:
        return raw_text
    return ONLINE_GALLERY_DEFAULT_CATEGORY_SLUGS.get(raw_text.lower(), raw_text)


def prepare_online_gallery_item(item: dict[str, Any] | None, *, categories_by_id: dict[int, str] | None = None) -> dict[str, Any]:
    prepared = dict(item or {})
    categories_by_id = categories_by_id or {}

    category_name = _normalize_category_name(prepared.get("category_id"), categories_by_id)
    prepared["category"] = category_name
    prepared["year"] = str(prepared.get("year_label") or "").strip()
    prepared["tags"] = _prepare_tags(prepared.get("tags"))
    prepared["image_url"] = resolve_online_gallery_image_url(prepared.get("image_filename"))
    prepared["teaching_note"] = str(prepared.get("teaching_note") or "").strip()
    prepared["title_tl"] = str(prepared.get("title_tl") or "").strip()
    prepared["location_tl"] = str(prepared.get("location_tl") or "").strip()
    prepared["short_caption_tl"] = str(prepared.get("short_caption_tl") or "").strip()
    prepared["full_description_tl"] = str(prepared.get("full_description_tl") or "").strip()
    return prepared


def prepare_online_gallery_items(items: list[dict[str, Any]] | None, *, categories_by_id: dict[int, str] | None = None) -> list[dict[str, Any]]:
    return [prepare_online_gallery_item(item, categories_by_id=categories_by_id) for item in list(items or [])]


def _build_categories_by_id(categories: list[dict[str, Any]]) -> dict[int, str]:
    mapping: dict[int, str] = {}
    for category in categories:
        try:
            key = int(category.get("id"))
        except (TypeError, ValueError):
            continue
        value = str(category.get("display_name") or "").strip()
        if value:
            mapping[key] = value
    return mapping


def load_public_online_gallery_categories() -> list[dict[str, Any]]:
    if not is_supabase_configured():
        return []

    try:
        return list_active_online_gallery_categories()
    except SupabaseConfigError:
        current_app.logger.warning("Supabase online gallery categories integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        current_app.logger.exception("Failed to load online gallery categories from Supabase: %s", exc)

    return []


def load_admin_online_gallery_categories() -> list[dict[str, Any]]:
    if not is_supabase_configured():
        return []

    try:
        return list_all_online_gallery_categories()
    except SupabaseConfigError:
        current_app.logger.warning("Supabase online gallery categories integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        current_app.logger.exception("Failed to load admin online gallery categories from Supabase: %s", exc)

    return []


def load_public_online_gallery_items() -> list[dict[str, Any]]:
    if not is_supabase_configured():
        return []

    try:
        categories = list_active_online_gallery_categories()
        categories_by_id = _build_categories_by_id(categories)
        return prepare_online_gallery_items(list_published_online_gallery_items(), categories_by_id=categories_by_id)
    except SupabaseConfigError:
        current_app.logger.warning("Supabase online gallery integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        current_app.logger.exception("Failed to load online gallery items from Supabase: %s", exc)

    return []


def load_admin_online_gallery_items() -> list[dict[str, Any]]:
    if not is_supabase_configured():
        return []

    try:
        categories = list_all_online_gallery_categories()
        categories_by_id = _build_categories_by_id(categories)
        return prepare_online_gallery_items(list_all_online_gallery_items(), categories_by_id=categories_by_id)
    except SupabaseConfigError:
        current_app.logger.warning("Supabase online gallery integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        current_app.logger.exception("Failed to load admin online gallery items from Supabase: %s", exc)

    return []


def load_admin_online_gallery_item(item_id: int) -> dict[str, Any] | None:
    if not is_supabase_configured():
        return None

    try:
        categories = list_all_online_gallery_categories()
        categories_by_id = _build_categories_by_id(categories)
        item = get_online_gallery_item_by_id(item_id)
        if item is None:
            return None
        return prepare_online_gallery_item(item, categories_by_id=categories_by_id)
    except SupabaseConfigError:
        current_app.logger.warning("Supabase online gallery integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        current_app.logger.exception("Failed to load admin online gallery item '%s' from Supabase: %s", item_id, exc)

    return None


def build_online_gallery_form_state(source: dict[str, Any] | None = None, *, categories: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    source = source or {}
    categories = list(categories or [])
    valid_category_ids = {str(category.get("id")) for category in categories}
    category_id = str(source.get("category_id") or "").strip()
    if category_id not in valid_category_ids and categories:
        category_id = str(categories[0].get("id"))

    return {
        "title": str(source.get("title") or "").strip(),
        "title_tl": str(source.get("title_tl") or "").strip(),
        "period": str(source.get("period") or "").strip(),
        "year_label": str(source.get("year_label") or source.get("year") or "").strip(),
        "category_id": category_id,
        "source": str(source.get("source") or "").strip(),
        "location": str(source.get("location") or "").strip(),
        "location_tl": str(source.get("location_tl") or "").strip(),
        "short_caption": str(source.get("short_caption") or "").strip(),
        "short_caption_tl": str(source.get("short_caption_tl") or "").strip(),
        "full_description": str(source.get("full_description") or "").strip(),
        "full_description_tl": str(source.get("full_description_tl") or "").strip(),
        "teaching_note": str(source.get("teaching_note") or "").strip(),
        "tags_text": ", ".join(_prepare_tags(source.get("tags") if source.get("tags") is not None else source.get("tags_text"))),
        "sort_order": str(source.get("sort_order") or "0").strip() or "0",
        "is_published": bool(source.get("is_published")),
        "image_filename": str(source.get("image_filename") or "").strip(),
        "image_url": source.get("image_url"),
    }


def get_online_gallery_status_message(status_key: Any) -> str | None:
    mapping = {
        "created": "Online gallery card created successfully.",
        "updated": "Online gallery card updated successfully.",
        "deleted": "Online gallery card deleted successfully.",
    }
    return mapping.get(str(status_key or "").strip().lower())


def render_admin_online_gallery_form(
    *,
    ensure_admin_csrf_token,
    admin_session_user_key: str,
    admin_username: str,
    form_title: str,
    submit_label: str,
    form_action: str,
    gallery_form: dict[str, Any],
    categories: list[dict[str, Any]],
    error_message: str | None = None,
):
    csrf_token = ensure_admin_csrf_token()
    current_admin_username = session.get(admin_session_user_key, admin_username)
    return render_template(
        "admin/AdminOnlineGalleryForm.html",
        csrf_token=csrf_token,
        admin_username=current_admin_username,
        form_title=form_title,
        submit_label=submit_label,
        form_action=form_action,
        gallery_form=gallery_form,
        categories=categories,
        error_message=error_message,
    )
