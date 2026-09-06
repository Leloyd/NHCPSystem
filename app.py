import hashlib
import hmac
import os
import re
import secrets
import threading
import time
from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path
from urllib.parse import urlparse

from flask import Flask, g, jsonify, make_response, redirect, render_template, request, send_from_directory, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

from admin_users_repository import (
    get_active_admin_user_by_email,
    get_active_admin_user_by_id,
    touch_admin_account,
    update_admin_password,
)
from admin_login_otp_repository import (
    get_active_admin_login_otp_challenge,
    issue_admin_login_otp_challenge,
    revoke_admin_login_otp_challenge,
    verify_admin_login_otp_challenge,
)
from admin_password_recovery_content import register_admin_password_recovery_routes
from admin_password_recovery_content.emailer import (
    AdminPasswordRecoveryEmailError,
    is_admin_password_recovery_email_configured,
    send_admin_login_otp_email,
)
from admin_password_recovery_content.security import secret_digest, token_digest
from admin_notifications_content import dispatch_admin_login_lockout_alert, register_admin_notification_routes
from analytics_content import load_admin_analytics_dashboard, register_analytics_routes
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
from media_upload_content import register_media_upload_routes
from supabase_client import is_supabase_configured
from tour_bookings_content import load_admin_tour_bookings, load_public_tour_bookings, register_tour_booking_routes
from user_accounts_content import load_user_bookmarked_gallery_item_ids, register_user_account_routes
from user_management_content import load_admin_public_users, register_user_management_routes
from visitor_feedback_content import build_public_visitor_feedback, load_admin_visitor_feedback, register_visitor_feedback_routes
from virtual_tour_content import (
    ORIGINAL_CAPTURED_ON,
    build_public_tour_config,
    format_captured_on,
    load_public_tour_options,
    register_virtual_tour_content_routes,
)
from site_map_content import build_public_site_map_config, register_site_map_content_routes
from heritage_keeper_content import load_heritage_keeper_progress, record_heritage_keeper_fragment
from webxr_progress_content import (
    collect_webxr_item,
    deposit_webxr_record,
    load_webxr_player_progress,
    record_webxr_museum_view,
)

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover - optional in some environments
    load_dotenv = None


PROJECT_ROOT = Path(__file__).resolve().parent
WEBXR_BASE_DIR = (PROJECT_ROOT / "webxr_runtime").resolve()
PUBLIC_AR_ARTIFACTS_DIR = (PROJECT_ROOT / "public" / "AR-Artifacts").resolve()


def _build_webxr_asset_version():
    """Create a stable cache key for the WebXR entry point and application module."""
    digest = hashlib.sha256()
    for relative_path in ("static/js/main.js", "static/js/app/webxr-app.js"):
        asset_path = WEBXR_BASE_DIR / relative_path
        if asset_path.exists() and asset_path.is_file():
            digest.update(asset_path.read_bytes())
    return digest.hexdigest()[:12]


WEBXR_ASSET_VERSION = _build_webxr_asset_version()

# Allowlisted WebXR scene archives. Public scene routes use stable names rather
# than exposing archive filenames, and the legacy ZIP query remains available
# only for the existing Church/Underground transitions.
WEBXR_SCENE_PATHS = {
    "church": WEBXR_BASE_DIR / "church.zip",
    "underground": WEBXR_BASE_DIR / "underground.zip",
    "museum": WEBXR_BASE_DIR / "museum.zip",
}
WEBXR_SCENE_ZIP_PATHS = {
    "church.zip": WEBXR_SCENE_PATHS["church"],
    "underground.zip": WEBXR_SCENE_PATHS["underground"],
}
WEBXR_EXTRACTED_SCENE_PATHS = {
    f"{scene_name}_extracted": scene_path
    for scene_name, scene_path in WEBXR_SCENE_PATHS.items()
}
WEBXR_SCENE_EXTRACTION_LOCK = threading.Lock()
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


def _configured_admin_asset_sources():
    # GLBs are fetched by <model-viewer>. Local previews use blob URLs, while
    # saved models are read from the configured Supabase project origin.
    sources = ["'self'", "blob:"]
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
ADMIN_ASSET_SOURCES = _configured_admin_asset_sources()

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
ADMIN_SESSION_VERSION_KEY = "admin_account_version"
ADMIN_CSRF_KEY = "admin_csrf"
ADMIN_LOGIN_OTP_SESSION_KEY = "admin_login_otp_challenge"
ADMIN_LOGIN_OTP_EMAIL_HINT_KEY = "admin_login_otp_email_hint"
ADMIN_LOGIN_OTP_EXPIRES_KEY = "admin_login_otp_expires_at"
ADMIN_LOGIN_OTP_SENT_KEY = "admin_login_otp_sent_at"
ADMIN_DEFAULT_USERNAME = "Administrator"
PUBLIC_SESSION_KEY = "public_authenticated"
PUBLIC_SESSION_USER_ID_KEY = "public_user_id"
PUBLIC_CSRF_KEY = "public_csrf"

ADMIN_LOGIN_RATE_WINDOW_SECONDS = max(60, int(os.getenv("ADMIN_LOGIN_RATE_WINDOW_SECONDS", "900")))
ADMIN_LOGIN_MAX_ATTEMPTS = max(3, int(os.getenv("ADMIN_LOGIN_MAX_ATTEMPTS", "5")))
ADMIN_LOGIN_LOCKOUT_SECONDS = max(30, int(os.getenv("ADMIN_LOGIN_LOCKOUT_SECONDS", "900")))
ADMIN_LOGIN_WARNING_AFTER_ATTEMPTS = 2
ADMIN_LOGIN_OTP_EXPIRES_SECONDS = 600
ADMIN_LOGIN_OTP_RESEND_SECONDS = 60
PUBLIC_LOGIN_RATE_WINDOW_SECONDS = max(60, int(os.getenv("PUBLIC_LOGIN_RATE_WINDOW_SECONDS", "900")))
PUBLIC_LOGIN_MAX_ATTEMPTS = max(3, int(os.getenv("PUBLIC_LOGIN_MAX_ATTEMPTS", "6")))
PUBLIC_LOGIN_LOCKOUT_SECONDS = max(30, int(os.getenv("PUBLIC_LOGIN_LOCKOUT_SECONDS", "900")))
PUBLIC_SIGNUP_RATE_WINDOW_SECONDS = max(60, int(os.getenv("PUBLIC_SIGNUP_RATE_WINDOW_SECONDS", "1800")))
PUBLIC_SIGNUP_MAX_ATTEMPTS = max(2, int(os.getenv("PUBLIC_SIGNUP_MAX_ATTEMPTS", "4")))
PUBLIC_SIGNUP_LOCKOUT_SECONDS = max(30, int(os.getenv("PUBLIC_SIGNUP_LOCKOUT_SECONDS", "1800")))
PUBLIC_PASSWORD_RESET_RATE_WINDOW_SECONDS = max(60, int(os.getenv("PUBLIC_PASSWORD_RESET_RATE_WINDOW_SECONDS", "900")))
PUBLIC_PASSWORD_RESET_MAX_ATTEMPTS = max(2, int(os.getenv("PUBLIC_PASSWORD_RESET_MAX_ATTEMPTS", "5")))
PUBLIC_PASSWORD_RESET_LOCKOUT_SECONDS = max(30, int(os.getenv("PUBLIC_PASSWORD_RESET_LOCKOUT_SECONDS", "900")))
PUBLIC_ACTION_RATE_WINDOW_SECONDS = max(10, int(os.getenv("PUBLIC_ACTION_RATE_WINDOW_SECONDS", "300")))
PUBLIC_ACTION_MAX_ATTEMPTS = max(1, int(os.getenv("PUBLIC_ACTION_MAX_ATTEMPTS", "8")))
TRUST_PROXY_HEADERS = _bool_env("TRUST_PROXY_HEADERS", False)

