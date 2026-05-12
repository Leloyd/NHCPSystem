from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

from flask import current_app, render_template, session

from participation_submissions_repository import (
    get_participation_submission_by_id,
    list_active_participation_submissions,
    list_all_participation_submissions,
)
from supabase_client import SupabaseConfigError, is_supabase_configured
from supabase_storage import is_storage_object_path, resolve_public_image_url


PROJECT_ROOT = Path(__file__).resolve().parent.parent
PARTICIPATION_SUBMISSIONS_UPLOAD_DIR = (PROJECT_ROOT / "static" / "uploads" / "participation-submissions").resolve()
PARTICIPATION_SUBMISSIONS_STORAGE_PREFIX = "participation-submissions"
PARTICIPATION_SUBMISSION_TYPES = (
    "teacher_corner",
    "story_submit",
)
PARTICIPATION_SUBMISSION_STATUS_OPTIONS = (
    "pending_verification",
    "pending_review",
    "active",
    "archived",
)
EDU_RESOURCE_CATEGORY_META = {
    "PPT": {"icon": "file-text", "gradient": "linear-gradient(135deg, #8b5cf6, #5b21b6)", "format": "PPT"},
    "Books": {"icon": "book-open", "gradient": "linear-gradient(135deg, #f59e0b, #92400e)", "format": "BOOK"},
    "DOCS": {"icon": "file-text", "gradient": "linear-gradient(135deg, #14b8a6, #0f766e)", "format": "DOCX"},
    "PDF": {"icon": "file-text", "gradient": "linear-gradient(135deg, #ef4444, #b91c1c)", "format": "PDF"},
}


def resolve_participation_submission_url(file_name: Any) -> str | None:
    if is_storage_object_path(file_name, folder_prefix=PARTICIPATION_SUBMISSIONS_STORAGE_PREFIX):
        remote_url = resolve_public_image_url(file_name)
        if remote_url:
            return remote_url
    return None


def infer_teacher_resource_category(file_name: Any) -> str | None:
    extension = Path(str(file_name or "").strip()).suffix.lower()
    if extension in {".ppt", ".pptx"}:
        return "PPT"
    if extension == ".docx":
        return "DOCS"
    if extension == ".pdf":
        return "PDF"
    return None


def build_submission_excerpt(value: Any, *, limit: int = 180) -> str:
    text = " ".join(str(value or "").strip().split())
    if len(text) <= limit:
        return text
    truncated = text[: limit - 1].rsplit(" ", 1)[0].strip()
    return f"{truncated or text[: limit - 1].strip()}…"


def prepare_participation_submission_item(item: dict[str, Any] | None) -> dict[str, Any]:
    prepared = dict(item or {})
    submission_type = str(prepared.get("submission_type") or PARTICIPATION_SUBMISSION_TYPES[0]).strip()
    status = str(prepared.get("status") or "pending_verification").strip().lower()
    is_private = bool(prepared.get("is_private"))
    resource_category = str(prepared.get("resource_category") or "").strip() or ("Books" if submission_type == "story_submit" else "")
    title = str(prepared.get("title") or "").strip()
    submitter_name = str(prepared.get("submitter_name") or "").strip()
    submitter_email = str(prepared.get("submitter_email") or "").strip().lower()
    description = str(prepared.get("description") or "").strip()
    story_content = str(prepared.get("story_content") or "").strip()
    preview_text = build_submission_excerpt(story_content or description)
    prepared["submission_type"] = submission_type
    prepared["status"] = status
    prepared["is_private"] = is_private
    prepared["resource_category"] = resource_category
    prepared["title"] = title
    prepared["submitter_name"] = submitter_name
    prepared["submitter_email"] = submitter_email
    prepared["grade_level"] = str(prepared.get("grade_level") or "").strip()
    prepared["subject_topic"] = str(prepared.get("subject_topic") or "").strip()
    prepared["description"] = description
    prepared["story_content"] = story_content
    prepared["preview_text"] = preview_text
    prepared["resource_file_url"] = resolve_participation_submission_url(prepared.get("resource_file_filename"))
    prepared["photo_url"] = resolve_participation_submission_url(prepared.get("photo_filename"))
    prepared["submission_type_label"] = "Teacher Corner" if submission_type == "teacher_corner" else "Story Submit"
    prepared["story_category"] = str(prepared.get("story_category") or "").strip()
    prepared["contributor_display"] = "Hidden by privacy request" if is_private and status == "active" else (submitter_name or "Anonymous")
    prepared["email_display"] = "Hidden by privacy request" if is_private and status == "active" else (submitter_email or "No email")
    prepared["display_date"] = format_submission_datetime(prepared.get("created_at"))
    return prepared


