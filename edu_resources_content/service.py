from __future__ import annotations

from pathlib import Path
from typing import Any

from flask import current_app, render_template, session

from edu_resources_repository import get_edu_resource_by_id, list_all_edu_resources, list_published_edu_resources
from participation_submissions_content import load_public_approved_participation_submission_resources
from supabase_client import SupabaseConfigError, is_supabase_configured
from supabase_storage import EDU_RESOURCES_STORAGE_PREFIX, is_storage_object_path, resolve_public_image_url


PROJECT_ROOT = Path(__file__).resolve().parent.parent
EDU_RESOURCES_UPLOAD_DIR = (PROJECT_ROOT / "static" / "uploads" / "edu-resources").resolve()
# Vercel Functions reject request bodies above 4.5 MB. Keep a selected cover
# image or learning-resource file at 4 MiB so multipart form fields still fit.
EDU_RESOURCES_UPLOAD_MAX_BYTES = 4 * 1024 * 1024
EDU_RESOURCE_CATEGORIES = (
    "PPT",
    "Story",
    "DOCS",
    "PDF",
)
EDU_RESOURCE_STATUS_OPTIONS = (
    "active",
    "draft",
    "archived",
)
EDU_RESOURCE_CATEGORY_META = {
    "PPT": {"icon": "file-text", "gradient": "linear-gradient(135deg, #8b5cf6, #5b21b6)", "format": "PPT"},
    "Story": {"icon": "book-heart", "gradient": "linear-gradient(135deg, #9a6a35, #3d2615)", "format": "STORY"},
    "DOCS": {"icon": "file-text", "gradient": "linear-gradient(135deg, #14b8a6, #0f766e)", "format": "DOCX"},
    "PDF": {"icon": "file-text", "gradient": "linear-gradient(135deg, #ef4444, #b91c1c)", "format": "PDF"},
}


def resolve_edu_resource_url(file_name: Any) -> str | None:
    if is_storage_object_path(file_name, folder_prefix=EDU_RESOURCES_STORAGE_PREFIX):
        remote_url = resolve_public_image_url(file_name)
        if remote_url:
            return remote_url
    return None


def prepare_edu_resource_item(item: dict[str, Any] | None) -> dict[str, Any]:
    prepared = dict(item or {})
    raw_category = str(prepared.get("category") or EDU_RESOURCE_CATEGORIES[0]).strip()
    # Older rows used Books for community stories. Keep them visible while the
    # accompanying migration changes the stored category to Story.
    if raw_category == "Books":
        raw_category = "Story"
    category = raw_category if raw_category in EDU_RESOURCE_CATEGORIES else EDU_RESOURCE_CATEGORIES[0]
    raw_status = str(prepared.get("status") or "").strip().lower()
    status = raw_status if raw_status in EDU_RESOURCE_STATUS_OPTIONS else ("active" if prepared.get("is_published") else "draft")
    meta = EDU_RESOURCE_CATEGORY_META.get(category, EDU_RESOURCE_CATEGORY_META[EDU_RESOURCE_CATEGORIES[0]])
    prepared["category"] = category
    prepared["status"] = status
    prepared["is_story"] = category == "Story"
    prepared["is_book"] = False
    prepared["cover_image_url"] = resolve_edu_resource_url(prepared.get("cover_image_filename"))
    prepared["file_url"] = resolve_edu_resource_url(prepared.get("file_filename"))
    prepared["icon"] = meta["icon"]
    prepared["gradient"] = meta["gradient"]
    prepared["format"] = meta["format"]
    prepared["author"] = str(prepared.get("author") or "").strip()
    prepared["year"] = str(prepared.get("year_label") or "").strip()
    prepared["educator_name"] = str(prepared.get("educator_name") or "").strip()
    prepared["subject_topic"] = str(prepared.get("subject_topic") or "").strip()
    prepared["description"] = str(prepared.get("description") or "").strip()
    prepared["full_text"] = str(prepared.get("full_text") or prepared.get("description") or "").strip()
    prepared["metadata_label"] = "Contributor" if category == "Story" else "Educator / Source"
    prepared["metadata_value"] = prepared["author"] if category == "Story" else prepared["educator_name"]
    return prepared


