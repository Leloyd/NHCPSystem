from __future__ import annotations

import hmac
import secrets
import time
from typing import Callable

from flask import make_response, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from admin_users_repository import get_active_admin_user_by_id

from .emailer import (
    AdminPasswordRecoveryEmailError,
    is_admin_password_recovery_email_configured,
    send_admin_password_changed_email,
    send_admin_password_reset_email,
)
from .repository import consume_reset_token, get_valid_reset_token, issue_reset_token
from .security import build_reset_url, secret_digest, token_digest, trusted_base_url


GENERIC_REQUEST_MESSAGE = (
    "If an active administrator account matches that email, a password reset link has been sent."
)
MINIMUM_REQUEST_SECONDS = 0.55
RESET_TOKEN_BYTES = 48
RESET_TOKEN_MAX_LENGTH = 256
RESET_SESSION_KEY = "admin_password_reset_token_hash"


def _pad_response(started_at: float) -> None:
    remaining = MINIMUM_REQUEST_SECONDS - (time.monotonic() - started_at)
    if remaining > 0:
        time.sleep(remaining)


def _secure_response(response_or_html, status_code: int | None = None):
    # Preserve an existing redirect response's 3xx status. Supplying 200 here
    # would display Flask's fallback “Redirecting…” document without actually
    # navigating to the token-free reset form.
    response = (
        make_response(response_or_html)
        if status_code is None
        else make_response(response_or_html, status_code)
    )
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Robots-Tag"] = "noindex, nofollow, noarchive"
    return response