def prepare_participation_submission_items(items: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    return [prepare_participation_submission_item(item) for item in list(items or [])]


def format_submission_datetime(raw_value: Any) -> str:
    raw_text = str(raw_value or "").strip()
    if not raw_text:
        return "Date unavailable"
    try:
        parsed = datetime.fromisoformat(raw_text.replace("Z", "+00:00"))
    except ValueError:
        return raw_text
    return parsed.strftime("%B %d, %Y %I:%M %p")


def load_admin_participation_submissions() -> list[dict[str, Any]]:
    if not is_supabase_configured():
        return []
    try:
        return prepare_participation_submission_items(list_all_participation_submissions())
    except SupabaseConfigError:
        current_app.logger.warning("Supabase participation submissions integration is not fully configured.")
    except Exception as exc:
        current_app.logger.exception("Failed to load participation submissions from Supabase: %s", exc)
    return []


def load_admin_participation_submission(submission_id: int) -> dict[str, Any] | None:
    if not is_supabase_configured():
        return None
    try:
        item = get_participation_submission_by_id(submission_id)
        if item is None:
            return None
        return prepare_participation_submission_item(item)
    except SupabaseConfigError:
        current_app.logger.warning("Supabase participation submissions integration is not fully configured.")
    except Exception as exc:
        current_app.logger.exception("Failed to load participation submission %s: %s", submission_id, exc)
    return None


def load_public_approved_participation_submission_resources() -> list[dict[str, Any]]:
    if not is_supabase_configured():
        return []
    try:
        items = list_active_participation_submissions()
    except SupabaseConfigError:
        current_app.logger.warning("Supabase participation submissions integration is not fully configured.")
        return []
    except Exception as exc:
        current_app.logger.exception("Failed to load approved participation submissions: %s", exc)
        return []

    resources = []
    for item in items:
        prepared = prepare_participation_submission_item(item)
        category = prepared.get("resource_category") or ("Books" if prepared.get("submission_type") == "story_submit" else "DOCS")
        meta = EDU_RESOURCE_CATEGORY_META.get(category, EDU_RESOURCE_CATEGORY_META["DOCS"])
        contributor_name = "" if prepared.get("is_private") else prepared.get("submitter_name")
        full_text = prepared.get("story_content") or prepared.get("description")
        resources.append(
            {
                "id": f"submission-{prepared.get('id')}",
                "title": prepared.get("title"),
                "category": category,
                "status": "active",
                "is_book": category == "Books",
                "cover_image_url": prepared.get("photo_url"),
                "file_url": prepared.get("resource_file_url"),
                "icon": meta["icon"],
                "gradient": meta["gradient"],
                "format": meta["format"],
                "author": contributor_name if category == "Books" else "",
                "year": "",
                "educator_name": contributor_name if category != "Books" else "",
                "grade_level": prepared.get("grade_level") or "",
                "subject_topic": prepared.get("subject_topic") or prepared.get("story_category") or "",
                "description": build_submission_excerpt(full_text),
                "full_text": full_text,
                "metadata_label": "Author" if category == "Books" else "Educator / Source",
                "metadata_value": contributor_name,
                "created_at": prepared.get("created_at"),
                "updated_at": prepared.get("updated_at"),
                "submission_type": prepared.get("submission_type"),
                "submitter_name": prepared.get("submitter_name"),
                "submitter_email": prepared.get("submitter_email"),
                "is_private": prepared.get("is_private"),
            }
        )
    return resources


def get_participation_submissions_status_message(status_key: Any) -> str | None:
    mapping = {
        "approved": "Submission approved and published successfully.",
        "archived": "Submission archived successfully.",
    }
    return mapping.get(str(status_key or "").strip().lower())


def render_admin_participation_submission_review(
    *,
    ensure_admin_csrf_token,
    admin_session_user_key: str,
    admin_username: str,
    submission_item: dict[str, Any],
    error_message: str | None = None,
):
    csrf_token = ensure_admin_csrf_token()
    current_admin_username = session.get(admin_session_user_key, admin_username)
    return render_template(
        "admin/AdminParticipationSubmissionReview.html",
        csrf_token=csrf_token,
        admin_username=current_admin_username,
        submission_item=submission_item,
        error_message=error_message,
    )
