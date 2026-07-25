import hmac
import os
import re
import secrets
import threading
import time
from datetime import datetime, timedelta
from functools import wraps
from pathlib import Path
from urllib.parse import urlparse

from flask import Flask, g, jsonify, make_response, redirect, render_template, request, send_from_directory, session, url_for
from werkzeug.security import check_password_hash
from werkzeug.utils import secure_filename

from admin_users_repository import get_active_admin_user_by_email
from community_content import load_news_community_highlights, register_community_content_routes
from community_content.service import load_admin_community_highlights
from edu_resources_content import load_admin_edu_resources, load_public_edu_resources, register_edu_resources_routes
from online_gallery_content import (
    ONLINE_GALLERY_UPLOAD_DIR,
    load_public_online_gallery_categories,
    load_public_online_gallery_items,
    register_online_gallery_content_routes,
)
from online_gallery_content.service import load_admin_online_gallery_items
from participation_submissions_content import load_admin_participation_submissions, register_participation_submission_routes
from public_users_repository import get_public_user_profile_by_id
from supabase_storage import delete_public_image, resolve_public_image_url, upload_public_file, upload_public_image
from supabase_client import is_supabase_configured
from tour_bookings_content import load_admin_tour_bookings, load_public_tour_bookings, register_tour_booking_routes
from user_accounts_content import load_user_bookmarked_gallery_item_ids, register_user_account_routes
from user_management_content import load_admin_public_users, register_user_management_routes
from visitor_feedback_content import load_admin_visitor_feedback, register_visitor_feedback_routes

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover - optional in some environments
    load_dotenv = None


PROJECT_ROOT = Path(__file__).resolve().parent
WEBXR_BASE_DIR = (PROJECT_ROOT / "webxr_runtime").resolve()
PUBLIC_AR_ARTIFACTS_DIR = (PROJECT_ROOT / "public" / "AR-Artifacts").resolve()
STATIC_AR_ARTIFACTS_DIR = (PROJECT_ROOT / "static" / "AR-Artifacts").resolve()

if load_dotenv is not None:
    load_dotenv(dotenv_path=PROJECT_ROOT / ".env", override=False)


def _bool_env(name, default):
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _configured_admin_image_sources():
    # Local upload previews use object URLs before the image reaches Supabase.
    sources = ["'self'", "data:", "blob:"]
    configured_url = (os.getenv("SUPABASE_URL") or "").strip()
    if not configured_url:
        return " ".join(sources)

    parsed = urlparse(configured_url)
    hostname = str(parsed.hostname or "").strip().lower()
    if parsed.scheme == "https" and hostname and re.fullmatch(r"[a-z0-9.-]+", hostname):
        sources.append(f"https://{hostname}")
    return " ".join(sources)


app = Flask(__name__)
ADMIN_IMAGE_SOURCES = _configured_admin_image_sources()

IS_PRODUCTION = os.getenv("FLASK_ENV", "development").strip().lower() in {"prod", "production"}
_secret_key = os.getenv("FLASK_SECRET_KEY", "").strip()
if not _secret_key:
    if IS_PRODUCTION:
        raise RuntimeError("FLASK_SECRET_KEY must be set in production.")
    _secret_key = secrets.token_hex(32)

app.config.update(
    SECRET_KEY=_secret_key,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=_bool_env("SESSION_COOKIE_SECURE", IS_PRODUCTION),
    PERMANENT_SESSION_LIFETIME=timedelta(minutes=max(5, int(os.getenv("ADMIN_SESSION_MINUTES", "120")))),
)

ADMIN_ROUTE_PREFIX = "/_admin"
ADMIN_LOGIN_PATH = f"{ADMIN_ROUTE_PREFIX}/login"
ADMIN_DASHBOARD_PATH = ADMIN_ROUTE_PREFIX
ADMIN_LOGOUT_PATH = f"{ADMIN_ROUTE_PREFIX}/logout"

ADMIN_SESSION_KEY = "admin_authenticated"
ADMIN_SESSION_USER_KEY = "admin_email"
ADMIN_CSRF_KEY = "admin_csrf"
ADMIN_DEFAULT_USERNAME = "Administrator"
PUBLIC_SESSION_KEY = "public_authenticated"
PUBLIC_SESSION_USER_ID_KEY = "public_user_id"
PUBLIC_CSRF_KEY = "public_csrf"

ADMIN_LOGIN_RATE_WINDOW_SECONDS = max(60, int(os.getenv("ADMIN_LOGIN_RATE_WINDOW_SECONDS", "900")))
ADMIN_LOGIN_MAX_ATTEMPTS = max(3, int(os.getenv("ADMIN_LOGIN_MAX_ATTEMPTS", "5")))
ADMIN_LOGIN_LOCKOUT_SECONDS = max(30, int(os.getenv("ADMIN_LOGIN_LOCKOUT_SECONDS", "900")))
PUBLIC_LOGIN_RATE_WINDOW_SECONDS = max(60, int(os.getenv("PUBLIC_LOGIN_RATE_WINDOW_SECONDS", "900")))
PUBLIC_LOGIN_MAX_ATTEMPTS = max(3, int(os.getenv("PUBLIC_LOGIN_MAX_ATTEMPTS", "6")))
PUBLIC_LOGIN_LOCKOUT_SECONDS = max(30, int(os.getenv("PUBLIC_LOGIN_LOCKOUT_SECONDS", "900")))
PUBLIC_SIGNUP_RATE_WINDOW_SECONDS = max(60, int(os.getenv("PUBLIC_SIGNUP_RATE_WINDOW_SECONDS", "1800")))
PUBLIC_SIGNUP_MAX_ATTEMPTS = max(2, int(os.getenv("PUBLIC_SIGNUP_MAX_ATTEMPTS", "4")))
PUBLIC_SIGNUP_LOCKOUT_SECONDS = max(30, int(os.getenv("PUBLIC_SIGNUP_LOCKOUT_SECONDS", "1800")))
PUBLIC_ACTION_RATE_WINDOW_SECONDS = max(10, int(os.getenv("PUBLIC_ACTION_RATE_WINDOW_SECONDS", "300")))
PUBLIC_ACTION_MAX_ATTEMPTS = max(1, int(os.getenv("PUBLIC_ACTION_MAX_ATTEMPTS", "8")))
TRUST_PROXY_HEADERS = _bool_env("TRUST_PROXY_HEADERS", False)

_ADMIN_LOGIN_ATTEMPTS = {}
_ADMIN_LOGIN_ATTEMPTS_LOCK = threading.Lock()
_PUBLIC_AUTH_ATTEMPTS = {"login": {}, "signup": {}}
_PUBLIC_AUTH_ATTEMPTS_LOCK = threading.Lock()
_PUBLIC_ACTION_ATTEMPTS = {}
_PUBLIC_ACTION_ATTEMPTS_LOCK = threading.Lock()


def _build_webxr_config():
    if load_dotenv is not None:
        load_dotenv(dotenv_path=WEBXR_BASE_DIR / ".env", override=False)

    from webxr_runtime.app.config import get_config_class

    config_class = get_config_class()
    config = {}

    for name in dir(config_class):
        if name.isupper():
            config[name] = getattr(config_class, name)

    return config


def _initialize_webxr_runtime():
    try:
        from webxr_runtime.app.services import RuntimeSceneService

        config = _build_webxr_config()
        runtime_scene = RuntimeSceneService(config)
        runtime_scene.initialize()

        app.logger.info("WebXR runtime initialized from %s", config.get("BASE_DIR"))
        return config, runtime_scene, None
    except Exception as exc:  # noqa: BLE001
        app.logger.exception("WebXR runtime initialization failed.")
        return {}, None, str(exc)


