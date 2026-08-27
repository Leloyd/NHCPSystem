from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Any

from flask import current_app, render_template, session, url_for

from online_gallery_repository import (
    get_online_gallery_item_by_id,
    list_active_online_gallery_categories,
    list_all_online_gallery_categories,
    list_all_online_gallery_items,
    list_published_online_gallery_items,
)
from supabase_storage import ONLINE_GALLERY_STORAGE_PREFIX, is_storage_object_path, resolve_public_image_url
from supabase_client import SupabaseConfigError, is_supabase_configured
from media_upload_content import MEDIA_UPLOAD_MAX_BYTES

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _resolve_runtime_uploads_root() -> Path:
    configured_root = str(os.getenv("LOCAL_UPLOADS_DIR") or "").strip()
    candidate_roots = []
    if configured_root:
        candidate_roots.append(Path(configured_root))
    candidate_roots.append(PROJECT_ROOT / "static" / "uploads")
    candidate_roots.append(Path(tempfile.gettempdir()) / "nhcp-system-uploads")

    for candidate_root in candidate_roots:
        try:
            candidate_root.mkdir(parents=True, exist_ok=True)
            probe_path = candidate_root / ".upload-write-test"
            probe_path.write_text("ok", encoding="utf-8")
            probe_path.unlink(missing_ok=True)
            return candidate_root.resolve()
        except OSError:
            continue

    fallback_root = (Path(tempfile.gettempdir()) / "nhcp-system-uploads").resolve()
    fallback_root.mkdir(parents=True, exist_ok=True)
    return fallback_root


ONLINE_GALLERY_UPLOADS_ROOT = _resolve_runtime_uploads_root()
ONLINE_GALLERY_UPLOAD_DIR = (ONLINE_GALLERY_UPLOADS_ROOT / "online-gallery").resolve()
# The browser uploads media directly to Supabase before saving metadata.
ONLINE_GALLERY_UPLOAD_MAX_BYTES = MEDIA_UPLOAD_MAX_BYTES
ONLINE_GALLERY_DEFAULT_CATEGORIES = [
    "Mga Rehiyunal na Kaugalian",
    "Mga Paniniwala sa Buong Bansa",
    "Kasaysayan",
    "Materyales",
]
ONLINE_GALLERY_DEFAULT_CATEGORY_SLUGS = {
    "mga-rehiyunal-na-kaugalian-regional-customs": "Mga Rehiyunal na Kaugalian",
    "mga-paniniwala-sa-buong-bansa-beliefs-across-the-nation": "Mga Paniniwala sa Buong Bansa",
    "kasaysayan-history": "Kasaysayan",
    "materyales-materials": "Materyales",
}


def resolve_local_upload_image_url(upload_dir: Path, upload_folder_name: str, image_filename: Any) -> str | None:
    """Resolve a legacy local upload without depending on the retired exhibits module."""
    safe_filename = Path(str(image_filename or "")).name.strip()
    if not safe_filename:
        return None

    candidate_path = (upload_dir / safe_filename).resolve()
    if upload_dir not in candidate_path.parents and candidate_path != upload_dir:
        return None
    if not candidate_path.exists() or not candidate_path.is_file():
        return None

    endpoint = f"{upload_folder_name[:-1]}_uploaded_image" if upload_folder_name.endswith("s") else f"{upload_folder_name}_uploaded_image"
    return url_for(endpoint, filename=safe_filename)


def resolve_online_gallery_asset_url(filename: Any) -> str | None:
    if is_storage_object_path(filename, folder_prefix=ONLINE_GALLERY_STORAGE_PREFIX):
        remote_url = resolve_public_image_url(filename)
        if remote_url:
            return remote_url
    return resolve_local_upload_image_url(ONLINE_GALLERY_UPLOAD_DIR, "online-gallery", filename)


def resolve_online_gallery_image_url(image_filename: Any) -> str | None:
    return resolve_online_gallery_asset_url(image_filename)


