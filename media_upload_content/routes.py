from __future__ import annotations

from flask import jsonify, request

from .service import discard_direct_uploads, get_direct_upload_browser_config, prepare_direct_upload


def register_media_upload_routes(
    app,
    *,
    admin_route_prefix: str,
    admin_required,
    is_admin_csrf_valid,
    is_public_csrf_valid,
    get_current_public_user,
    consume_public_action_rate_limit,
):
    def csrf_token() -> str:
        return str(request.headers.get("X-CSRF-Token") or "").strip()

    def error_response(exc: Exception, status: int = 400):
        return jsonify({"ok": False, "error": str(exc)}), status

    @app.post(f"{admin_route_prefix}/media-uploads/sign")
    @admin_required
    def admin_media_upload_sign():
        if not is_admin_csrf_valid(csrf_token()):
            return error_response(ValueError("Your admin session expired. Refresh the page and try again."), 403)
        try:
            data = request.get_json(silent=True) or {}
            signed = prepare_direct_upload(
                filename=data.get("filename"),
                purpose=data.get("purpose"),
                file_size=data.get("size"),
                audience="admin",
            )
            return jsonify({"ok": True, **get_direct_upload_browser_config(), **signed})
        except RuntimeError as exc:
            app.logger.error("Admin direct upload configuration error: %s", exc)
            return error_response(exc, 503)
        except Exception as exc:
            return error_response(exc)

    @app.post(f"{admin_route_prefix}/media-uploads/discard")
    @admin_required
    def admin_media_upload_discard():
        if not is_admin_csrf_valid(csrf_token()):
            return error_response(ValueError("Your admin session expired. Refresh the page and try again."), 403)
        try:
            data = request.get_json(silent=True) or {}
            removed = discard_direct_uploads(data.get("uploads"), audience="admin")
            return jsonify({"ok": True, "removed": removed})
        except Exception as exc:
            app.logger.warning("Could not discard an unfinished admin upload: %s", exc)
            return error_response(ValueError("The unfinished upload could not be cleaned up automatically."))

    @app.post("/media-uploads/sign")
    def public_media_upload_sign():
        current_user = get_current_public_user()
        if not current_user:
            return error_response(ValueError("Please sign in before uploading a file."), 401)
        if not is_public_csrf_valid(csrf_token()):
            return error_response(ValueError("Your session expired. Refresh the page and try again."), 403)
        retry_after = consume_public_action_rate_limit("media-upload-sign")
        if retry_after:
            return error_response(
                ValueError(f"Too many upload attempts. Try again in {retry_after} seconds."), 429
            )
        try:
            data = request.get_json(silent=True) or {}
            signed = prepare_direct_upload(
                filename=data.get("filename"),
                purpose=data.get("purpose"),
                file_size=data.get("size"),
                audience="public",
                owner_id=current_user.get("id"),
            )
            return jsonify({"ok": True, **get_direct_upload_browser_config(), **signed})
        except RuntimeError as exc:
            app.logger.error("Public direct upload configuration error: %s", exc)
            return error_response(exc, 503)
        except Exception as exc:
            return error_response(exc)

    @app.post("/media-uploads/discard")
    def public_media_upload_discard():
        current_user = get_current_public_user()
        if not current_user:
            return error_response(ValueError("Please sign in before managing an upload."), 401)
        if not is_public_csrf_valid(csrf_token()):
            return error_response(ValueError("Your session expired. Refresh the page and try again."), 403)
        try:
            data = request.get_json(silent=True) or {}
            removed = discard_direct_uploads(
                data.get("uploads"), audience="public", owner_id=current_user.get("id")
            )
            return jsonify({"ok": True, "removed": removed})
        except Exception as exc:
            app.logger.warning("Could not discard an unfinished public upload: %s", exc)
            return error_response(ValueError("The unfinished upload could not be cleaned up automatically."))