_ADMIN_LOGIN_ATTEMPTS = {}
_ADMIN_LOGIN_ATTEMPTS_LOCK = threading.Lock()
_PUBLIC_AUTH_ATTEMPTS = {"login": {}, "signup": {}, "password-reset": {}}
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


def _get_webxr_player_settings():
    configured_settings = _get_webxr_config_value("PLAYER_SETTINGS", {})
    return dict(configured_settings) if isinstance(configured_settings, dict) else {}


def _ensure_webxr_runtime_initialized():
    global WEBXR_CONFIG
    global WEBXR_RUNTIME_SCENE
    global WEBXR_INIT_ERROR

    if WEBXR_RUNTIME_SCENE is not None:
        return True

    WEBXR_CONFIG, WEBXR_RUNTIME_SCENE, WEBXR_INIT_ERROR = _initialize_webxr_runtime()
    return WEBXR_RUNTIME_SCENE is not None


def _ensure_webxr_asset_scene_extracted(asset_path):
    normalized_path = str(asset_path or "").replace("\\", "/").lstrip("/")
    extracted_dir_name = normalized_path.split("/", 1)[0]
    scene_zip_path = WEBXR_EXTRACTED_SCENE_PATHS.get(extracted_dir_name)
    if scene_zip_path is None:
        return False

    with WEBXR_SCENE_EXTRACTION_LOCK:
        if not _ensure_webxr_runtime_initialized():
            return False
        WEBXR_RUNTIME_SCENE.get_scene_description(zip_override=str(scene_zip_path.resolve()))

    return True


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
    analytics_dashboard = load_admin_analytics_dashboard(days=30)

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
    rejected_submissions = [item for item in submission_items if item.get("status") == "rejected"]
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
                f"{len(active_submissions)} active · {len(rejected_submissions)} changes requested · {len(archived_submissions)} archived"
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
        "analytics_dashboard": analytics_dashboard,
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
            retry_after = max(1, int(locked_until - now + 0.999))
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

        was_locked = float(entry.get("locked_until", 0.0)) > now
        entry["attempts"] = int(entry.get("attempts", 0)) + 1
        if entry["attempts"] >= ADMIN_LOGIN_MAX_ATTEMPTS:
            entry["locked_until"] = now + ADMIN_LOGIN_LOCKOUT_SECONDS
        _ADMIN_LOGIN_ATTEMPTS[client_ip] = entry
        is_locked = float(entry.get("locked_until", 0.0)) > now
        return {
            "attempts": entry["attempts"],
            "remaining": max(0, ADMIN_LOGIN_MAX_ATTEMPTS - entry["attempts"]),
            "is_locked": is_locked,
            "just_locked": is_locked and not was_locked,
            "retry_after_seconds": max(0, int(float(entry.get("locked_until", 0.0)) - now + 0.999)),
        }


def _describe_admin_login_client():
    """Return useful, bounded labels derived from untrusted request headers."""
    user_agent = str(request.headers.get("User-Agent") or "").strip()[:500]
    lower_agent = user_agent.lower()
    browser = "Unknown browser"
    for browser_name, pattern in (
        ("Microsoft Edge", r"(?:edg|edgios|edga)/([0-9.]+)"),
        ("Opera", r"(?:opr|opera)/([0-9.]+)"),
        ("Google Chrome", r"(?:chrome|crios)/([0-9.]+)"),
        ("Mozilla Firefox", r"(?:firefox|fxios)/([0-9.]+)"),
        ("Safari", r"version/([0-9.]+).*(?:safari)/"),
    ):
        match = re.search(pattern, lower_agent)
        if match:
            browser = f"{browser_name} {match.group(1)}"
            break

    if "iphone" in lower_agent:
        operating_system = "iOS (iPhone)"
    elif "ipad" in lower_agent:
        operating_system = "iPadOS"
    elif "android" in lower_agent:
        version = re.search(r"android\s+([0-9.]+)", lower_agent)
        operating_system = f"Android {version.group(1)}" if version else "Android"
    elif "windows nt 10.0" in lower_agent:
        operating_system = "Windows 10 or later"
    elif "windows" in lower_agent:
        operating_system = "Windows"
    elif "mac os x" in lower_agent or "macintosh" in lower_agent:
        operating_system = "macOS"
    elif "cros" in lower_agent:
        operating_system = "ChromeOS"
    elif "linux" in lower_agent:
        operating_system = "Linux"
    else:
        operating_system = "Unknown operating system"

    mobile_hint = str(request.headers.get("Sec-CH-UA-Mobile") or "").strip()
    if "ipad" in lower_agent or "tablet" in lower_agent:
        device_type = "Tablet"
    elif mobile_hint == "?1" or "mobile" in lower_agent or "iphone" in lower_agent or "android" in lower_agent:
        device_type = "Mobile phone"
    else:
        device_type = "Desktop or laptop"

    return {
        "browser": browser,
        "operating_system": operating_system,
        "device_type": device_type,
        "user_agent": user_agent or "Not supplied",
    }


