import hmac
import os
import re
import secrets
import threading
import time
from datetime import datetime, timedelta
from functools import wraps
from pathlib import Path

from flask import Flask, g, jsonify, make_response, redirect, render_template, request, send_from_directory, session, url_for
from werkzeug.security import check_password_hash
from werkzeug.utils import secure_filename

from admin_users_repository import get_active_admin_user_by_username
from community_content import load_news_community_highlights, register_community_content_routes
from edu_resources_content import load_public_edu_resources, register_edu_resources_routes
from online_gallery_content import (
    ONLINE_GALLERY_UPLOAD_DIR,
    load_public_online_gallery_categories,
    load_public_online_gallery_items,
    register_online_gallery_content_routes,
)
from participation_submissions_content import register_participation_submission_routes
from public_users_repository import get_public_user_profile_by_id
from supabase_storage import delete_public_image, upload_public_file, upload_public_image
from supabase_client import is_supabase_configured
from tour_bookings_content import load_public_tour_bookings, register_tour_booking_routes
from user_accounts_content import load_user_bookmarked_gallery_item_ids, register_user_account_routes
from visitor_feedback_content import register_visitor_feedback_routes

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover - optional in some environments
    load_dotenv = None


PROJECT_ROOT = Path(__file__).resolve().parent
WEBXR_BASE_DIR = (PROJECT_ROOT / "webxr_runtime").resolve()

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


def _normalize_admin_identity(raw_value):
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


def _is_valid_login_payload(username, password):
    if not username or len(username) > 128:
        return False
    if re.fullmatch(r"[a-z0-9._@+\-]+", username) is None:
        return False
    if not password or len(password) > 1024:
        return False
    return True


def _authenticate_admin_credentials(username, password):
    if not _is_admin_auth_configured():
        return None

    try:
        admin_user = get_active_admin_user_by_username(username)
    except (ValueError, TypeError):
        return None
    except Exception:  # noqa: BLE001
        app.logger.exception("Failed to fetch admin user credentials from Supabase.")
        return None

    if not admin_user:
        return False

    stored_username = _normalize_admin_identity(admin_user.get("username", ""))
    stored_password_hash = str(admin_user.get("password_hash", "") or "")

    if not stored_username or not stored_password_hash:
        return False
    if not hmac.compare_digest(username, stored_username):
        return False

    try:
        if check_password_hash(stored_password_hash, password):
            return stored_username
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
    session_username = _normalize_admin_identity(session.get(ADMIN_SESSION_USER_KEY, ""))
    return bool(session_username)


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
                username = _normalize_admin_identity(request.form.get("username", ""))
                password = str(request.form.get("password", ""))

                if _is_valid_login_payload(username, password):
                    authenticated_username = _authenticate_admin_credentials(username, password)

                    if authenticated_username is None:
                        status_code = 503
                        error_message = "Login is temporarily unavailable."
                    elif authenticated_username:
                        _clear_failed_logins(client_ip)
                        session.clear()
                        session.permanent = True
                        session[ADMIN_SESSION_KEY] = True
                        session[ADMIN_SESSION_USER_KEY] = authenticated_username
                        session[ADMIN_CSRF_KEY] = secrets.token_urlsafe(32)
                        return redirect(url_for("admin_dashboard"))
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
    return render_template(
        "admin/AdminDashboard.html",
        csrf_token=csrf_token,
        admin_username=admin_username,
    )


@app.route(ADMIN_LOGOUT_PATH, methods=["POST"])
@_admin_required
def admin_logout():
    if not _is_admin_csrf_valid(request.form.get("csrf_token")):
        return redirect(url_for("admin_login"))
    session.clear()
    return redirect(url_for("admin_login"))


@app.context_processor
def inject_public_auth_context():
    current_public_user = _get_current_public_user()
    return {
        "current_public_user": current_public_user,
        "public_user_authenticated": bool(current_public_user),
        "public_csrf_token": _ensure_public_csrf_token(),
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


@app.route("/heritage-trail")
def heritage_trail():
    return render_template("HeritageTrail.html")


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
