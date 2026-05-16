from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlsplit

from flask import jsonify, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from public_users_repository import (
    create_public_user,
    get_public_user_auth_by_email,
    get_public_user_auth_by_identifier,
    get_public_user_auth_by_username,
    update_public_user,
)
from supabase_client import is_supabase_configured
from user_bookmarks_repository import create_user_bookmark, delete_user_bookmark, get_user_bookmark

from .service import BOOKMARK_ITEM_TYPE_ONLINE_GALLERY, load_user_account_dashboard


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
USERNAME_PATTERN = re.compile(r"^[a-z0-9._-]{3,32}$")


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


def _resolve_next_url(default_endpoint: str) -> str:
    next_url = request.values.get("next")
    if _is_safe_next_url(next_url):
        return str(next_url)
    return url_for(default_endpoint)


def _validate_signup_payload(form) -> tuple[dict[str, Any], str]:
    full_name = str(form.get("full_name") or "").strip()
    email = _normalize_login_identifier(form.get("email"))
    username = _normalize_login_identifier(form.get("username"))
    password = str(form.get("password") or "")
    confirm_password = str(form.get("confirm_password") or "")
    phone_number = str(form.get("phone_number") or "").strip()
    organization = str(form.get("organization") or "").strip()

    if len(full_name) < 3 or len(full_name) > 160:
        raise ValueError("Full name must be between 3 and 160 characters.")
    if not EMAIL_PATTERN.match(email):
        raise ValueError("Please provide a valid email address.")
    if not USERNAME_PATTERN.match(username):
        raise ValueError("Username must be 3 to 32 characters using lowercase letters, numbers, dots, dashes, or underscores.")
    if len(password) < 8 or len(password) > 128:
        raise ValueError("Password must be between 8 and 128 characters.")
    if password != confirm_password:
        raise ValueError("Passwords do not match.")
    if len(phone_number) > 64:
        raise ValueError("Phone number must be 64 characters or fewer.")
    if len(organization) > 180:
        raise ValueError("Organization must be 180 characters or fewer.")
    if get_public_user_auth_by_email(email):
        raise ValueError("That email address is already registered.")
    if get_public_user_auth_by_username(username):
        raise ValueError("That username is already taken.")

    password_hash = generate_password_hash(password)
    return {
        "full_name": full_name,
        "email": email,
        "username": username,
        "password_hash": password_hash,
        "phone_number": phone_number,
        "organization": organization,
        "is_active": True,
    }, email


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
    @app.route("/login", methods=["GET", "POST"])
    def public_login():
        if get_current_public_user():
            return redirect(_resolve_next_url("account_profile"))

        error_message = None
        status_code = 200
        next_url = _resolve_next_url("account_profile")

        if request.method == "POST":
            if not is_supabase_configured():
                status_code = 503
                error_message = "Login is temporarily unavailable."
            elif not is_public_csrf_valid(request.form.get("csrf_token")):
                status_code = 400
                error_message = "Invalid request."
            else:
                client_ip = get_client_ip()
                is_limited, retry_after = is_public_auth_rate_limited("login", client_ip)
                if is_limited:
                    status_code = 429
                    error_message = f"Too many login attempts. Try again in {retry_after} seconds."
                else:
                    identifier = _normalize_login_identifier(request.form.get("identifier"))
                    password = str(request.form.get("password") or "")
                    if not identifier or not password or len(password) > 128:
                        status_code = 400
                        error_message = "Please enter a valid email or username and password."
                    else:
                        try:
                            user = get_public_user_auth_by_identifier(identifier)
                        except Exception:
                            user = None
                        if not user or not bool(user.get("is_active")):
                            record_public_auth_failure("login", client_ip)
                            status_code = 401
                            error_message = "Invalid credentials."
                        else:
                            stored_hash = str(user.get("password_hash") or "")
                            if not stored_hash or not check_password_hash(stored_hash, password):
                                record_public_auth_failure("login", client_ip)
                                status_code = 401
                                error_message = "Invalid credentials."
                            else:
                                clear_public_auth_failures("login", client_ip)
                                update_public_user(int(user.get("id")), {"last_login_at": _utcnow().isoformat()})
                                set_public_user_session(int(user.get("id")))
                                return redirect(next_url)

        csrf_token = ensure_public_csrf_token()
        return render_template(
            "Login.html",
            csrf_token=csrf_token,
            error_message=error_message,
            next_url=next_url,
        ), status_code

    @app.route("/signup", methods=["GET", "POST"])
    def public_signup():
        if get_current_public_user():
            return redirect(_resolve_next_url("account_profile"))

        error_message = None
        status_code = 200
        next_url = _resolve_next_url("account_profile")

        if request.method == "POST":
            if not is_supabase_configured():
                status_code = 503
                error_message = "Sign up is temporarily unavailable."
            elif not is_public_csrf_valid(request.form.get("csrf_token")):
                status_code = 400
                error_message = "Invalid request."
            else:
                client_ip = get_client_ip()
                is_limited, retry_after = is_public_auth_rate_limited("signup", client_ip)
                if is_limited:
                    status_code = 429
                    error_message = f"Too many sign up attempts. Try again in {retry_after} seconds."
                else:
                    try:
                        payload, _email = _validate_signup_payload(request.form)
                        created_user = create_public_user(payload)
                        clear_public_auth_failures("signup", client_ip)
                        set_public_user_session(int(created_user.get("id")))
                        return redirect(next_url)
                    except ValueError as exc:
                        record_public_auth_failure("signup", client_ip)
                        status_code = 400
                        error_message = str(exc)
                    except Exception as exc:
                        record_public_auth_failure("signup", client_ip)
                        app.logger.exception("Failed to create public user account: %s", exc)
                        status_code = 500
                        error_message = "Could not create your account right now."

        csrf_token = ensure_public_csrf_token()
        return render_template(
            "Signup.html",
            csrf_token=csrf_token,
            error_message=error_message,
            next_url=next_url,
        ), status_code

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