def _resolve_safe_path(root_dir, relative_path):
    root_resolved = Path(root_dir).resolve()
    candidate = (root_resolved / relative_path).resolve()

    if root_resolved not in candidate.parents and candidate != root_resolved:
        return None

    return candidate


def _get_webxr_config_value(name, fallback):
    if isinstance(WEBXR_CONFIG, dict):
        value = WEBXR_CONFIG.get(name)
        if value not in (None, ""):
            return value
    return fallback


def _ensure_webxr_runtime_initialized():
    global WEBXR_CONFIG
    global WEBXR_RUNTIME_SCENE
    global WEBXR_INIT_ERROR

    if WEBXR_RUNTIME_SCENE is not None:
        return True

    WEBXR_CONFIG, WEBXR_RUNTIME_SCENE, WEBXR_INIT_ERROR = _initialize_webxr_runtime()
    return WEBXR_RUNTIME_SCENE is not None


def _slugify_text(value, fallback="exhibit"):
    normalized = re.sub(r"[^a-z0-9]+", "-", str(value or "").strip().lower())
    normalized = normalized.strip("-")
    return normalized or fallback


def _normalize_checkbox(raw_value):
    return str(raw_value or "").strip().lower() in {"1", "true", "on", "yes"}


def _validate_event_date(raw_value):
    raw_text = str(raw_value or "").strip()
    if not raw_text:
        raise ValueError("Event date is required.")

    try:
        return datetime.strptime(raw_text, "%Y-%m-%d").date().isoformat()
    except ValueError as exc:
        raise ValueError("Event date must use YYYY-MM-DD format.") from exc


def _parse_dashboard_datetime(raw_value):
    raw_text = str(raw_value or "").strip()
    if not raw_text:
        return None

    try:
        return datetime.fromisoformat(raw_text.replace("Z", "+00:00"))
    except ValueError:
        pass

    try:
        return datetime.strptime(raw_text, "%Y-%m-%d")
    except ValueError:
        return None


def _format_dashboard_datetime(raw_value):
    parsed = _parse_dashboard_datetime(raw_value)
    if parsed is not None:
        return parsed.strftime("%b %d, %Y")

    raw_text = str(raw_value or "").strip()
    return raw_text or "Date unavailable"


def _dashboard_sort_key(*raw_values):
    for raw_value in raw_values:
        parsed = _parse_dashboard_datetime(raw_value)
        if parsed is not None:
            return (1, parsed.timestamp())

        raw_text = str(raw_value or "").strip()
        if raw_text:
            return (0, raw_text)

    return (0, "")


def _dashboard_status_class(status):
    status_key = str(status or "").strip().lower()
    if status_key in {"active", "published", "confirmed", "reviewed"}:
        return "is-published"
    if status_key == "cancelled":
        return "is-cancelled"
    if status_key == "rescheduled":
        return "is-rescheduled"
    return "is-draft"


def _dashboard_status_label(status, fallback="Unknown"):
    raw_text = str(status or "").strip().replace("_", " ")
    return raw_text.title() if raw_text else fallback


