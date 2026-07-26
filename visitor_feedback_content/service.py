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
    prepared["status_label"] = {
        "new": "New Feedback",
        "reviewed": "Reviewed",
        "archived": "Archived",
    }.get(status, status.replace("_", " ").title())
    if rating >= 4:
        prepared["sentiment_label"] = "Positive"
        prepared["sentiment_class"] = "positive"
    elif rating == 3:
        prepared["sentiment_label"] = "Neutral"
        prepared["sentiment_class"] = "neutral"
    else:
        prepared["sentiment_label"] = "Needs Attention"
        prepared["sentiment_class"] = "attention"
    return prepared


def build_visitor_feedback_analytics(items: list[dict[str, Any]] | None) -> dict[str, Any]:
    feedback_items = list(items or [])
    valid_ratings = [
        int(item.get("rating"))
        for item in feedback_items
        if isinstance(item.get("rating"), int) and 1 <= int(item.get("rating")) <= 5
    ]
    total = len(feedback_items)
    rated_total = len(valid_ratings)
    average_rating = round(sum(valid_ratings) / rated_total, 1) if rated_total else 0.0
    status_counts = {
        status: sum(1 for item in feedback_items if item.get("status") == status)
        for status in VISITOR_FEEDBACK_STATUS_OPTIONS
    }
    visit_type_counts = {
        visit_type: sum(1 for item in feedback_items if item.get("visit_type") == visit_type)
        for visit_type in VISIT_TYPE_LABELS
    }
    rating_distribution = []
    for rating in range(5, 0, -1):
        count = valid_ratings.count(rating)
        rating_distribution.append(
            {
                "rating": rating,
                "count": count,
                "percent": round((count / rated_total) * 100) if rated_total else 0,
            }
        )

    positive_count = sum(1 for rating in valid_ratings if rating >= 4)
    attention_count = sum(1 for rating in valid_ratings if rating <= 2)
    return {
        "total": total,
        "rated_total": rated_total,
        "average_rating": average_rating,
        "new_count": status_counts["new"],
        "reviewed_count": status_counts["reviewed"],
        "archived_count": status_counts["archived"],
        "positive_count": positive_count,
        "positive_percent": round((positive_count / rated_total) * 100) if rated_total else 0,
        "attention_count": attention_count,
        "attention_percent": round((attention_count / rated_total) * 100) if rated_total else 0,
        "comment_count": sum(1 for item in feedback_items if str(item.get("comments") or "").strip()),
        "rating_distribution": rating_distribution,
        "visit_types": [
            {
                "key": visit_type,
                "label": VISIT_TYPE_LABELS[visit_type],
                "count": count,
                "percent": round((count / total) * 100) if total else 0,
            }
            for visit_type, count in visit_type_counts.items()
        ],
    }


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
        "restored": "Visitor feedback restored to the review queue successfully.",
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
