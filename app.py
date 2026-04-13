import hmac
import os
import re
import secrets
import threading
import time
from datetime import datetime, timedelta
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, make_response, redirect, render_template, request, send_from_directory, session, url_for
from werkzeug.security import check_password_hash
from werkzeug.utils import secure_filename

from community_events_repository import (
    create_community_event,
    delete_community_event,
    get_community_event_by_id,
    get_published_community_event_by_slug,
    list_all_community_events,
    list_published_community_events,
    update_community_event,
)
from community_highlights_repository import (
    create_community_highlight,
    delete_community_highlight,
    get_community_highlight_by_id,
    get_published_community_highlight_by_slug,
    list_all_community_highlights,
    list_published_community_highlights,
    update_community_highlight,
)
from exhibits_repository import (
    create_exhibit,
    delete_exhibit,
    get_exhibit_by_id,
    get_published_exhibit_by_slug,
    list_all_exhibits,
    list_published_exhibits,
    update_exhibit,
)
from supabase_client import SupabaseConfigError, is_supabase_configured

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover - optional in some environments
    load_dotenv = None


PROJECT_ROOT = Path(__file__).resolve().parent
WEBXR_BASE_DIR = (PROJECT_ROOT / "webxr_runtime").resolve()
EXHIBITS_UPLOAD_DIR = (PROJECT_ROOT / "static" / "uploads" / "exhibits").resolve()
COMMUNITY_HIGHLIGHTS_UPLOAD_DIR = (PROJECT_ROOT / "static" / "uploads" / "community-highlights").resolve()
COMMUNITY_EVENTS_UPLOAD_DIR = (PROJECT_ROOT / "static" / "uploads" / "events").resolve()
ALLOWED_EXHIBIT_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
COMMUNITY_HIGHLIGHT_CATEGORIES = (
    "Education Program",
    "Community Activity",
    "Public Advisory",
)

if load_dotenv is not None:
    load_dotenv(dotenv_path=PROJECT_ROOT / ".env", override=False)


def _bool_env(name, default):
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


app = Flask(__name__)

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
ADMIN_SESSION_USER_KEY = "admin_username"
ADMIN_CSRF_KEY = "admin_csrf"

ADMIN_USERNAME = (os.getenv("ADMIN_USERNAME") or "").strip().lower()
ADMIN_PASSWORD_HASH = (os.getenv("ADMIN_PASSWORD_HASH") or "").strip()

ADMIN_LOGIN_RATE_WINDOW_SECONDS = max(60, int(os.getenv("ADMIN_LOGIN_RATE_WINDOW_SECONDS", "900")))
ADMIN_LOGIN_MAX_ATTEMPTS = max(3, int(os.getenv("ADMIN_LOGIN_MAX_ATTEMPTS", "5")))
ADMIN_LOGIN_LOCKOUT_SECONDS = max(30, int(os.getenv("ADMIN_LOGIN_LOCKOUT_SECONDS", "900")))
TRUST_PROXY_HEADERS = _bool_env("TRUST_PROXY_HEADERS", False)

_ADMIN_LOGIN_ATTEMPTS = {}
_ADMIN_LOGIN_ATTEMPTS_LOCK = threading.Lock()


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