def _failed_admin_login_feedback(client_ip, attempted_email):
    failed_login = _record_failed_login(client_ip)
    retry_after_seconds = failed_login["retry_after_seconds"]
    warning_message = None
    if failed_login["is_locked"]:
        lockout_minutes = max(1, (ADMIN_LOGIN_LOCKOUT_SECONDS + 59) // 60)
        error_message = f"Too many failed attempts. Login is temporarily locked for {lockout_minutes} minutes."
        if failed_login["just_locked"]:
            client_details = _describe_admin_login_client()
            occurred_at = datetime.now(timezone.utc).astimezone(
                timezone(timedelta(hours=8))
            ).strftime("%B %d, %Y at %I:%M:%S %p (Philippine Time)")
            dispatch_admin_login_lockout_alert(
                attempted_email=attempted_email or "Not provided",
                occurred_at=occurred_at,
                client_ip=client_ip,
                failed_attempts=failed_login["attempts"],
                lockout_minutes=lockout_minutes,
                **client_details,
            )
        return 429, error_message, warning_message, retry_after_seconds

    if failed_login["attempts"] >= ADMIN_LOGIN_WARNING_AFTER_ATTEMPTS:
        remaining = failed_login["remaining"]
        warning_message = (
            f"Security warning: You have {remaining} attempt{'s' if remaining != 1 else ''} remaining "
            "before login is temporarily locked."
        )
    return 401, "Invalid credentials.", warning_message, retry_after_seconds


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
            return admin_user
    except (ValueError, TypeError):
        return False

    return False


def _admin_login_otp_digest(raw_challenge, otp_code):
    payload = f"admin-login-otp:{str(raw_challenge or '')}:{str(otp_code or '')}".encode("utf-8")
    return hmac.new(str(app.config["SECRET_KEY"]).encode("utf-8"), payload, hashlib.sha256).hexdigest()


def _mask_admin_email(email):
    normalized = _normalize_admin_email(email)
    if "@" not in normalized:
        return "your administrator email"
    local_part, domain = normalized.rsplit("@", 1)
    if len(local_part) <= 2:
        masked_local = local_part[:1] + "*" * max(1, len(local_part) - 1)
    else:
        masked_local = local_part[:2] + "*" * max(2, len(local_part) - 2)
    return f"{masked_local}@{domain}"


def _clear_admin_login_otp_session(*, revoke=False):
    raw_challenge = str(session.pop(ADMIN_LOGIN_OTP_SESSION_KEY, "") or "").strip()
    session.pop(ADMIN_LOGIN_OTP_EMAIL_HINT_KEY, None)
    session.pop(ADMIN_LOGIN_OTP_EXPIRES_KEY, None)
    session.pop(ADMIN_LOGIN_OTP_SENT_KEY, None)
    if revoke and raw_challenge:
        try:
            revoke_admin_login_otp_challenge(token_digest(raw_challenge))
        except Exception:  # noqa: BLE001 - clearing local pending state is still required
            app.logger.warning("Could not revoke an abandoned administrator login code.")


def _admin_login_otp_state():
    raw_challenge = str(session.get(ADMIN_LOGIN_OTP_SESSION_KEY, "") or "").strip()
    try:
        expires_at = int(session.get(ADMIN_LOGIN_OTP_EXPIRES_KEY, 0) or 0)
        sent_at = int(session.get(ADMIN_LOGIN_OTP_SENT_KEY, 0) or 0)
    except (TypeError, ValueError):
        expires_at = 0
        sent_at = 0
    now = int(time.time())
    if not raw_challenge or expires_at <= now:
        if raw_challenge:
            _clear_admin_login_otp_session(revoke=True)
        return None
    return {
        "raw_challenge": raw_challenge,
        "challenge_hash": token_digest(raw_challenge),
        "email_hint": str(session.get(ADMIN_LOGIN_OTP_EMAIL_HINT_KEY, "") or "your administrator email"),
        "expires_in": max(0, expires_at - now),
        "resend_in": max(0, sent_at + ADMIN_LOGIN_OTP_RESEND_SECONDS - now),
    }


def _issue_admin_login_otp(admin_user):
    admin_user_id = int(admin_user.get("id"))
    admin_email = _normalize_admin_email(admin_user.get("email", ""))
    account_version = str(admin_user.get("updated_at", "") or "").strip()
    if not admin_email or not account_version:
        return "invalid", None
    if not is_admin_password_recovery_email_configured():
        raise AdminPasswordRecoveryEmailError("Secure SMTP delivery is not configured.")

    raw_challenge = secrets.token_urlsafe(48)
    otp_code = f"{secrets.randbelow(1_000_000):06d}"
    challenge_hash = token_digest(raw_challenge)
    client_details = _describe_admin_login_client()
    issue_result = issue_admin_login_otp_challenge(
        admin_user_id=admin_user_id,
        account_version=account_version,
        challenge_hash=challenge_hash,
        otp_hash=_admin_login_otp_digest(raw_challenge, otp_code),
        request_ip_hash=secret_digest(str(app.config["SECRET_KEY"]), "admin-login-ip", _get_client_ip()),
        user_agent_hash=secret_digest(
            str(app.config["SECRET_KEY"]),
            "admin-login-user-agent",
            str(request.headers.get("User-Agent") or "")[:500],
        ),
    )
    if issue_result != "issued":
        return issue_result, None

    occurred_at = datetime.now(timezone.utc).astimezone(
        timezone(timedelta(hours=8))
    ).strftime("%B %d, %Y at %I:%M:%S %p (Philippine Time)")
    try:
        send_admin_login_otp_email(
            to_email=admin_email,
            otp_code=otp_code,
            expires_minutes=ADMIN_LOGIN_OTP_EXPIRES_SECONDS // 60,
            occurred_at=occurred_at,
            browser=client_details["browser"],
            operating_system=client_details["operating_system"],
            device_type=client_details["device_type"],
        )
    except Exception:
        try:
            revoke_admin_login_otp_challenge(challenge_hash)
        except Exception:  # noqa: BLE001
            app.logger.warning("Could not revoke an undelivered administrator login code.")
        raise

    now = int(time.time())
    session.clear()
    session.permanent = False
    session[ADMIN_LOGIN_OTP_SESSION_KEY] = raw_challenge
    session[ADMIN_LOGIN_OTP_EMAIL_HINT_KEY] = _mask_admin_email(admin_email)
    session[ADMIN_LOGIN_OTP_EXPIRES_KEY] = now + ADMIN_LOGIN_OTP_EXPIRES_SECONDS
    session[ADMIN_LOGIN_OTP_SENT_KEY] = now
    session[ADMIN_CSRF_KEY] = secrets.token_urlsafe(32)
    return "issued", _admin_login_otp_state()


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
    session_version = str(session.get(ADMIN_SESSION_VERSION_KEY, "") or "").strip()
    if not _is_valid_admin_email(session_email) or not session_version:
        return False

    try:
        admin_user = get_active_admin_user_by_email(session_email)
    except Exception:  # noqa: BLE001
        app.logger.exception("Failed to validate the active administrator session.")
        return False

    if not admin_user:
        return False

    current_version = str(admin_user.get("updated_at", "") or "").strip()
    if not current_version or not hmac.compare_digest(session_version, current_version):
        return False

    g.admin_user = admin_user
    return True


ADMIN_COMMON_PASSWORDS = {
    "administrator",
    "admin123456789",
    "changeme123456",
    "letmein123456789",
    "nhcpadministrator",
    "password123456",
    "qwerty123456789",
}


def _validate_new_admin_password(password, email):
    candidate = str(password or "")
    if len(candidate) < 15:
        return "Use at least 15 characters for an administrator password."
    if len(candidate) > 128:
        return "The new password must not exceed 128 characters."
    if not candidate.strip():
        return "The new password cannot contain only spaces."

    normalized_candidate = candidate.casefold()
    compact_candidate = re.sub(r"[^a-z0-9]", "", normalized_candidate)
    normalized_email = _normalize_admin_email(email)
    email_local_part = normalized_email.split("@", 1)[0].casefold() if normalized_email else ""

    if normalized_candidate in ADMIN_COMMON_PASSWORDS or compact_candidate in ADMIN_COMMON_PASSWORDS:
        return "Choose a less common administrator password."
    if normalized_candidate == normalized_email.casefold() or (
        email_local_part and normalized_candidate == email_local_part
    ):
        return "The new password must not be the administrator email or account name."
    return None


def _admin_settings_response(*, ok, title, message, status_code=200, redirect_url=None):
    payload = {
        "ok": bool(ok),
        "title": str(title),
        "message": str(message),
    }
    if redirect_url:
        payload["redirect_url"] = str(redirect_url)

    if request.headers.get("X-Requested-With") == "XMLHttpRequest":
        return jsonify(payload), status_code
    return None


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
            "script-src 'self' https://cdnjs.cloudflare.com https://ajax.googleapis.com https://cdn.jsdelivr.net; "
            # <model-viewer> injects its component styles inside Shadow DOM.
            # Inline JavaScript remains blocked; only component CSS is allowed.
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            f"connect-src {ADMIN_ASSET_SOURCES}; "
            f"media-src {ADMIN_ASSET_SOURCES}; "
            f"frame-src {ADMIN_ASSET_SOURCES} https://view.officeapps.live.com; "
            "worker-src 'self' blob:; "
            "font-src 'self'; "
            "base-uri 'self'; "
            "form-action 'self'; "
            "frame-ancestors 'none'; "
            "object-src 'none'"
        )

    if request.path in {"/login", "/signup", "/account"} or request.path.startswith("/account"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"

    if request.path == "/virtual-tour" or request.path.startswith("/api/virtual-tours/"):
        response.headers["Cache-Control"] = "private, no-store, max-age=0"
        response.headers["Pragma"] = "no-cache"
    elif request.path == "/interactive":
        response.headers["Cache-Control"] = "no-cache, must-revalidate"

    return response


WEBXR_CONFIG, WEBXR_RUNTIME_SCENE, WEBXR_INIT_ERROR = _initialize_webxr_runtime()


@app.route(ADMIN_LOGIN_PATH, methods=["GET", "POST"])
def admin_login():
    is_async_login = request.headers.get("X-Requested-With") == "XMLHttpRequest"
    if _is_admin_authenticated():
        if is_async_login:
            return jsonify({"ok": True, "redirect": url_for("admin_dashboard")})
        return redirect(url_for("admin_dashboard"))

    status_code = 200
    error_message = None
    warning_message = None
    retry_after_seconds = 0
    is_limited = False
    otp_state = _admin_login_otp_state()
    if request.args.get("password_reset") == "1":
        success_message = "Your administrator password was reset securely. Sign in with the new password."
    elif request.args.get("password_changed") == "1":
        success_message = "Your administrator password was updated. Sign in with the new password."
    else:
        success_message = None

    if request.method == "GET" and not otp_state:
        is_limited, retry_after_seconds = _is_login_rate_limited(_get_client_ip())
        if is_limited:
            error_message = "Login is temporarily locked. Wait for the security timer to finish."
    elif request.method == "POST":
        if not _is_admin_auth_configured():
            status_code = 503
            error_message = "Login is temporarily unavailable."
        elif not _is_admin_csrf_valid(request.form.get("csrf_token")):
            status_code = 400
            error_message = "Invalid request."
        else:
            action = (
                "cancel_otp"
                if request.form.get("cancel_otp") == "1"
                else str(request.form.get("login_action") or "credentials").strip().lower()
            )
            client_ip = _get_client_ip()

            if action == "cancel_otp":
                _clear_admin_login_otp_session(revoke=True)
                otp_state = None
                success_message = None
                if is_async_login:
                    return jsonify(
                        {
                            "ok": True,
                            "credentials_required": True,
                            "csrf_token": _ensure_admin_csrf_token(),
                        }
                    )
                return redirect(url_for("admin_login"), code=303)

            elif action == "verify_otp":
                otp_state = _admin_login_otp_state()
                if not otp_state:
                    status_code = 400
                    error_message = "Your sign-in code expired. Enter your credentials to request a new code."
                else:
                    otp_code = re.sub(r"\s+", "", str(request.form.get("otp_code") or ""))[:32]
                    verification = None
                    if not re.fullmatch(r"[0-9]{6}", otp_code):
                        status_code = 400
                        error_message = "Enter the complete six-digit code from your email."
                    else:
                        try:
                            verification = verify_admin_login_otp_challenge(
                                challenge_hash=otp_state["challenge_hash"],
                                otp_hash=_admin_login_otp_digest(otp_state["raw_challenge"], otp_code),
                            )
                        except Exception:  # noqa: BLE001
                            app.logger.exception("Administrator login code verification failed.")
                            status_code = 503
                            error_message = "The sign-in code could not be verified right now. Please try again."
                            verification = None
                    if verification is not None:
                        verification_result = str(verification.get("result") or "invalid")
                        if verification_result == "verified":
                            try:
                                authenticated_admin = get_active_admin_user_by_id(
                                    int(verification.get("admin_user_id"))
                                )
                            except Exception:  # noqa: BLE001
                                app.logger.exception("Failed to complete verified administrator login.")
                                authenticated_admin = None
                            authenticated_email = _normalize_admin_email(
                                (authenticated_admin or {}).get("email", "")
                            )
                            account_version = str(
                                (authenticated_admin or {}).get("updated_at", "") or ""
                            ).strip()
                            if not authenticated_email or not account_version:
                                _clear_admin_login_otp_session()
                                status_code = 503
                                error_message = "Login is temporarily unavailable."
                            else:
                                _clear_failed_logins(client_ip)
                                session.clear()
                                session.permanent = True
                                session[ADMIN_SESSION_KEY] = True
                                session[ADMIN_SESSION_USER_KEY] = authenticated_email
                                session[ADMIN_SESSION_VERSION_KEY] = account_version
                                session[ADMIN_CSRF_KEY] = secrets.token_urlsafe(32)
                                if is_async_login:
                                    return jsonify({"ok": True, "redirect": url_for("admin_dashboard")})
                                return redirect(url_for("admin_dashboard"))
                        elif verification_result == "incorrect":
                            attempts_remaining = max(0, int(verification.get("attempts_remaining") or 0))
                            status_code = 401
                            error_message = (
                                "That code is incorrect. "
                                f"You have {attempts_remaining} attempt{'s' if attempts_remaining != 1 else ''} remaining."
                            )
                        elif verification_result == "expired":
                            _clear_admin_login_otp_session()
                            otp_state = None
                            status_code = 400
                            error_message = "Your sign-in code expired. Enter your credentials to request a new code."
                        elif verification_result == "locked":
                            _clear_admin_login_otp_session()
                            otp_state = None
                            status_code = 429
                            error_message = "Too many incorrect codes. Enter your credentials to start a new sign-in."
                        else:
                            _clear_admin_login_otp_session()
                            otp_state = None
                            status_code = 400
                            error_message = "That sign-in request is no longer valid. Enter your credentials again."

            elif action == "resend_otp":
                otp_state = _admin_login_otp_state()
                if not otp_state:
                    status_code = 400
                    error_message = "Your sign-in request expired. Enter your credentials again."
                elif otp_state["resend_in"] > 0:
                    status_code = 429
                    error_message = f"Wait {otp_state['resend_in']} seconds before requesting another code."
                else:
                    try:
                        challenge = get_active_admin_login_otp_challenge(otp_state["challenge_hash"])
                        admin_user = (
                            get_active_admin_user_by_id(int(challenge["admin_user_id"]))
                            if challenge
                            else None
                        )
                        issue_result, new_otp_state = (
                            _issue_admin_login_otp(admin_user) if admin_user else ("invalid", None)
                        )
                    except Exception:  # noqa: BLE001
                        app.logger.exception("Administrator sign-in code could not be resent.")
                        _clear_admin_login_otp_session(revoke=True)
                        otp_state = None
                        status_code = 503
                        error_message = "A new sign-in code could not be delivered. Enter your credentials and try again."
                    else:
                        if issue_result == "issued":
                            otp_state = new_otp_state
                            success_message = "A new one-time code was sent to your administrator email."
                        elif issue_result in {"cooldown", "rate_limited"}:
                            status_code = 429
                            error_message = "Too many code requests. Please wait before requesting another code."
                        else:
                            _clear_admin_login_otp_session(revoke=True)
                            otp_state = None
                            status_code = 400
                            error_message = "That sign-in request is no longer valid. Enter your credentials again."

            else:
                is_limited, retry_after_seconds = _is_login_rate_limited(client_ip)
                if is_limited:
                    status_code = 429
                    error_message = "Login is temporarily locked. Wait for the security timer to finish."
                else:
                    # Starting over invalidates a pending code before checking
                    # another credential pair.
                    if otp_state:
                        _clear_admin_login_otp_session(revoke=True)
                        otp_state = None
                    email = _normalize_admin_email(request.form.get("email", ""))
                    password = str(request.form.get("password", ""))

                    if _is_valid_login_payload(email, password):
                        authenticated_admin = _authenticate_admin_credentials(email, password)

                        if authenticated_admin is None:
                            status_code = 503
                            error_message = "Login is temporarily unavailable."
                        elif authenticated_admin:
                            try:
                                issue_result, otp_state = _issue_admin_login_otp(authenticated_admin)
                            except Exception:  # noqa: BLE001
                                app.logger.exception("Administrator sign-in code could not be delivered.")
                                status_code = 503
                                error_message = "Login verification is temporarily unavailable. Please try again."
                            else:
                                if issue_result == "issued":
                                    success_message = "A one-time code was sent to your administrator email."
                                elif issue_result in {"cooldown", "rate_limited"}:
                                    otp_state = None
                                    status_code = 429
                                    error_message = "Too many code requests. Please wait before trying again."
                                else:
                                    otp_state = None
                                    status_code = 503
                                    error_message = "Login verification is temporarily unavailable."
                        else:
                            status_code, error_message, warning_message, retry_after_seconds = (
                                _failed_admin_login_feedback(client_ip, email)
                            )
                    else:
                        status_code, error_message, warning_message, retry_after_seconds = (
                            _failed_admin_login_feedback(client_ip, email)
                        )

    lockout_remaining = (
        retry_after_seconds
        if retry_after_seconds and is_limited
        else 0
    )
    if is_async_login:
        if otp_state:
            response = jsonify(
                {
                    "ok": status_code < 400,
                    "otp_required": True,
                    "email_hint": otp_state["email_hint"],
                    "expires_in": otp_state["expires_in"],
                    "resend_in": otp_state["resend_in"],
                    "error": error_message,
                    "warning": warning_message,
                    "message": success_message,
                    "csrf_token": _ensure_admin_csrf_token(),
                }
            )
            response.status_code = status_code
            return response
        response = jsonify(
            {
                "ok": False,
                "error": error_message,
                "warning": warning_message,
                "locked": bool(lockout_remaining),
                "retry_after_seconds": lockout_remaining,
            }
        )
        response.status_code = status_code
        if status_code == 429 and retry_after_seconds:
            response.headers["Retry-After"] = str(retry_after_seconds)
        return response

    csrf_token = _ensure_admin_csrf_token()
    response = make_response(
        render_template(
            "admin/AdminLogin.html",
            csrf_token=csrf_token,
            error_message=error_message,
            warning_message=warning_message,
            success_message=success_message,
            lockout_remaining=lockout_remaining,
            otp_required=bool(otp_state),
            otp_email_hint=otp_state["email_hint"] if otp_state else "",
            otp_expires_in=otp_state["expires_in"] if otp_state else 0,
            otp_resend_in=otp_state["resend_in"] if otp_state else 0,
        ),
        status_code,
    )
    if status_code == 429 and retry_after_seconds:
        response.headers["Retry-After"] = str(retry_after_seconds)
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
    normalized_kind = str(kind or "").strip().lower()
    if normalized_kind == "signup":
        return PUBLIC_SIGNUP_RATE_WINDOW_SECONDS, PUBLIC_SIGNUP_MAX_ATTEMPTS, PUBLIC_SIGNUP_LOCKOUT_SECONDS
    if normalized_kind == "password-reset":
        return (
            PUBLIC_PASSWORD_RESET_RATE_WINDOW_SECONDS,
            PUBLIC_PASSWORD_RESET_MAX_ATTEMPTS,
            PUBLIC_PASSWORD_RESET_LOCKOUT_SECONDS,
        )
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


register_admin_password_recovery_routes(
    app,
    admin_route_prefix=ADMIN_ROUTE_PREFIX,
    ensure_admin_csrf_token=_ensure_admin_csrf_token,
    is_admin_csrf_valid=_is_admin_csrf_valid,
    normalize_admin_email=_normalize_admin_email,
    is_valid_admin_email=_is_valid_admin_email,
    validate_new_admin_password=_validate_new_admin_password,
    get_client_ip=_get_client_ip,
    secret_key=str(app.config["SECRET_KEY"]),
    is_production=IS_PRODUCTION,
)


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


register_media_upload_routes(
    app,
    admin_route_prefix=ADMIN_ROUTE_PREFIX,
    admin_required=_admin_required,
    is_admin_csrf_valid=_is_admin_csrf_valid,
    is_public_csrf_valid=_is_public_csrf_valid,
    get_current_public_user=_get_current_public_user,
    consume_public_action_rate_limit=_consume_public_action_rate_limit,
)


register_community_content_routes(
    app,
    admin_route_prefix=ADMIN_ROUTE_PREFIX,
    admin_required=_admin_required,
    ensure_admin_csrf_token=_ensure_admin_csrf_token,
    is_admin_csrf_valid=_is_admin_csrf_valid,
    admin_session_user_key=ADMIN_SESSION_USER_KEY,
    admin_username=ADMIN_DEFAULT_USERNAME,
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

register_analytics_routes(
    app,
    admin_route_prefix=ADMIN_ROUTE_PREFIX,
    admin_required=_admin_required,
    public_session_user_id_key=PUBLIC_SESSION_USER_ID_KEY,
)


register_admin_notification_routes(
    app,
    admin_route_prefix=ADMIN_ROUTE_PREFIX,
    admin_required=_admin_required,
    is_admin_csrf_valid=_is_admin_csrf_valid,
    admin_session_user_key=ADMIN_SESSION_USER_KEY,
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


register_virtual_tour_content_routes(
    app,
    admin_route_prefix=ADMIN_ROUTE_PREFIX,
    admin_required=_admin_required,
    ensure_admin_csrf_token=_ensure_admin_csrf_token,
    is_admin_csrf_valid=_is_admin_csrf_valid,
    admin_session_user_key=ADMIN_SESSION_USER_KEY,
    admin_username=ADMIN_DEFAULT_USERNAME,
)

register_site_map_content_routes(
    app,
    admin_route_prefix=ADMIN_ROUTE_PREFIX,
    admin_required=_admin_required,
    ensure_admin_csrf_token=_ensure_admin_csrf_token,
    is_admin_csrf_valid=_is_admin_csrf_valid,
    admin_session_user_key=ADMIN_SESSION_USER_KEY,
    admin_username=ADMIN_DEFAULT_USERNAME,
)


@app.route("/")
def index():
    return render_template("Landing.html")


@app.route("/digital-exhibits")
def digital_exhibits():
    return render_template("DigitalExhibits.html")


@app.route("/interactive")
def interactive():
    return render_template("Interactive.html", virtual_tour_options=load_public_tour_options())


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
    requested_tour = _slugify_text(request.args.get("tour"), fallback="original")
    dynamic_tour_config = build_public_tour_config(requested_tour)
    captured_on = ORIGINAL_CAPTURED_ON
    if dynamic_tour_config:
        dynamic_scenes = list(dynamic_tour_config.get("scenes") or [])
        requested_scene = str(request.args.get("scene") or "").strip()
        initial_scene_key = requested_scene or str(dynamic_tour_config.get("startScene") or "")
        initial_scene = next(
            (scene for scene in dynamic_scenes if str(scene.get("id") or "") == initial_scene_key),
            dynamic_scenes[0] if dynamic_scenes else {},
        )
        captured_on = str(initial_scene.get("capturedOn") or "")
    return render_template(
        "VirtualTour.html",
        dynamic_tour_config=dynamic_tour_config,
        selected_virtual_tour_slug=requested_tour if dynamic_tour_config else "original",
        tour_captured_on=captured_on,
        tour_captured_on_display=format_captured_on(captured_on),
    )


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
    return render_template("SiteMap.html", site_map_config=build_public_site_map_config())


@app.route("/3d-environment")
def three_d_environment():
    return render_template(
        "WebXREnvironment.html",
        webxr_scene="",
        webxr_asset_version=WEBXR_ASSET_VERSION,
    )


@app.route(f"{ADMIN_ROUTE_PREFIX}/account-settings", methods=["GET", "POST"])
@_admin_required
def admin_account_settings():
    admin_user = getattr(g, "admin_user", None)
    if not admin_user:
        session.clear()
        return redirect(url_for("admin_login"))

    csrf_token = _ensure_admin_csrf_token()
    admin_email = _normalize_admin_email(admin_user.get("email", ""))
    admin_username = admin_email or ADMIN_DEFAULT_USERNAME
    error_message = None
    status_code = 200

    if request.method == "POST":
        if not _is_admin_csrf_valid(request.form.get("csrf_token")):
            status_code = 400
            error_message = "The security token is invalid or expired. Reload the page and try again."
        else:
            client_ip = _get_client_ip()
            is_limited, retry_after_seconds = _is_login_rate_limited(client_ip)
            if is_limited:
                status_code = 429
                error_message = f"Too many attempts. Try again in {retry_after_seconds} seconds."
            else:
                current_password = str(request.form.get("current_password", ""))
                stored_password_hash = str(admin_user.get("password_hash", "") or "")
                current_password_valid = False
                try:
                    current_password_valid = bool(
                        current_password
                        and len(current_password) <= 1024
                        and stored_password_hash
                        and check_password_hash(stored_password_hash, current_password)
                    )
                except (TypeError, ValueError):
                    current_password_valid = False

                if not current_password_valid:
                    _record_failed_login(client_ip)
                    status_code = 401
                    error_message = "The current password is incorrect."
                else:
                    action = str(request.form.get("action", "change-password")).strip().lower()
                    if action == "change-password":
                        new_password = str(request.form.get("new_password", ""))
                        confirm_password = str(request.form.get("confirm_password", ""))
                        error_message = _validate_new_admin_password(new_password, admin_email)

                        if not error_message and not hmac.compare_digest(new_password, confirm_password):
                            error_message = "The new password and confirmation do not match."
                        if not error_message:
                            try:
                                same_as_current = check_password_hash(stored_password_hash, new_password)
                            except (TypeError, ValueError):
                                same_as_current = False
                            if same_as_current:
                                error_message = "Choose a password that is different from the current password."

                        if error_message:
                            status_code = 400
                        else:
                            try:
                                security_timestamp = datetime.utcnow().isoformat(timespec="microseconds") + "Z"
                                update_admin_password(
                                    int(admin_user["id"]),
                                    generate_password_hash(new_password),
                                    security_timestamp,
                                )
                            except Exception:  # noqa: BLE001
                                app.logger.exception("Failed to update the administrator password.")
                                status_code = 503
                                error_message = "The password could not be updated. Please try again."
                            else:
                                _clear_failed_logins(client_ip)
                                session.clear()
                                ajax_response = _admin_settings_response(
                                    ok=True,
                                    title="Password updated",
                                    message="Your password was changed and all administrator sessions were signed out. Sign in again to continue.",
                                    redirect_url=url_for("admin_login"),
                                )
                                if ajax_response:
                                    return ajax_response
                                return redirect(url_for("admin_login", password_changed="1"))
                    elif action == "sign-out-all":
                        try:
                            security_timestamp = datetime.utcnow().isoformat(timespec="microseconds") + "Z"
                            touch_admin_account(int(admin_user["id"]), security_timestamp)
                        except Exception:  # noqa: BLE001
                            app.logger.exception("Failed to invalidate administrator sessions.")
                            status_code = 503
                            error_message = "Administrator sessions could not be ended. Please try again."
                        else:
                            _clear_failed_logins(client_ip)
                            session.clear()
                            ajax_response = _admin_settings_response(
                                ok=True,
                                title="Sessions ended",
                                message="All administrator sessions were signed out successfully.",
                                redirect_url=url_for("admin_login"),
                            )
                            if ajax_response:
                                return ajax_response
                            return redirect(url_for("admin_login"))
                    else:
                        status_code = 400
                        error_message = "Unsupported account action."

        ajax_response = _admin_settings_response(
            ok=False,
            title="Unable to save",
            message=error_message or "The account change could not be completed.",
            status_code=status_code,
        )
        if ajax_response:
            return ajax_response

    return (
        render_template(
            "admin/AdminAccountSettings.html",
            csrf_token=csrf_token,
            admin_username=admin_username,
            admin_account={
                "email": admin_email,
                "initial": (admin_email[:1] or "A").upper(),
                "status": "Active" if admin_user.get("is_active") else "Disabled",
                "created_at": _format_dashboard_datetime(admin_user.get("created_at")),
                "updated_at": _format_dashboard_datetime(admin_user.get("updated_at")),
                "session_minutes": int(app.config["PERMANENT_SESSION_LIFETIME"].total_seconds() // 60),
            },
            error_message=error_message,
        ),
        status_code,
    )


@app.route("/3d-environment/<scene_name>")
def three_d_environment_scene(scene_name):
    normalized_scene = str(scene_name or "").strip().lower()
    if normalized_scene not in WEBXR_SCENE_PATHS:
        return jsonify({"error": f"Unknown WebXR scene: {scene_name}"}), 404
    return render_template(
        "WebXREnvironment.html",
        webxr_scene=normalized_scene,
        webxr_asset_version=WEBXR_ASSET_VERSION,
    )


@app.route("/api/webxr/player-progress")
def webxr_player_progress_api():
    current_user = _get_current_public_user()
    if not current_user:
        return jsonify({
            "ok": False,
            "login_required": True,
            "login_url": url_for("public_login", next=request.referrer or url_for("three_d_environment")),
        }), 401
    try:
        user_id = int(current_user.get("id"))
        keeper_progress = load_heritage_keeper_progress(user_id)
        webxr_achievements = [
            str(fragment.get("key") or "")
            for fragment in keeper_progress.get("fragments", [])
            if fragment.get("source") == "webxr" and fragment.get("earned")
        ]
        return jsonify({
            "ok": True,
            "progress": load_webxr_player_progress(user_id),
            "webxr_achievements": webxr_achievements,
        })
    except Exception as exc:
        app.logger.exception("Failed to load WebXR player progress: %s", exc)
        return jsonify({"ok": False, "error": "Player progress could not be loaded."}), 500


@app.route("/api/webxr/player-progress/collect", methods=["POST"])
def webxr_collect_item_api():
    current_user = _get_current_public_user()
    if not current_user or session.get(PUBLIC_SESSION_KEY) is not True:
        return jsonify({"ok": False, "login_required": True}), 401
    if not _is_public_csrf_valid(request.headers.get("X-CSRF-Token")):
        return jsonify({"ok": False, "error": "Invalid request."}), 400
    payload = request.get_json(silent=True) or {}
    try:
        progress = collect_webxr_item(
            int(current_user.get("id")),
            str(payload.get("item_key") or ""),
            str(payload.get("scene") or ""),
        )
        return jsonify({"ok": True, "progress": progress})
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400
    except Exception as exc:
        app.logger.exception("Failed to save a WebXR collectible: %s", exc)
        return jsonify({"ok": False, "error": "The recovered item could not be saved."}), 500


@app.route("/api/webxr/player-progress/deposit", methods=["POST"])
def webxr_deposit_record_api():
    current_user = _get_current_public_user()
    if not current_user or session.get(PUBLIC_SESSION_KEY) is not True:
        return jsonify({"ok": False, "login_required": True}), 401
    if not _is_public_csrf_valid(request.headers.get("X-CSRF-Token")):
        return jsonify({"ok": False, "error": "Invalid request."}), 400
    payload = request.get_json(silent=True) or {}
    try:
        progress = deposit_webxr_record(int(current_user.get("id")), str(payload.get("record_key") or ""))
        return jsonify({"ok": True, "progress": progress})
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400
    except Exception as exc:
        app.logger.exception("Failed to deposit WebXR record items: %s", exc)
        return jsonify({"ok": False, "error": "The recovered materials could not be deposited."}), 500


@app.route("/api/webxr/player-progress/museum-view", methods=["POST"])
def webxr_museum_view_api():
    current_user = _get_current_public_user()
    if not current_user or session.get(PUBLIC_SESSION_KEY) is not True:
        return jsonify({"ok": False, "login_required": True}), 401
    if not _is_public_csrf_valid(request.headers.get("X-CSRF-Token")):
        return jsonify({"ok": False, "error": "Invalid request."}), 400
    payload = request.get_json(silent=True) or {}
    try:
        progress = record_webxr_museum_view(
            int(current_user.get("id")), str(payload.get("hotspot_key") or ""),
        )
        return jsonify({"ok": True, "progress": progress})
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400
    except Exception as exc:
        app.logger.exception("Failed to save a viewed WebXR museum exhibit: %s", exc)
        return jsonify({"ok": False, "error": "Museum progress could not be saved."}), 500


@app.route("/api/webxr/player-progress/achievement", methods=["POST"])
def webxr_scene_achievement_api():
    current_user = _get_current_public_user()
    if not current_user or session.get(PUBLIC_SESSION_KEY) is not True:
        return jsonify({"ok": False, "login_required": True}), 401
    if not _is_public_csrf_valid(request.headers.get("X-CSRF-Token")):
        return jsonify({"ok": False, "error": "Invalid request."}), 400
    payload = request.get_json(silent=True) or {}
    try:
        result = record_heritage_keeper_fragment(
            int(current_user.get("id")), "webxr", str(payload.get("scene") or ""),
        )
        return jsonify({"ok": True, **result})
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400
    except Exception as exc:
        app.logger.exception("Failed to save WebXR scene achievement: %s", exc)
        return jsonify({"ok": False, "error": "The environment achievement could not be saved."}), 500


@app.route("/api/webxr/scene")
def webxr_scene_metadata():
    if not _ensure_webxr_runtime_initialized():
        return jsonify({"error": "WebXR runtime is unavailable.", "details": WEBXR_INIT_ERROR}), 503

    requested_scene = (request.args.get("scene") or "").strip().lower()
    requested_zip = (request.args.get("zip") or "").strip()
    zip_override = None
    if requested_scene:
        resolved_zip = WEBXR_SCENE_PATHS.get(requested_scene)
        if resolved_zip is not None:
            resolved_zip = resolved_zip.resolve()
        if resolved_zip is None or not resolved_zip.exists() or not resolved_zip.is_file():
            return jsonify({"error": f"Unknown WebXR scene: {requested_scene}"}), 404
        zip_override = str(resolved_zip)
    elif requested_zip:
        resolved_zip = WEBXR_SCENE_ZIP_PATHS.get(requested_zip)
        if resolved_zip is not None:
            resolved_zip = resolved_zip.resolve()
        if resolved_zip is None or not resolved_zip.exists() or not resolved_zip.is_file():
            return jsonify({"error": f"Unknown WebXR scene: {requested_zip}"}), 404
        zip_override = str(resolved_zip)
    scene_description = WEBXR_RUNTIME_SCENE.get_scene_description(zip_override=zip_override)
    payload = {
        "app": {
            "name": _get_webxr_config_value("APP_NAME", "Marble WebXR Viewer"),
            "debug": bool(_get_webxr_config_value("DEBUG", False)),
        },
        "player": _get_webxr_player_settings(),
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
        try:
            scene_prepared = _ensure_webxr_asset_scene_extracted(asset_path)
        except Exception:  # noqa: BLE001
            app.logger.exception("WebXR scene recovery failed for asset %s", asset_path)
            return jsonify({"error": "The WebXR scene could not be prepared."}), 503

        if scene_prepared:
            candidate_path = _resolve_safe_path(runtime_dir, asset_path)

    if candidate_path is None or not candidate_path.exists() or not candidate_path.is_file():
        return jsonify({"error": f"WebXR runtime asset not found: {asset_path}"}), 404

    return send_from_directory(str(runtime_dir), asset_path, conditional=True, max_age=3600)


@app.route("/webxr/static/<path:filename>")
def webxr_static_file(filename):
    webxr_static_dir = (WEBXR_BASE_DIR / "static").resolve()
    candidate_path = _resolve_safe_path(webxr_static_dir, filename)
    if candidate_path is None:
        return jsonify({"error": "Invalid WebXR static asset path"}), 400
    if not candidate_path.exists() or not candidate_path.is_file():
        return jsonify({"error": f"WebXR static asset not found: {filename}"}), 404
    return send_from_directory(str(webxr_static_dir), filename)


# Vercel serves public/ at the site root. This local-development mirror keeps
# the shared Spark renderer on the same /webxr/vendor URL without adding the
# large module to the Python function bundle.
@app.route("/webxr/vendor/<path:filename>")
def webxr_public_vendor_file(filename):
    webxr_vendor_dir = (PROJECT_ROOT / "public" / "webxr" / "vendor").resolve()
    candidate_path = _resolve_safe_path(webxr_vendor_dir, filename)
    if candidate_path is None:
        return jsonify({"error": "Invalid WebXR vendor asset path"}), 400
    if not candidate_path.exists() or not candidate_path.is_file():
        return jsonify({"error": f"WebXR vendor asset not found: {filename}"}), 404
    return send_from_directory(str(webxr_vendor_dir), filename, conditional=True, max_age=31536000)


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


@app.route("/participation")
def participation():
    return redirect(url_for("community_participation"))


@app.route("/community-participation")
def community_participation():
    community_highlights_items = load_news_community_highlights(limit=24)
    community_calendar_items = load_public_tour_bookings(limit=90)
    public_visitor_feedback = build_public_visitor_feedback()
    return render_template(
        "CommunityParticipation.html",
        community_highlights_items=community_highlights_items,
        community_calendar_items=community_calendar_items,
        public_visitor_feedback=public_visitor_feedback,
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


# Vercel publishes files from public/ at the website root. This mirror keeps
# that same root-style Seal URL available while running Flask locally.
@app.route("/Seal/<path:filename>")
def public_seal_file(filename):
    seal_dir = PROJECT_ROOT / "public" / "Seal"
    candidate_path = _resolve_safe_path(seal_dir, filename)
    if candidate_path is None:
        return jsonify({"error": "Invalid seal file path"}), 400
    if not candidate_path.exists() or not candidate_path.is_file():
        return jsonify({"error": f"Seal file not found: {filename}"}), 404
    return send_from_directory(str(seal_dir), filename)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=not IS_PRODUCTION)