def register_admin_password_recovery_routes(
    app,
    *,
    admin_route_prefix: str,
    ensure_admin_csrf_token: Callable[[], str],
    is_admin_csrf_valid: Callable[[str], bool],
    normalize_admin_email: Callable[[str], str],
    is_valid_admin_email: Callable[[str], bool],
    validate_new_admin_password: Callable[[str, str], str | None],
    get_client_ip: Callable[[], str],
    secret_key: str,
    is_production: bool,
):
    forgot_path = f"{admin_route_prefix}/forgot-password"
    reset_path = f"{admin_route_prefix}/reset-password"

    @app.route(forgot_path, methods=["GET", "POST"])
    def admin_forgot_password():
        error_message = None
        success_message = None
        status_code = 200
        submitted_email = ""

        if request.method == "POST":
            started_at = time.monotonic()
            if not is_admin_csrf_valid(request.form.get("csrf_token")):
                error_message = "The security token is invalid or expired. Reload the page and try again."
                status_code = 400
            else:
                submitted_email = normalize_admin_email(request.form.get("email", ""))
                if not is_valid_admin_email(submitted_email):
                    error_message = "Enter a valid administrator email address."
                    status_code = 400
                else:
                    try:
                        if not is_admin_password_recovery_email_configured():
                            raise AdminPasswordRecoveryEmailError("Secure SMTP delivery is not configured.")
                        base_url = trusted_base_url(is_production=is_production)
                        raw_token = secrets.token_urlsafe(RESET_TOKEN_BYTES)
                        issued = issue_reset_token(
                            email=submitted_email,
                            email_hash=secret_digest(secret_key, "email", submitted_email),
                            request_ip_hash=secret_digest(secret_key, "ip", get_client_ip()),
                            token_hash=token_digest(raw_token),
                        )
                        if issued:
                            send_admin_password_reset_email(
                                to_email=submitted_email,
                                reset_url=build_reset_url(base_url, reset_path, raw_token),
                                expires_minutes=30,
                            )
                    except Exception as exc:  # noqa: BLE001 - public response must not disclose account or delivery state
                        app.logger.warning("Administrator password recovery request was handled without disclosure: %s", exc)
                    success_message = GENERIC_REQUEST_MESSAGE
                    submitted_email = ""
            _pad_response(started_at)

        return _secure_response(
            render_template(
                "admin/AdminForgotPassword.html",
                csrf_token=ensure_admin_csrf_token(),
                error_message=error_message,
                success_message=success_message,
                submitted_email=submitted_email,
            ),
            status_code,
        )

    @app.route(reset_path, methods=["GET", "POST"])
    def admin_reset_password():
        raw_token = str(request.args.get("token") or "").strip() if request.method == "GET" else ""
        if raw_token:
            session.pop(RESET_SESSION_KEY, None)
            if len(raw_token) <= RESET_TOKEN_MAX_LENGTH:
                candidate_hash = token_digest(raw_token)
                try:
                    candidate_row = get_valid_reset_token(candidate_hash)
                    candidate_user = (
                        get_active_admin_user_by_id(int(candidate_row["admin_user_id"]))
                        if candidate_row
                        else None
                    )
                except Exception as exc:  # noqa: BLE001
                    candidate_row = None
                    candidate_user = None
                    app.logger.warning("Administrator password reset link validation failed safely: %s", exc)
                if candidate_row and candidate_user:
                    # Keep only the digest in the signed, HttpOnly session, then
                    # immediately remove the raw token from the browser address.
                    session[RESET_SESSION_KEY] = candidate_hash
                    return _secure_response(redirect(url_for("admin_reset_password"), code=303))

        token_hash = str(session.get(RESET_SESSION_KEY) or "").strip()
        token_row = None
        admin_user = None
        error_message = None
        status_code = 200

        if token_hash:
            try:
                token_row = get_valid_reset_token(token_hash)
                if token_row:
                    admin_user = get_active_admin_user_by_id(int(token_row["admin_user_id"]))
            except Exception as exc:  # noqa: BLE001
                app.logger.warning("Administrator password reset token validation failed safely: %s", exc)

        token_valid = bool(token_row and admin_user)
        if not token_valid:
            session.pop(RESET_SESSION_KEY, None)
            error_message = "That administrator password reset link is invalid, expired, or already used."

        if request.method == "POST" and token_valid:
            if not is_admin_csrf_valid(request.form.get("csrf_token")):
                error_message = "The security token is invalid or expired. Reload the page and try again."
                status_code = 400
            else:
                password = str(request.form.get("password") or "")
                confirmation = str(request.form.get("confirm_password") or "")
                admin_email = normalize_admin_email(admin_user.get("email", ""))
                error_message = validate_new_admin_password(password, admin_email)
                if not error_message and not hmac.compare_digest(password, confirmation):
                    error_message = "The new password and confirmation do not match."
                if not error_message:
                    try:
                        if check_password_hash(str(admin_user.get("password_hash") or ""), password):
                            error_message = "Choose a password that is different from the current password."
                    except (TypeError, ValueError):
                        pass

                if error_message:
                    status_code = 400
                else:
                    try:
                        consumed = consume_reset_token(
                            token_hash=token_hash,
                            password_hash=generate_password_hash(password),
                        )
                        if not consumed:
                            raise ValueError("The reset token could not be consumed.")
                    except Exception as exc:  # noqa: BLE001
                        app.logger.warning("Administrator password reset failed safely: %s", exc)
                        token_valid = False
                        status_code = 400
                        error_message = "That administrator password reset link is invalid, expired, or already used."
                    else:
                        session.clear()
                        try:
                            send_admin_password_changed_email(to_email=admin_email)
                        except Exception as exc:  # noqa: BLE001 - password change has already completed
                            app.logger.warning("Administrator password changed confirmation could not be delivered: %s", exc)
                        response = redirect(url_for("admin_login", password_reset="1"), code=303)
                        return _secure_response(response)

        return _secure_response(
            render_template(
                "admin/AdminResetPassword.html",
                csrf_token=ensure_admin_csrf_token(),
                error_message=error_message,
                token_valid=token_valid,
            ),
            status_code,
        )

    return admin_forgot_password, admin_reset_password