def _load_landing_exhibits(limit=None):
    if not is_supabase_configured():
        return []

    try:
        return _prepare_exhibit_items(list_published_exhibits(limit=limit))
    except SupabaseConfigError:
        app.logger.warning("Supabase exhibits integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        app.logger.exception("Failed to load exhibits from Supabase: %s", exc)

    return []


def _load_published_exhibit(slug):
    if not is_supabase_configured():
        return None

    try:
        exhibit_item = get_published_exhibit_by_slug(slug)
        if exhibit_item is None:
            return None
        return _prepare_exhibit_item(exhibit_item)
    except SupabaseConfigError:
        app.logger.warning("Supabase exhibits integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        app.logger.exception("Failed to load exhibit '%s' from Supabase: %s", slug, exc)

    return None


def _load_news_community_highlights(limit=None):
    if not is_supabase_configured():
        return []

    try:
        return _prepare_community_highlight_items(list_published_community_highlights(limit=limit))
    except SupabaseConfigError:
        app.logger.warning("Supabase community highlights integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        app.logger.exception("Failed to load community highlights from Supabase: %s", exc)

    return []


def _load_news_community_events(limit=None):
    if not is_supabase_configured():
        return []

    try:
        return _prepare_community_event_items(list_published_community_events(limit=limit))
    except SupabaseConfigError:
        app.logger.warning("Supabase community events integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        app.logger.exception("Failed to load community events from Supabase: %s", exc)

    return []


def _load_published_community_highlight(slug):
    if not is_supabase_configured():
        return None

    try:
        highlight_item = get_published_community_highlight_by_slug(slug)
        if highlight_item is None:
            return None
        return _prepare_community_highlight_item(highlight_item)
    except SupabaseConfigError:
        app.logger.warning("Supabase community highlights integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        app.logger.exception("Failed to load community highlight '%s' from Supabase: %s", slug, exc)

    return None


def _load_published_community_event(slug):
    if not is_supabase_configured():
        return None

    try:
        event_item = get_published_community_event_by_slug(slug)
        if event_item is None:
            return None
        return _prepare_community_event_item(event_item)
    except SupabaseConfigError:
        app.logger.warning("Supabase community events integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        app.logger.exception("Failed to load community event '%s' from Supabase: %s", slug, exc)

    return None


def _format_exhibit_date(raw_value):
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


def _resolve_local_upload_image_url(upload_dir, upload_folder_name, image_filename):
    safe_filename = Path(str(image_filename or "")).name.strip()
    if not safe_filename:
        return None

    candidate_path = (upload_dir / safe_filename).resolve()
    if upload_dir not in candidate_path.parents and candidate_path != upload_dir:
        return None
    if not candidate_path.exists() or not candidate_path.is_file():
        return None

    return url_for("static", filename=f"uploads/{upload_folder_name}/{safe_filename}")


def _resolve_exhibit_image_url(image_filename):
    return _resolve_local_upload_image_url(EXHIBITS_UPLOAD_DIR, "exhibits", image_filename)


def _prepare_exhibit_item(item):
    prepared = dict(item or {})
    prepared["display_date"] = _format_exhibit_date(prepared.get("event_date"))
    prepared["detail_url"] = url_for("current_exhibits_news_detail", slug=prepared.get("slug", ""))
    prepared["image_url"] = _resolve_exhibit_image_url(prepared.get("image_filename"))
    return prepared


def _prepare_exhibit_items(items):
    return [_prepare_exhibit_item(item) for item in list(items or [])]


def _prepare_community_highlight_item(item):
    prepared = dict(item or {})
    prepared["display_date"] = _format_exhibit_date(prepared.get("event_date"))
    prepared["detail_url"] = url_for("community_highlight_detail", slug=prepared.get("slug", ""))
    prepared["image_url"] = _resolve_local_upload_image_url(
        COMMUNITY_HIGHLIGHTS_UPLOAD_DIR,
        "community-highlights",
        prepared.get("image_filename"),
    )
    prepared["category"] = str(prepared.get("category") or COMMUNITY_HIGHLIGHT_CATEGORIES[0]).strip() or COMMUNITY_HIGHLIGHT_CATEGORIES[0]
    return prepared


def _prepare_community_highlight_items(items):
    return [_prepare_community_highlight_item(item) for item in list(items or [])]


def _prepare_community_event_item(item):
    prepared = dict(item or {})
    prepared["display_date"] = _format_exhibit_date(prepared.get("event_date"))
    prepared["detail_url"] = url_for("community_event_detail", slug=prepared.get("slug", ""))
    prepared["image_url"] = _resolve_local_upload_image_url(
        COMMUNITY_EVENTS_UPLOAD_DIR,
        "events",
        prepared.get("image_filename"),
    )
    return prepared


def _prepare_community_event_items(items):
    return [_prepare_community_event_item(item) for item in list(items or [])]


def _load_admin_exhibits():
    if not is_supabase_configured():
        return []

    try:
        return _prepare_exhibit_items(list_all_exhibits())
    except SupabaseConfigError:
        app.logger.warning("Supabase exhibits integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        app.logger.exception("Failed to load admin exhibits from Supabase: %s", exc)

    return []


def _load_admin_exhibit(exhibit_id):
    if not is_supabase_configured():
        return None

    try:
        exhibit_item = get_exhibit_by_id(exhibit_id)
        if exhibit_item is None:
            return None
        return _prepare_exhibit_item(exhibit_item)
    except SupabaseConfigError:
        app.logger.warning("Supabase exhibits integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        app.logger.exception("Failed to load admin exhibit '%s' from Supabase: %s", exhibit_id, exc)

    return None


def _load_admin_community_highlights():
    if not is_supabase_configured():
        return []

    try:
        return _prepare_community_highlight_items(list_all_community_highlights())
    except SupabaseConfigError:
        app.logger.warning("Supabase community highlights integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        app.logger.exception("Failed to load admin community highlights from Supabase: %s", exc)

    return []


def _load_admin_community_highlight(highlight_id):
    if not is_supabase_configured():
        return None

    try:
        highlight_item = get_community_highlight_by_id(highlight_id)
        if highlight_item is None:
            return None
        return _prepare_community_highlight_item(highlight_item)
    except SupabaseConfigError:
        app.logger.warning("Supabase community highlights integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        app.logger.exception("Failed to load admin community highlight '%s' from Supabase: %s", highlight_id, exc)

    return None


def _load_admin_community_events():
    if not is_supabase_configured():
        return []

    try:
        return _prepare_community_event_items(list_all_community_events())
    except SupabaseConfigError:
        app.logger.warning("Supabase community events integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        app.logger.exception("Failed to load admin community events from Supabase: %s", exc)

    return []


def _load_admin_community_event(event_id):
    if not is_supabase_configured():
        return None

    try:
        event_item = get_community_event_by_id(event_id)
        if event_item is None:
            return None
        return _prepare_community_event_item(event_item)
    except SupabaseConfigError:
        app.logger.warning("Supabase community events integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        app.logger.exception("Failed to load admin community event '%s' from Supabase: %s", event_id, exc)

    return None


def _slugify_text(value, fallback="exhibit"):
    normalized = re.sub(r"[^a-z0-9]+", "-", str(value or "").strip().lower())
    normalized = normalized.strip("-")
    return normalized or fallback


def _build_unique_exhibit_slug(title, current_id=None):
    base_slug = _slugify_text(title, fallback="exhibit")
    try:
        existing_items = list_all_exhibits() if is_supabase_configured() else []
    except Exception:  # noqa: BLE001
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


def _build_unique_community_highlight_slug(title, current_id=None):
    base_slug = _slugify_text(title, fallback="community-highlight")
    try:
        existing_items = list_all_community_highlights() if is_supabase_configured() else []
    except Exception:  # noqa: BLE001
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


def _build_unique_community_event_slug(title, current_id=None):
    base_slug = _slugify_text(title, fallback="community-event")
    try:
        existing_items = list_all_community_events() if is_supabase_configured() else []
    except Exception:  # noqa: BLE001
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


def _parse_sort_order(raw_value):
    try:
        return int(str(raw_value or "0").strip() or "0")
    except ValueError:
        return 0


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


def _delete_local_image(image_filename, upload_dir):
    safe_filename = Path(str(image_filename or "")).name.strip()
    if not safe_filename:
        return

    candidate_path = (upload_dir / safe_filename).resolve()
    if upload_dir not in candidate_path.parents and candidate_path != upload_dir:
        return
    if candidate_path.exists() and candidate_path.is_file():
        candidate_path.unlink()


def _delete_local_exhibit_image(image_filename):
    _delete_local_image(image_filename, EXHIBITS_UPLOAD_DIR)


def _save_uploaded_image(file_storage, title, upload_dir):
    if file_storage is None or not str(getattr(file_storage, "filename", "")).strip():
        return None

    original_name = secure_filename(str(file_storage.filename or "").strip())
    extension = Path(original_name).suffix.lower()
    if extension not in ALLOWED_EXHIBIT_IMAGE_EXTENSIONS:
        raise ValueError("Image must be a JPG or PNG file.")

    upload_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    safe_title = _slugify_text(title, fallback="image")
    filename = f"{safe_title}-{timestamp}{extension}"
    destination = (upload_dir / filename).resolve()
    file_storage.save(destination)
    return filename


def _save_uploaded_exhibit_image(file_storage, title):
    return _save_uploaded_image(file_storage, title, EXHIBITS_UPLOAD_DIR)


def _build_exhibit_form_state(source=None):
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


def _build_community_highlight_form_state(source=None):
    source = source or {}
    raw_category = str(source.get("category") or "").strip()
    return {
        "title": str(source.get("title") or "").strip(),
        "category": raw_category if raw_category in COMMUNITY_HIGHLIGHT_CATEGORIES else COMMUNITY_HIGHLIGHT_CATEGORIES[0],
        "event_date": str(source.get("event_date") or "").strip(),
        "short_description": str(source.get("short_description") or "").strip(),
        "long_description": str(source.get("long_description") or "").strip(),
        "is_published": bool(source.get("is_published")),
        "image_filename": str(source.get("image_filename") or "").strip(),
        "image_url": source.get("image_url"),
    }


def _build_community_event_form_state(source=None):
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


def _build_exhibit_form_payload(form, files, current_item=None):
    title = str(form.get("title") or "").strip()
    short_description = str(form.get("short_description") or "").strip()
    long_description = str(form.get("long_description") or "").strip()

    if len(title) < 3:
        raise ValueError("Title must be at least 3 characters.")
    if len(short_description) < 12:
        raise ValueError("Short description must be at least 12 characters.")
    if len(long_description) < 24:
        raise ValueError("More information must be at least 24 characters.")

    payload = {
        "title": title,
        "slug": _build_unique_exhibit_slug(title, current_id=current_item.get("id") if current_item else None),
        "event_date": _validate_event_date(form.get("event_date")),
        "short_description": short_description,
        "long_description": long_description,
        "is_published": _normalize_checkbox(form.get("is_published")),
    }

    uploaded_file = files.get("image_file")
    new_image_filename = _save_uploaded_exhibit_image(uploaded_file, title)
    if new_image_filename:
        payload["image_filename"] = new_image_filename
    elif current_item:
        payload["image_filename"] = current_item.get("image_filename")
    else:
        payload["image_filename"] = None

    return payload, new_image_filename


def _build_community_highlight_form_payload(form, files, current_item=None):
    title = str(form.get("title") or "").strip()
    category = str(form.get("category") or "").strip()
    short_description = str(form.get("short_description") or "").strip()
    long_description = str(form.get("long_description") or "").strip()

    if len(title) < 3:
        raise ValueError("Title must be at least 3 characters.")
    if category not in COMMUNITY_HIGHLIGHT_CATEGORIES:
        raise ValueError("Please choose a valid category.")
    if len(short_description) < 12:
        raise ValueError("Short description must be at least 12 characters.")
    if len(long_description) < 24:
        raise ValueError("More information must be at least 24 characters.")

    payload = {
        "title": title,
        "slug": _build_unique_community_highlight_slug(title, current_id=current_item.get("id") if current_item else None),
        "category": category,
        "event_date": _validate_event_date(form.get("event_date")),
        "short_description": short_description,
        "long_description": long_description,
        "is_published": _normalize_checkbox(form.get("is_published")),
    }

    uploaded_file = files.get("image_file")
    new_image_filename = _save_uploaded_image(uploaded_file, title, COMMUNITY_HIGHLIGHTS_UPLOAD_DIR)
    if new_image_filename:
        payload["image_filename"] = new_image_filename
    elif current_item:
        payload["image_filename"] = current_item.get("image_filename")
    else:
        payload["image_filename"] = None

    return payload, new_image_filename


def _build_community_event_form_payload(form, files, current_item=None):
    title = str(form.get("title") or "").strip()
    short_description = str(form.get("short_description") or "").strip()
    long_description = str(form.get("long_description") or "").strip()

    if len(title) < 3:
        raise ValueError("Title must be at least 3 characters.")
    if len(short_description) < 12:
        raise ValueError("Short description must be at least 12 characters.")
    if len(long_description) < 24:
        raise ValueError("More information must be at least 24 characters.")

    payload = {
        "title": title,
        "slug": _build_unique_community_event_slug(title, current_id=current_item.get("id") if current_item else None),
        "event_date": _validate_event_date(form.get("event_date")),
        "short_description": short_description,
        "long_description": long_description,
        "is_published": _normalize_checkbox(form.get("is_published")),
    }

    uploaded_file = files.get("image_file")
    new_image_filename = _save_uploaded_image(uploaded_file, title, COMMUNITY_EVENTS_UPLOAD_DIR)
    if new_image_filename:
        payload["image_filename"] = new_image_filename
    elif current_item:
        payload["image_filename"] = current_item.get("image_filename")
    else:
        payload["image_filename"] = None

    return payload, new_image_filename


def _get_exhibits_status_message(status_key):
    mapping = {
        "created": "Exhibit card created successfully.",
        "updated": "Exhibit card updated successfully.",
        "deleted": "Exhibit card deleted successfully.",
    }
    return mapping.get(str(status_key or "").strip().lower())


def _get_community_highlights_status_message(status_key):
    mapping = {
        "created": "Community highlight created successfully.",
        "updated": "Community highlight updated successfully.",
        "deleted": "Community highlight deleted successfully.",
    }
    return mapping.get(str(status_key or "").strip().lower())


def _get_community_events_status_message(status_key):
    mapping = {
        "created": "Event card created successfully.",
        "updated": "Event card updated successfully.",
        "deleted": "Event card deleted successfully.",
    }
    return mapping.get(str(status_key or "").strip().lower())


def _render_admin_exhibit_form(*, form_title, submit_label, form_action, exhibit_form, error_message=None):
    csrf_token = _ensure_admin_csrf_token()
    admin_username = session.get(ADMIN_SESSION_USER_KEY, ADMIN_USERNAME)
    return render_template(
        "admin/AdminExhibitForm.html",
        csrf_token=csrf_token,
        admin_username=admin_username,
        form_title=form_title,
        submit_label=submit_label,
        form_action=form_action,
        exhibit_form=exhibit_form,
        error_message=error_message,
    )


def _render_admin_community_highlight_form(*, form_title, submit_label, form_action, highlight_form, error_message=None):
    csrf_token = _ensure_admin_csrf_token()
    admin_username = session.get(ADMIN_SESSION_USER_KEY, ADMIN_USERNAME)
    return render_template(
        "admin/AdminCommunityHighlightForm.html",
        csrf_token=csrf_token,
        admin_username=admin_username,
        form_title=form_title,
        submit_label=submit_label,
        form_action=form_action,
        highlight_form=highlight_form,
        category_options=COMMUNITY_HIGHLIGHT_CATEGORIES,
        error_message=error_message,
    )


def _render_admin_event_form(*, form_title, submit_label, form_action, event_form, error_message=None):
    csrf_token = _ensure_admin_csrf_token()
    admin_username = session.get(ADMIN_SESSION_USER_KEY, ADMIN_USERNAME)
    return render_template(
        "admin/AdminEventForm.html",
        csrf_token=csrf_token,
        admin_username=admin_username,
        form_title=form_title,
        submit_label=submit_label,
        form_action=form_action,
        event_form=event_form,
        error_message=error_message,
    )


def _normalize_admin_identity(raw_value):
    return str(raw_value or "").strip().lower()


def _is_admin_auth_configured():
    return bool(ADMIN_USERNAME and ADMIN_PASSWORD_HASH)


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


def _is_valid_login_payload(username, password):
    if not username or len(username) > 128:
        return False
    if re.fullmatch(r"[a-z0-9._@+\-]+", username) is None:
        return False
    if not password or len(password) > 1024:
        return False
    return True


def _credentials_match(username, password):
    if not _is_admin_auth_configured():
        return False
    if not hmac.compare_digest(username, ADMIN_USERNAME):
        return False
    try:
        return bool(check_password_hash(ADMIN_PASSWORD_HASH, password))
    except (ValueError, TypeError):
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
    session_username = _normalize_admin_identity(session.get(ADMIN_SESSION_USER_KEY, ""))
    return bool(ADMIN_USERNAME) and hmac.compare_digest(session_username, ADMIN_USERNAME)


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
            "img-src 'self' data:; "
            "script-src 'self' https://cdnjs.cloudflare.com; "
            "style-src 'self'; "
            "connect-src 'self'; "
            "font-src 'self'; "
            "base-uri 'self'; "
            "form-action 'self'; "
            "frame-ancestors 'none'; "
            "object-src 'none'"
        )

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
                username = _normalize_admin_identity(request.form.get("username", ""))
                password = str(request.form.get("password", ""))

                if _is_valid_login_payload(username, password) and _credentials_match(username, password):
                    _clear_failed_logins(client_ip)
                    session.clear()
                    session.permanent = True
                    session[ADMIN_SESSION_KEY] = True
                    session[ADMIN_SESSION_USER_KEY] = ADMIN_USERNAME
                    session[ADMIN_CSRF_KEY] = secrets.token_urlsafe(32)
                    return redirect(url_for("admin_dashboard"))

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
    admin_username = session.get(ADMIN_SESSION_USER_KEY, ADMIN_USERNAME)
    return render_template(
        "admin/AdminDashboard.html",
        csrf_token=csrf_token,
        admin_username=admin_username,
    )


@app.route(f"{ADMIN_ROUTE_PREFIX}/exhibits")
@_admin_required
def admin_exhibits():
    csrf_token = _ensure_admin_csrf_token()
    admin_username = session.get(ADMIN_SESSION_USER_KEY, ADMIN_USERNAME)
    exhibits_items = _load_admin_exhibits()
    status_message = _get_exhibits_status_message(request.args.get("status"))
    config_error = None if is_supabase_configured() else "Supabase exhibits integration is not configured."
    return render_template(
        "admin/AdminExhibits.html",
        csrf_token=csrf_token,
        admin_username=admin_username,
        exhibits_items=exhibits_items,
        status_message=status_message,
        config_error=config_error,
    )


@app.route(f"{ADMIN_ROUTE_PREFIX}/exhibits/new", methods=["GET", "POST"])
@_admin_required
def admin_exhibit_new():
    if request.method == "GET":
        return _render_admin_exhibit_form(
            form_title="Create Exhibit Card",
            submit_label="Create Exhibit",
            form_action=url_for("admin_exhibit_new"),
            exhibit_form=_build_exhibit_form_state({"is_published": True}),
        )

    if not _is_admin_csrf_valid(request.form.get("csrf_token")):
        return redirect(url_for("admin_exhibits"))

    if not is_supabase_configured():
        return _render_admin_exhibit_form(
            form_title="Create Exhibit Card",
            submit_label="Create Exhibit",
            form_action=url_for("admin_exhibit_new"),
            exhibit_form=_build_exhibit_form_state(request.form),
            error_message="Supabase exhibits integration is not configured.",
        )

    new_image_filename = None
    try:
        payload, new_image_filename = _build_exhibit_form_payload(request.form, request.files)
        create_exhibit(payload)
    except ValueError as exc:
        if new_image_filename:
            _delete_local_exhibit_image(new_image_filename)
        return _render_admin_exhibit_form(
            form_title="Create Exhibit Card",
            submit_label="Create Exhibit",
            form_action=url_for("admin_exhibit_new"),
            exhibit_form=_build_exhibit_form_state({**request.form, "is_published": _normalize_checkbox(request.form.get("is_published"))}),
            error_message=str(exc),
        )
    except Exception as exc:  # noqa: BLE001
        if new_image_filename:
            _delete_local_exhibit_image(new_image_filename)
        app.logger.exception("Failed to create exhibit: %s", exc)
        return _render_admin_exhibit_form(
            form_title="Create Exhibit Card",
            submit_label="Create Exhibit",
            form_action=url_for("admin_exhibit_new"),
            exhibit_form=_build_exhibit_form_state({**request.form, "is_published": _normalize_checkbox(request.form.get("is_published"))}),
            error_message="Could not create the exhibit card right now.",
        )

    return redirect(url_for("admin_exhibits", status="created"))


@app.route(f"{ADMIN_ROUTE_PREFIX}/exhibits/<int:exhibit_id>/edit", methods=["GET", "POST"])
@_admin_required
def admin_exhibit_edit(exhibit_id):
    current_item = _load_admin_exhibit(exhibit_id)
    if current_item is None:
        return redirect(url_for("admin_exhibits"))

    if request.method == "GET":
        return _render_admin_exhibit_form(
            form_title="Edit Exhibit Card",
            submit_label="Save Changes",
            form_action=url_for("admin_exhibit_edit", exhibit_id=exhibit_id),
            exhibit_form=_build_exhibit_form_state(current_item),
        )

    if not _is_admin_csrf_valid(request.form.get("csrf_token")):
        return redirect(url_for("admin_exhibits"))

    new_image_filename = None
    previous_image_filename = current_item.get("image_filename")
    try:
        payload, new_image_filename = _build_exhibit_form_payload(request.form, request.files, current_item=current_item)
        update_exhibit(exhibit_id, payload)
        if new_image_filename and previous_image_filename and previous_image_filename != new_image_filename:
            _delete_local_exhibit_image(previous_image_filename)
    except ValueError as exc:
        if new_image_filename:
            _delete_local_exhibit_image(new_image_filename)
        return _render_admin_exhibit_form(
            form_title="Edit Exhibit Card",
            submit_label="Save Changes",
            form_action=url_for("admin_exhibit_edit", exhibit_id=exhibit_id),
            exhibit_form=_build_exhibit_form_state({**current_item, **request.form, "is_published": _normalize_checkbox(request.form.get("is_published"))}),
            error_message=str(exc),
        )
    except Exception as exc:  # noqa: BLE001
        if new_image_filename:
            _delete_local_exhibit_image(new_image_filename)
        app.logger.exception("Failed to update exhibit %s: %s", exhibit_id, exc)
        return _render_admin_exhibit_form(
            form_title="Edit Exhibit Card",
            submit_label="Save Changes",
            form_action=url_for("admin_exhibit_edit", exhibit_id=exhibit_id),
            exhibit_form=_build_exhibit_form_state({**current_item, **request.form, "is_published": _normalize_checkbox(request.form.get("is_published"))}),
            error_message="Could not update the exhibit card right now.",
        )

    return redirect(url_for("admin_exhibits", status="updated"))


@app.route(f"{ADMIN_ROUTE_PREFIX}/exhibits/<int:exhibit_id>/delete", methods=["POST"])
@_admin_required
def admin_exhibit_delete(exhibit_id):
    if not _is_admin_csrf_valid(request.form.get("csrf_token")):
        return redirect(url_for("admin_exhibits"))

    current_item = _load_admin_exhibit(exhibit_id)
    if current_item is None:
        return redirect(url_for("admin_exhibits"))

    try:
        delete_exhibit(exhibit_id)
        _delete_local_exhibit_image(current_item.get("image_filename"))
    except Exception as exc:  # noqa: BLE001
        app.logger.exception("Failed to delete exhibit %s: %s", exhibit_id, exc)
        return redirect(url_for("admin_exhibits"))

    return redirect(url_for("admin_exhibits", status="deleted"))


@app.route(f"{ADMIN_ROUTE_PREFIX}/community-highlights")
@_admin_required
def admin_community_highlights():
    csrf_token = _ensure_admin_csrf_token()
    admin_username = session.get(ADMIN_SESSION_USER_KEY, ADMIN_USERNAME)
    highlights_items = _load_admin_community_highlights()
    status_message = _get_community_highlights_status_message(request.args.get("status"))
    config_error = None if is_supabase_configured() else "Supabase community highlights integration is not configured."
    return render_template(
        "admin/AdminCommunityHighlights.html",
        csrf_token=csrf_token,
        admin_username=admin_username,
        highlights_items=highlights_items,
        status_message=status_message,
        config_error=config_error,
    )


@app.route(f"{ADMIN_ROUTE_PREFIX}/community-highlights/new", methods=["GET", "POST"])
@_admin_required
def admin_community_highlight_new():
    if request.method == "GET":
        return _render_admin_community_highlight_form(
            form_title="Create Community Highlight",
            submit_label="Create Highlight",
            form_action=url_for("admin_community_highlight_new"),
            highlight_form=_build_community_highlight_form_state({"is_published": True, "category": COMMUNITY_HIGHLIGHT_CATEGORIES[0]}),
        )

    if not _is_admin_csrf_valid(request.form.get("csrf_token")):
        return redirect(url_for("admin_community_highlights"))

    if not is_supabase_configured():
        return _render_admin_community_highlight_form(
            form_title="Create Community Highlight",
            submit_label="Create Highlight",
            form_action=url_for("admin_community_highlight_new"),
            highlight_form=_build_community_highlight_form_state(request.form),
            error_message="Supabase community highlights integration is not configured.",
        )

    new_image_filename = None
    try:
        payload, new_image_filename = _build_community_highlight_form_payload(request.form, request.files)
        create_community_highlight(payload)
    except ValueError as exc:
        if new_image_filename:
            _delete_local_image(new_image_filename, COMMUNITY_HIGHLIGHTS_UPLOAD_DIR)
        return _render_admin_community_highlight_form(
            form_title="Create Community Highlight",
            submit_label="Create Highlight",
            form_action=url_for("admin_community_highlight_new"),
            highlight_form=_build_community_highlight_form_state({**request.form, "is_published": _normalize_checkbox(request.form.get("is_published"))}),
            error_message=str(exc),
        )
    except Exception as exc:  # noqa: BLE001
        if new_image_filename:
            _delete_local_image(new_image_filename, COMMUNITY_HIGHLIGHTS_UPLOAD_DIR)
        app.logger.exception("Failed to create community highlight: %s", exc)
        return _render_admin_community_highlight_form(
            form_title="Create Community Highlight",
            submit_label="Create Highlight",
            form_action=url_for("admin_community_highlight_new"),
            highlight_form=_build_community_highlight_form_state({**request.form, "is_published": _normalize_checkbox(request.form.get("is_published"))}),
            error_message="Could not create the community highlight right now.",
        )

    return redirect(url_for("admin_community_highlights", status="created"))


@app.route(f"{ADMIN_ROUTE_PREFIX}/community-highlights/<int:highlight_id>/edit", methods=["GET", "POST"])
@_admin_required
def admin_community_highlight_edit(highlight_id):
    current_item = _load_admin_community_highlight(highlight_id)
    if current_item is None:
        return redirect(url_for("admin_community_highlights"))

    if request.method == "GET":
        return _render_admin_community_highlight_form(
            form_title="Edit Community Highlight",
            submit_label="Save Changes",
            form_action=url_for("admin_community_highlight_edit", highlight_id=highlight_id),
            highlight_form=_build_community_highlight_form_state(current_item),
        )

    if not _is_admin_csrf_valid(request.form.get("csrf_token")):
        return redirect(url_for("admin_community_highlights"))

    new_image_filename = None
    previous_image_filename = current_item.get("image_filename")
    try:
        payload, new_image_filename = _build_community_highlight_form_payload(request.form, request.files, current_item=current_item)
        update_community_highlight(highlight_id, payload)
        if new_image_filename and previous_image_filename and previous_image_filename != new_image_filename:
            _delete_local_image(previous_image_filename, COMMUNITY_HIGHLIGHTS_UPLOAD_DIR)
    except ValueError as exc:
        if new_image_filename:
            _delete_local_image(new_image_filename, COMMUNITY_HIGHLIGHTS_UPLOAD_DIR)
        return _render_admin_community_highlight_form(
            form_title="Edit Community Highlight",
            submit_label="Save Changes",
            form_action=url_for("admin_community_highlight_edit", highlight_id=highlight_id),
            highlight_form=_build_community_highlight_form_state({**current_item, **request.form, "is_published": _normalize_checkbox(request.form.get("is_published"))}),
            error_message=str(exc),
        )
    except Exception as exc:  # noqa: BLE001
        if new_image_filename:
            _delete_local_image(new_image_filename, COMMUNITY_HIGHLIGHTS_UPLOAD_DIR)
        app.logger.exception("Failed to update community highlight %s: %s", highlight_id, exc)
        return _render_admin_community_highlight_form(
            form_title="Edit Community Highlight",
            submit_label="Save Changes",
            form_action=url_for("admin_community_highlight_edit", highlight_id=highlight_id),
            highlight_form=_build_community_highlight_form_state({**current_item, **request.form, "is_published": _normalize_checkbox(request.form.get("is_published"))}),
            error_message="Could not update the community highlight right now.",
        )

    return redirect(url_for("admin_community_highlights", status="updated"))


@app.route(f"{ADMIN_ROUTE_PREFIX}/community-highlights/<int:highlight_id>/delete", methods=["POST"])
@_admin_required
def admin_community_highlight_delete(highlight_id):
    if not _is_admin_csrf_valid(request.form.get("csrf_token")):
        return redirect(url_for("admin_community_highlights"))

    current_item = _load_admin_community_highlight(highlight_id)
    if current_item is None:
        return redirect(url_for("admin_community_highlights"))

    try:
        delete_community_highlight(highlight_id)
        _delete_local_image(current_item.get("image_filename"), COMMUNITY_HIGHLIGHTS_UPLOAD_DIR)
    except Exception as exc:  # noqa: BLE001
        app.logger.exception("Failed to delete community highlight %s: %s", highlight_id, exc)
        return redirect(url_for("admin_community_highlights"))

    return redirect(url_for("admin_community_highlights", status="deleted"))


@app.route(f"{ADMIN_ROUTE_PREFIX}/events")
@_admin_required
def admin_events():
    csrf_token = _ensure_admin_csrf_token()
    admin_username = session.get(ADMIN_SESSION_USER_KEY, ADMIN_USERNAME)
    events_items = _load_admin_community_events()
    status_message = _get_community_events_status_message(request.args.get("status"))
    config_error = None if is_supabase_configured() else "Supabase community events integration is not configured."
    return render_template(
        "admin/AdminEvents.html",
        csrf_token=csrf_token,
        admin_username=admin_username,
        events_items=events_items,
        status_message=status_message,
        config_error=config_error,
    )


@app.route(f"{ADMIN_ROUTE_PREFIX}/events/new", methods=["GET", "POST"])
@_admin_required
def admin_event_new():
    if request.method == "GET":
        return _render_admin_event_form(
            form_title="Create Event Card",
            submit_label="Create Event",
            form_action=url_for("admin_event_new"),
            event_form=_build_community_event_form_state({"is_published": True}),
        )

    if not _is_admin_csrf_valid(request.form.get("csrf_token")):
        return redirect(url_for("admin_events"))

    if not is_supabase_configured():
        return _render_admin_event_form(
            form_title="Create Event Card",
            submit_label="Create Event",
            form_action=url_for("admin_event_new"),
            event_form=_build_community_event_form_state(request.form),
            error_message="Supabase community events integration is not configured.",
        )

    new_image_filename = None
    try:
        payload, new_image_filename = _build_community_event_form_payload(request.form, request.files)
        create_community_event(payload)
    except ValueError as exc:
        if new_image_filename:
            _delete_local_image(new_image_filename, COMMUNITY_EVENTS_UPLOAD_DIR)
        return _render_admin_event_form(
            form_title="Create Event Card",
            submit_label="Create Event",
            form_action=url_for("admin_event_new"),
            event_form=_build_community_event_form_state({**request.form, "is_published": _normalize_checkbox(request.form.get("is_published"))}),
            error_message=str(exc),
        )
    except Exception as exc:  # noqa: BLE001
        if new_image_filename:
            _delete_local_image(new_image_filename, COMMUNITY_EVENTS_UPLOAD_DIR)
        app.logger.exception("Failed to create community event: %s", exc)
        return _render_admin_event_form(
            form_title="Create Event Card",
            submit_label="Create Event",
            form_action=url_for("admin_event_new"),
            event_form=_build_community_event_form_state({**request.form, "is_published": _normalize_checkbox(request.form.get("is_published"))}),
            error_message="Could not create the event card right now.",
        )

    return redirect(url_for("admin_events", status="created"))


@app.route(f"{ADMIN_ROUTE_PREFIX}/events/<int:event_id>/edit", methods=["GET", "POST"])
@_admin_required
def admin_event_edit(event_id):
    current_item = _load_admin_community_event(event_id)
    if current_item is None:
        return redirect(url_for("admin_events"))

    if request.method == "GET":
        return _render_admin_event_form(
            form_title="Edit Event Card",
            submit_label="Save Changes",
            form_action=url_for("admin_event_edit", event_id=event_id),
            event_form=_build_community_event_form_state(current_item),
        )

    if not _is_admin_csrf_valid(request.form.get("csrf_token")):
        return redirect(url_for("admin_events"))

    new_image_filename = None
    previous_image_filename = current_item.get("image_filename")
    try:
        payload, new_image_filename = _build_community_event_form_payload(request.form, request.files, current_item=current_item)
        update_community_event(event_id, payload)
        if new_image_filename and previous_image_filename and previous_image_filename != new_image_filename:
            _delete_local_image(previous_image_filename, COMMUNITY_EVENTS_UPLOAD_DIR)
    except ValueError as exc:
        if new_image_filename:
            _delete_local_image(new_image_filename, COMMUNITY_EVENTS_UPLOAD_DIR)
        return _render_admin_event_form(
            form_title="Edit Event Card",
            submit_label="Save Changes",
            form_action=url_for("admin_event_edit", event_id=event_id),
            event_form=_build_community_event_form_state({**current_item, **request.form, "is_published": _normalize_checkbox(request.form.get("is_published"))}),
            error_message=str(exc),
        )
    except Exception as exc:  # noqa: BLE001
        if new_image_filename:
            _delete_local_image(new_image_filename, COMMUNITY_EVENTS_UPLOAD_DIR)
        app.logger.exception("Failed to update community event %s: %s", event_id, exc)
        return _render_admin_event_form(
            form_title="Edit Event Card",
            submit_label="Save Changes",
            form_action=url_for("admin_event_edit", event_id=event_id),
            event_form=_build_community_event_form_state({**current_item, **request.form, "is_published": _normalize_checkbox(request.form.get("is_published"))}),
            error_message="Could not update the event card right now.",
        )

    return redirect(url_for("admin_events", status="updated"))


@app.route(f"{ADMIN_ROUTE_PREFIX}/events/<int:event_id>/delete", methods=["POST"])
@_admin_required
def admin_event_delete(event_id):
    if not _is_admin_csrf_valid(request.form.get("csrf_token")):
        return redirect(url_for("admin_events"))

    current_item = _load_admin_community_event(event_id)
    if current_item is None:
        return redirect(url_for("admin_events"))

    try:
        delete_community_event(event_id)
        _delete_local_image(current_item.get("image_filename"), COMMUNITY_EVENTS_UPLOAD_DIR)
    except Exception as exc:  # noqa: BLE001
        app.logger.exception("Failed to delete community event %s: %s", event_id, exc)
        return redirect(url_for("admin_events"))

    return redirect(url_for("admin_events", status="deleted"))


@app.route(ADMIN_LOGOUT_PATH, methods=["POST"])
@_admin_required
def admin_logout():
    if not _is_admin_csrf_valid(request.form.get("csrf_token")):
        return redirect(url_for("admin_login"))
    session.clear()
    return redirect(url_for("admin_login"))


@app.route("/")
def index():
    exhibits_news_items = _load_landing_exhibits(limit=12)
    return render_template("Landing.html", exhibits_news_items=exhibits_news_items)


@app.route("/current-exhibits-news")
def current_exhibits_news():
    exhibits_news_items = _load_landing_exhibits(limit=None)
    return render_template("CurrentExhibitsNews.html", exhibits_news_items=exhibits_news_items)


@app.route("/current-exhibits-news/<slug>")
def current_exhibits_news_detail(slug):
    exhibit_item = _load_published_exhibit(slug)
    if exhibit_item is None:
        return redirect(url_for("current_exhibits_news"))
    return render_template("CurrentExhibitNewsDetail.html", exhibit_item=exhibit_item)


@app.route("/community-highlights/<slug>")
def community_highlight_detail(slug):
    highlight_item = _load_published_community_highlight(slug)
    if highlight_item is None:
        return redirect(url_for("news"))
    return render_template("CommunityHighlightDetail.html", highlight_item=highlight_item)


@app.route("/community-events/<slug>")
def community_event_detail(slug):
    event_item = _load_published_community_event(slug)
    if event_item is None:
        return redirect(url_for("news"))
    return render_template("CommunityEventDetail.html", event_item=event_item)


@app.route("/digital-exhibits")
def digital_exhibits():
    return render_template("DigitalExhibits.html")


@app.route("/online-gallery")
def online_gallery():
    return render_template("OnlineGallery.html")


@app.route("/online-gallery/details")
def online_gallery_details():
    return render_template("OnlineGalleryDetails.html")


@app.route("/virtual-tour")
def virtual_tour():
    return render_template("VirtualTour.html")


@app.route("/edu-resources")
def edu_resources():
    return render_template("EduResources.html")


@app.route("/ar-content-detection")
def ar_content_detection():
    return render_template("ARContentDetection.html", analytics_endpoint=url_for("ar_analytics"))


@app.route("/ar-launch/<artifact_key>")
def ar_launch(artifact_key):
    return redirect(url_for("ar_content_detection"))


@app.post("/api/ar/analytics")
def ar_analytics():
    payload = request.get_json(silent=True) or {}
    event = str(payload.get("event", "unknown"))[:120]
    marker = str(payload.get("marker", ""))[:120]
    model = str(payload.get("model", ""))[:120]

    app.logger.info(
        "ar_analytics event=%s marker=%s model=%s ua=%s",
        event,
        marker,
        model,
        request.headers.get("User-Agent", ""),
    )

    return jsonify({"ok": True})


@app.route("/accessibility")
def accessibility():
    return render_template("Accessibility.html")


@app.route("/interactive")
def interactive():
    return render_template("Interactive.html")


@app.route("/site-map")
def site_map():
    return render_template("SiteMap.html")


@app.route("/3d-environment")
def three_d_environment():
    return render_template("ThreeDEnvironmentIntro.html")


@app.route("/3d-environment/runtime")
def three_d_environment_runtime():
    return render_template("WebXR.html", webxr_init_error=WEBXR_INIT_ERROR)


@app.route("/api/webxr/scene")
def webxr_scene_metadata():
    if WEBXR_RUNTIME_SCENE is None and not _ensure_webxr_runtime_initialized():
        return jsonify({"error": "WebXR runtime is unavailable.", "details": WEBXR_INIT_ERROR}), 503

    zip_override = (request.args.get("zip") or "").strip() or None

    try:
        scene_description = WEBXR_RUNTIME_SCENE.get_scene_description(zip_override=zip_override)
    except Exception as exc:  # noqa: BLE001
        app.logger.exception("Failed to produce WebXR scene metadata.")
        return jsonify({"error": str(exc)}), 500

    payload = {
        "app": {
            "name": WEBXR_CONFIG.get("APP_NAME", "Marble WebXR Viewer"),
            "debug": bool(WEBXR_CONFIG.get("DEBUG", False)),
        },
        "player": WEBXR_CONFIG.get("PLAYER_SETTINGS", {}),
        "quality": {
            "default": WEBXR_CONFIG.get("DEFAULT_QUALITY", "auto"),
            "options": ["auto", "low", "medium", "high"],
        },
        "debug": {
            "collision": bool(WEBXR_CONFIG.get("DEBUG_COLLISION", False)),
        },
        "scene": scene_description,
    }
    return jsonify(payload)


@app.route("/api/webxr/healthz")
def webxr_healthz():
    if WEBXR_RUNTIME_SCENE is None and not _ensure_webxr_runtime_initialized():
        return jsonify({"ready": False, "error": WEBXR_INIT_ERROR, "startupReport": {}}), 503

    payload = WEBXR_RUNTIME_SCENE.get_health_payload()
    status_code = 200 if payload.get("ready") else 503
    return jsonify(payload), status_code


@app.route("/webxr/runtime/<path:asset_path>")
def webxr_runtime_asset(asset_path):
    runtime_dir = Path(_get_webxr_config_value("RUNTIME_DIR", WEBXR_BASE_DIR / "runtime")).resolve()
    candidate_path = _resolve_safe_path(runtime_dir, asset_path)

    if candidate_path is None:
        return jsonify({"error": "Invalid runtime asset path"}), 400

    if not candidate_path.exists() or not candidate_path.is_file():
        return jsonify({"error": f"Asset not found: {asset_path}"}), 404

    return send_from_directory(str(runtime_dir), asset_path)


@app.route("/webxr/static/<path:asset_path>")
def webxr_static_asset(asset_path):
    static_dir = (Path(_get_webxr_config_value("BASE_DIR", WEBXR_BASE_DIR)) / "static").resolve()
    candidate_path = _resolve_safe_path(static_dir, asset_path)

    if candidate_path is None:
        return jsonify({"error": "Invalid static asset path"}), 400

    if not candidate_path.exists() or not candidate_path.is_file():
        return jsonify({"error": f"Static asset not found: {asset_path}"}), 404

    return send_from_directory(str(static_dir), asset_path)


@app.route("/webxr/images/<path:image_path>")
def webxr_image_asset(image_path):
    images_dir = (Path(_get_webxr_config_value("BASE_DIR", WEBXR_BASE_DIR)) / "images").resolve()
    candidate_path = _resolve_safe_path(images_dir, image_path)

    if candidate_path is None:
        return jsonify({"error": "Invalid image asset path"}), 400

    if not candidate_path.exists() or not candidate_path.is_file():
        return jsonify({"error": f"Image asset not found: {image_path}"}), 404

    return send_from_directory(str(images_dir), image_path)


@app.route("/participation")
def participation():
    return render_template("Participation.html")


@app.route("/news")
def news():
    community_highlights_items = _load_news_community_highlights(limit=12)
    community_events_items = _load_news_community_events(limit=12)
    return render_template(
        "News.html",
        community_highlights_items=community_highlights_items,
        community_events_items=community_events_items,
    )


@app.route("/support")
def support():
    return render_template("Support.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=not IS_PRODUCTION)