def _build_admin_dashboard_context():
    highlights_items = load_admin_community_highlights()
    gallery_items = load_admin_online_gallery_items()
    resources_items = load_admin_edu_resources()
    booking_items = load_admin_tour_bookings()
    submission_items = load_admin_participation_submissions()
    feedback_items = load_admin_visitor_feedback()
    user_items = load_admin_public_users()

    active_users = [item for item in user_items if item.get("is_active")]
    deactivated_users = [item for item in user_items if not item.get("is_active")]

    active_highlights = [item for item in highlights_items if item.get("status") == "active"]
    draft_highlights = [item for item in highlights_items if item.get("status") == "draft"]
    archived_highlights = [item for item in highlights_items if item.get("status") == "archived"]

    published_gallery = [item for item in gallery_items if bool(item.get("is_published"))]
    draft_gallery = [item for item in gallery_items if not bool(item.get("is_published"))]

    active_resources = [item for item in resources_items if item.get("status") == "active"]
    draft_resources = [item for item in resources_items if item.get("status") == "draft"]
    archived_resources = [item for item in resources_items if item.get("status") == "archived"]

    pending_bookings = [item for item in booking_items if item.get("status") == "pending"]
    confirmed_bookings = [item for item in booking_items if item.get("status") == "confirmed"]
    rescheduled_bookings = [item for item in booking_items if item.get("status") == "rescheduled"]
    cancelled_bookings = [item for item in booking_items if item.get("status") == "cancelled"]

    pending_review_submissions = [item for item in submission_items if item.get("status") == "pending_review"]
    awaiting_verification_submissions = [item for item in submission_items if item.get("status") == "pending_verification"]
    active_submissions = [item for item in submission_items if item.get("status") == "active"]
    archived_submissions = [item for item in submission_items if item.get("status") == "archived"]

    new_feedback = [item for item in feedback_items if item.get("status") == "new"]
    reviewed_feedback = [item for item in feedback_items if item.get("status") == "reviewed"]
    archived_feedback = [item for item in feedback_items if item.get("status") == "archived"]

    open_review_total = (
        len(pending_bookings)
        + len(pending_review_submissions)
        + len(awaiting_verification_submissions)
        + len(new_feedback)
    )

    dashboard_stat_cards = [
        {
            "icon_class": "visitors",
            "label": "Registered Users",
            "value": len(user_items),
            "summary": f"{len(active_users)} active · {len(deactivated_users)} deactivated",
            "href": url_for("admin_users"),
            "action_label": "Manage users",
        },
        {
            "icon_class": "posts",
            "label": "Community Highlights",
            "value": len(highlights_items),
            "summary": f"{len(active_highlights)} active · {len(draft_highlights)} draft",
            "href": url_for("admin_community_highlights"),
            "action_label": "Manage",
        },
        {
            "icon_class": "views",
            "label": "Gallery Cards",
            "value": len(gallery_items),
            "summary": f"{len(published_gallery)} published · {len(draft_gallery)} draft",
            "href": url_for("admin_online_gallery"),
            "action_label": "Open gallery",
        },
        {
            "icon_class": "media",
            "label": "Edu Resources",
            "value": len(resources_items),
            "summary": f"{len(active_resources)} active · {len(draft_resources)} draft",
            "href": url_for("admin_edu_resources"),
            "action_label": "Manage resources",
        },
        {
            "icon_class": "visitors",
            "label": "Open Review Queue",
            "value": open_review_total,
            "summary": (
                f"{len(pending_bookings)} bookings · "
                f"{len(pending_review_submissions) + len(awaiting_verification_submissions)} submissions · "
                f"{len(new_feedback)} feedback"
            ),
            "href": "#dashboard-review-queue",
            "action_label": "See queue",
        },
    ]

    dashboard_content_breakdown = [
        {
            "label": "Highlights",
            "count": len(highlights_items),
            "legend_class": "legend-news",
            "color": "#1b4332",
            "href": url_for("admin_community_highlights"),
        },
        {
            "label": "Submissions",
            "count": len(submission_items),
            "legend_class": "legend-events",
            "color": "#c9a84c",
            "href": url_for("admin_participation_submissions"),
        },
        {
            "label": "Gallery",
            "count": len(gallery_items),
            "legend_class": "legend-gallery",
            "color": "#2d6a4f",
            "href": url_for("admin_online_gallery"),
        },
        {
            "label": "Edu Resources",
            "count": len(resources_items),
            "legend_class": "legend-articles",
            "color": "#a07830",
            "href": url_for("admin_edu_resources"),
        },
    ]
    dashboard_content_total = sum(item["count"] for item in dashboard_content_breakdown)
    if dashboard_content_total > 0:
        range_start = 0.0
        chart_segments = []
        for index, item in enumerate(dashboard_content_breakdown):
            percentage = (item["count"] / dashboard_content_total) * 100
            range_end = 100.0 if index == len(dashboard_content_breakdown) - 1 else range_start + percentage
            item["percentage_value"] = percentage
            item["percentage_label"] = f"{round(percentage)}%"
            chart_segments.append(f"{item['color']} {range_start:.2f}% {range_end:.2f}%")
            range_start = range_end
        dashboard_content_chart = f"conic-gradient({', '.join(chart_segments)})"
    else:
        for item in dashboard_content_breakdown:
            item["percentage_value"] = 0
            item["percentage_label"] = "0%"
        dashboard_content_chart = "conic-gradient(#e5e7eb 0 100%)"

    dashboard_review_queue = []
    for booking_item in pending_bookings:
        dashboard_review_queue.append(
            {
                "title": booking_item.get("display_title") or booking_item.get("scheduled_tour") or "Booking Request",
                "module_label": "Bookings",
                "meta_label": (
                    f"{booking_item.get('contact_person') or 'No contact'} · "
                    f"{booking_item.get('total_visitors') or booking_item.get('group_size') or 0} visitors"
                ),
                "date_label": booking_item.get("display_date") or _format_dashboard_datetime(booking_item.get("visit_date")),
                "status_label": booking_item.get("status_label") or "Pending Review",
                "status_class": _dashboard_status_class(booking_item.get("status")),
                "action_href": url_for("admin_tour_booking_review", booking_id=booking_item.get("id")),
                "action_label": "Review",
                "sort_key": _dashboard_sort_key(
                    booking_item.get("created_at"),
                    booking_item.get("updated_at"),
                    booking_item.get("visit_date"),
                ),
            }
        )

    for submission_item in pending_review_submissions + awaiting_verification_submissions:
        dashboard_review_queue.append(
            {
                "title": submission_item.get("title") or "Community Submission",
                "module_label": "Submissions",
                "meta_label": (
                    f"{submission_item.get('submission_type_label') or 'Submission'} · "
                    f"{submission_item.get('submitter_name') or submission_item.get('contributor_display') or 'Anonymous'}"
                ),
                "date_label": submission_item.get("display_date") or _format_dashboard_datetime(submission_item.get("created_at")),
                "status_label": _dashboard_status_label(submission_item.get("status"), "Pending Review"),
                "status_class": _dashboard_status_class(submission_item.get("status")),
                "action_href": url_for("admin_participation_submission_review", submission_id=submission_item.get("id")),
                "action_label": "Review",
                "sort_key": _dashboard_sort_key(submission_item.get("created_at"), submission_item.get("updated_at")),
            }
        )

    for feedback_item in new_feedback:
        dashboard_review_queue.append(
            {
                "title": feedback_item.get("visitor_display") or "Visitor Feedback",
                "module_label": "Feedback",
                "meta_label": (
                    f"{feedback_item.get('visit_type_label') or 'Visitor feedback'} · "
                    f"{feedback_item.get('rating_label') or 'Unrated'}"
                ),
                "date_label": feedback_item.get("display_date") or _format_dashboard_datetime(feedback_item.get("created_at")),
                "status_label": "New",
                "status_class": _dashboard_status_class(feedback_item.get("status")),
                "action_href": url_for("admin_visitor_feedback_review", feedback_id=feedback_item.get("id")),
                "action_label": "Review",
                "sort_key": _dashboard_sort_key(feedback_item.get("created_at"), feedback_item.get("updated_at")),
            }
        )
    dashboard_review_queue.sort(key=lambda item: item["sort_key"], reverse=True)
    dashboard_review_queue = dashboard_review_queue[:8]

    dashboard_recent_activity = []
    for highlight_item in highlights_items:
        dashboard_recent_activity.append(
            {
                "title": highlight_item.get("title") or "Community Highlight",
                "module_label": "Highlights",
                "meta_label": highlight_item.get("category") or "Community highlight",
                "date_label": highlight_item.get("display_date") or _format_dashboard_datetime(highlight_item.get("updated_at") or highlight_item.get("created_at")),
                "status_label": _dashboard_status_label(highlight_item.get("status"), "Draft"),
                "status_class": _dashboard_status_class(highlight_item.get("status")),
                "action_href": url_for("admin_community_highlight_edit", highlight_id=highlight_item.get("id")),
                "action_label": "Edit",
                "sort_key": _dashboard_sort_key(
                    highlight_item.get("updated_at"),
                    highlight_item.get("created_at"),
                    highlight_item.get("event_date"),
                ),
            }
        )

    for gallery_item in gallery_items:
        dashboard_recent_activity.append(
            {
                "title": gallery_item.get("title") or gallery_item.get("title_tl") or gallery_item.get("title_en") or "Gallery Card",
                "module_label": "Gallery",
                "meta_label": gallery_item.get("category") or "Online Gallery",
                "date_label": _format_dashboard_datetime(gallery_item.get("updated_at") or gallery_item.get("created_at")),
                "status_label": "Published" if gallery_item.get("is_published") else "Draft",
                "status_class": _dashboard_status_class("published" if gallery_item.get("is_published") else "draft"),
                "action_href": url_for("admin_online_gallery_edit", item_id=gallery_item.get("id")),
                "action_label": "Edit",
                "sort_key": _dashboard_sort_key(gallery_item.get("updated_at"), gallery_item.get("created_at")),
            }
        )

    for resource_item in resources_items:
        dashboard_recent_activity.append(
            {
                "title": resource_item.get("title") or "Edu Resource",
                "module_label": "Edu Resources",
                "meta_label": resource_item.get("category") or resource_item.get("metadata_value") or "Resource",
                "date_label": _format_dashboard_datetime(resource_item.get("updated_at") or resource_item.get("created_at")),
                "status_label": _dashboard_status_label(resource_item.get("status"), "Draft"),
                "status_class": _dashboard_status_class(resource_item.get("status")),
                "action_href": url_for("admin_edu_resource_edit", item_id=resource_item.get("id")),
                "action_label": "Edit",
                "sort_key": _dashboard_sort_key(resource_item.get("updated_at"), resource_item.get("created_at")),
            }
        )

    for submission_item in submission_items:
        dashboard_recent_activity.append(
            {
                "title": submission_item.get("title") or "Participation Submission",
                "module_label": "Submissions",
                "meta_label": submission_item.get("submission_type_label") or "Community Participation",
                "date_label": submission_item.get("display_date") or _format_dashboard_datetime(submission_item.get("created_at")),
                "status_label": _dashboard_status_label(submission_item.get("status"), "Pending Review"),
                "status_class": _dashboard_status_class(submission_item.get("status")),
                "action_href": url_for("admin_participation_submission_review", submission_id=submission_item.get("id")),
                "action_label": "Review",
                "sort_key": _dashboard_sort_key(submission_item.get("updated_at"), submission_item.get("created_at")),
            }
        )

    for booking_item in booking_items:
        dashboard_recent_activity.append(
            {
                "title": booking_item.get("display_title") or booking_item.get("scheduled_tour") or "Tour Booking",
                "module_label": "Bookings",
                "meta_label": booking_item.get("booking_type_label") or "Tour Booking",
                "date_label": booking_item.get("display_date") or _format_dashboard_datetime(booking_item.get("visit_date")),
                "status_label": booking_item.get("status_label") or _dashboard_status_label(booking_item.get("status"), "Pending Review"),
                "status_class": _dashboard_status_class(booking_item.get("status")),
                "action_href": url_for("admin_tour_booking_review", booking_id=booking_item.get("id")),
                "action_label": "Open",
                "sort_key": _dashboard_sort_key(
                    booking_item.get("updated_at"),
                    booking_item.get("created_at"),
                    booking_item.get("visit_date"),
                ),
            }
        )

    for feedback_item in feedback_items:
        dashboard_recent_activity.append(
            {
                "title": feedback_item.get("visitor_display") or "Visitor Feedback",
                "module_label": "Feedback",
                "meta_label": feedback_item.get("visit_type_label") or "Visitor feedback",
                "date_label": feedback_item.get("display_date") or _format_dashboard_datetime(feedback_item.get("created_at")),
                "status_label": _dashboard_status_label(feedback_item.get("status"), "New"),
                "status_class": _dashboard_status_class(feedback_item.get("status")),
                "action_href": url_for("admin_visitor_feedback_review", feedback_id=feedback_item.get("id")),
                "action_label": "Open",
                "sort_key": _dashboard_sort_key(feedback_item.get("updated_at"), feedback_item.get("created_at")),
            }
        )
    dashboard_recent_activity.sort(key=lambda item: item["sort_key"], reverse=True)
    dashboard_recent_activity = dashboard_recent_activity[:8]

    dashboard_workspace_rows = [
        {
            "short_label": "Users",
            "count": len(user_items),
            "href": url_for("admin_users"),
        },
        {
            "short_label": "Highlights",
            "count": len(highlights_items),
            "href": url_for("admin_community_highlights"),
        },
        {
            "short_label": "Gallery",
            "count": len(gallery_items),
            "href": url_for("admin_online_gallery"),
        },
        {
            "short_label": "Resources",
            "count": len(resources_items),
            "href": url_for("admin_edu_resources"),
        },
        {
            "short_label": "Bookings",
            "count": len(booking_items),
            "href": url_for("admin_tour_bookings"),
        },
        {
            "short_label": "Submissions",
            "count": len(submission_items),
            "href": url_for("admin_participation_submissions"),
        },
        {
            "short_label": "Feedback",
            "count": len(feedback_items),
            "href": url_for("admin_visitor_feedback"),
        },
    ]
    workspace_max_count = max((item["count"] for item in dashboard_workspace_rows), default=0)
    for item in dashboard_workspace_rows:
        if workspace_max_count <= 0 or item["count"] <= 0:
            item["bar_width"] = 0
        else:
            item["bar_width"] = max(12, round((item["count"] / workspace_max_count) * 100))

    dashboard_overview_rows = [
        {
            "label": "Registered Users",
            "description": "Visitor accounts that can sign in to the public site.",
            "count": len(user_items),
            "summary": f"{len(active_users)} active · {len(deactivated_users)} deactivated",
            "action_href": url_for("admin_users"),
            "action_label": "Manage",
        },
        {
            "label": "Community Highlights",
            "description": "Public stories, updates, and featured museum content.",
            "count": len(highlights_items),
            "summary": f"{len(active_highlights)} active · {len(draft_highlights)} draft · {len(archived_highlights)} archived",
            "action_href": url_for("admin_community_highlights"),
            "action_label": "Manage",
        },
        {
            "label": "Online Gallery",
            "description": "Gallery cards connected to your public artifact archive.",
            "count": len(gallery_items),
            "summary": f"{len(published_gallery)} published · {len(draft_gallery)} draft",
            "action_href": url_for("admin_online_gallery"),
            "action_label": "Open",
        },
        {
            "label": "Edu Resources",
            "description": "Learning materials and downloadable resources for visitors and educators.",
            "count": len(resources_items),
            "summary": f"{len(active_resources)} active · {len(draft_resources)} draft · {len(archived_resources)} archived",
            "action_href": url_for("admin_edu_resources"),
            "action_label": "Manage",
        },
        {
            "label": "Tour Bookings",
            "description": "Scheduled visits, pending requests, and rescheduled tours.",
            "count": len(booking_items),
            "summary": (
                f"{len(pending_bookings)} pending · {len(confirmed_bookings)} confirmed · "
                f"{len(rescheduled_bookings)} rescheduled · {len(cancelled_bookings)} cancelled"
            ),
            "action_href": url_for("admin_tour_bookings"),
            "action_label": "Review",
        },
        {
            "label": "Participation Submissions",
            "description": "Teacher Corner and Story Submit contributions from the public.",
            "count": len(submission_items),
            "summary": (
                f"{len(pending_review_submissions)} pending review · {len(awaiting_verification_submissions)} awaiting verification · "
                f"{len(active_submissions)} active · {len(archived_submissions)} archived"
            ),
            "action_href": url_for("admin_participation_submissions"),
            "action_label": "Open",
        },
        {
            "label": "Visitor Feedback",
            "description": "Moderation queue for on-site and website visitor responses.",
            "count": len(feedback_items),
            "summary": f"{len(new_feedback)} new · {len(reviewed_feedback)} reviewed · {len(archived_feedback)} archived",
            "action_href": url_for("admin_visitor_feedback"),
            "action_label": "Review",
        },
    ]

    return {
        "dashboard_config_error": None
        if is_supabase_configured()
        else "Supabase admin content integrations are not configured. Dashboard queues and counts will remain empty until configuration is complete.",
        "dashboard_stat_cards": dashboard_stat_cards,
        "dashboard_content_breakdown": dashboard_content_breakdown,
        "dashboard_content_breakdown_total": dashboard_content_total,
        "dashboard_content_breakdown_chart": dashboard_content_chart,
        "dashboard_review_queue": dashboard_review_queue,
        "dashboard_recent_activity": dashboard_recent_activity,
        "dashboard_workspace_rows": dashboard_workspace_rows,
        "dashboard_overview_rows": dashboard_overview_rows,
    }


