from __future__ import annotations

import hashlib
import json
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlsplit

from flask import jsonify, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from public_users_repository import (
    create_public_user,
    get_public_user_auth_by_email,
    get_public_user_auth_by_identifier,
    get_public_user_auth_by_username,
    get_public_user_by_email_verification_token_hash,
    get_public_user_by_password_reset_token_hash,
    update_public_user,
)
from supabase_client import is_supabase_configured
from user_bookmarks_repository import create_user_bookmark, delete_user_bookmark, get_user_bookmark

from .emailer import (
    PublicAuthEmailError,
    is_public_auth_email_configured,
    send_public_account_verification_email,
    send_public_password_reset_email,
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
EMAIL_VERIFICATION_LIFETIME = timedelta(hours=24)
PASSWORD_RESET_LIFETIME = timedelta(hours=1)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_login_identifier(raw_value: Any) -> str:
    return str(raw_value or "").strip().lower()


def _is_safe_next_url(raw_value: Any) -> bool:
    target = str(raw_value or "").strip()
    if not target:
        return False
    parsed = urlsplit(target)
    return not parsed.scheme and not parsed.netloc and target.startswith("/")


def _resolve_safe_next_url(raw_value: Any, default_endpoint: str) -> str:
    if _is_safe_next_url(raw_value):
        return str(raw_value).strip()
    return url_for(default_endpoint)


def _resolve_next_url(default_endpoint: str) -> str:
    return _resolve_safe_next_url(request.values.get("next"), default_endpoint)


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(str(raw_token or "").encode("utf-8")).hexdigest()


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


def _validate_onboarding_payload(form, role_values: list[str]) -> dict[str, Any]:
    full_name = str(form.get("full_name") or "").strip()
    website_use_case = str(form.get("website_use_case") or "").strip()
    country_text = str(form.get("country_text") or "").strip()
    province_text = str(form.get("province_text") or "").strip()
    city_text = str(form.get("city_text") or "").strip()

    if len(full_name) < 3 or len(full_name) > 160:
        raise ValueError("Full name must be between 3 and 160 characters.")
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
    website_use_case = str(form.get("website_use_case") or "").strip()
    country_text = str(form.get("country_text") or "").strip()
    province_text = str(form.get("province_text") or "").strip()
    city_text = str(form.get("city_text") or "").strip()

    if len(full_name) < 3:
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
    def _render_auth_entry(*, default_view: str, next_url: str, page_title: str, status_message: str | None = None, error_message: str | None = None):
        return render_template(
            "AuthEntry.html",
            auth_page_title=page_title,
            auth_default_view=default_view,
            next_url=next_url,
            csrf_token=ensure_public_csrf_token(),
            auth_status_message=status_message,
            auth_error_message=error_message,
            public_auth_email_enabled=is_public_auth_email_configured(),
        )

    def _build_verify_url(raw_token: str, next_url: str) -> str:
        return url_for("public_verify_email", token=raw_token, next=next_url, _external=True)

    def _build_reset_url(raw_token: str, next_url: str) -> str:
        return url_for("public_reset_password", token=raw_token, next=next_url, _external=True)

    @app.route("/login", methods=["GET"])
    def public_login():
        current_user = get_current_public_user()
        next_url = _resolve_next_url("account_profile")
        if current_user:
            if not _user_completed_onboarding(current_user):
                return redirect(url_for("public_account_setup", next=next_url))
            return redirect(next_url)
        return _render_auth_entry(default_view="login", next_url=next_url, page_title="Sign In | Museo ng Libingan sa Ilalim ng Lupa")

    @app.route("/signup", methods=["GET"])
    def public_signup():
        current_user = get_current_public_user()
        next_url = _resolve_next_url("account_profile")
        if current_user:
            if not _user_completed_onboarding(current_user):
                return redirect(url_for("public_account_setup", next=next_url))
            return redirect(next_url)
        return _render_auth_entry(default_view="signup", next_url=next_url, page_title="Create Account | Museo ng Libingan sa Ilalim ng Lupa")

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
        if not user or not bool(user.get("is_active")):
            record_public_auth_failure("login", client_ip)
            return jsonify({"ok": False, "error": "Invalid credentials."}), 401

        stored_hash = str(user.get("password_hash") or "")
        if not stored_hash or not check_password_hash(stored_hash, password):
            record_public_auth_failure("login", client_ip)
            return jsonify({"ok": False, "error": "Invalid credentials."}), 401

        if not _user_is_verified(user):
            record_public_auth_failure("login", client_ip)
            return jsonify({"ok": False, "error": "Please verify your email before signing in.", "verification_required": True, "email": user.get("email")}), 403

        clear_public_auth_failures("login", client_ip)
        update_public_user(int(user.get("id")), {"last_login_at": _utcnow().isoformat()})
        set_public_user_session(int(user.get("id")))
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
            raw_token = secrets.token_urlsafe(32)
            now = _utcnow()
            payload.update(
                {
                    "email_verification_token_hash": _hash_token(raw_token),
                    "email_verification_expires_at": (now + EMAIL_VERIFICATION_LIFETIME).isoformat(),
                    "password_reset_token_hash": None,
                    "password_reset_expires_at": None,
                    "updated_at": now.isoformat(),
                }
            )
            created_user = create_public_user(payload)
            send_public_account_verification_email(to_email=email, verification_url=_build_verify_url(raw_token, next_url))
            clear_public_auth_failures("signup", client_ip)
            return jsonify({"ok": True, "email": email, "verify_pending": True, "user_id": created_user.get("id")})
        except ValueError as exc:
            record_public_auth_failure("signup", client_ip)
            return jsonify({"ok": False, "error": str(exc)}), 400
        except PublicAuthEmailError as exc:
            app.logger.exception("Failed to send account verification email: %s", exc)
            return jsonify({"ok": False, "error": str(exc)}), 500
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
            raw_token = secrets.token_urlsafe(32)
            update_public_user(
                int(user.get("id")),
                {
                    "email_verification_token_hash": _hash_token(raw_token),
                    "email_verification_expires_at": (_utcnow() + EMAIL_VERIFICATION_LIFETIME).isoformat(),
                    "updated_at": _utcnow().isoformat(),
                },
            )
            send_public_account_verification_email(to_email=email, verification_url=_build_verify_url(raw_token, next_url))
            return jsonify({"ok": True, "email": email, "verify_pending": True})
        except PublicAuthEmailError as exc:
            app.logger.exception("Failed to resend account verification email: %s", exc)
            return jsonify({"ok": False, "error": str(exc)}), 500
        except Exception as exc:
            app.logger.exception("Failed to resend account verification email for %s: %s", email, exc)
            return jsonify({"ok": False, "error": "Could not resend the verification email right now."}), 500

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
                    payload = _validate_onboarding_payload(request.form, role_values)
                    update_public_user(int(current_user.get("id")), payload)
                    return redirect(next_url)
                except ValueError as exc:
                    error_message = str(exc)
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

        email = _normalize_login_identifier(request.form.get("email"))
        if not EMAIL_PATTERN.match(email):
            return jsonify({"ok": False, "error": "Please provide a valid email address."}), 400

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
            return jsonify({"ok": False, "error": str(exc)}), 500
        except Exception as exc:
            app.logger.exception("Failed to start password reset for %s: %s", email, exc)
            return jsonify({"ok": False, "error": "Could not send the reset email right now."}), 500

    @app.route("/reset-password", methods=["GET", "POST"])
    def public_reset_password():
        next_url = _resolve_safe_next_url(request.values.get("next"), "index")
        raw_token = str(request.values.get("token") or "").strip()
        error_message = None
        success_message = None
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
                    if len(password) < 8 or len(password) > 128:
                        error_message = "Password must be between 8 and 128 characters."
                    elif password != confirm_password:
                        error_message = "Passwords do not match."
                    else:
                        try:
                            update_public_user(
                                int(token_user.get("id")),
                                {
                                    "password_hash": generate_password_hash(password),
                                    "password_reset_token_hash": None,
                                    "password_reset_expires_at": None,
                                    "updated_at": _utcnow().isoformat(),
                                },
                            )
                            success_message = "Your password has been updated. You can sign in now."
                        except Exception as exc:
                            app.logger.exception("Failed to reset password for user %s: %s", token_user.get("id"), exc)
                            error_message = "Could not reset your password right now."

        if success_message:
            return _render_auth_entry(default_view="login", next_url=next_url, page_title="Sign In | Museo ng Libingan sa Ilalim ng Lupa", status_message=success_message)

        return render_template(
            "ResetPassword.html",
            next_url=next_url,
            csrf_token=ensure_public_csrf_token(),
            token=raw_token,
            token_valid=token_valid,
            error_message=error_message,
        )

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
