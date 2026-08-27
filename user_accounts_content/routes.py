from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import secrets
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlsplit

from flask import jsonify, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from public_users_repository import (
    create_public_user,
    get_public_user_auth_by_email,
    get_public_user_auth_by_identifier,
    get_public_user_auth_by_oauth_subject,
    get_public_user_auth_by_username,
    get_public_user_by_email_verification_token_hash,
    get_public_user_by_password_reset_token_hash,
    update_public_user,
)
from heritage_keeper_content import load_heritage_keeper_progress, record_heritage_keeper_fragment
from supabase_client import is_supabase_configured
from supabase_storage import delete_public_image, upload_public_image
from media_upload_content import MEDIA_UPLOAD_MAX_BYTES, discard_direct_uploads, validate_direct_upload_reference
from user_bookmarks_repository import create_user_bookmark, delete_user_bookmark, get_user_bookmark

from .emailer import (
    PublicAuthEmailError,
    is_public_auth_email_configured,
    send_public_account_verification_email,
    send_public_password_changed_email,
    send_public_password_reset_email,
    send_public_security_code_email,
)
from .service import BOOKMARK_ITEM_TYPE_ONLINE_GALLERY, load_user_account_dashboard

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
USERNAME_PATTERN = re.compile(r"^[a-z0-9._-]{3,32}$")
ONBOARDING_USE_CASE_OPTIONS = (
    "Explore museum information",
    "Learn for school or research",
    "Prepare for a visit",
    "Access virtual tours and exhibits",
    "Share feedback or stories",
    "Use teaching or learning materials",
)
ONBOARDING_ROLE_OPTIONS = (
    "Visitor",
    "Student",
    "Teacher",
    "Researcher",
    "Historian",
    "Person with Disability",
    "Senior Citizen",
    "Museum Staff",
    "Local Resident",
    "Tourist",
    "Other",
)
EMAIL_VERIFICATION_LIFETIME = timedelta(minutes=10)
EMAIL_VERIFICATION_RESEND_COOLDOWN = timedelta(seconds=60)
EMAIL_VERIFICATION_MAX_ATTEMPTS = 5
SECURITY_CODE_LIFETIME = timedelta(minutes=10)
SECURITY_CODE_RESEND_COOLDOWN = timedelta(seconds=60)
SECURITY_CODE_MAX_ATTEMPTS = 5
SECURITY_SETUP_SESSION_KEY = "public_security_password_setup"
PASSWORD_RESET_LIFETIME = timedelta(hours=1)
PASSWORD_RESET_SUCCESS_LIFETIME = timedelta(minutes=10)
PASSWORD_RESET_SUCCESS_SESSION_KEY = "public_password_reset_success"

AVATAR_UPLOAD_FOLDER = "avatars"


def _uploaded_file_size(file_storage) -> int:
    if file_storage is None or not str(getattr(file_storage, "filename", "") or "").strip():
        return 0
    stream = getattr(file_storage, "stream", None)
    if stream is None:
        raise ValueError("The selected photo size could not be verified.")
    try:
        original_position = stream.tell()
        stream.seek(0, 2)
        size = int(stream.tell())
        stream.seek(original_position)
    except (AttributeError, OSError, TypeError, ValueError) as exc:
        raise ValueError("The selected photo size could not be verified.") from exc
    return max(0, size)


DELETE_ACCOUNT_CONFIRM_PHRASE = "confirm delete"
VALID_THEME_PREFERENCES = {"light", "dark"}
VALID_LANGUAGE_PREFERENCES = {"en", "tl"}
DISABLED_ACCOUNT_MESSAGE = (
    "This account is disabled and cannot sign in. "
    "Please contact museum support if you need access restored."
)


def _avatar_slugify(text: Any, fallback: str = "avatar") -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", str(text or "").strip().lower()).strip("-")
    return slug or fallback
GOOGLE_OAUTH_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_OAUTH_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
GOOGLE_OAUTH_SESSION_STATE_KEY = "public_google_oauth_state"
GOOGLE_OAUTH_SESSION_NEXT_KEY = "public_google_oauth_next"
GOOGLE_OAUTH_SESSION_VIEW_KEY = "public_google_oauth_view"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_login_identifier(raw_value: Any) -> str:
    return str(raw_value or "").strip().lower()


def _is_safe_next_url(raw_value: Any) -> bool:
    target = str(raw_value or "").strip()
    if not target:
        return False
    parsed = urlsplit(target)
    if parsed.scheme or parsed.netloc or not target.startswith("/") or target.startswith("//"):
        return False

    # Never return a signed-in visitor to an authentication or one-time-token
    # URL. A consumed reset link would otherwise appear as an expired page.
    normalized_path = (parsed.path or "/").rstrip("/") or "/"
    blocked_paths = {
        "/login",
        "/signup",
        "/reset-password",
        "/reset-password/success",
        "/verify-email",
        "/auth/google",
        "/auth/google/callback",
    }
    return normalized_path not in blocked_paths and not normalized_path.startswith("/api/auth/")


def _resolve_safe_next_url(raw_value: Any, default_endpoint: str) -> str:
    if _is_safe_next_url(raw_value):
        return str(raw_value).strip()
    return url_for(default_endpoint)


def _resolve_next_url(default_endpoint: str) -> str:
    return _resolve_safe_next_url(request.values.get("next"), default_endpoint)


def _normalize_auth_view(raw_value: Any, *, default: str = "login") -> str:
    normalized_default = "signup" if str(default or "").strip().lower() == "signup" else "login"
    return "signup" if str(raw_value or "").strip().lower() == "signup" else normalized_default


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(str(raw_token or "").encode("utf-8")).hexdigest()


def _is_google_oauth_configured() -> bool:
    return bool(
        str(os.getenv("GOOGLE_OAUTH_CLIENT_ID") or "").strip()
        and str(os.getenv("GOOGLE_OAUTH_CLIENT_SECRET") or "").strip()
    )


def _get_google_oauth_credentials() -> tuple[str, str]:
    client_id = str(os.getenv("GOOGLE_OAUTH_CLIENT_ID") or "").strip()
    client_secret = str(os.getenv("GOOGLE_OAUTH_CLIENT_SECRET") or "").strip()
    if not client_id or not client_secret:
        raise RuntimeError("Google sign-in is not configured.")
    return client_id, client_secret


def _build_google_oauth_redirect_uri() -> str:
    configured_uri = str(os.getenv("GOOGLE_OAUTH_REDIRECT_URI") or "").strip()
    if configured_uri:
        return configured_uri
    return url_for("public_google_auth_callback", _external=True)


def _load_json_response(request_obj: urllib.request.Request) -> dict[str, Any]:
    try:
        with urllib.request.urlopen(request_obj, timeout=15) as response:
            charset = response.headers.get_content_charset() or "utf-8"
            body = response.read().decode(charset)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(body or f"Google request failed with status {exc.code}.") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError("Could not reach Google authentication services.") from exc

    if not body:
        return {}
    try:
        payload = json.loads(body)
    except json.JSONDecodeError as exc:
        raise RuntimeError("Received an invalid response from Google.") from exc
    if not isinstance(payload, dict):
        raise RuntimeError("Received an invalid response from Google.")
    return payload


def _exchange_google_authorization_code(code: str, redirect_uri: str) -> dict[str, Any]:
    client_id, client_secret = _get_google_oauth_credentials()
    encoded_payload = urllib.parse.urlencode(
        {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
    ).encode("utf-8")
    request_obj = urllib.request.Request(
        GOOGLE_OAUTH_TOKEN_URL,
        data=encoded_payload,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        },
        method="POST",
    )
    return _load_json_response(request_obj)


def _fetch_google_user_profile(access_token: str) -> dict[str, Any]:
    request_obj = urllib.request.Request(
        GOOGLE_OAUTH_USERINFO_URL,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        },
        method="GET",
    )
    return _load_json_response(request_obj)