def prepare_edu_resource_items(items: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    return [prepare_edu_resource_item(item) for item in list(items or [])]


def load_public_edu_resources() -> list[dict[str, Any]]:
    published_items: list[dict[str, Any]] = []
    approved_submission_items: list[dict[str, Any]] = []

    if is_supabase_configured():
        try:
            published_items = prepare_edu_resource_items(list_published_edu_resources())
        except SupabaseConfigError:
            current_app.logger.warning("Supabase edu resources integration is not fully configured.")
        except Exception as exc:
            current_app.logger.exception("Failed to load edu resources from Supabase: %s", exc)

    try:
        approved_submission_items = load_public_approved_participation_submission_resources()
    except Exception as exc:
        current_app.logger.exception("Failed to merge participation submissions into Edu Resources: %s", exc)

    combined_items = list(published_items) + list(approved_submission_items)
    return sorted(
        combined_items,
        key=lambda item: str(item.get("created_at") or item.get("updated_at") or ""),
        reverse=True,
    )


def load_admin_edu_resources() -> list[dict[str, Any]]:
    if not is_supabase_configured():
        return []

    try:
        return prepare_edu_resource_items(list_all_edu_resources())
    except SupabaseConfigError:
        current_app.logger.warning("Supabase edu resources integration is not fully configured.")
    except Exception as exc:
        current_app.logger.exception("Failed to load admin edu resources from Supabase: %s", exc)

    return []


def load_admin_edu_resource(item_id: int) -> dict[str, Any] | None:
    if not is_supabase_configured():
        return None

    try:
        item = get_edu_resource_by_id(item_id)
        if item is None:
            return None
        return prepare_edu_resource_item(item)
    except SupabaseConfigError:
        current_app.logger.warning("Supabase edu resources integration is not fully configured.")
    except Exception as exc:
        current_app.logger.exception("Failed to load admin edu resource '%s' from Supabase: %s", item_id, exc)

    return None


def build_edu_resource_form_state(source: dict[str, Any] | None = None) -> dict[str, Any]:
    source = source or {}
    raw_category = str(source.get("category") or "").strip()
    category = raw_category if raw_category in EDU_RESOURCE_CATEGORIES else EDU_RESOURCE_CATEGORIES[0]
    raw_status = str(source.get("status") or "draft").strip().lower()
    status = raw_status if raw_status in EDU_RESOURCE_STATUS_OPTIONS else "draft"
    return {
        "title": str(source.get("title") or "").strip(),
        "category": category,
        "educator_name": str(source.get("educator_name") or "").strip(),
        "subject_topic": str(source.get("subject_topic") or "").strip(),
        "author": str(source.get("author") or "").strip(),
        "year_label": str(source.get("year_label") or source.get("year") or "").strip(),
        "description": str(source.get("description") or "").strip(),
        "status": status,
        "file_filename": str(source.get("file_filename") or "").strip(),
        "cover_image_filename": str(source.get("cover_image_filename") or "").strip(),
        "file_url": source.get("file_url"),
        "cover_image_url": source.get("cover_image_url"),
    }


def get_edu_resources_status_message(status_key: Any) -> str | None:
    mapping = {
        "created": "Edu resource created successfully.",
        "updated": "Edu resource updated successfully.",
        "activated": "Edu resource activated successfully.",
        "archived": "Edu resource archived successfully.",
        "restored": "Edu resource restored to Draft successfully.",
        "deleted": "Edu resource archived successfully.",
    }
    return mapping.get(str(status_key or "").strip().lower())


def render_admin_edu_resource_form(
    *,
    ensure_admin_csrf_token,
    admin_session_user_key: str,
    admin_username: str,
    form_title: str,
    submit_label: str,
    form_action: str,
    resource_form: dict[str, Any],
    error_message: str | None = None,
):
    csrf_token = ensure_admin_csrf_token()
    current_admin_username = session.get(admin_session_user_key, admin_username)
    return render_template(
        "admin/AdminEduResourceForm.html",
        csrf_token=csrf_token,
        admin_username=current_admin_username,
        form_title=form_title,
        submit_label=submit_label,
        form_action=form_action,
        resource_form=resource_form,
        category_options=EDU_RESOURCE_CATEGORIES,
        status_options=EDU_RESOURCE_STATUS_OPTIONS,
        error_message=error_message,
        max_upload_bytes=EDU_RESOURCES_UPLOAD_MAX_BYTES,
        max_upload_mb=EDU_RESOURCES_UPLOAD_MAX_BYTES / (1024 * 1024),
    )