def _delete_local_image(image_filename, upload_dir):
    folder_prefix = Path(upload_dir).name.strip()
    if delete_public_image(image_filename, folder_prefix=folder_prefix):
        return

    safe_filename = Path(str(image_filename or "")).name.strip()
    if not safe_filename:
        return

    candidate_path = (upload_dir / safe_filename).resolve()
    if upload_dir not in candidate_path.parents and candidate_path != upload_dir:
        return
    if candidate_path.exists() and candidate_path.is_file():
        candidate_path.unlink()


def _save_uploaded_image(file_storage, title, upload_dir):
    folder_prefix = Path(upload_dir).name.strip() or "uploads"
    return upload_public_image(
        file_storage,
        title=title,
        folder_prefix=folder_prefix,
        slugify_text=_slugify_text,
    )


def _save_uploaded_file(file_storage, title, upload_dir, allowed_extensions, invalid_type_message):
    folder_prefix = Path(upload_dir).name.strip() or "uploads"
    return upload_public_file(
        file_storage,
        title=title,
        folder_prefix=folder_prefix,
        slugify_text=_slugify_text,
        allowed_extensions=allowed_extensions,
        invalid_type_message=invalid_type_message,
    )


ADMIN_EMAIL_PATTERN = re.compile(
    r"^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*"
    r"@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"
    r"(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$"
)


def _normalize_admin_email(raw_value):
    return str(raw_value or "").strip().lower()


def _is_admin_auth_configured():
    return is_supabase_configured()


