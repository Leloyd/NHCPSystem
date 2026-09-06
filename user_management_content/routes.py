from __future__ import annotations

from datetime import datetime, timezone

from flask import jsonify, redirect, render_template, request, session, url_for

from public_users_repository import update_public_user
from supabase_client import is_supabase_configured

from .service import (
    filter_public_users,
    get_public_user_status_message,
    load_admin_public_user,
    load_admin_public_users,
)


VALID_STATUS_FILTERS = {"all", "active", "deactivated"}
VALID_ACCOUNT_ACTIONS = {"activate", "deactivate"}
CLIENT_USER_FIELDS = (
    "id",
    "display_name",
    "username",
    "is_active",
    "status_label",
    "email",
    "has_current_terms",
    "terms_label",
    "terms_version_display",
    "display_terms_accepted_at",
    "roles_display",
    "use_case_display",
    "location_display",
    "auth_provider_label",
    "verified_label",
    "display_verified_at",
    "onboarding_label",
    "display_created",
    "display_last_login",
    "display_updated",
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def register_user_management_routes(
    app,
    *,
    admin_route_prefix: str,
    admin_required,
    ensure_admin_csrf_token,
    is_admin_csrf_valid,
    admin_session_user_key: str,
    admin_username: str,
):
    def _render_user_detail(user, *, error_message: str | None = None):
        csrf_token = ensure_admin_csrf_token()
        current_admin_username = session.get(admin_session_user_key, admin_username)
        return render_template(
            "admin/AdminUserDetail.html",
            csrf_token=csrf_token,
            admin_username=current_admin_username,
            user=user,
            error_message=error_message,
        )

    @app.route(f"{admin_route_prefix}/users")
    @admin_required
    def admin_users():
        csrf_token = ensure_admin_csrf_token()
        current_admin_username = session.get(admin_session_user_key, admin_username)

        search_query = str(request.args.get("q") or "").strip()[:128]
        status_filter = str(request.args.get("filter") or "all").strip().lower()
        if status_filter not in VALID_STATUS_FILTERS:
            status_filter = "all"

        all_users = load_admin_public_users()
        total_count = len(all_users)
        active_count = sum(1 for user in all_users if user.get("is_active"))
        deactivated_count = total_count - active_count

        visible_users = filter_public_users(all_users, search=search_query, status=status_filter)
        visible_user_ids = {
            int(user.get("id"))
            for user in visible_users
            if user.get("id") is not None
        }
        client_users = [
            {field: user.get(field) for field in CLIENT_USER_FIELDS}
            for user in all_users
        ]

        status_message = get_public_user_status_message(request.args.get("status"))
        config_error = None if is_supabase_configured() else "Supabase user accounts integration is not configured."
        return render_template(
            "admin/AdminUsers.html",
            csrf_token=csrf_token,
            admin_username=current_admin_username,
            users=all_users,
            client_users=client_users,
            visible_user_ids=visible_user_ids,
            total_count=total_count,
            active_count=active_count,
            deactivated_count=deactivated_count,
            search_query=search_query,
            status_filter=status_filter,
            status_message=status_message,
            config_error=config_error,
        )

    @app.route(f"{admin_route_prefix}/users/<int:user_id>", methods=["GET", "POST"])
    @admin_required
    def admin_user_detail(user_id):
        user = load_admin_public_user(user_id)
        if user is None:
            if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                return jsonify({"ok": False, "error": "This account could not be found."}), 404
            return redirect(url_for("admin_users"))

        if request.method == "GET":
            return _render_user_detail(user)

        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                return jsonify({"ok": False, "error": "Invalid request."}), 400
            return redirect(url_for("admin_users"))

        account_action = str(request.form.get("account_action") or "").strip().lower()
        if account_action not in VALID_ACCOUNT_ACTIONS:
            if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                return jsonify({"ok": False, "error": "Please choose a valid account action."}), 400
            return _render_user_detail(user, error_message="Please choose a valid account action.")

        next_active = account_action == "activate"
        if bool(user.get("is_active")) == next_active:
            # Nothing to change — the account is already in the requested state.
            if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                return jsonify(
                    {
                        "ok": True,
                        "user_id": user_id,
                        "is_active": next_active,
                        "status_label": "Active" if next_active else "Deactivated",
                        "message": get_public_user_status_message("activated" if next_active else "deactivated"),
                    }
                )
            return redirect(url_for("admin_user_detail", user_id=user_id))

        try:
            update_public_user(
                user_id,
                {
                    "is_active": next_active,
                    "updated_at": _utcnow().isoformat(),
                },
            )
        except Exception as exc:  # noqa: BLE001
            app.logger.exception("Failed to update account status for user %s: %s", user_id, exc)
            if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                return jsonify({"ok": False, "error": "Could not update this account right now."}), 500
            return _render_user_detail(user, error_message="Could not update this account right now.")

        status_key = "activated" if next_active else "deactivated"
        if request.headers.get("X-Requested-With") == "XMLHttpRequest":
            return jsonify(
                {
                    "ok": True,
                    "user_id": user_id,
                    "is_active": next_active,
                    "status_label": "Active" if next_active else "Deactivated",
                    "message": get_public_user_status_message(status_key),
                }
            )

        return_filter = str(request.form.get("return_filter") or "all").strip().lower()
        if return_filter not in VALID_STATUS_FILTERS:
            return_filter = "all"
        return_query = str(request.form.get("return_q") or "").strip()[:128]

        return redirect(
            url_for(
                "admin_users",
                status=status_key,
                filter=return_filter,
                q=return_query,
            )
        )