def resolve_online_gallery_model_url(model_filename: Any) -> str | None:
    return resolve_online_gallery_asset_url(model_filename)


def _prepare_tags(raw_tags: Any) -> list[str]:
    if isinstance(raw_tags, list):
        return [str(tag).strip() for tag in raw_tags if str(tag).strip()]

    if isinstance(raw_tags, str):
        return [part.strip() for part in raw_tags.split(",") if part.strip()]

    return []


def _normalize_text(raw_value: Any) -> str:
    return str(raw_value or "").strip()


def prepare_online_gallery_category(category: dict[str, Any] | None) -> dict[str, Any]:
    prepared = dict(category or {})
    display_name = _normalize_text(prepared.get("display_name"))
    display_name_en = _normalize_text(prepared.get("display_name_en")) or display_name
    display_name_tl = _normalize_text(prepared.get("display_name_tl")) or display_name
    prepared["display_name_en"] = display_name_en
    prepared["display_name_tl"] = display_name_tl
    prepared["display_name"] = display_name_tl or display_name_en or display_name
    return prepared


def prepare_online_gallery_categories(categories: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    return [prepare_online_gallery_category(category) for category in list(categories or [])]


def _normalize_category_name(raw_value: Any, categories_by_id: dict[int, dict[str, Any]]) -> dict[str, str]:
    if isinstance(raw_value, int):
        return dict(categories_by_id.get(raw_value) or {})

    try:
        numeric_id = int(raw_value)
    except (TypeError, ValueError):
        numeric_id = None

    if numeric_id is not None:
        return dict(categories_by_id.get(numeric_id) or {})

    raw_text = str(raw_value or "").strip()
    if raw_text in ONLINE_GALLERY_DEFAULT_CATEGORIES:
        return {
            "display_name": raw_text,
            "display_name_en": raw_text,
            "display_name_tl": raw_text,
            "slug": raw_text.lower(),
        }
    fallback_name = ONLINE_GALLERY_DEFAULT_CATEGORY_SLUGS.get(raw_text.lower(), raw_text)
    return {
        "display_name": fallback_name,
        "display_name_en": fallback_name,
        "display_name_tl": fallback_name,
        "slug": raw_text.lower(),
    }


def prepare_online_gallery_item(item: dict[str, Any] | None, *, categories_by_id: dict[int, dict[str, Any]] | None = None) -> dict[str, Any]:
    prepared = dict(item or {})
    categories_by_id = categories_by_id or {}

    category_info = _normalize_category_name(prepared.get("category_id"), categories_by_id)
    prepared["category"] = _normalize_text(category_info.get("display_name_tl")) or _normalize_text(category_info.get("display_name")) or _normalize_text(category_info.get("display_name_en"))
    prepared["category_en"] = _normalize_text(category_info.get("display_name_en")) or prepared["category"]
    prepared["category_tl"] = _normalize_text(category_info.get("display_name_tl")) or prepared["category"]
    prepared["category_slug"] = _normalize_text(category_info.get("slug"))
    prepared["title_en"] = _normalize_text(prepared.get("title_en")) or _normalize_text(prepared.get("title"))
    prepared["title_tl"] = _normalize_text(prepared.get("title_tl")) or _normalize_text(prepared.get("title"))
    prepared["year"] = str(prepared.get("year_label") or "").strip()
    prepared["location_en"] = _normalize_text(prepared.get("location_en")) or _normalize_text(prepared.get("location"))
    prepared["location_tl"] = _normalize_text(prepared.get("location_tl")) or _normalize_text(prepared.get("location"))
    prepared["short_caption_en"] = _normalize_text(prepared.get("short_caption_en")) or _normalize_text(prepared.get("short_caption"))
    prepared["short_caption_tl"] = _normalize_text(prepared.get("short_caption_tl")) or _normalize_text(prepared.get("short_caption"))
    prepared["full_description_en"] = _normalize_text(prepared.get("full_description_en")) or _normalize_text(prepared.get("full_description"))
    prepared["full_description_tl"] = _normalize_text(prepared.get("full_description_tl")) or _normalize_text(prepared.get("full_description"))
    prepared["tags"] = _prepare_tags(prepared.get("tags"))
    prepared["image_url"] = resolve_online_gallery_image_url(prepared.get("image_filename"))
    prepared["model_url"] = resolve_online_gallery_model_url(prepared.get("model_filename"))
    prepared["teaching_note"] = str(prepared.get("teaching_note") or "").strip()
    status = _normalize_text(prepared.get("status")).lower()
    if status not in {"published", "draft", "archived"}:
        status = "published" if bool(prepared.get("is_published")) else "draft"
    prepared["status"] = status
    prepared["is_published"] = status == "published"
    return prepared


def prepare_online_gallery_items(items: list[dict[str, Any]] | None, *, categories_by_id: dict[int, dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    return [prepare_online_gallery_item(item, categories_by_id=categories_by_id) for item in list(items or [])]


def _build_categories_by_id(categories: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
    mapping: dict[int, dict[str, Any]] = {}
    for category in categories:
        prepared_category = prepare_online_gallery_category(category)
        try:
            key = int(prepared_category.get("id"))
        except (TypeError, ValueError):
            continue
        mapping[key] = prepared_category
    return mapping


def load_public_online_gallery_categories() -> list[dict[str, Any]]:
    if not is_supabase_configured():
        return []

    try:
        return prepare_online_gallery_categories(list_active_online_gallery_categories())
    except SupabaseConfigError:
        current_app.logger.warning("Supabase online gallery categories integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        current_app.logger.exception("Failed to load online gallery categories from Supabase: %s", exc)

    return []


def load_admin_online_gallery_categories() -> list[dict[str, Any]]:
    if not is_supabase_configured():
        return []

    try:
        return prepare_online_gallery_categories(list_all_online_gallery_categories())
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

    status = str(source.get("status") or "").strip().lower()
    if status not in {"published", "draft", "archived"}:
        status = "published" if bool(source.get("is_published")) else "draft"

    return {
        "title": str(source.get("title") or source.get("title_en") or "").strip(),
        "title_en": str(source.get("title_en") or source.get("title") or "").strip(),
        "title_tl": str(source.get("title_tl") or source.get("title") or "").strip(),
        "year_label": str(source.get("year_label") or source.get("year") or "").strip(),
        "category_id": category_id,
        "location": str(source.get("location") or source.get("location_en") or "").strip(),
        "location_en": str(source.get("location_en") or source.get("location") or "").strip(),
        "location_tl": str(source.get("location_tl") or source.get("location") or "").strip(),
        "short_caption": str(source.get("short_caption") or source.get("short_caption_en") or "").strip(),
        "short_caption_en": str(source.get("short_caption_en") or source.get("short_caption") or "").strip(),
        "short_caption_tl": str(source.get("short_caption_tl") or source.get("short_caption") or "").strip(),
        "full_description": str(source.get("full_description") or source.get("full_description_en") or "").strip(),
        "full_description_en": str(source.get("full_description_en") or source.get("full_description") or "").strip(),
        "full_description_tl": str(source.get("full_description_tl") or source.get("full_description") or "").strip(),
        "status": status,
        "is_published": status == "published",
        "image_filename": str(source.get("image_filename") or "").strip(),
        "image_url": source.get("image_url"),
        "model_filename": str(source.get("model_filename") or "").strip(),
        "model_url": source.get("model_url"),
    }


def get_online_gallery_status_message(status_key: Any) -> str | None:
    mapping = {
        "created": "Online gallery card created successfully.",
        "updated": "Online gallery card updated successfully.",
        "published": "Online gallery card published successfully.",
        "archived": "Online gallery card archived successfully.",
        "restored": "Online gallery card restored to Draft successfully.",
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
        max_upload_bytes=ONLINE_GALLERY_UPLOAD_MAX_BYTES,
        max_upload_mb=ONLINE_GALLERY_UPLOAD_MAX_BYTES / (1024 * 1024),
    )
