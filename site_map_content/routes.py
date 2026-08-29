from __future__ import annotations

import os
from typing import Any

from flask import jsonify, redirect, render_template, request, session, url_for

from site_map_repository import (
    create_site_map,
    delete_site_map,
    get_revision,
    get_site_map,
    publish_site_map,
    update_revision_config,
)
from supabase_client import get_supabase_client, is_supabase_configured
from virtual_tour_content.service import get_virtual_tour_bucket_name

from .service import (
    config_with_urls,
    discard_uploads,
    list_asset_paths,
    packaged_original_config,
    prepare_upload,
    upgrade_coordinate_system,
    validate_config,
)


def _json_error(message: Any, status: int = 400):
    return jsonify({"ok": False, "error": str(message)}), status


def register_site_map_content_routes(
    app,
    *,
    admin_route_prefix: str,
    admin_required,
    ensure_admin_csrf_token,
    is_admin_csrf_valid,
    admin_session_user_key: str,
    admin_username: str,
):
    def current_admin() -> str:
        return str(session.get(admin_session_user_key) or admin_username)

    def valid_json_csrf() -> bool:
        return is_admin_csrf_valid(request.headers.get("X-CSRF-Token"))

    def editable_map() -> tuple[dict[str, Any], int]:
        site_map = get_site_map()
        revision_id = int((site_map or {}).get("draft_revision_id") or 0)
        if not site_map or not revision_id:
            raise ValueError("Customize the protected Original before editing it.")
        return site_map, revision_id

    @app.get(f"{admin_route_prefix}/site-map")
    @admin_required
    def admin_site_map():
        csrf_token = ensure_admin_csrf_token()
        original = packaged_original_config()
        site_map = None
        revision = None
        config_error = None
        if not is_supabase_configured():
            config_error = "Supabase is not configured. The protected file-based Original remains public, but updates cannot be saved."
        else:
            try:
                site_map = get_site_map()
                if site_map and site_map.get("draft_revision_id"):
                    revision = get_revision(int(site_map["draft_revision_id"]))
            except Exception as exc:
                config_error = f"Site Map tables are not ready. Run site_map_tables.sql in Supabase. Details: {exc}"
        config = revision.get("config") if revision and isinstance(revision.get("config"), dict) else original
        if revision:
            config, upgraded = upgrade_coordinate_system(config)
            if upgraded:
                revision = update_revision_config(int(revision["id"]), config)
        editor_config = config_with_urls(config)
        status_notices = {
            "customized": {"title": "Editable draft created", "message": "The protected Original was copied into a database draft. The public Site Map is unchanged until you publish."},
            "saved": {"title": "Draft saved", "message": "Your Site Map changes were saved to the working database revision."},
            "published": {"title": "Site Map published", "message": "Visitors now receive the published database revision. A new working draft is ready."},
            "reverted": {"title": "Original restored", "message": "The database override was removed. Visitors now receive the protected file-based Original."},
        }
        return render_template(
            "admin/AdminSiteMapEditor.html",
            csrf_token=csrf_token,
            admin_username=current_admin(),
            site_map=site_map,
            revision=revision,
            editor_data=editor_config,
            editor_config={
                "siteMapId": int(site_map["id"]) if site_map else None,
                "revisionId": int(revision["id"]) if revision else None,
                "readOnly": not bool(site_map and revision),
                "csrfToken": csrf_token,
                "supabaseUrl": str(os.getenv("SUPABASE_URL") or "").strip(),
                "supabaseKey": str(os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or "").strip(),
            },
            config_error=config_error,
            status_notice=status_notices.get(str(request.args.get("status") or "")),
        )

    @app.post(f"{admin_route_prefix}/site-map/customize")
    @admin_required
    def admin_site_map_customize():
        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_site_map"))
        try:
            if not is_supabase_configured():
                raise ValueError("Supabase is not configured.")
            existing = get_site_map()
            if not existing:
                create_site_map(packaged_original_config(), created_by=current_admin())
            return redirect(url_for("admin_site_map", status="customized"))
        except Exception as exc:
            app.logger.exception("Could not create the Site Map draft: %s", exc)
            return redirect(url_for("admin_site_map", error=str(exc)))

    @app.put(f"{admin_route_prefix}/site-map/config")
    @admin_required
    def admin_site_map_save():
        if not valid_json_csrf():
            return _json_error("Your admin session token expired. Refresh and try again.", 403)
        try:
            site_map, revision_id = editable_map()
            config = validate_config(request.get_json(silent=True) or {}, site_map_id=int(site_map["id"]))
            update_revision_config(revision_id, config)
            return jsonify({"ok": True, "config": config_with_urls(config)})
        except Exception as exc:
            app.logger.warning("Site Map draft validation failed: %s", exc)
            return _json_error(str(exc))

    @app.post(f"{admin_route_prefix}/site-map/publish")
    @admin_required
    def admin_site_map_publish():
        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_site_map"))
        try:
            site_map, _ = editable_map()
            publish_site_map(int(site_map["id"]), created_by=current_admin())
            return redirect(url_for("admin_site_map", status="published"))
        except Exception as exc:
            app.logger.exception("Could not publish the Site Map: %s", exc)
            return redirect(url_for("admin_site_map", error=str(exc)))

    @app.post(f"{admin_route_prefix}/site-map/revert")
    @admin_required
    def admin_site_map_revert():
        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_site_map"))
        try:
            site_map = get_site_map()
            if site_map:
                site_map_id = int(site_map["id"])
                paths = list_asset_paths(site_map_id)
                delete_site_map(site_map_id)
                if paths:
                    get_supabase_client().storage.from_(get_virtual_tour_bucket_name()).remove(paths)
            return redirect(url_for("admin_site_map", status="reverted"))
        except Exception as exc:
            app.logger.exception("Could not revert the Site Map: %s", exc)
            return redirect(url_for("admin_site_map", error=str(exc)))

    @app.post(f"{admin_route_prefix}/site-map/uploads/sign")
    @admin_required
    def admin_site_map_sign_upload():
        if not valid_json_csrf():
            return _json_error("Your admin session token expired. Refresh and try again.", 403)
        try:
            site_map, _ = editable_map()
            data = request.get_json(silent=True) or {}
            return jsonify({"ok": True, **prepare_upload(
                filename=data.get("filename"), kind=str(data.get("kind") or ""),
                site_map_id=int(site_map["id"]), file_size=data.get("size"),
            )})
        except Exception as exc:
            return _json_error(str(exc))

    @app.post(f"{admin_route_prefix}/site-map/uploads/discard")
    @admin_required
    def admin_site_map_discard_uploads():
        if not valid_json_csrf():
            return _json_error("Your admin session token expired. Refresh and try again.", 403)
        try:
            site_map, _ = editable_map()
            removed = discard_uploads((request.get_json(silent=True) or {}).get("paths"), site_map_id=int(site_map["id"]))
            return jsonify({"ok": True, "removed": removed})
        except Exception as exc:
            return _json_error(str(exc))