def _sign_in_public_user_from_google_profile(profile: dict[str, Any]) -> dict[str, Any]:
    oauth_subject = str(profile.get("sub") or "").strip()
    email = _normalize_login_identifier(profile.get("email"))
    if not oauth_subject or len(oauth_subject) > 255:
        raise ValueError("Google did not return a valid account identifier.")
    if not EMAIL_PATTERN.match(email):
        raise ValueError("Google did not return a valid email address.")
    if not bool(profile.get("email_verified")):
        raise ValueError("Please use a Google account with a verified email address.")

    full_name = str(profile.get("name") or "").strip() or _build_placeholder_full_name(email)
    picture_url = str(profile.get("picture") or "").strip()
    if not picture_url.startswith(("http://", "https://")):
        picture_url = ""
    now = _utcnow().isoformat()
    existing_user = get_public_user_auth_by_oauth_subject("google", oauth_subject)
    if not existing_user:
        existing_user = get_public_user_auth_by_email(email)
    if existing_user:
        if not bool(existing_user.get("is_active")):
            raise ValueError(DISABLED_ACCOUNT_MESSAGE)
        stored_subject = str(existing_user.get("oauth_subject") or "").strip()
        if stored_subject and not secrets.compare_digest(stored_subject, oauth_subject):
            raise ValueError("This email is already linked to a different Google account.")

        payload = {
            "auth_provider": "google",
            "oauth_subject": oauth_subject,
            "last_login_at": now,
            "updated_at": now,
        }
        # First Google sign-in populates the avatar from the Gmail photo, but we
        # never overwrite a picture the user has since set themselves.
        if picture_url and not str(existing_user.get("profile_picture") or "").strip():
            payload["profile_picture"] = picture_url[:600]
        if not _user_is_verified(existing_user):
            payload.update(
                {
                    "email_verified_at": now,
                    "email_verification_token_hash": None,
                    "email_verification_expires_at": None,
                    "email_verification_sent_at": None,
                    "email_verification_attempts": 0,
                }
            )
        if not str(existing_user.get("full_name") or "").strip():
            payload["full_name"] = full_name[:160]
        return update_public_user(int(existing_user.get("id")), payload)

    password_hash = generate_password_hash(secrets.token_urlsafe(48))
    return create_public_user(
        {
            "full_name": full_name[:160],
            "email": email,
            "username": _generate_unique_username(email),
            "password_hash": password_hash,
            "phone_number": "",
            "organization": "",
            "is_active": True,
            "last_login_at": now,
            "email_verified_at": now,
            "email_verification_token_hash": None,
            "email_verification_expires_at": None,
            "onboarding_completed_at": None,
            "website_use_case": "",
            "profile_roles": _serialize_role_values([]),
            "location_text": "",
            "country_text": "",
            "province_text": "",
            "city_text": "",
            "auth_provider": "google",
            "oauth_subject": oauth_subject,
            "local_password_enabled": False,
            "profile_picture": picture_url[:600] if picture_url else None,
            "password_reset_token_hash": None,
            "password_reset_expires_at": None,
            "security_code_hash": None,
            "security_code_expires_at": None,
            "security_code_sent_at": None,
            "security_code_attempts": 0,
            "updated_at": now,
        }
    )


def _is_expired(raw_timestamp: Any) -> bool:
    raw_value = str(raw_timestamp or "").strip()
    if not raw_value:
        return True
    try:
        parsed = datetime.fromisoformat(raw_value.replace("Z", "+00:00"))
    except ValueError:
        return True
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed <= _utcnow()