def _get_client_ip():
    if TRUST_PROXY_HEADERS:
        forwarded_for = str(request.headers.get("X-Forwarded-For", "")).strip()
        if forwarded_for:
            return forwarded_for.split(",", 1)[0].strip()[:64] or "unknown"
    return str(request.remote_addr or "unknown")[:64]


def _prune_login_attempts(now):
    expired_keys = []
    for key, entry in _ADMIN_LOGIN_ATTEMPTS.items():
        window_start = float(entry.get("window_start", now))
        locked_until = float(entry.get("locked_until", 0.0))
        if now - window_start > ADMIN_LOGIN_RATE_WINDOW_SECONDS and now >= locked_until:
            expired_keys.append(key)
    for key in expired_keys:
        _ADMIN_LOGIN_ATTEMPTS.pop(key, None)


def _is_login_rate_limited(client_ip):
    now = time.monotonic()
    with _ADMIN_LOGIN_ATTEMPTS_LOCK:
        _prune_login_attempts(now)
        entry = _ADMIN_LOGIN_ATTEMPTS.get(client_ip)
        if not entry:
            return False, 0
        locked_until = float(entry.get("locked_until", 0.0))
        if locked_until > now:
            retry_after = max(1, int(locked_until - now))
            return True, retry_after
    return False, 0


def _record_failed_login(client_ip):
    now = time.monotonic()
    with _ADMIN_LOGIN_ATTEMPTS_LOCK:
        _prune_login_attempts(now)
        entry = _ADMIN_LOGIN_ATTEMPTS.get(client_ip)
        if not entry or now - float(entry.get("window_start", now)) > ADMIN_LOGIN_RATE_WINDOW_SECONDS:
            entry = {
                "window_start": now,
                "attempts": 0,
                "locked_until": 0.0,
            }

        entry["attempts"] = int(entry.get("attempts", 0)) + 1
        if entry["attempts"] >= ADMIN_LOGIN_MAX_ATTEMPTS:
            entry["locked_until"] = now + ADMIN_LOGIN_LOCKOUT_SECONDS
        _ADMIN_LOGIN_ATTEMPTS[client_ip] = entry


def _clear_failed_logins(client_ip):
    with _ADMIN_LOGIN_ATTEMPTS_LOCK:
        _ADMIN_LOGIN_ATTEMPTS.pop(client_ip, None)


def _is_valid_admin_email(email):
    if not email or len(email) > 254 or email.count("@") != 1:
        return False
    local_part, _domain = email.rsplit("@", 1)
    if len(local_part) > 64:
        return False
    return ADMIN_EMAIL_PATTERN.fullmatch(email) is not None


def _is_valid_login_payload(email, password):
    if not _is_valid_admin_email(email):
        return False
    if not password or len(password) > 1024:
        return False
    return True


def _authenticate_admin_credentials(email, password):
    if not _is_admin_auth_configured():
        return None

    try:
        admin_user = get_active_admin_user_by_email(email)
    except (ValueError, TypeError):
        return None
    except Exception:  # noqa: BLE001
        app.logger.exception("Failed to fetch admin user credentials from Supabase.")
        return None

    if not admin_user:
        return False

    stored_email = _normalize_admin_email(admin_user.get("email", ""))
    stored_password_hash = str(admin_user.get("password_hash", "") or "")

    if not stored_email or not stored_password_hash:
        return False
    if not hmac.compare_digest(email, stored_email):
        return False

    try:
        if check_password_hash(stored_password_hash, password):
            return stored_email
    except (ValueError, TypeError):
        return False

    return False


def _ensure_admin_csrf_token():
    token = session.get(ADMIN_CSRF_KEY)
    if not isinstance(token, str) or not token:
        token = secrets.token_urlsafe(32)
        session[ADMIN_CSRF_KEY] = token
    return token


def _is_admin_csrf_valid(submitted_token):
    stored_token = session.get(ADMIN_CSRF_KEY)
    if not isinstance(stored_token, str) or not stored_token:
        return False
    return hmac.compare_digest(stored_token, str(submitted_token or ""))


def _is_admin_authenticated():
    if session.get(ADMIN_SESSION_KEY) is not True:
        return False
    session_email = _normalize_admin_email(session.get(ADMIN_SESSION_USER_KEY, ""))
    return _is_valid_admin_email(session_email)


def _admin_required(view_func):
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        if not _is_admin_authenticated():
            return redirect(url_for("admin_login"))
        return view_func(*args, **kwargs)

    return wrapped


