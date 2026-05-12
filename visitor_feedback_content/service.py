from __future__ import annotations

from datetime import datetime
from typing import Any

from flask import current_app, render_template, session

from supabase_client import SupabaseConfigError, is_supabase_configured
from visitor_feedback_repository import get_visitor_feedback_by_id, list_all_visitor_feedback


VISIT_TYPE_LABELS = {
    "on-site": "On-Site Visit",
    "website": "Website Visit",
}
RATING_LABELS = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Very Good",
    5: "Excellent",
}
VISITOR_FEEDBACK_STATUS_OPTIONS = (
    "new",
    "reviewed",
    "archived",
)


def build_feedback_excerpt(value: Any, *, limit: int = 180) -> str:
    text = " ".join(str(value or "").strip().split())
    if not text:
        return "No comments provided."
    if len(text) <= limit:
        return text
    truncated = text[: limit - 1].rsplit(" ", 1)[0].strip()
    return f"{truncated or text[: limit - 1].strip()}…"


def format_feedback_datetime(raw_value: Any) -> str:
    raw_text = str(raw_value or "").strip()
    if not raw_text:
        return "Date unavailable"
    try:
        parsed = datetime.fromisoformat(raw_text.replace("Z", "+00:00"))
    except ValueError:
        return raw_text
    return parsed.strftime("%B %d, %Y %I:%M %p")


def prepare_visitor_feedback_item(item: dict[str, Any] | None) -> dict[str, Any]:
    prepared = dict(item or {})
    visit_type = str(prepared.get("visit_type") or "").strip().lower()
    visitor_name = str(prepared.get("visitor_name") or "").strip()
    comments = str(prepared.get("comments") or "").strip()
    status = str(prepared.get("status") or "new").strip().lower()

    try:
        rating = int(prepared.get("rating") or 0)
    except (TypeError, ValueError):
        rating = 0

    prepared["visit_type"] = visit_type
    prepared["visit_type_label"] = VISIT_TYPE_LABELS.get(visit_type, "Unknown Visit Type")
    prepared["rating"] = rating
    prepared["rating_label"] = RATING_LABELS.get(rating, "Unrated")
    prepared["visitor_name"] = visitor_name
    prepared["visitor_display"] = visitor_name or "Anonymous visitor"
    prepared["comments"] = comments
    prepared["preview_text"] = build_feedback_excerpt(comments)
    prepared["status"] = status
    prepared["display_date"] = format_feedback_datetime(prepared.get("created_at"))
    prepared["reviewed_display_date"] = format_feedback_datetime(prepared.get("reviewed_at")) if prepared.get("reviewed_at") else "Not reviewed yet"
    return prepared


def load_admin_visitor_feedback() -> list[dict[str, Any]]:
    if not is_supabase_configured():
        return []
    try:
        return [prepare_visitor_feedback_item(item) for item in list_all_visitor_feedback()]
    except SupabaseConfigError:
        current_app.logger.warning("Supabase visitor feedback integration is not fully configured.")
    except Exception as exc:
        current_app.logger.exception("Failed to load visitor feedback: %s", exc)
    return []


def load_admin_visitor_feedback_item(feedback_id: int) -> dict[str, Any] | None:
    if not is_supabase_configured():
        return None
    try:
        item = get_visitor_feedback_by_id(feedback_id)
        if item is None:
            return None
        return prepare_visitor_feedback_item(item)
    except SupabaseConfigError:
        current_app.logger.warning("Supabase visitor feedback integration is not fully configured.")
    except Exception as exc:
        current_app.logger.exception("Failed to load visitor feedback %s: %s", feedback_id, exc)
    return None


def get_visitor_feedback_status_message(status_key: Any) -> str | None:
    mapping = {
        "reviewed": "Visitor feedback marked as reviewed successfully.",
        "archived": "Visitor feedback archived successfully.",
    }
    return mapping.get(str(status_key or "").strip().lower())


def render_admin_visitor_feedback_review(
    *,
    ensure_admin_csrf_token,
    admin_session_user_key: str,
    admin_username: str,
    feedback_item: dict[str, Any],
    error_message: str | None = None,
):
    csrf_token = ensure_admin_csrf_token()
    current_admin_username = session.get(admin_session_user_key, admin_username)
    return render_template(
        "admin/AdminVisitorFeedbackReview.html",
        csrf_token=csrf_token,
        admin_username=current_admin_username,
        feedback_item=feedback_item,
        error_message=error_message,
    )