def _parse_timestamp(raw_timestamp: Any) -> datetime | None:
    raw_value = str(raw_timestamp or "").strip()
    if not raw_value:
        return None
    try:
        parsed = datetime.fromisoformat(raw_value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _resend_wait_seconds(raw_sent_at: Any, cooldown: timedelta) -> int:
    sent_at = _parse_timestamp(raw_sent_at)
    if not sent_at:
        return 0
    remaining = (sent_at + cooldown - _utcnow()).total_seconds()
    return max(0, int(remaining + 0.999))


def _generate_six_digit_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _validate_six_digit_code(raw_value: Any) -> str:
    code = re.sub(r"\D", "", str(raw_value or ""))
    if len(code) != 6:
        raise ValueError("Enter the six-digit code sent to your email.")
    return code


def _validate_new_password(password: str, confirmation: str) -> None:
    if len(password) < 8 or len(password) > 128:
        raise ValueError("Password must be between 8 and 128 characters.")
    if password != confirmation:
        raise ValueError("Passwords do not match.")


def _user_is_verified(user: dict[str, Any] | None) -> bool:
    return bool(user and user.get("email_verified_at"))


def _user_completed_onboarding(user: dict[str, Any] | None) -> bool:
    return bool(user and user.get("onboarding_completed_at"))


def _build_placeholder_full_name(email: str) -> str:
    local_part = str(email or "").split("@", 1)[0].strip()
    candidate = re.sub(r"[._-]+", " ", local_part).strip().title()
    if len(candidate) < 3:
        candidate = "New User"
    return candidate[:160]


def _generate_unique_username(email: str) -> str:
    local_part = str(email or "").split("@", 1)[0].strip().lower()
    base = re.sub(r"[^a-z0-9._-]+", "", local_part).strip("._-")
    if len(base) < 3:
        base = f"user-{secrets.token_hex(2)}"
    base = base[:24]
    candidate = base
    counter = 1
    while get_public_user_auth_by_username(candidate):
        suffix = f"-{counter}"
        candidate = f"{base[:max(3, 32 - len(suffix))]}{suffix}"
        counter += 1
    if not USERNAME_PATTERN.match(candidate):
        fallback = f"user-{secrets.token_hex(4)}"[:32]
        if not USERNAME_PATTERN.match(fallback):
            fallback = "user-account"
        return fallback
    return candidate


def _normalize_role_values(raw_value: Any) -> list[str]:
    if isinstance(raw_value, (list, tuple)):
        items = raw_value
    else:
        raw_text = str(raw_value or "").strip()
        if not raw_text:
            items = []
        else:
            try:
                decoded = json.loads(raw_text)
            except Exception:
                decoded = [part.strip() for part in raw_text.split(",")]
            items = decoded if isinstance(decoded, list) else [decoded]
    cleaned = []
    for item in items:
        value = str(item or "").strip()
        if not value or value in cleaned:
            continue
        cleaned.append(value[:80])
    return cleaned


def _serialize_role_values(role_values: list[str]) -> str:
    return json.dumps(_normalize_role_values(role_values))


def _validate_modal_signup_payload(form) -> tuple[dict[str, Any], str]:
    email = _normalize_login_identifier(form.get("email"))
    password = str(form.get("password") or "")
    confirm_password = str(form.get("confirm_password") or "")

    if not EMAIL_PATTERN.match(email):
        raise ValueError("Please provide a valid email address.")
    if len(password) < 8 or len(password) > 128:
        raise ValueError("Password must be between 8 and 128 characters.")
    if password != confirm_password:
        raise ValueError("Passwords do not match.")
    if get_public_user_auth_by_email(email):
        raise ValueError("That email address is already registered. Try signing in or resend verification.")

    password_hash = generate_password_hash(password)
    return {
        "full_name": _build_placeholder_full_name(email),
        "email": email,
        "username": _generate_unique_username(email),
        "password_hash": password_hash,
        "phone_number": "",
        "organization": "",
        "is_active": True,
        "email_verified_at": None,
        "onboarding_completed_at": None,
        "website_use_case": "",
        "profile_roles": _serialize_role_values([]),
        "location_text": "",
        "country_text": "",
        "province_text": "",
        "city_text": "",
        "auth_provider": "password",
    }, email


def _validate_onboarding_payload(form, role_values: list[str], current_user_id: int) -> dict[str, Any]:
    full_name = str(form.get("full_name") or "").strip()
    username = str(form.get("username") or "").strip().lower()
    website_use_case = str(form.get("website_use_case") or "").strip()
    country_text = str(form.get("country_text") or "").strip()
    province_text = str(form.get("province_text") or "").strip()
    city_text = str(form.get("city_text") or "").strip()

    if len(full_name) < 3 or len(full_name) > 160:
        raise ValueError("Full name must be between 3 and 160 characters.")
    if not USERNAME_PATTERN.fullmatch(username):
        raise ValueError("Username must be 3 to 32 characters and use only lowercase letters, numbers, periods, underscores, or hyphens.")
    existing_username_user = get_public_user_auth_by_username(username)
    if existing_username_user and int(existing_username_user.get("id") or 0) != int(current_user_id):
        raise ValueError("That username is already in use. Please choose another one.")
    if len(website_use_case) < 3 or len(website_use_case) > 160:
        raise ValueError("Please select how you plan to use the website.")
    if not role_values:
        raise ValueError("Please select at least one role.")
    if len(country_text) < 2 or len(country_text) > 120:
        raise ValueError("Please select your country.")
    if len(province_text) < 2 or len(province_text) > 120:
        raise ValueError("Please select your province.")
    if len(city_text) < 2 or len(city_text) > 120:
        raise ValueError("Please select your city.")

    location_text = f"{city_text}, {province_text}, {country_text}"

    now = _utcnow().isoformat()
    return {
        "full_name": full_name,
        "username": username,
        "website_use_case": website_use_case,
        "profile_roles": _serialize_role_values(role_values),
        "location_text": location_text,
        "country_text": country_text,
        "province_text": province_text,
        "city_text": city_text,
        "onboarding_completed_at": now,
        "updated_at": now,
    }


def _resolve_onboarding_step_index(form, role_values: list[str]) -> int:
    full_name = str(form.get("full_name") or "").strip()
    username = str(form.get("username") or "").strip().lower()
    website_use_case = str(form.get("website_use_case") or "").strip()
    country_text = str(form.get("country_text") or "").strip()
    province_text = str(form.get("province_text") or "").strip()
    city_text = str(form.get("city_text") or "").strip()

    if len(full_name) < 3 or len(full_name) > 160 or not USERNAME_PATTERN.fullmatch(username):
        return 0
    if len(website_use_case) < 3:
        return 1
    if not role_values:
        return 2
    if len(country_text) < 2 or len(province_text) < 2 or len(city_text) < 2:
        return 3
    return 3


def register_user_account_routes(
    app,
    *,
    ensure_public_csrf_token,
    is_public_csrf_valid,
    public_session_user_id_key: str,
    public_session_authenticated_key: str,
    set_public_user_session,
    clear_public_user_session,
    get_current_public_user,
    public_login_required,
    get_client_ip,
    is_public_auth_rate_limited,
    record_public_auth_failure,
    clear_public_auth_failures,
):
    def _hash_one_time_code(raw_code: str) -> str:
        secret_key = str(app.secret_key or os.getenv("FLASK_SECRET_KEY") or "")
        if not secret_key:
            raise RuntimeError("The application secret key is required for one-time codes.")
        return hmac.new(secret_key.encode("utf-8"), str(raw_code or "").encode("utf-8"), hashlib.sha256).hexdigest()

    def _clear_security_setup_state() -> None:
        session.pop(SECURITY_SETUP_SESSION_KEY, None)

    def _set_security_setup_state(user_id: int, stage: str) -> None:
        session[SECURITY_SETUP_SESSION_KEY] = {
            "user_id": int(user_id),
            "stage": "password" if stage == "password" else "code",
            "expires_at": (_utcnow() + SECURITY_CODE_LIFETIME).isoformat(),
        }

    def _get_security_setup_stage(user_id: int) -> str:
        raw_state = session.get(SECURITY_SETUP_SESSION_KEY)
        if not isinstance(raw_state, dict):
            return ""
        try:
            state_user_id = int(raw_state.get("user_id"))
        except (TypeError, ValueError):
            _clear_security_setup_state()
            return ""
        stage = str(raw_state.get("stage") or "").strip().lower()
        if state_user_id != int(user_id) or stage not in {"code", "password"} or _is_expired(raw_state.get("expires_at")):
            _clear_security_setup_state()
            return ""
        return stage

    def _settings_wants_json() -> bool:
        return request.headers.get("X-Requested-With") == "XMLHttpRequest" or request.accept_mimetypes.best == "application/json"

    def _settings_response(
        *,
        ok: bool,
        message: str,
        redirect_status: str = "",
        http_status: int = 200,
        **extra: Any,
    ):
        if _settings_wants_json():
            payload: dict[str, Any] = {"ok": ok, "message" if ok else "error": message}
            payload.update(extra)
            return jsonify(payload), http_status
        if redirect_status:
            return redirect(url_for("account_settings", status=redirect_status))
        return redirect(url_for("account_settings"))

    def _settings_login_required_response():
        login_url = url_for("public_login", next=url_for("account_settings"))
        if _settings_wants_json():
            return jsonify({"ok": False, "error": "Your session has expired. Please sign in again.", "redirect_url": login_url}), 401
        return redirect(login_url)

    def _render_auth_entry(*, default_view: str, next_url: str, page_title: str, status_message: str | None = None, error_message: str | None = None):
        return render_template(
            "AuthEntry.html",
            auth_page_title=page_title,
            auth_default_view=default_view,
            next_url=next_url,
            auth_next_url=next_url,
            csrf_token=ensure_public_csrf_token(),
            auth_status_message=status_message,
            auth_error_message=error_message,
            public_auth_email_enabled=is_public_auth_email_configured(),
            public_auth_google_enabled=_is_google_oauth_configured(),
        )

    def _build_verify_url(raw_token: str, next_url: str) -> str:
        return url_for("public_verify_email", token=raw_token, next=next_url, _external=True)

    def _build_reset_url(raw_token: str, next_url: str) -> str:
        return url_for("public_reset_password", token=raw_token, next=next_url, _external=True)

    def _redirect_google_auth_error(*, view: str, next_url: str, error_message: str):
        target_endpoint = "public_signup" if _normalize_auth_view(view, default="login") == "signup" else "public_login"
        return redirect(
            url_for(
                target_endpoint,
                next=next_url,
                auth_view=_normalize_auth_view(view, default=target_endpoint.split("_")[-1]),
                error=error_message,
            )
        )

    @app.route("/login", methods=["GET"])
    def public_login():
        current_user = get_current_public_user()
        next_url = _resolve_next_url("account_profile")
        if current_user:
            if not _user_completed_onboarding(current_user):
                return redirect(url_for("public_account_setup", next=next_url))
            return redirect(next_url)
        return _render_auth_entry(
            default_view=_normalize_auth_view(request.args.get("auth_view"), default="login"),
            next_url=next_url,
            page_title="Sign In | Museo ng Libingan sa Ilalim ng Lupa",
            status_message=str(request.args.get("status") or "").strip() or None,
            error_message=str(request.args.get("error") or "").strip() or None,
        )

    @app.route("/signup", methods=["GET"])
    def public_signup():
        current_user = get_current_public_user()
        next_url = _resolve_next_url("account_profile")
        if current_user:
            if not _user_completed_onboarding(current_user):
                return redirect(url_for("public_account_setup", next=next_url))
            return redirect(next_url)
        return _render_auth_entry(
            default_view=_normalize_auth_view(request.args.get("auth_view"), default="signup"),
            next_url=next_url,
            page_title="Create Account | Museo ng Libingan sa Ilalim ng Lupa",
            status_message=str(request.args.get("status") or "").strip() or None,
            error_message=str(request.args.get("error") or "").strip() or None,
        )

    @app.route("/auth/google", methods=["GET"])
    def public_google_auth_start():
        current_user = get_current_public_user()
        next_url = _resolve_safe_next_url(request.args.get("next"), "account_profile")
        auth_view = _normalize_auth_view(request.args.get("view"), default="login")
        if current_user:
            if not _user_completed_onboarding(current_user):
                return redirect(url_for("public_account_setup", next=next_url))
            return redirect(next_url)
        if not _is_google_oauth_configured():
            return _redirect_google_auth_error(view=auth_view, next_url=next_url, error_message="Google sign-in is not configured yet.")

        state = secrets.token_urlsafe(32)
        session[GOOGLE_OAUTH_SESSION_STATE_KEY] = state
        session[GOOGLE_OAUTH_SESSION_NEXT_KEY] = next_url
        session[GOOGLE_OAUTH_SESSION_VIEW_KEY] = auth_view
        client_id, _client_secret = _get_google_oauth_credentials()
        authorization_query = urllib.parse.urlencode(
            {
                "client_id": client_id,
                "redirect_uri": _build_google_oauth_redirect_uri(),
                "response_type": "code",
                "scope": "openid email profile",
                "state": state,
                "prompt": "select_account",
            }
        )
        return redirect(f"{GOOGLE_OAUTH_AUTHORIZE_URL}?{authorization_query}")

    @app.route("/auth/google/callback", methods=["GET"])
    def public_google_auth_callback():
        next_url = _resolve_safe_next_url(session.pop(GOOGLE_OAUTH_SESSION_NEXT_KEY, None), "account_profile")
        auth_view = _normalize_auth_view(session.pop(GOOGLE_OAUTH_SESSION_VIEW_KEY, None), default="login")
        expected_state = str(session.pop(GOOGLE_OAUTH_SESSION_STATE_KEY, "") or "")
        error_code = str(request.args.get("error") or "").strip()
        returned_state = str(request.args.get("state") or "").strip()
        authorization_code = str(request.args.get("code") or "").strip()

        if error_code:
            return _redirect_google_auth_error(view=auth_view, next_url=next_url, error_message="Google sign-in was canceled or denied.")
        if not _is_google_oauth_configured():
            return _redirect_google_auth_error(view=auth_view, next_url=next_url, error_message="Google sign-in is not configured yet.")
        if not expected_state or not returned_state or not secrets.compare_digest(expected_state, returned_state):
            return _redirect_google_auth_error(view=auth_view, next_url=next_url, error_message="Could not verify the Google sign-in request.")
        if not authorization_code:
            return _redirect_google_auth_error(view=auth_view, next_url=next_url, error_message="Google did not return an authorization code.")

        try:
            token_payload = _exchange_google_authorization_code(authorization_code, _build_google_oauth_redirect_uri())
            access_token = str(token_payload.get("access_token") or "").strip()
            if not access_token:
                raise RuntimeError("Google did not return an access token.")
            user_profile = _fetch_google_user_profile(access_token)
            user = _sign_in_public_user_from_google_profile(user_profile)
        except ValueError as exc:
            return _redirect_google_auth_error(view=auth_view, next_url=next_url, error_message=str(exc))
        except Exception as exc:
            app.logger.exception("Failed to sign in with Google: %s", exc)
            return _redirect_google_auth_error(view=auth_view, next_url=next_url, error_message="Could not sign you in with Google right now.")

        set_public_user_session(int(user.get("id")))
        session.pop(PASSWORD_RESET_SUCCESS_SESSION_KEY, None)
        if not _user_completed_onboarding(user):
            return redirect(url_for("public_account_setup", next=next_url))
        return redirect(next_url)

    @app.route("/api/auth/login", methods=["POST"])
    def api_public_login():
        next_url = _resolve_safe_next_url(request.form.get("next"), "account_profile")
        if not is_supabase_configured():
            return jsonify({"ok": False, "error": "Login is temporarily unavailable."}), 503
        if not is_public_csrf_valid(request.form.get("csrf_token")):
            return jsonify({"ok": False, "error": "Invalid request."}), 400

        client_ip = get_client_ip()
        is_limited, retry_after = is_public_auth_rate_limited("login", client_ip)
        if is_limited:
            return jsonify({"ok": False, "error": f"Too many login attempts. Try again in {retry_after} seconds."}), 429

        identifier = _normalize_login_identifier(request.form.get("identifier") or request.form.get("email"))
        password = str(request.form.get("password") or "")
        if not identifier or not password or len(password) > 128:
            return jsonify({"ok": False, "error": "Please enter a valid email and password."}), 400

        try:
            user = get_public_user_auth_by_identifier(identifier)
        except Exception:
            user = None
        if not user:
            record_public_auth_failure("login", client_ip)
            return jsonify({"ok": False, "error": "Invalid credentials."}), 401

        stored_hash = str(user.get("password_hash") or "")
        try:
            password_is_valid = bool(user.get("local_password_enabled", True)) and bool(stored_hash) and check_password_hash(stored_hash, password)
        except (TypeError, ValueError):
            password_is_valid = False
        if not password_is_valid:
            record_public_auth_failure("login", client_ip)
            return jsonify({"ok": False, "error": "Invalid credentials."}), 401

        if not bool(user.get("is_active")):
            record_public_auth_failure("login", client_ip)
            return jsonify(
                {
                    "ok": False,
                    "error": DISABLED_ACCOUNT_MESSAGE,
                    "account_disabled": True,
                }
            ), 403

        if not _user_is_verified(user):
            record_public_auth_failure("login", client_ip)
            return jsonify({"ok": False, "error": "Please verify your email before signing in.", "verification_required": True, "email": user.get("email")}), 403

        clear_public_auth_failures("login", client_ip)
        update_public_user(int(user.get("id")), {"last_login_at": _utcnow().isoformat()})
        set_public_user_session(int(user.get("id")))
        session.pop(PASSWORD_RESET_SUCCESS_SESSION_KEY, None)
        if not _user_completed_onboarding(user):
            return jsonify({"ok": True, "redirect_url": url_for("public_account_setup", next=next_url)})
        return jsonify({"ok": True, "redirect_url": next_url})

    @app.route("/api/auth/signup", methods=["POST"])
    def api_public_signup():
        next_url = _resolve_safe_next_url(request.form.get("next"), "account_profile")
        if not is_supabase_configured():
            return jsonify({"ok": False, "error": "Sign up is temporarily unavailable."}), 503
        if not is_public_auth_email_configured():
            return jsonify({"ok": False, "error": "Email verification is not configured yet."}), 503
        if not is_public_csrf_valid(request.form.get("csrf_token")):
            return jsonify({"ok": False, "error": "Invalid request."}), 400

        client_ip = get_client_ip()
        is_limited, retry_after = is_public_auth_rate_limited("signup", client_ip)
        if is_limited:
            return jsonify({"ok": False, "error": f"Too many sign up attempts. Try again in {retry_after} seconds."}), 429

        try:
            payload, email = _validate_modal_signup_payload(request.form)
            verification_code = _generate_six_digit_code()
            now = _utcnow()
            payload.update(
                {
                    "email_verification_token_hash": _hash_one_time_code(verification_code),
                    "email_verification_expires_at": (now + EMAIL_VERIFICATION_LIFETIME).isoformat(),
                    "email_verification_sent_at": now.isoformat(),
                    "email_verification_attempts": 0,
                    "oauth_subject": None,
                    "local_password_enabled": True,
                    "password_reset_token_hash": None,
                    "password_reset_expires_at": None,
                    "security_code_hash": None,
                    "security_code_expires_at": None,
                    "security_code_sent_at": None,
                    "security_code_attempts": 0,
                    "updated_at": now.isoformat(),
                }
            )
            created_user = create_public_user(payload)
            send_public_account_verification_email(
                to_email=email,
                verification_code=verification_code,
                expires_minutes=int(EMAIL_VERIFICATION_LIFETIME.total_seconds() // 60),
            )
            clear_public_auth_failures("signup", client_ip)
            return jsonify({"ok": True, "email": email, "verify_pending": True, "user_id": created_user.get("id")})
        except ValueError as exc:
            record_public_auth_failure("signup", client_ip)
            return jsonify({"ok": False, "error": str(exc)}), 400
        except PublicAuthEmailError as exc:
            app.logger.exception("Failed to send account verification email: %s", exc)
            return jsonify({"ok": False, "error": "Could not send the verification code right now. Please try again."}), 500
        except Exception as exc:
            record_public_auth_failure("signup", client_ip)
            app.logger.exception("Failed to create public user account: %s", exc)
            return jsonify({"ok": False, "error": "Could not create your account right now."}), 500

    @app.route("/api/auth/signup/resend", methods=["POST"])
    def api_public_signup_resend():
        next_url = _resolve_safe_next_url(request.form.get("next"), "account_profile")
        if not is_supabase_configured():
            return jsonify({"ok": False, "error": "Verification resend is temporarily unavailable."}), 503
        if not is_public_auth_email_configured():
            return jsonify({"ok": False, "error": "Email verification is not configured yet."}), 503
        if not is_public_csrf_valid(request.form.get("csrf_token")):
            return jsonify({"ok": False, "error": "Invalid request."}), 400

        email = _normalize_login_identifier(request.form.get("email"))
        if not EMAIL_PATTERN.match(email):
            return jsonify({"ok": False, "error": "Please provide a valid email address."}), 400

        try:
            user = get_public_user_auth_by_email(email)
            if not user:
                return jsonify({"ok": True, "email": email, "verify_pending": True})
            if _user_is_verified(user):
                return jsonify({"ok": True, "already_verified": True, "redirect_url": url_for("public_login", next=next_url)})
            wait_seconds = _resend_wait_seconds(user.get("email_verification_sent_at"), EMAIL_VERIFICATION_RESEND_COOLDOWN)
            if wait_seconds:
                return jsonify({"ok": False, "error": f"Please wait {wait_seconds} seconds before requesting another code.", "retry_after": wait_seconds}), 429
            verification_code = _generate_six_digit_code()
            now = _utcnow()
            update_public_user(
                int(user.get("id")),
                {
                    "email_verification_token_hash": _hash_one_time_code(verification_code),
                    "email_verification_expires_at": (now + EMAIL_VERIFICATION_LIFETIME).isoformat(),
                    "email_verification_sent_at": now.isoformat(),
                    "email_verification_attempts": 0,
                    "updated_at": now.isoformat(),
                },
            )
            send_public_account_verification_email(
                to_email=email,
                verification_code=verification_code,
                expires_minutes=int(EMAIL_VERIFICATION_LIFETIME.total_seconds() // 60),
            )
            return jsonify({"ok": True, "email": email, "verify_pending": True})
        except PublicAuthEmailError as exc:
            app.logger.exception("Failed to resend account verification email: %s", exc)
            return jsonify({"ok": False, "error": "Could not resend the verification code right now. Please try again."}), 500
        except Exception as exc:
            app.logger.exception("Failed to resend account verification email for %s: %s", email, exc)
            return jsonify({"ok": False, "error": "Could not resend the verification email right now."}), 500

    @app.route("/api/auth/signup/verify-otp", methods=["POST"])
    def api_public_signup_verify_otp():
        next_url = _resolve_safe_next_url(request.form.get("next"), "account_profile")
        if not is_supabase_configured():
            return jsonify({"ok": False, "error": "Email verification is temporarily unavailable."}), 503
        if not is_public_csrf_valid(request.form.get("csrf_token")):
            return jsonify({"ok": False, "error": "Invalid request."}), 400

        client_ip = get_client_ip()
        is_limited, retry_after = is_public_auth_rate_limited("signup", client_ip)
        if is_limited:
            return jsonify({"ok": False, "error": f"Too many verification attempts. Try again in {retry_after} seconds."}), 429

        email = _normalize_login_identifier(request.form.get("email"))
        try:
            code = _validate_six_digit_code(request.form.get("verification_code"))
        except ValueError as exc:
            return jsonify({"ok": False, "error": str(exc)}), 400
        if not EMAIL_PATTERN.match(email):
            return jsonify({"ok": False, "error": "Enter the email address used during sign up."}), 400

        try:
            user = get_public_user_auth_by_email(email)
            if not user:
                record_public_auth_failure("signup", client_ip)
                return jsonify({"ok": False, "error": "The code is invalid or has expired."}), 400
            if _user_is_verified(user):
                return jsonify({"ok": True, "redirect_url": url_for("public_login", next=next_url)})

            attempts = int(user.get("email_verification_attempts") or 0)
            if attempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS:
                return jsonify({"ok": False, "error": "Too many incorrect attempts. Request a new code."}), 429
            stored_hash = str(user.get("email_verification_token_hash") or "")
            code_is_valid = (
                bool(stored_hash)
                and not _is_expired(user.get("email_verification_expires_at"))
                and hmac.compare_digest(stored_hash, _hash_one_time_code(code))
            )
            if not code_is_valid:
                update_public_user(
                    int(user.get("id")),
                    {"email_verification_attempts": attempts + 1, "updated_at": _utcnow().isoformat()},
                )
                record_public_auth_failure("signup", client_ip)
                remaining = max(0, EMAIL_VERIFICATION_MAX_ATTEMPTS - attempts - 1)
                message = "The code is invalid or has expired."
                if remaining:
                    message += f" {remaining} attempt{'s' if remaining != 1 else ''} remaining."
                else:
                    message += " Request a new code."
                return jsonify({"ok": False, "error": message}), 400

            now = _utcnow().isoformat()
            verified_user = update_public_user(
                int(user.get("id")),
                {
                    "email_verified_at": str(user.get("email_verified_at") or now),
                    "email_verification_token_hash": None,
                    "email_verification_expires_at": None,
                    "email_verification_sent_at": None,
                    "email_verification_attempts": 0,
                    "updated_at": now,
                },
            )
            clear_public_auth_failures("signup", client_ip)
            set_public_user_session(int(user.get("id")))
            redirect_url = next_url if _user_completed_onboarding(verified_user) else url_for("public_account_setup", next=next_url)
            return jsonify({"ok": True, "redirect_url": redirect_url})
        except Exception as exc:
            app.logger.exception("Failed to verify signup OTP for %s: %s", email, exc)
            return jsonify({"ok": False, "error": "Could not verify the code right now."}), 500

    @app.route("/verify-email", methods=["GET"])
    def public_verify_email():
        next_url = _resolve_safe_next_url(request.args.get("next"), "index")
        raw_token = str(request.args.get("token") or "").strip()
        if not raw_token:
            return _render_auth_entry(default_view="signup", next_url=next_url, page_title="Verify Account | Museo ng Libingan sa Ilalim ng Lupa", error_message="The verification link is incomplete.")

        try:
            user = get_public_user_by_email_verification_token_hash(_hash_token(raw_token))
        except Exception:
            user = None
        if not user or _is_expired(user.get("email_verification_expires_at")):
            return _render_auth_entry(default_view="signup", next_url=next_url, page_title="Verify Account | Museo ng Libingan sa Ilalim ng Lupa", error_message="That verification link is invalid or has expired. Please request a new email.")

        now = _utcnow().isoformat()
        update_public_user(
            int(user.get("id")),
            {
                "email_verified_at": str(user.get("email_verified_at") or now),
                "email_verification_token_hash": None,
                "email_verification_expires_at": None,
                "email_verification_sent_at": None,
                "email_verification_attempts": 0,
                "updated_at": now,
            },
        )
        set_public_user_session(int(user.get("id")))
        if _user_completed_onboarding(user):
            return redirect(next_url)
        return redirect(url_for("public_account_setup", next=next_url))

    @app.route("/account/setup", methods=["GET", "POST"])
    @public_login_required
    def public_account_setup():
        current_user = get_current_public_user()
        if not current_user:
            return redirect(url_for("public_login"))
        if not _user_is_verified(current_user):
            clear_public_user_session()
            return redirect(url_for("public_login"))

        next_url = _resolve_next_url("index")
        if _user_completed_onboarding(current_user):
            return redirect(next_url)

        error_message = None
        role_values = _normalize_role_values(request.form.getlist("profile_roles")) if request.method == "POST" else _normalize_role_values(current_user.get("profile_roles"))
        step_index = _resolve_onboarding_step_index(request.form, role_values) if request.method == "POST" else 0
        if request.method == "POST":
            if not is_public_csrf_valid(request.form.get("csrf_token")):
                error_message = "Invalid request."
            else:
                try:
                    payload = _validate_onboarding_payload(request.form, role_values, int(current_user.get("id")))
                    update_public_user(int(current_user.get("id")), payload)
                    return redirect(next_url)
                except ValueError as exc:
                    error_message = str(exc)
                    if "username" in error_message.lower() or "full name" in error_message.lower():
                        step_index = 0
                except Exception as exc:
                    app.logger.exception("Failed to complete onboarding for user %s: %s", current_user.get("id"), exc)
                    error_message = "Could not save your profile right now."

        return render_template(
            "AccountSetup.html",
            next_url=next_url,
            error_message=error_message,
            csrf_token=ensure_public_csrf_token(),
            use_case_options=ONBOARDING_USE_CASE_OPTIONS,
            role_options=ONBOARDING_ROLE_OPTIONS,
            selected_roles=role_values,
            onboarding_step_index=step_index,
        )

    @app.route("/api/auth/forgot-password", methods=["POST"])
    def api_public_forgot_password():
        next_url = _resolve_safe_next_url(request.form.get("next"), "index")
        if not is_supabase_configured():
            return jsonify({"ok": False, "error": "Password reset is temporarily unavailable."}), 503
        if not is_public_auth_email_configured():
            return jsonify({"ok": False, "error": "Password reset email is not configured yet."}), 503
        if not is_public_csrf_valid(request.form.get("csrf_token")):
            return jsonify({"ok": False, "error": "Invalid request."}), 400

        client_ip = get_client_ip()
        is_limited, retry_after = is_public_auth_rate_limited("password-reset", client_ip)
        if is_limited:
            return jsonify({"ok": False, "error": f"Too many password reset requests. Try again in {retry_after} seconds."}), 429

        email = _normalize_login_identifier(request.form.get("email"))
        if not EMAIL_PATTERN.match(email):
            return jsonify({"ok": False, "error": "Please provide a valid email address."}), 400

        # Count every valid request while keeping the response independent of
        # whether an account exists, which avoids exposing registered emails.
        record_public_auth_failure("password-reset", client_ip)

        try:
            user = get_public_user_auth_by_email(email)
            if user and _user_is_verified(user):
                raw_token = secrets.token_urlsafe(32)
                update_public_user(
                    int(user.get("id")),
                    {
                        "password_reset_token_hash": _hash_token(raw_token),
                        "password_reset_expires_at": (_utcnow() + PASSWORD_RESET_LIFETIME).isoformat(),
                        "updated_at": _utcnow().isoformat(),
                    },
                )
                send_public_password_reset_email(to_email=email, reset_url=_build_reset_url(raw_token, next_url))
            return jsonify({"ok": True, "email": email})
        except PublicAuthEmailError as exc:
            app.logger.exception("Failed to send password reset email: %s", exc)
            # Preserve the same public response for registered and unregistered
            # addresses; delivery details stay in server logs.
            return jsonify({"ok": True, "email": email})
        except Exception as exc:
            app.logger.exception("Failed to start password reset for %s: %s", email, exc)
            return jsonify({"ok": True, "email": email})

    @app.route("/reset-password", methods=["GET", "POST"])
    def public_reset_password():
        next_url = _resolve_safe_next_url(request.values.get("next"), "index")
        raw_token = str(request.values.get("token") or "").strip()
        error_message = None
        token_user = None
        token_valid = False
        if raw_token:
            try:
                token_user = get_public_user_by_password_reset_token_hash(_hash_token(raw_token))
            except Exception:
                token_user = None
        if not raw_token or not token_user or _is_expired(token_user.get("password_reset_expires_at")):
            error_message = "That password reset link is invalid or has expired."
        else:
            token_valid = True
            if request.method == "POST":
                if not is_public_csrf_valid(request.form.get("csrf_token")):
                    error_message = "Invalid request."
                else:
                    password = str(request.form.get("password") or "")
                    confirm_password = str(request.form.get("confirm_password") or "")
                    try:
                        _validate_new_password(password, confirm_password)
                    except ValueError as exc:
                        error_message = str(exc)
                    if not error_message:
                        try:
                            update_public_user(
                                int(token_user.get("id")),
                                {
                                    "password_hash": generate_password_hash(password),
                                    "local_password_enabled": True,
                                    "password_reset_token_hash": None,
                                    "password_reset_expires_at": None,
                                    "updated_at": _utcnow().isoformat(),
                                },
                            )
                            # Do not auto-login after a credential reset. End any
                            # current browser session, rotate CSRF state, then use
                            # a token-free confirmation page before sign-in.
                            clear_public_user_session()
                            clear_public_auth_failures("login", get_client_ip())
                            session[PASSWORD_RESET_SUCCESS_SESSION_KEY] = {
                                "next_url": next_url,
                                "expires_at": (_utcnow() + PASSWORD_RESET_SUCCESS_LIFETIME).isoformat(),
                            }
                            try:
                                send_public_password_changed_email(to_email=str(token_user.get("email") or ""))
                            except Exception as notification_error:
                                app.logger.warning(
                                    "Password changed for user %s but its confirmation email could not be sent: %s",
                                    token_user.get("id"),
                                    notification_error,
                                )
                            response = redirect(url_for("public_reset_password_success"), code=303)
                            response.headers["Cache-Control"] = "no-store, max-age=0"
                            response.headers["Pragma"] = "no-cache"
                            response.headers["Referrer-Policy"] = "no-referrer"
                            return response
                        except Exception as exc:
                            app.logger.exception("Failed to reset password for user %s: %s", token_user.get("id"), exc)
                            error_message = "Could not reset your password right now."

        response = app.make_response(
            render_template(
                "ResetPassword.html",
                next_url=next_url,
                auth_next_url=next_url,
                csrf_token=ensure_public_csrf_token(),
                token=raw_token,
                token_valid=token_valid,
                reset_success=False,
                error_message=error_message,
            )
        )
        response.headers["Cache-Control"] = "no-store, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
        return response

    @app.route("/reset-password/success", methods=["GET"])
    def public_reset_password_success():
        state = session.get(PASSWORD_RESET_SUCCESS_SESSION_KEY)
        if not isinstance(state, dict) or _is_expired(state.get("expires_at")):
            session.pop(PASSWORD_RESET_SUCCESS_SESSION_KEY, None)
            return redirect(url_for("public_login"))

        next_url = _resolve_safe_next_url(state.get("next_url"), "index")
        response = app.make_response(
            render_template(
                "ResetPassword.html",
                next_url=next_url,
                auth_next_url=next_url,
                csrf_token=ensure_public_csrf_token(),
                token="",
                token_valid=False,
                reset_success=True,
                login_url=url_for("public_login", next=next_url),
                error_message=None,
            )
        )
        response.headers["Cache-Control"] = "no-store, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
        return response

    @app.route("/logout", methods=["POST"])
    def public_logout():
        if not is_public_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("public_login"))
        clear_public_user_session()
        return redirect(url_for("index"))

    @app.route("/account")
    @public_login_required
    def account_profile():
        current_user = get_current_public_user()
        if not current_user:
            return redirect(url_for("public_login"))
        if not _user_completed_onboarding(current_user):
            return redirect(url_for("public_account_setup", next=url_for("account_profile")))
        dashboard = load_user_account_dashboard(int(current_user.get("id")))
        return render_template(
            "AccountProfile.html",
            account_dashboard=dashboard,
        )

    @app.route("/account/heritage-keeper")
    @public_login_required
    def heritage_keeper_page():
        current_user = get_current_public_user()
        if not current_user:
            return redirect(url_for("public_login", next=request.path))
        if not _user_completed_onboarding(current_user):
            return redirect(url_for("public_account_setup", next=request.path))
        progress = load_heritage_keeper_progress(int(current_user.get("id")))
        return render_template("HeritageKeeper.html", heritage_keeper=progress)

    @app.route("/api/account/heritage-keeper/progress")
    def heritage_keeper_progress_api():
        current_user = get_current_public_user()
        if not current_user:
            return jsonify({
                "ok": False,
                "login_required": True,
                "login_url": url_for("public_login", next=request.referrer or url_for("heritage_keeper_page")),
            }), 401
        return jsonify({"ok": True, "progress": load_heritage_keeper_progress(int(current_user.get("id")))})

    @app.route("/api/account/heritage-keeper/fragments", methods=["POST"])
    def heritage_keeper_award_fragment():
        current_user = get_current_public_user()
        if not current_user or session.get(public_session_authenticated_key) is not True:
            return jsonify({
                "ok": False,
                "login_required": True,
                "login_url": url_for("public_login", next=request.referrer or url_for("account_profile")),
            }), 401
        if not is_public_csrf_valid(request.headers.get("X-CSRF-Token")):
            return jsonify({"ok": False, "error": "Invalid request."}), 400
        payload = request.get_json(silent=True) or {}
        try:
            result = record_heritage_keeper_fragment(
                int(current_user.get("id")),
                str(payload.get("source") or ""),
                str(payload.get("item_key") or ""),
            )
            return jsonify({"ok": True, **result})
        except ValueError as exc:
            return jsonify({"ok": False, "error": str(exc)}), 400
        except Exception as exc:
            app.logger.exception("Failed to record Heritage Keeper progress: %s", exc)
            return jsonify({"ok": False, "error": "Progress could not be saved right now."}), 500

    @app.route("/account/settings", methods=["GET", "POST"])
    def account_settings():
        current_user = get_current_public_user()
        if not current_user:
            return _settings_login_required_response()
        if not _user_completed_onboarding(current_user):
            return redirect(url_for("public_account_setup", next=url_for("account_settings")))

        error_message = None
        status_message = None

        if request.method == "POST":
            if not is_public_csrf_valid(request.form.get("csrf_token")):
                error_message = "Invalid request. Please try again."
                if _settings_wants_json():
                    return jsonify({"ok": False, "error": error_message}), 400
            else:
                try:
                    full_name = str(request.form.get("full_name") or "").strip()
                    if len(full_name) < 3 or len(full_name) > 160:
                        raise ValueError("Please enter your full name (3–160 characters).")
                    role_values = _normalize_role_values(request.form.getlist("profile_roles"))
                    if not role_values:
                        raise ValueError("Please select at least one role.")
                    # Theme + language are managed live by the shared accessibility
                    # controls (/api/account/preferences), so this form only saves
                    # the name and roles.
                    update_public_user(
                        int(current_user.get("id")),
                        {
                            "full_name": full_name[:160],
                            "profile_roles": _serialize_role_values(role_values),
                            "updated_at": _utcnow().isoformat(),
                        },
                    )
                    return _settings_response(
                        ok=True,
                        message="Your settings were saved.",
                        redirect_status="saved",
                    )
                except ValueError as exc:
                    error_message = str(exc)
                    if _settings_wants_json():
                        return jsonify({"ok": False, "error": error_message}), 400
                except Exception as exc:  # noqa: BLE001
                    app.logger.exception("Failed to update settings for user %s: %s", current_user.get("id"), exc)
                    error_message = "Could not save your settings right now."
                    if _settings_wants_json():
                        return jsonify({"ok": False, "error": error_message}), 500

            current_user = get_current_public_user() or current_user

        status_key = str(request.args.get("status") or "").strip()
        success_by_status = {
            "saved": "Your settings were saved.",
            "photo": "Your profile picture was updated.",
            "photo-removed": "Your profile picture was removed.",
            "security-code-sent": "A security code was sent to your email. It expires in 10 minutes.",
            "security-code-verified": "Security code confirmed. You can now create your password.",
            "password-changed": "Your password was changed successfully.",
            "password-created": "A password was added to your Google account. You can now sign in either way.",
        }
        error_by_status = {
            "photo-error": "That image couldn't be uploaded. Please use a JPG or PNG image.",
            "photo-config": "Photo uploads are not available right now.",
            "delete-mismatch": "The confirmation text didn't match. Type “confirm delete” exactly.",
            "delete-error": "We couldn't process that request. Please try again.",
            "security-code-wait": "Please wait before requesting another security code.",
            "security-code-error": "We couldn't send a security code right now. Please try again.",
            "security-code-invalid": "The security code is invalid or expired. Check the code or request a new one.",
            "password-error": "We couldn't update your password. Check the information and try again.",
            "password-current": "Your current password is incorrect.",
            "password-code": "The security code is invalid, expired, or has too many failed attempts. Request a new code and try again.",
            "password-invalid": "Use matching passwords between 8 and 128 characters, different from your current password.",
        }
        if not error_message:
            if status_key in success_by_status:
                status_message = success_by_status[status_key]
            elif status_key in error_by_status:
                error_message = error_by_status[status_key]

        dashboard = load_user_account_dashboard(int(current_user.get("id")))
        return render_template(
            "AccountSettings.html",
            role_options=ONBOARDING_ROLE_OPTIONS,
            selected_roles=_normalize_role_values(current_user.get("profile_roles")),
            account_dashboard=dashboard,
            csrf_token=ensure_public_csrf_token(),
            error_message=error_message,
            status_message=status_message,
            security_setup_stage=_get_security_setup_stage(int(current_user.get("id"))),
        )

    @app.route("/account/settings/security/code", methods=["POST"])
    def account_settings_security_code():
        current_user = get_current_public_user()
        if not current_user:
            return _settings_login_required_response()
        if not is_public_csrf_valid(request.form.get("csrf_token")):
            return _settings_response(ok=False, message="Invalid request. Please try again.", redirect_status="security-code-error", http_status=400)
        if not is_public_auth_email_configured():
            return _settings_response(ok=False, message="Email security codes are not available right now.", redirect_status="security-code-error", http_status=503)

        try:
            auth_user = get_public_user_auth_by_email(str(current_user.get("email") or ""))
            if not auth_user or bool(auth_user.get("local_password_enabled", True)):
                _clear_security_setup_state()
                return _settings_response(ok=False, message="Password sign-in is already enabled for this account.", http_status=400)
            wait_seconds = _resend_wait_seconds(auth_user.get("security_code_sent_at"), SECURITY_CODE_RESEND_COOLDOWN)
            if wait_seconds:
                return _settings_response(
                    ok=False,
                    message=f"Please wait {wait_seconds} seconds before requesting another security code.",
                    redirect_status="security-code-wait",
                    http_status=429,
                    stage="code",
                    retry_after=wait_seconds,
                )

            security_code = _generate_six_digit_code()
            now = _utcnow()
            update_public_user(
                int(auth_user.get("id")),
                {
                    "security_code_hash": _hash_one_time_code(security_code),
                    "security_code_expires_at": (now + SECURITY_CODE_LIFETIME).isoformat(),
                    "security_code_sent_at": now.isoformat(),
                    "security_code_attempts": 0,
                    "updated_at": now.isoformat(),
                },
            )
            send_public_security_code_email(
                to_email=str(auth_user.get("email") or ""),
                security_code=security_code,
                expires_minutes=int(SECURITY_CODE_LIFETIME.total_seconds() // 60),
            )
            _set_security_setup_state(int(auth_user.get("id")), "code")
            return _settings_response(
                ok=True,
                message="A security code was sent to your email. It expires in 10 minutes.",
                redirect_status="security-code-sent",
                stage="code",
            )
        except Exception as exc:
            _clear_security_setup_state()
            app.logger.exception("Failed to send a password security code for user %s: %s", current_user.get("id"), exc)
            return _settings_response(ok=False, message="We couldn't send a security code right now. Please try again.", redirect_status="security-code-error", http_status=500)

    @app.route("/account/settings/security/verify-code", methods=["POST"])
    def account_settings_security_verify_code():
        current_user = get_current_public_user()
        if not current_user:
            return _settings_login_required_response()
        if not is_public_csrf_valid(request.form.get("csrf_token")):
            _clear_security_setup_state()
            return _settings_response(ok=False, message="The security code is invalid or expired. Request a new code and try again.", redirect_status="security-code-invalid", http_status=400)
        if _get_security_setup_stage(int(current_user.get("id"))) != "code":
            return _settings_response(ok=False, message="Request a new security code before continuing.", redirect_status="security-code-invalid", http_status=400)

        client_ip = get_client_ip()
        is_limited, _retry_after = is_public_auth_rate_limited("login", client_ip)
        if is_limited:
            return _settings_response(ok=False, message="Too many attempts. Please wait before trying again.", redirect_status="security-code-invalid", http_status=429, stage="code")

        try:
            security_code = _validate_six_digit_code(request.form.get("security_code"))
            auth_user = get_public_user_auth_by_email(str(current_user.get("email") or ""))
            if not auth_user or bool(auth_user.get("local_password_enabled", True)):
                _clear_security_setup_state()
                return _settings_response(ok=False, message="Password sign-in is already enabled for this account.", http_status=400)

            attempts = int(auth_user.get("security_code_attempts") or 0)
            if attempts >= SECURITY_CODE_MAX_ATTEMPTS:
                _clear_security_setup_state()
                return _settings_response(ok=False, message="Too many incorrect codes. Request a new security code.", redirect_status="security-code-invalid", http_status=429, stage="")
            stored_code_hash = str(auth_user.get("security_code_hash") or "")
            code_is_valid = (
                bool(stored_code_hash)
                and not _is_expired(auth_user.get("security_code_expires_at"))
                and hmac.compare_digest(stored_code_hash, _hash_one_time_code(security_code))
            )
            if not code_is_valid:
                update_public_user(
                    int(auth_user.get("id")),
                    {"security_code_attempts": attempts + 1, "updated_at": _utcnow().isoformat()},
                )
                record_public_auth_failure("login", client_ip)
                if attempts + 1 >= SECURITY_CODE_MAX_ATTEMPTS:
                    _clear_security_setup_state()
                return _settings_response(
                    ok=False,
                    message="The security code is invalid or expired. Check the code or request a new one.",
                    redirect_status="security-code-invalid",
                    http_status=400,
                    stage="" if attempts + 1 >= SECURITY_CODE_MAX_ATTEMPTS else "code",
                )

            update_public_user(
                int(auth_user.get("id")),
                {
                    "security_code_hash": None,
                    "security_code_expires_at": None,
                    "security_code_sent_at": None,
                    "security_code_attempts": 0,
                    "updated_at": _utcnow().isoformat(),
                },
            )
            clear_public_auth_failures("login", client_ip)
            _set_security_setup_state(int(auth_user.get("id")), "password")
            return _settings_response(
                ok=True,
                message="Security code confirmed. You can now create your password.",
                redirect_status="security-code-verified",
                stage="password",
            )
        except ValueError:
            return _settings_response(ok=False, message="Enter the complete six-digit security code.", redirect_status="security-code-invalid", http_status=400, stage="code")
        except Exception as exc:
            app.logger.exception("Failed to verify password security code for user %s: %s", current_user.get("id"), exc)
            return _settings_response(ok=False, message="We couldn't verify the security code right now. Please try again.", redirect_status="security-code-invalid", http_status=500, stage="code")

    @app.route("/account/settings/security/password", methods=["POST"])
    def account_settings_security_password():
        current_user = get_current_public_user()
        if not current_user:
            return _settings_login_required_response()
        if not is_public_csrf_valid(request.form.get("csrf_token")):
            return _settings_response(ok=False, message="Invalid request. Please try again.", redirect_status="password-error", http_status=400)
        client_ip = get_client_ip()
        is_limited, _retry_after = is_public_auth_rate_limited("login", client_ip)
        if is_limited:
            return _settings_response(ok=False, message="Too many password attempts. Please wait before trying again.", redirect_status="password-error", http_status=429)

        try:
            auth_user = get_public_user_auth_by_email(str(current_user.get("email") or ""))
            if not auth_user:
                raise ValueError("Account not found.")

            password = str(request.form.get("new_password") or "")
            confirmation = str(request.form.get("confirm_password") or "")
            _validate_new_password(password, confirmation)
            had_local_password = bool(auth_user.get("local_password_enabled", True))

            if had_local_password:
                current_password = str(request.form.get("current_password") or "")
                stored_hash = str(auth_user.get("password_hash") or "")
                try:
                    current_is_valid = bool(stored_hash) and check_password_hash(stored_hash, current_password)
                except (TypeError, ValueError):
                    current_is_valid = False
                if not current_is_valid:
                    record_public_auth_failure("login", client_ip)
                    raise ValueError("Your current password is incorrect.")
                if check_password_hash(stored_hash, password):
                    raise ValueError("Choose a new password that is different from your current password.")
            else:
                if _get_security_setup_stage(int(auth_user.get("id"))) != "password":
                    raise ValueError("Confirm your security code before creating a password.")

            now = _utcnow().isoformat()
            update_public_user(
                int(auth_user.get("id")),
                {
                    "password_hash": generate_password_hash(password),
                    "local_password_enabled": True,
                    "security_code_hash": None,
                    "security_code_expires_at": None,
                    "security_code_sent_at": None,
                    "security_code_attempts": 0,
                    "password_reset_token_hash": None,
                    "password_reset_expires_at": None,
                    "updated_at": now,
                },
            )
            # Rotate the signed session and CSRF token after a credential change.
            clear_public_auth_failures("login", client_ip)
            _clear_security_setup_state()
            set_public_user_session(int(auth_user.get("id")))
            return _settings_response(
                ok=True,
                message=(
                    "Your password was changed successfully."
                    if had_local_password
                    else "A password was added to your Google account. You can now sign in either way."
                ),
                redirect_status="password-changed" if had_local_password else "password-created",
                password_created=not had_local_password,
                password_changed=had_local_password,
                csrf_token=ensure_public_csrf_token(),
                stage="complete",
            )
        except ValueError as exc:
            app.logger.warning("Password update rejected for user %s: %s", current_user.get("id"), exc)
            error_text = str(exc).lower()
            if "current password" in error_text:
                status = "password-current"
            elif "security code" in error_text or "incorrect attempts" in error_text:
                status = "password-code"
            else:
                status = "password-invalid"
            return _settings_response(ok=False, message=str(exc), redirect_status=status, http_status=400, stage=_get_security_setup_stage(int(current_user.get("id"))))
        except Exception as exc:
            app.logger.exception("Failed to update password for user %s: %s", current_user.get("id"), exc)
            return _settings_response(ok=False, message="We couldn't update your password right now. Please try again.", redirect_status="password-error", http_status=500)

    @app.route("/account/settings/avatar", methods=["POST"])
    def account_settings_avatar():
        current_user = get_current_public_user()
        if not current_user:
            return _settings_login_required_response()
        if not is_public_csrf_valid(request.form.get("csrf_token")):
            return _settings_response(ok=False, message="Invalid request. Please try again.", http_status=400)

        action = str(request.form.get("avatar_action") or "upload").strip().lower()
        old_picture = str(current_user.get("profile_picture") or "").strip()
        is_stored_object = bool(old_picture) and not old_picture.startswith(("http://", "https://"))

        new_object_path = None
        pending_direct_path = str(request.form.get("avatar_object_path") or "").strip()
        try:
            if action == "remove":
                update_public_user(int(current_user.get("id")), {"profile_picture": None, "updated_at": _utcnow().isoformat()})
                if is_stored_object:
                    try:
                        delete_public_image(old_picture, folder_prefix=AVATAR_UPLOAD_FOLDER)
                    except Exception:  # noqa: BLE001
                        pass
                return _settings_response(ok=True, message="Your profile picture was removed.", redirect_status="photo-removed", avatar_action="remove")

            file_storage = request.files.get("avatar")
            direct_path = pending_direct_path
            if not direct_path and (file_storage is None or not str(getattr(file_storage, "filename", "")).strip()):
                return _settings_response(ok=False, message="Choose a JPG or PNG image first.", http_status=400)
            if not is_supabase_configured():
                return _settings_response(ok=False, message="Photo uploads are not available right now.", redirect_status="photo-config", http_status=503)

            if _uploaded_file_size(file_storage) > MEDIA_UPLOAD_MAX_BYTES:
                return _settings_response(ok=False, message="Your photo exceeds the 25 MB upload limit.", redirect_status="photo-error", http_status=400)
            if direct_path:
                direct_upload = validate_direct_upload_reference(
                    direct_path,
                    "account_avatar",
                    audience="public",
                    owner_id=current_user.get("id"),
                )
                object_path = direct_upload["path"]
            else:
                object_path = upload_public_image(
                    file_storage,
                    title=f"{current_user.get('username') or 'user'}-avatar",
                    folder_prefix=AVATAR_UPLOAD_FOLDER,
                    slugify_text=_avatar_slugify,
                )
            new_object_path = object_path
            if not object_path:
                return _settings_response(ok=False, message="That image couldn't be uploaded. Please try again.", redirect_status="photo-error", http_status=400)
            update_public_user(int(current_user.get("id")), {"profile_picture": object_path, "updated_at": _utcnow().isoformat()})
            if is_stored_object:
                try:
                    delete_public_image(old_picture, folder_prefix=AVATAR_UPLOAD_FOLDER)
                except Exception:  # noqa: BLE001
                    pass
            return _settings_response(ok=True, message="Your profile picture was updated.", redirect_status="photo", avatar_action="upload")
        except ValueError as exc:
            if new_object_path:
                try:
                    delete_public_image(new_object_path, folder_prefix=AVATAR_UPLOAD_FOLDER)
                except Exception:  # noqa: BLE001
                    pass
            elif pending_direct_path:
                try:
                    discard_direct_uploads(
                        [{"purpose": "account_avatar", "path": pending_direct_path}],
                        audience="public",
                        owner_id=current_user.get("id"),
                    )
                except Exception:  # noqa: BLE001
                    pass
            return _settings_response(ok=False, message=str(exc) or "That image couldn't be uploaded. Please use a JPG or PNG image.", redirect_status="photo-error", http_status=400)
        except Exception as exc:  # noqa: BLE001
            if new_object_path:
                try:
                    delete_public_image(new_object_path, folder_prefix=AVATAR_UPLOAD_FOLDER)
                except Exception:  # noqa: BLE001
                    pass
            elif pending_direct_path:
                try:
                    discard_direct_uploads(
                        [{"purpose": "account_avatar", "path": pending_direct_path}],
                        audience="public",
                        owner_id=current_user.get("id"),
                    )
                except Exception:  # noqa: BLE001
                    pass
            app.logger.exception("Failed to update avatar for user %s: %s", current_user.get("id"), exc)
            return _settings_response(ok=False, message="That image couldn't be uploaded. Please try again.", redirect_status="photo-error", http_status=500)

    @app.route("/api/account/preferences", methods=["POST"])
    def account_update_preferences():
        current_user = get_current_public_user()
        if not current_user:
            return jsonify({"ok": False}), 401
        if not is_public_csrf_valid(request.headers.get("X-CSRF-Token") or request.form.get("csrf_token")):
            return jsonify({"ok": False, "error": "Invalid request."}), 400

        payload: dict[str, Any] = {}
        theme = str(request.form.get("theme_preference") or "").strip().lower()
        if theme in VALID_THEME_PREFERENCES:
            payload["theme_preference"] = theme
        language = str(request.form.get("language_preference") or "").strip().lower()
        if language in VALID_LANGUAGE_PREFERENCES:
            payload["language_preference"] = language
        if not payload:
            return jsonify({"ok": False, "error": "Nothing to update."}), 400

        payload["updated_at"] = _utcnow().isoformat()
        try:
            update_public_user(int(current_user.get("id")), payload)
        except Exception as exc:  # noqa: BLE001
            app.logger.exception("Failed to update preferences for user %s: %s", current_user.get("id"), exc)
            return jsonify({"ok": False}), 500
        return jsonify({"ok": True})

    @app.route("/account/settings/delete", methods=["POST"])
    def account_delete():
        current_user = get_current_public_user()
        if not current_user:
            return redirect(url_for("public_login"))
        if not is_public_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("account_settings"))

        confirmation = str(request.form.get("confirmation") or "").strip().lower()
        if confirmation != DELETE_ACCOUNT_CONFIRM_PHRASE:
            return redirect(url_for("account_settings", status="delete-mismatch"))

        try:
            update_public_user(
                int(current_user.get("id")),
                {"is_active": False, "updated_at": _utcnow().isoformat()},
            )
        except Exception as exc:  # noqa: BLE001
            app.logger.exception("Failed to deactivate account for user %s: %s", current_user.get("id"), exc)
            return redirect(url_for("account_settings", status="delete-error"))

        clear_public_user_session()
        return redirect(url_for("index"))

    @app.route("/api/account/bookmarks/online-gallery/<int:item_id>", methods=["POST", "DELETE"])
    def online_gallery_bookmark_toggle(item_id):
        current_user = get_current_public_user()
        if not current_user or session.get(public_session_authenticated_key) is not True or not session.get(public_session_user_id_key):
            return jsonify({"ok": False, "error": "Please sign in to manage bookmarks.", "login_required": True, "login_url": url_for("public_login", next=request.referrer or url_for("online_gallery"))}), 401
        if not is_public_csrf_valid(request.headers.get("X-CSRF-Token") or request.form.get("csrf_token")):
            return jsonify({"ok": False, "error": "Invalid request."}), 400

        try:
            bookmark = get_user_bookmark(int(current_user.get("id")), item_type=BOOKMARK_ITEM_TYPE_ONLINE_GALLERY, item_id=item_id)
            if request.method == "DELETE":
                delete_user_bookmark(int(current_user.get("id")), item_type=BOOKMARK_ITEM_TYPE_ONLINE_GALLERY, item_id=item_id)
                return jsonify({"ok": True, "bookmarked": False})

            if bookmark is None:
                create_user_bookmark(
                    {
                        "user_id": int(current_user.get("id")),
                        "item_type": BOOKMARK_ITEM_TYPE_ONLINE_GALLERY,
                        "item_id": int(item_id),
                    }
                )
            return jsonify({"ok": True, "bookmarked": True})
        except Exception as exc:
            app.logger.exception("Failed to toggle gallery bookmark for item %s: %s", item_id, exc)
            return jsonify({"ok": False, "error": "Could not update your bookmark right now."}), 500