@app.after_request
def _set_security_headers(response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Permissions-Policy", "camera=(self), microphone=(), geolocation=(), payment=()")

    if request.path.startswith(ADMIN_ROUTE_PREFIX):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["X-Robots-Tag"] = "noindex, nofollow, noarchive"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            f"img-src {ADMIN_IMAGE_SOURCES}; "
            "script-src 'self' https://cdnjs.cloudflare.com; "
            "style-src 'self'; "
            "connect-src 'self'; "
            "font-src 'self'; "
            "base-uri 'self'; "
            "form-action 'self'; "
            "frame-ancestors 'none'; "
            "object-src 'none'"
        )

    if request.path in {"/login", "/signup", "/account"} or request.path.startswith("/account"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"

    return response


WEBXR_CONFIG, WEBXR_RUNTIME_SCENE, WEBXR_INIT_ERROR = _initialize_webxr_runtime()


@app.route(ADMIN_LOGIN_PATH, methods=["GET", "POST"])
def admin_login():
    if _is_admin_authenticated():
        return redirect(url_for("admin_dashboard"))

    status_code = 200
    error_message = None

    if request.method == "POST":
        if not _is_admin_auth_configured():
            status_code = 503
            error_message = "Login is temporarily unavailable."
        elif not _is_admin_csrf_valid(request.form.get("csrf_token")):
            status_code = 400
            error_message = "Invalid request."
        else:
            client_ip = _get_client_ip()
            is_limited, retry_after_seconds = _is_login_rate_limited(client_ip)
            if is_limited:
                status_code = 429
                error_message = f"Too many attempts. Try again in {retry_after_seconds} seconds."
            else:
                email = _normalize_admin_email(request.form.get("email", ""))
                password = str(request.form.get("password", ""))

                if _is_valid_login_payload(email, password):
                    authenticated_email = _authenticate_admin_credentials(email, password)

                    if authenticated_email is None:
                        status_code = 503
                        error_message = "Login is temporarily unavailable."
                    elif authenticated_email:
                        _clear_failed_logins(client_ip)
                        session.clear()
                        session.permanent = True
                        session[ADMIN_SESSION_KEY] = True
                        session[ADMIN_SESSION_USER_KEY] = authenticated_email
                        session[ADMIN_CSRF_KEY] = secrets.token_urlsafe(32)
                        return redirect(url_for("admin_dashboard"))
                    else:
                        _record_failed_login(client_ip)
                        status_code = 401
                        error_message = "Invalid credentials."
                else:
                    _record_failed_login(client_ip)
                    status_code = 401
                    error_message = "Invalid credentials."

    csrf_token = _ensure_admin_csrf_token()
    response = make_response(
        render_template("admin/AdminLogin.html", csrf_token=csrf_token, error_message=error_message),
        status_code,
    )
    return response


@app.route(ADMIN_DASHBOARD_PATH)
@_admin_required
def admin_dashboard():
    csrf_token = _ensure_admin_csrf_token()
    admin_username = session.get(ADMIN_SESSION_USER_KEY, ADMIN_DEFAULT_USERNAME)
    dashboard_context = _build_admin_dashboard_context()
    return render_template(
        "admin/AdminDashboard.html",
        csrf_token=csrf_token,
        admin_username=admin_username,
        **dashboard_context,
    )


@app.route(ADMIN_LOGOUT_PATH, methods=["POST"])
@_admin_required
def admin_logout():
    if not _is_admin_csrf_valid(request.form.get("csrf_token")):
        return redirect(url_for("admin_login"))
    session.clear()
    return redirect(url_for("admin_login"))


def _resolve_public_user_avatar(user):
    """Turn a stored profile_picture (Google URL or Supabase path) into a usable
    <img> src, or None so templates fall back to initials."""
    if not user:
        return None
    raw = str(user.get("profile_picture") or "").strip()
    if not raw:
        return None
    try:
        return resolve_public_image_url(raw)
    except Exception:  # noqa: BLE001
        app.logger.warning("Could not resolve avatar for a public user.")
        return raw if raw.startswith(("http://", "https://")) else None


@app.context_processor
def inject_public_auth_context():
    current_public_user = _get_current_public_user()
    return {
        "current_public_user": current_public_user,
        "public_user_authenticated": bool(current_public_user),
        "public_csrf_token": _ensure_public_csrf_token(),
        "current_public_user_avatar": _resolve_public_user_avatar(current_public_user),
        "public_theme_preference": (current_public_user or {}).get("theme_preference") or "light",
        "public_language_preference": (current_public_user or {}).get("language_preference") or "en",
        "public_auth_google_enabled": bool(
            str(os.getenv("GOOGLE_OAUTH_CLIENT_ID") or "").strip()
            and str(os.getenv("GOOGLE_OAUTH_CLIENT_SECRET") or "").strip()
        ),
    }


def _get_public_auth_config(kind):
    if str(kind or "").strip().lower() == "signup":
        return PUBLIC_SIGNUP_RATE_WINDOW_SECONDS, PUBLIC_SIGNUP_MAX_ATTEMPTS, PUBLIC_SIGNUP_LOCKOUT_SECONDS
    return PUBLIC_LOGIN_RATE_WINDOW_SECONDS, PUBLIC_LOGIN_MAX_ATTEMPTS, PUBLIC_LOGIN_LOCKOUT_SECONDS


def _prune_public_auth_attempts(kind, now):
    window_seconds, _max_attempts, _lockout_seconds = _get_public_auth_config(kind)
    attempts_store = _PUBLIC_AUTH_ATTEMPTS.setdefault(kind, {})
    expired_keys = []
    for key, entry in attempts_store.items():
        window_start = float(entry.get("window_start", now))
        locked_until = float(entry.get("locked_until", 0.0))
        if now - window_start > window_seconds and now >= locked_until:
            expired_keys.append(key)
    for key in expired_keys:
        attempts_store.pop(key, None)


def _is_public_auth_rate_limited(kind, client_ip):
    now = time.monotonic()
    with _PUBLIC_AUTH_ATTEMPTS_LOCK:
        _prune_public_auth_attempts(kind, now)
        entry = _PUBLIC_AUTH_ATTEMPTS.get(kind, {}).get(client_ip)
        if not entry:
            return False, 0
        locked_until = float(entry.get("locked_until", 0.0))
        if locked_until > now:
            return True, max(1, int(locked_until - now))
    return False, 0


def _record_public_auth_failure(kind, client_ip):
    now = time.monotonic()
    window_seconds, max_attempts, lockout_seconds = _get_public_auth_config(kind)
    with _PUBLIC_AUTH_ATTEMPTS_LOCK:
        _prune_public_auth_attempts(kind, now)
        attempts_store = _PUBLIC_AUTH_ATTEMPTS.setdefault(kind, {})
        entry = attempts_store.get(client_ip)
        if not entry or now - float(entry.get("window_start", now)) > window_seconds:
            entry = {
                "window_start": now,
                "attempts": 0,
                "locked_until": 0.0,
            }
        entry["attempts"] = int(entry.get("attempts", 0)) + 1
        if entry["attempts"] >= max_attempts:
            entry["locked_until"] = now + lockout_seconds
        attempts_store[client_ip] = entry


def _clear_public_auth_failures(kind, client_ip):
    with _PUBLIC_AUTH_ATTEMPTS_LOCK:
        _PUBLIC_AUTH_ATTEMPTS.setdefault(kind, {}).pop(client_ip, None)


def _prune_public_action_attempts(now):
    expired_keys = []
    for key, entry in _PUBLIC_ACTION_ATTEMPTS.items():
        window_start = float(entry.get("window_start", now))
        if now - window_start > PUBLIC_ACTION_RATE_WINDOW_SECONDS:
            expired_keys.append(key)
    for key in expired_keys:
        _PUBLIC_ACTION_ATTEMPTS.pop(key, None)


def _consume_public_action_rate_limit(action_key):
    now = time.monotonic()
    client_ip = _get_client_ip()
    session_user_id = session.get(PUBLIC_SESSION_USER_ID_KEY, "anon")
    bucket_key = f"{action_key}:{client_ip}:{session_user_id}"
    with _PUBLIC_ACTION_ATTEMPTS_LOCK:
        _prune_public_action_attempts(now)
        entry = _PUBLIC_ACTION_ATTEMPTS.get(bucket_key)
        if not entry or now - float(entry.get("window_start", now)) > PUBLIC_ACTION_RATE_WINDOW_SECONDS:
            entry = {
                "window_start": now,
                "attempts": 0,
            }
        if int(entry.get("attempts", 0)) >= PUBLIC_ACTION_MAX_ATTEMPTS:
            return max(1, int(PUBLIC_ACTION_RATE_WINDOW_SECONDS - (now - float(entry.get("window_start", now)))))
        entry["attempts"] = int(entry.get("attempts", 0)) + 1
        _PUBLIC_ACTION_ATTEMPTS[bucket_key] = entry
    return 0


def _ensure_public_csrf_token():
    token = session.get(PUBLIC_CSRF_KEY)
    if not isinstance(token, str) or not token:
        token = secrets.token_urlsafe(32)
        session[PUBLIC_CSRF_KEY] = token
    return token


def _is_public_csrf_valid(submitted_token):
    stored_token = session.get(PUBLIC_CSRF_KEY)
    if not isinstance(stored_token, str) or not stored_token:
        return False
    return hmac.compare_digest(stored_token, str(submitted_token or ""))


def _set_public_user_session(user_id):
    session.permanent = True
    session[PUBLIC_SESSION_KEY] = True
    session[PUBLIC_SESSION_USER_ID_KEY] = int(user_id)
    session[PUBLIC_CSRF_KEY] = secrets.token_urlsafe(32)


def _clear_public_user_session():
    session.pop(PUBLIC_SESSION_KEY, None)
    session.pop(PUBLIC_SESSION_USER_ID_KEY, None)
    session.pop(PUBLIC_CSRF_KEY, None)
    if hasattr(g, "current_public_user"):
        g.current_public_user = None
    if hasattr(g, "current_public_user_loaded"):
        g.current_public_user_loaded = True


def _get_current_public_user():
    if getattr(g, "current_public_user_loaded", False):
        return getattr(g, "current_public_user", None)

    g.current_public_user_loaded = True
    g.current_public_user = None

    if session.get(PUBLIC_SESSION_KEY) is not True:
        return None

    raw_user_id = session.get(PUBLIC_SESSION_USER_ID_KEY)
    try:
        user_id = int(raw_user_id)
    except (TypeError, ValueError):
        _clear_public_user_session()
        return None

    try:
        user = get_public_user_profile_by_id(user_id)
    except Exception:
        app.logger.exception("Failed to load public user profile for session user %s", user_id)
        return None

    if not user or not bool(user.get("is_active")):
        _clear_public_user_session()
        return None

    g.current_public_user = user
    return user


def _is_public_authenticated():
    return _get_current_public_user() is not None


def _public_login_required(view_func):
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        if _is_public_authenticated():
            return view_func(*args, **kwargs)
        next_path = request.full_path[:-1] if request.full_path.endswith("?") else request.full_path
        login_url = url_for("public_login", next=next_path or request.path)
        if request.headers.get("X-Requested-With") == "XMLHttpRequest" or request.path.startswith("/api/"):
            return jsonify({"ok": False, "login_required": True, "login_url": login_url, "error": "Please sign in to continue."}), 401
        return redirect(login_url)

    return wrapped


register_user_account_routes(
    app,
    ensure_public_csrf_token=_ensure_public_csrf_token,
    is_public_csrf_valid=_is_public_csrf_valid,
    public_session_user_id_key=PUBLIC_SESSION_USER_ID_KEY,
    public_session_authenticated_key=PUBLIC_SESSION_KEY,
    set_public_user_session=_set_public_user_session,
    clear_public_user_session=_clear_public_user_session,
    get_current_public_user=_get_current_public_user,
    public_login_required=_public_login_required,
    get_client_ip=_get_client_ip,
    is_public_auth_rate_limited=_is_public_auth_rate_limited,
    record_public_auth_failure=_record_public_auth_failure,
    clear_public_auth_failures=_clear_public_auth_failures,
)


register_community_content_routes(
    app,
    admin_route_prefix=ADMIN_ROUTE_PREFIX,
    admin_required=_admin_required,
    ensure_admin_csrf_token=_ensure_admin_csrf_token,
    is_admin_csrf_valid=_is_admin_csrf_valid,
    admin_session_user_key=ADMIN_SESSION_USER_KEY,
    admin_username=ADMIN_DEFAULT_USERNAME,
    public_login_required=_public_login_required,
    normalize_checkbox=_normalize_checkbox,
    validate_event_date=_validate_event_date,
    save_uploaded_image=_save_uploaded_image,
    delete_local_image=_delete_local_image,
    slugify_text=_slugify_text,
)


register_participation_submission_routes(
    app,
    admin_route_prefix=ADMIN_ROUTE_PREFIX,
    admin_required=_admin_required,
    ensure_admin_csrf_token=_ensure_admin_csrf_token,
    is_admin_csrf_valid=_is_admin_csrf_valid,
    admin_session_user_key=ADMIN_SESSION_USER_KEY,
    admin_username=ADMIN_DEFAULT_USERNAME,
    save_uploaded_image=_save_uploaded_image,
    save_uploaded_file=_save_uploaded_file,
    delete_local_image=_delete_local_image,
    public_login_required=_public_login_required,
    is_public_csrf_valid=_is_public_csrf_valid,
    get_current_public_user=_get_current_public_user,
    consume_public_action_rate_limit=_consume_public_action_rate_limit,
)


register_visitor_feedback_routes(
    app,
    admin_route_prefix=ADMIN_ROUTE_PREFIX,
    admin_required=_admin_required,
    ensure_admin_csrf_token=_ensure_admin_csrf_token,
    is_admin_csrf_valid=_is_admin_csrf_valid,
    admin_session_user_key=ADMIN_SESSION_USER_KEY,
    admin_username=ADMIN_DEFAULT_USERNAME,
    public_login_required=_public_login_required,
    is_public_csrf_valid=_is_public_csrf_valid,
    get_current_public_user=_get_current_public_user,
    consume_public_action_rate_limit=_consume_public_action_rate_limit,
)


register_user_management_routes(
    app,
    admin_route_prefix=ADMIN_ROUTE_PREFIX,
    admin_required=_admin_required,
    ensure_admin_csrf_token=_ensure_admin_csrf_token,
    is_admin_csrf_valid=_is_admin_csrf_valid,
    admin_session_user_key=ADMIN_SESSION_USER_KEY,
    admin_username=ADMIN_DEFAULT_USERNAME,
)


register_tour_booking_routes(
    app,
    admin_route_prefix=ADMIN_ROUTE_PREFIX,
    admin_required=_admin_required,
    ensure_admin_csrf_token=_ensure_admin_csrf_token,
    is_admin_csrf_valid=_is_admin_csrf_valid,
    admin_session_user_key=ADMIN_SESSION_USER_KEY,
    admin_username=ADMIN_DEFAULT_USERNAME,
    public_login_required=_public_login_required,
    is_public_csrf_valid=_is_public_csrf_valid,
    get_current_public_user=_get_current_public_user,
    consume_public_action_rate_limit=_consume_public_action_rate_limit,
)


register_online_gallery_content_routes(
    app,
    admin_route_prefix=ADMIN_ROUTE_PREFIX,
    admin_required=_admin_required,
    ensure_admin_csrf_token=_ensure_admin_csrf_token,
    is_admin_csrf_valid=_is_admin_csrf_valid,
    admin_session_user_key=ADMIN_SESSION_USER_KEY,
    admin_username=ADMIN_DEFAULT_USERNAME,
    normalize_checkbox=_normalize_checkbox,
    save_uploaded_image=_save_uploaded_image,
    save_uploaded_file=_save_uploaded_file,
    delete_local_image=_delete_local_image,
)


register_edu_resources_routes(
    app,
    admin_route_prefix=ADMIN_ROUTE_PREFIX,
    admin_required=_admin_required,
    ensure_admin_csrf_token=_ensure_admin_csrf_token,
    is_admin_csrf_valid=_is_admin_csrf_valid,
    admin_session_user_key=ADMIN_SESSION_USER_KEY,
    admin_username=ADMIN_DEFAULT_USERNAME,
    save_uploaded_image=_save_uploaded_image,
    save_uploaded_file=_save_uploaded_file,
    delete_local_image=_delete_local_image,
    slugify_text=_slugify_text,
)


@app.route("/")
def index():
    return render_template("Landing.html")


@app.route("/digital-exhibits")
def digital_exhibits():
    return render_template("DigitalExhibits.html")


@app.route("/interactive")
def interactive():
    return render_template("Interactive.html")


@app.route("/online-gallery")
def online_gallery():
    gallery_categories = load_public_online_gallery_categories()
    gallery_items = load_public_online_gallery_items()
    current_public_user = _get_current_public_user()
    bookmarked_gallery_item_ids = load_user_bookmarked_gallery_item_ids(int(current_public_user.get("id"))) if current_public_user else []
    return render_template(
        "OnlineGallery.html",
        gallery_categories=gallery_categories,
        gallery_items=gallery_items,
        bookmarked_gallery_item_ids=bookmarked_gallery_item_ids,
    )


@app.route("/online-gallery/details")
def online_gallery_details():
    gallery_items = load_public_online_gallery_items()
    current_public_user = _get_current_public_user()
    bookmarked_gallery_item_ids = load_user_bookmarked_gallery_item_ids(int(current_public_user.get("id"))) if current_public_user else []
    return render_template("OnlineGalleryDetails.html", gallery_items=gallery_items, bookmarked_gallery_item_ids=bookmarked_gallery_item_ids)


@app.route("/virtual-tour")
def virtual_tour():
    return render_template("VirtualTour.html")


@app.route("/AR-Artifacts/<path:filename>")
def artifact_asset_file(filename):
    for root_dir in (PUBLIC_AR_ARTIFACTS_DIR, STATIC_AR_ARTIFACTS_DIR):
        candidate_path = _resolve_safe_path(root_dir, filename)
        if candidate_path is not None and candidate_path.exists() and candidate_path.is_file():
            return send_from_directory(str(root_dir), filename)
    return jsonify({"error": f"Artifact asset not found: {filename}"}), 404


# The next three routes mirror Vercel's static hosting of public/ at the site
# root, so the same root-style URLs work in local development too. On Vercel
# these requests are served from the CDN and never reach the function (which
# keeps the big media out of the 225 MB serverless bundle).
@app.route("/images/<path:filename>")
def public_images_file(filename):
    images_dir = PROJECT_ROOT / "public" / "images"
    candidate_path = _resolve_safe_path(images_dir, filename)
    if candidate_path is not None and candidate_path.exists() and candidate_path.is_file():
        return send_from_directory(str(images_dir), filename)
    return jsonify({"error": f"Image not found: {filename}"}), 404


@app.route("/audio/<path:filename>")
def public_audio_file(filename):
    audio_dir = PROJECT_ROOT / "public" / "audio"
    candidate_path = _resolve_safe_path(audio_dir, filename)
    if candidate_path is not None and candidate_path.exists() and candidate_path.is_file():
        return send_from_directory(str(audio_dir), filename)
    return jsonify({"error": f"Audio not found: {filename}"}), 404


@app.route("/videos/<path:filename>")
def public_video_file(filename):
    videos_dir = PROJECT_ROOT / "public" / "videos"
    candidate_path = _resolve_safe_path(videos_dir, filename)
    if candidate_path is not None and candidate_path.exists() and candidate_path.is_file():
        return send_from_directory(str(videos_dir), filename, conditional=True)
    return jsonify({"error": f"Video not found: {filename}"}), 404


@app.route("/AK-animation/<path:filename>")
def ana_kalang_model_file(filename):
    models_dir = PROJECT_ROOT / "public" / "AK-animation"
    candidate_path = _resolve_safe_path(models_dir, filename)
    if candidate_path is not None and candidate_path.exists() and candidate_path.is_file():
        return send_from_directory(str(models_dir), filename)
    return jsonify({"error": f"Model not found: {filename}"}), 404


@app.route("/trail")
def trail_start():
    return render_template("TrailStart.html")


@app.route("/site-map")
def site_map():
    return render_template("SiteMap.html")


@app.route("/3d-environment")
def three_d_environment():
    return render_template("WebXREnvironment.html")


@app.route("/api/webxr/scene")
def webxr_scene_metadata():
    if not _ensure_webxr_runtime_initialized():
        return jsonify({"error": "WebXR runtime is unavailable.", "details": WEBXR_INIT_ERROR}), 503

    zip_override = (request.args.get("zip") or "").strip() or None
    scene_description = WEBXR_RUNTIME_SCENE.get_scene_description(zip_override=zip_override)
    payload = {
        "app": {
            "name": _get_webxr_config_value("APP_NAME", "Marble WebXR Viewer"),
            "debug": bool(_get_webxr_config_value("DEBUG", False)),
        },
        "player": _get_webxr_config_value("PLAYER_SETTINGS", {}),
        "quality": {
            "default": _get_webxr_config_value("DEFAULT_QUALITY", "auto"),
            "options": ["auto", "low", "medium", "high"],
        },
        "debug": {
            "collision": bool(_get_webxr_config_value("DEBUG_COLLISION", False)),
        },
        "scene": scene_description,
    }
    return jsonify(payload)


@app.route("/webxr/runtime/<path:asset_path>")
def webxr_runtime_asset(asset_path):
    runtime_dir = Path(_get_webxr_config_value("RUNTIME_DIR", WEBXR_BASE_DIR / "runtime")).resolve()
    candidate_path = _resolve_safe_path(runtime_dir, asset_path)
    if candidate_path is None:
        return jsonify({"error": "Invalid WebXR runtime asset path"}), 400
    if not candidate_path.exists() or not candidate_path.is_file():
        return jsonify({"error": f"WebXR runtime asset not found: {asset_path}"}), 404
    return send_from_directory(str(runtime_dir), asset_path)


@app.route("/webxr/static/<path:filename>")
def webxr_static_file(filename):
    webxr_static_dir = (WEBXR_BASE_DIR / "static").resolve()
    candidate_path = _resolve_safe_path(webxr_static_dir, filename)
    if candidate_path is None:
        return jsonify({"error": "Invalid WebXR static asset path"}), 400
    if not candidate_path.exists() or not candidate_path.is_file():
        return jsonify({"error": f"WebXR static asset not found: {filename}"}), 404
    return send_from_directory(str(webxr_static_dir), filename)


@app.route("/edu-resources")
def edu_resources():
    return render_template("EduResources.html", edu_resources_items=load_public_edu_resources())


@app.route("/edu-resources/details")
def edu_resources_details():
    if not _is_public_authenticated():
        next_path = request.full_path[:-1] if request.full_path.endswith("?") else request.full_path
        return redirect(url_for("public_login", next=next_path or request.path))
    return render_template("EduResourceDetails.html", edu_resources_items=load_public_edu_resources())


@app.route("/ar-content-detection")
def ar_content_detection():
    return render_template("ARContentDetection.html", analytics_endpoint=url_for("ar_analytics"))


@app.route("/api/ar/analytics", methods=["POST"])
def ar_analytics():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        payload = {}
    app.logger.info("AR analytics event received", extra={"ar_event": payload})
    return jsonify({"ok": True}), 200


@app.route("/participation")
def participation():
    return redirect(url_for("community_participation"))


@app.route("/community-participation")
def community_participation():
    community_highlights_items = load_news_community_highlights(limit=24)
    community_events_items = load_public_tour_bookings(limit=90)
    return render_template(
        "CommunityParticipation.html",
        community_highlights_items=community_highlights_items,
        community_events_items=community_events_items,
    )


@app.route("/support")
def support():
    return render_template("Support.html")


@app.route("/360VirtualTour/<path:filename>")
def virtual_tour_file(filename):
    virtual_tour_dir = PROJECT_ROOT / "public" / "360VirtualTour"
    candidate_path = _resolve_safe_path(virtual_tour_dir, filename)
    if candidate_path is None:
        return jsonify({"error": "Invalid virtual tour file path"}), 400
    if not candidate_path.exists() or not candidate_path.is_file():
        return jsonify({"error": f"Virtual tour file not found: {filename}"}), 404
    return send_from_directory(str(virtual_tour_dir), filename)


@app.route("/360Hotspots/<path:filename>")
def virtual_tour_hotspot_file(filename):
    hotspot_dir = PROJECT_ROOT / "public" / "360Hotspots"
    candidate_path = _resolve_safe_path(hotspot_dir, filename)
    if candidate_path is None:
        return jsonify({"error": "Invalid hotspot file path"}), 400
    if not candidate_path.exists() or not candidate_path.is_file():
        return jsonify({"error": f"Hotspot file not found: {filename}"}), 404
    return send_from_directory(str(hotspot_dir), filename)


@app.route("/public/<path:filename>")
def public_file(filename):
    public_dir = PROJECT_ROOT / "public"
    candidate_path = _resolve_safe_path(public_dir, filename)
    if candidate_path is None:
        return jsonify({"error": "Invalid public file path"}), 400
    if not candidate_path.exists() or not candidate_path.is_file():
        return jsonify({"error": f"File not found: {filename}"}), 404
    return send_from_directory(str(public_dir), filename)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=not IS_PRODUCTION)
