from __future__ import annotations

from datetime import datetime
from typing import Any

from flask import current_app, render_template, request, session

from supabase_client import SupabaseConfigError, is_supabase_configured
from visitor_feedback_repository import (
    get_visitor_feedback_by_id,
    list_all_visitor_feedback,
    list_public_visitor_feedback,
    list_visitor_feedback_moderation_log,
)
from visitor_feedback_sentiment import SENTIMENT_LABELS, analyze_feedback_locally


VISIT_TYPE_LABELS = {
    "on-site": "On-Site Visit",
    "website": "Online Experience",
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
    rating_status = str(prepared.get("rating_status") or "counted").strip().lower()
    comment_status = str(prepared.get("comment_status") or "pending").strip().lower()
    name_preference = str(prepared.get("public_name_preference") or "anonymous").strip().lower()
    prepared["rating_status"] = rating_status if rating_status in {"counted", "excluded"} else "counted"
    prepared["rating_status_label"] = "Counted in public rating" if prepared["rating_status"] == "counted" else "Excluded from public rating"
    prepared["comment_status"] = comment_status if comment_status in {"not_provided", "pending", "published", "withheld"} else "pending"
    prepared["comment_status_label"] = {
        "not_provided": "Rating only",
        "pending": "Comment awaiting review",
        "published": "Comment published",
        "withheld": "Comment withheld",
    }[prepared["comment_status"]]
    prepared["public_display_consent"] = prepared.get("public_display_consent") is True
    prepared["public_name_preference"] = name_preference if name_preference in {"anonymous", "first_name"} else "anonymous"
    prepared["public_display_name"] = _public_display_name(visitor_name, prepared["public_name_preference"])
    prepared["moderation_log"] = list(prepared.get("moderation_log") or [])
    stored_label = str(prepared.get("sentiment_label") or "").strip().lower()
    sentiment_is_stored = stored_label in SENTIMENT_LABELS
    if not sentiment_is_stored:
        prepared.update(analyze_feedback_locally(comments, rating))

    sentiment_key = str(prepared.get("sentiment_label") or "neutral").strip().lower()
    if sentiment_key not in SENTIMENT_LABELS:
        sentiment_key = "neutral"
    try:
        confidence = max(0.0, min(1.0, float(prepared.get("sentiment_confidence") or 0)))
    except (TypeError, ValueError):
        confidence = 0.0
    raw_scores = prepared.get("sentiment_scores")
    if not isinstance(raw_scores, dict):
        raw_scores = {}
    scores = {}
    for label in SENTIMENT_LABELS:
        try:
            scores[label] = max(0.0, min(1.0, float(raw_scores.get(label) or 0)))
        except (TypeError, ValueError):
            scores[label] = 0.0

    provider = str(prepared.get("sentiment_provider") or "").strip().lower()
    model = str(prepared.get("sentiment_model") or "").strip()
    if provider == "huggingface":
        method_label = "XLM-T multilingual model"
    elif provider == "local":
        method_label = "English/Filipino fallback"
    else:
        method_label = "Rating estimate"

    prepared["sentiment_key"] = sentiment_key
    prepared["sentiment_label"] = sentiment_key.title()
    prepared["sentiment_class"] = "attention" if sentiment_key == "negative" else sentiment_key
    prepared["sentiment_confidence"] = confidence
    prepared["sentiment_confidence_percent"] = round(confidence * 100)
    prepared["sentiment_scores"] = scores
    prepared["sentiment_score_rows"] = [
        {"key": label, "label": label.title(), "percent": round(scores[label] * 100)}
        for label in SENTIMENT_LABELS
    ]
    prepared["sentiment_provider"] = provider
    prepared["sentiment_model"] = model
    prepared["sentiment_method_label"] = method_label
    prepared["sentiment_is_stored"] = sentiment_is_stored
    prepared["sentiment_analyzed_display"] = (
        format_feedback_datetime(prepared.get("sentiment_analyzed_at"))
        if prepared.get("sentiment_analyzed_at")
        else "Calculated for this view"
    )
    return prepared


def _public_display_name(full_name: str, preference: str) -> str:
    if preference != "first_name":
        return "Anonymous visitor"
    parts = [part for part in str(full_name or "").split() if part]
    if not parts:
        return "Anonymous visitor"
    return parts[0] if len(parts) == 1 else f"{parts[0]} {parts[-1][0]}."


def build_visitor_feedback_analytics(items: list[dict[str, Any]] | None) -> dict[str, Any]:
    feedback_items = list(items or [])
    valid_ratings = [
        int(item.get("rating"))
        for item in feedback_items
        if isinstance(item.get("rating"), int)
        and 1 <= int(item.get("rating")) <= 5
        and item.get("rating_status", "counted") == "counted"
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

    positive_count = sum(1 for item in feedback_items if item.get("sentiment_key") == "positive")
    neutral_count = sum(1 for item in feedback_items if item.get("sentiment_key") == "neutral")
    negative_count = sum(1 for item in feedback_items if item.get("sentiment_key") == "negative")
    analyzed_total = positive_count + neutral_count + negative_count
    stored_analysis_count = sum(1 for item in feedback_items if item.get("sentiment_is_stored"))
    attention_count = sum(1 for rating in valid_ratings if rating <= 2)
    return {
        "total": total,
        "rated_total": rated_total,
        "average_rating": average_rating,
        "new_count": status_counts["new"],
        "reviewed_count": status_counts["reviewed"],
        "archived_count": status_counts["archived"],
        "positive_count": positive_count,
        "positive_percent": round((positive_count / analyzed_total) * 100) if analyzed_total else 0,
        "neutral_count": neutral_count,
        "neutral_percent": round((neutral_count / analyzed_total) * 100) if analyzed_total else 0,
        "negative_count": negative_count,
        "negative_percent": round((negative_count / analyzed_total) * 100) if analyzed_total else 0,
        "analyzed_total": analyzed_total,
        "stored_analysis_count": stored_analysis_count,
        "sentiment_distribution": [
            {
                "key": key,
                "label": key.title(),
                "count": count,
                "percent": round((count / analyzed_total) * 100) if analyzed_total else 0,
            }
            for key, count in (
                ("positive", positive_count),
                ("neutral", neutral_count),
                ("negative", negative_count),
            )
        ],
        "attention_count": attention_count,
        "attention_percent": round((attention_count / rated_total) * 100) if rated_total else 0,
        "comment_count": sum(1 for item in feedback_items if str(item.get("comments") or "").strip()),
        "counted_rating_count": sum(1 for item in feedback_items if item.get("rating_status") == "counted"),
        "excluded_rating_count": sum(1 for item in feedback_items if item.get("rating_status") == "excluded"),
        "pending_comment_count": sum(1 for item in feedback_items if item.get("comment_status") == "pending"),
        "published_comment_count": sum(1 for item in feedback_items if item.get("comment_status") == "published"),
        "withheld_comment_count": sum(1 for item in feedback_items if item.get("comment_status") == "withheld"),
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


def build_public_visitor_feedback() -> dict[str, Any]:
    """Build a privacy-safe public aggregate and published-comment feed."""
    empty = {"channels": {}, "comments": [], "pending_comment_count": 0}
    if not is_supabase_configured():
        return empty
    try:
        items = [prepare_visitor_feedback_item(item) for item in list_public_visitor_feedback()]
    except Exception as exc:
        current_app.logger.exception("Failed to load public visitor feedback: %s", exc)
        return empty

    channels: dict[str, Any] = {}
    for key in VISIT_TYPE_LABELS:
        channel_items = [item for item in items if item.get("visit_type") == key]
        ratings = [item["rating"] for item in channel_items if 1 <= item.get("rating", 0) <= 5]
        channels[key] = {
            "key": key,
            "label": VISIT_TYPE_LABELS[key],
            "count": len(ratings),
            "average": round(sum(ratings) / len(ratings), 1) if ratings else 0.0,
            "distribution": [
                {"rating": value, "count": ratings.count(value)} for value in range(5, 0, -1)
            ],
        }

    comments = [
        {
            "id": item.get("id"),
            "visit_type": item["visit_type"],
            "visit_type_label": item["visit_type_label"],
            "rating": item["rating"],
            "name": item["public_display_name"],
            "comment": item["comments"],
            "date": item["display_date"].split(" ", 3)[:3],
        }
        for item in items
        if item.get("public_display_consent")
        and item.get("comment_status") == "published"
        and item.get("comments")
    ]
    for item in comments:
        item["date"] = " ".join(item["date"])
    return {
        "channels": channels,
        "comments": comments[:24],
        "pending_comment_count": sum(
            1
            for item in items
            if item.get("public_display_consent")
            and item.get("comment_status") == "pending"
            and item.get("comments")
        ),
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
        try:
            item["moderation_log"] = list_visitor_feedback_moderation_log(feedback_id)
        except Exception as exc:
            current_app.logger.warning("Could not load moderation log for feedback %s: %s", feedback_id, exc)
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
        "analyzed": "Visitor feedback sentiment analysis updated successfully.",
        "comment-published": "The visitor comment is now public.",
        "comment-withheld": "The comment was withheld and the reason was recorded.",
        "rating-excluded": "The ineligible rating was excluded and the reason was recorded.",
        "rating-reinstated": "The rating is included in the public aggregate again.",
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
        analysis_message=(
            "Sentiment analysis updated. Review the confidence and original comment before making a decision."
            if str(request.args.get("analysis") or "").strip().lower() == "updated"
            else None
        ),
    )
