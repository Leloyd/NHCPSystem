from __future__ import annotations

import math
import os
from datetime import datetime, timezone
from typing import Any

from flask import jsonify, redirect, render_template, request, session, url_for

from supabase_client import is_supabase_configured
from virtual_tour_repository import (
    create_hotspot,
    create_hotspots,
    create_scene,
    create_scenes,
    create_tour,
    delete_tour,
    delete_hotspot,
    delete_scene,
    get_hotspot,
    get_scene,
    get_tour,
    get_system_original,
    list_hotspots,
    list_scenes,
    publish_revision,
    update_hotspot,
    update_scene,
    update_tour,
)

from .service import (
    ORIGINAL_CAPTURED_ON,
    build_revision_config,
    discard_uploaded_assets,
    generate_narration,
    load_admin_tours,
    list_tour_asset_paths,
    prepare_upload,
    resolve_admin_asset_urls,
    slugify,
    validate_stored_asset,
)


STATUSES = {"draft", "active", "archived"}


def _json_error(message: str, status: int = 400):
    return jsonify({"ok": False, "error": str(message)}), status


def _admin_hotspot_with_asset_urls(hotspot: dict[str, Any]) -> dict[str, Any]:
    """Attach short-lived admin preview URLs without changing stored paths."""
    result = dict(hotspot or {})
    asset_fields = ("image_path", "glb_path", "audio_en_path", "audio_tl_path")
    paths = [result.get(field) for field in asset_fields]
    try:
        asset_urls = resolve_admin_asset_urls(paths)
    except Exception:
        asset_urls = {}
    for field in asset_fields:
        path = str(result.get(field) or "").strip()
        result[field.replace("_path", "_url")] = asset_urls.get(path, "")
    return result


def _number(value: Any, *, minimum: float, maximum: float, label: str, default: float | None = None) -> float:
    if value in (None, "") and default is not None:
        return default
    try:
        result = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{label} must be a number.") from exc
    if result < minimum or result > maximum:
        raise ValueError(f"{label} must be between {minimum:g} and {maximum:g}.")
    return round(result, 2)


def _normalize_yaw(value: Any, *, label: str, default: float | None = None) -> float | None:
    """Wrap an equivalent panorama heading into the database's -180..180 range."""
    if value in (None, ""):
        return default
    try:
        result = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{label} must be a number.") from exc
    if not math.isfinite(result):
        raise ValueError(f"{label} must be a finite number.")
    normalized = ((result + 180) % 360) - 180
    if normalized == -180 and result > 0:
        normalized = 180
    return round(normalized, 2)


def _clean_text(value: Any, *, label: str, minimum: int = 0, maximum: int = 5000) -> str:
    result = str(value or "").strip()
    if len(result) < minimum:
        raise ValueError(f"{label} must be at least {minimum} characters.")
    if len(result) > maximum:
        raise ValueError(f"{label} cannot exceed {maximum} characters.")
    return result


def _captured_on(value: Any) -> str:
    raw_value = str(value or "").strip()
    if not raw_value:
        raise ValueError("Date taken is required.")
    try:
        parsed = datetime.strptime(raw_value, "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValueError("Date taken must use YYYY-MM-DD format.") from exc
    if parsed > datetime.now(timezone.utc).date():
        raise ValueError("Date taken cannot be in the future.")
    return parsed.isoformat()


def register_virtual_tour_content_routes(
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

    def editable_tour(tour_id: int):
        tour = get_tour(tour_id)
        if not tour or not tour.get("draft_revision_id"):
            raise ValueError("The virtual-tour draft was not found.")
        return tour, int(tour["draft_revision_id"])

    @app.route(f"{admin_route_prefix}/virtual-tours")
    @admin_required
    def admin_virtual_tours():
        tours, config_error = load_admin_tours()
        notices = {
            "created": {"title": "Draft created", "message": "The tour environment was created as a draft."},
            "published": {"title": "Environment published", "message": "The selected revision is now active for public visitors."},
            "archived": {"title": "Environment archived", "message": "The tour environment was archived and removed from the public selector."},
            "activated": {"title": "Environment active", "message": "The archived environment is active and available to public visitors again."},
            "restored": {"title": "Draft restored", "message": "The unpublished environment was restored as a private draft."},
            "reverted": {"title": "Original restored", "message": "Original was restored to the packaged 40-scene baseline and its editable override was removed."},
        }
        status_code = str(request.args.get("status") or "")
        return render_template(
            "admin/AdminVirtualTours.html",
            csrf_token=ensure_admin_csrf_token(),
            admin_username=current_admin(), tours=tours, config_error=config_error,
            status_notice=notices.get(status_code),
        )

    @app.get(f"{admin_route_prefix}/virtual-tours/original/edit")
    @admin_required
    def admin_virtual_tour_original_edit():
        try:
            original = get_system_original() if is_supabase_configured() else None
            if original:
                return redirect(url_for("admin_virtual_tour_edit", tour_id=original["id"]))
        except Exception:
            original = None
        return render_template(
            "admin/AdminVirtualTourOriginalImport.html",
            csrf_token=ensure_admin_csrf_token(), admin_username=current_admin(),
            import_config={"csrfToken": ensure_admin_csrf_token(), "importUrl": f"{admin_route_prefix}/virtual-tours/original/import"},
        )

    @app.post(f"{admin_route_prefix}/virtual-tours/original/import")
    @admin_required
    def admin_virtual_tour_original_import():
        if not valid_json_csrf():
            return _json_error("Your admin session token expired. Refresh and try again.", 403)
        imported_tour = None
        try:
            if get_system_original():
                raise ValueError("The editable Original environment already exists.")
            data = request.get_json(silent=True) or {}
            source_scenes = data.get("scenes") if isinstance(data.get("scenes"), list) else []
            if not source_scenes or len(source_scenes) > 80:
                raise ValueError("The Original scene snapshot is missing or invalid.")
            tour = create_tour({
                "slug": "original", "title_en": "Original Museum Tour", "title_tl": "Orihinal na Tour ng Museo",
                "description_en": "The complete original museum and cemetery experience.",
                "description_tl": "Ang kumpletong orihinal na karanasan sa museo at libingan.",
                "status": "draft", "is_system_original": True,
            }, created_by=current_admin())
            imported_tour = tour
            revision_id = int(tour["draft_revision_id"])
            scene_payloads = []
            for index, source in enumerate(source_scenes):
                panorama = str(source.get("panorama") or "")
                if not panorama.startswith("/360VirtualTour/"):
                    raise ValueError("The Original snapshot contains an unexpected panorama path.")
                source_key = slugify(source.get("id"), f"scene-{index + 1}")
                scene_payloads.append({
                    "revision_id": revision_id, "scene_key": source_key,
                    "name_en": _clean_text(source.get("name") or source.get("id") or "Scene", label="Scene name", minimum=2, maximum=120),
                    "name_tl": "", "captured_on": _captured_on(source.get("capturedOn") or ORIGINAL_CAPTURED_ON),
                    "panorama_path": panorama, "panorama_width": 4096,
                    "panorama_height": 2048, "panorama_mime": "image/jpeg", "validation_status": "valid",
                    "initial_pitch": _number(source.get("pitch"), minimum=-90, maximum=90, label="Initial pitch", default=0),
                    "initial_yaw": _normalize_yaw(source.get("yaw"), label="Initial yaw", default=0),
                    "initial_hfov": _number(source.get("hfov"), minimum=30, maximum=150, label="Initial field of view", default=100),
                    "is_start_scene": str(source.get("id")) == str(data.get("startScene") or "frontGate"), "sort_order": index,
                })
            created_scenes = create_scenes(scene_payloads)
            created_by_key = {scene["scene_key"]: scene for scene in created_scenes}
            hotspot_order = 0
            hotspot_payloads = []
            allowed_asset_prefixes = ("/images/", "/AR-Artifacts/", "/360Hotspots/", "/audio/", "/static/")
            for source in source_scenes:
                scene = created_by_key.get(slugify(source.get("id"), "scene"))
                for hotspot in source.get("hotspots") or []:
                    kind = "navigation" if hotspot.get("type") == "navigation" else "item"
                    target = created_by_key.get(slugify(hotspot.get("targetScene"), "scene")) if kind == "navigation" else None
                    content = hotspot.get("content") if isinstance(hotspot.get("content"), dict) else {}
                    if kind == "navigation" and not target:
                        continue
                    def safe_asset(value):
                        value = str(value or "")
                        return value if value.startswith(allowed_asset_prefixes) else None
                    image_path = safe_asset(content.get("image"))
                    if kind == "item" and not image_path:
                        continue
                    name = hotspot.get("name") if isinstance(hotspot.get("name"), dict) else {}
                    subtitle = content.get("subtitle") if isinstance(content.get("subtitle"), dict) else {}
                    audio = content.get("audio") if isinstance(content.get("audio"), dict) else {}
                    nested = []
                    for detail in content.get("nested") or []:
                        if not isinstance(detail, dict) or len(nested) >= 30:
                            continue
                        detail_image = safe_asset(detail.get("image"))
                        if not detail_image:
                            continue
                        detail_title = detail.get("title") if isinstance(detail.get("title"), dict) else {}
                        detail_subtitle = detail.get("subtitle") if isinstance(detail.get("subtitle"), dict) else {}
                        detail_audio = detail.get("audio") if isinstance(detail.get("audio"), dict) else {}
                        nested.append({
                            "id": slugify(detail.get("id"), f"detail-{len(nested) + 1}"),
                            "x": _number(detail.get("x"), minimum=0, maximum=100, label="Nested hotspot X"),
                            "y": _number(detail.get("y"), minimum=0, maximum=100, label="Nested hotspot Y"),
                            "image": detail_image,
                            "title": {"en": _clean_text(detail_title.get("en"), label="Detail title", maximum=120), "tl": _clean_text(detail_title.get("tl"), label="Detail title", maximum=120)},
                            "subtitle": {"en": _clean_text(detail_subtitle.get("en"), label="Detail subtitle"), "tl": _clean_text(detail_subtitle.get("tl"), label="Detail subtitle")},
                            "audio": {"en": safe_asset(detail_audio.get("en")), "tl": safe_asset(detail_audio.get("tl"))},
                        })
                    hotspot_payloads.append({
                        "revision_id": revision_id, "scene_id": scene["id"], "hotspot_type": kind,
                        "name_en": _clean_text(name.get("en") or name.get("tl") or "Museum hotspot", label="Hotspot name", minimum=2, maximum=120),
                        "name_tl": _clean_text(name.get("tl"), label="Tagalog hotspot name", maximum=120),
                        "pitch": _number(hotspot.get("pitch"), minimum=-90, maximum=90, label="Pitch"),
                        "yaw": _normalize_yaw(hotspot.get("yaw"), label="Yaw"),
                        "target_scene_id": target["id"] if target else None,
                        "target_pitch": hotspot.get("targetPitch"),
                        "target_yaw": _normalize_yaw(hotspot.get("targetYaw"), label="Target yaw"),
                        "target_hfov": hotspot.get("targetHfov"),
                        "image_path": image_path, "glb_path": safe_asset(content.get("glb")),
                        "subtitle_en": _clean_text(subtitle.get("en"), label="English subtitle"),
                        "subtitle_tl": _clean_text(subtitle.get("tl"), label="Tagalog subtitle"),
                        "audio_en_path": safe_asset(audio.get("en")), "audio_tl_path": safe_asset(audio.get("tl")),
                        "nested_hotspots": nested,
                        "is_enabled": True, "sort_order": hotspot_order,
                    })
                    hotspot_order += 1
            create_hotspots(hotspot_payloads)
            return jsonify({"ok": True, "editorUrl": url_for("admin_virtual_tour_edit", tour_id=tour["id"])})
        except Exception as exc:
            if imported_tour and imported_tour.get("id"):
                try:
                    delete_tour(int(imported_tour["id"]))
                except Exception:
                    app.logger.exception("Could not roll back failed Original tour import.")
            app.logger.exception("Could not import Original virtual tour: %s", exc)
            return _json_error(str(exc))

    @app.post(f"{admin_route_prefix}/virtual-tours/original/revert")
    @admin_required
    def admin_virtual_tour_original_revert():
        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_virtual_tours"))
        original = get_system_original()
        if original:
            tour_id = int(original["id"])
            stored_paths = list_tour_asset_paths(tour_id)
            delete_tour(tour_id)
            try:
                for index in range(0, len(stored_paths), 12):
                    discard_uploaded_assets(stored_paths[index:index + 12], tour_id=tour_id)
            except Exception:
                app.logger.exception("Original was reverted, but some private uploaded assets could not be removed.")
        return redirect(url_for("admin_virtual_tours", status="reverted"))

    @app.route(f"{admin_route_prefix}/virtual-tours/new", methods=["GET", "POST"])
    @admin_required
    def admin_virtual_tour_new():
        if request.method == "GET":
            return render_template(
                "admin/AdminVirtualTourNew.html", csrf_token=ensure_admin_csrf_token(),
                admin_username=current_admin(), error_message=None, form_data={"status": "draft"},
            )
        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_virtual_tours"))
        form_data = dict(request.form)
        try:
            if not is_supabase_configured():
                raise ValueError("Supabase is not configured.")
            title_en = _clean_text(request.form.get("title_en"), label="English title", minimum=2, maximum=120)
            title_tl = _clean_text(request.form.get("title_tl"), label="Tagalog title", maximum=120)
            requested_slug = slugify(request.form.get("slug") or title_en)
            if requested_slug == "original":
                raise ValueError("The slug “original” is reserved for the protected Original tour.")
            tour = create_tour({
                "slug": requested_slug,
                "title_en": title_en, "title_tl": title_tl,
                "description_en": _clean_text(request.form.get("description_en"), label="English description", maximum=600),
                "description_tl": _clean_text(request.form.get("description_tl"), label="Tagalog description", maximum=600),
                "status": "draft", "is_system_original": False,
            }, created_by=current_admin())
            return redirect(url_for("admin_virtual_tour_edit", tour_id=tour["id"], status="created"))
        except Exception as exc:
            app.logger.exception("Could not create virtual tour: %s", exc)
            return render_template(
                "admin/AdminVirtualTourNew.html", csrf_token=ensure_admin_csrf_token(),
                admin_username=current_admin(), error_message=str(exc), form_data=form_data,
            ), 400

    @app.route(f"{admin_route_prefix}/virtual-tours/<int:tour_id>/edit")
    @admin_required
    def admin_virtual_tour_edit(tour_id: int):
        try:
            tour, revision_id = editable_tour(tour_id)
            editor_notices = {
                "created": {"title": "Draft ready", "message": "Your new environment is ready for scenes and hotspots."},
                "published": {"title": "Environment published", "message": "This revision is now available to public visitors. You can continue editing the new working revision here."},
            }
            scenes = list_scenes(revision_id)
            hotspots = list_hotspots(revision_id)
            asset_fields = ("image_path", "glb_path", "audio_en_path", "audio_tl_path")
            asset_paths = [scene.get("panorama_path") for scene in scenes]
            asset_paths.extend(hotspot.get(field) for hotspot in hotspots for field in asset_fields)
            asset_urls = resolve_admin_asset_urls(asset_paths)
            for scene in scenes:
                scene["panorama_url"] = asset_urls.get(str(scene.get("panorama_path") or "").strip(), "")
            for hotspot in hotspots:
                for field in asset_fields:
                    hotspot[field.replace("_path", "_url")] = asset_urls.get(str(hotspot.get(field) or "").strip(), "")
            return render_template(
                "admin/AdminVirtualTourEditor.html",
                csrf_token=ensure_admin_csrf_token(), admin_username=current_admin(),
                tour=tour, revision_id=revision_id, scenes=scenes, hotspots=hotspots,
                editor_config={
                    "tourId": tour_id, "revisionId": revision_id,
                    "csrfToken": ensure_admin_csrf_token(),
                    "supabaseUrl": str(os.getenv("SUPABASE_URL") or "").strip(),
                    "supabaseKey": str(os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or "").strip(),
                },
                error_message=str(request.args.get("error") or "").strip() or None,
                status_notice=editor_notices.get(str(request.args.get("status") or "")),
            )
        except Exception as exc:
            app.logger.exception("Could not load virtual-tour editor: %s", exc)
            return redirect(url_for("admin_virtual_tours"))

    @app.post(f"{admin_route_prefix}/virtual-tours/<int:tour_id>/metadata")
    @admin_required
    def admin_virtual_tour_metadata(tour_id: int):
        if not valid_json_csrf():
            return _json_error("Your admin session token expired. Refresh and try again.", 403)
        try:
            tour, _ = editable_tour(tour_id)
            data = request.get_json(silent=True) or {}
            title_en = _clean_text(data.get("title_en"), label="English title", minimum=2, maximum=120)
            payload = {
                "title_en": title_en,
                "title_tl": _clean_text(data.get("title_tl"), label="Tagalog title", maximum=120),
                "description_en": _clean_text(data.get("description_en"), label="English description", maximum=600),
                "description_tl": _clean_text(data.get("description_tl"), label="Tagalog description", maximum=600),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            if not tour.get("is_system_original"):
                requested_slug = slugify(data.get("slug") or title_en)
                if requested_slug == "original":
                    raise ValueError("The slug “original” is reserved for the protected Original tour.")
                payload["slug"] = requested_slug
            return jsonify({"ok": True, "tour": update_tour(tour_id, payload)})
        except Exception as exc:
            return _json_error(str(exc))

    @app.post(f"{admin_route_prefix}/virtual-tours/<int:tour_id>/uploads/sign")
    @admin_required
    def admin_virtual_tour_sign_upload(tour_id: int):
        if not valid_json_csrf():
            return _json_error("Your admin session token expired. Refresh and try again.", 403)
        try:
            editable_tour(tour_id)
            data = request.get_json(silent=True) or {}
            return jsonify({"ok": True, **prepare_upload(
                filename=data.get("filename"), asset_kind=str(data.get("kind") or ""),
                tour_id=tour_id, file_size=data.get("size"),
            )})
        except Exception as exc:
            return _json_error(str(exc))

    @app.post(f"{admin_route_prefix}/virtual-tours/<int:tour_id>/uploads/discard")
    @admin_required
    def admin_virtual_tour_discard_uploads(tour_id: int):
        if not valid_json_csrf():
            return _json_error("Your admin session token expired. Refresh and try again.", 403)
        try:
            editable_tour(tour_id)
            data = request.get_json(silent=True) or {}
            removed = discard_uploaded_assets(data.get("paths"), tour_id=tour_id)
            return jsonify({"ok": True, "removed": removed})
        except Exception as exc:
            app.logger.warning("Could not discard rejected virtual-tour uploads: %s", exc)
            return _json_error(str(exc))

    @app.post(f"{admin_route_prefix}/virtual-tours/<int:tour_id>/scenes")
    @admin_required
    def admin_virtual_tour_scene_create(tour_id: int):
        if not valid_json_csrf():
            return _json_error("Your admin session token expired. Refresh and try again.", 403)
        try:
            _, revision_id = editable_tour(tour_id)
            data = request.get_json(silent=True) or {}
            width, height = int(data.get("panorama_width") or 0), int(data.get("panorama_height") or 0)
            asset = validate_stored_asset(data.get("panorama_path"), "panorama", tour_id=tour_id, claimed_width=width, claimed_height=height)
            existing = list_scenes(revision_id)
            scene = create_scene({
                "revision_id": revision_id,
                "scene_key": slugify(data.get("scene_key") or data.get("name_en"), "scene"),
                "name_en": _clean_text(data.get("name_en"), label="Scene name", minimum=2, maximum=120),
                "name_tl": _clean_text(data.get("name_tl"), label="Tagalog scene name", maximum=120),
                "captured_on": _captured_on(data.get("captured_on")),
                "panorama_path": str(data.get("panorama_path") or ""),
                "panorama_width": asset["width"], "panorama_height": asset["height"],
                "panorama_mime": asset["mime"], "validation_status": "valid",
                "initial_pitch": _number(data.get("initial_pitch"), minimum=-90, maximum=90, label="Initial pitch", default=0),
                "initial_yaw": _number(data.get("initial_yaw"), minimum=-180, maximum=180, label="Initial yaw", default=0),
                "initial_hfov": _number(data.get("initial_hfov"), minimum=30, maximum=150, label="Initial field of view", default=100),
                "is_start_scene": bool(data.get("is_start_scene")) or not existing,
                "sort_order": len(existing),
            })
            from .service import _asset_url
            scene["panorama_url"] = _asset_url(scene["panorama_path"])
            return jsonify({"ok": True, "scene": scene})
        except Exception as exc:
            app.logger.warning("Scene upload validation failed: %s", exc)
            return _json_error(str(exc))

    @app.patch(f"{admin_route_prefix}/virtual-tours/<int:tour_id>/scenes/<int:scene_id>")
    @admin_required
    def admin_virtual_tour_scene_update(tour_id: int, scene_id: int):
        if not valid_json_csrf():
            return _json_error("Your admin session token expired. Refresh and try again.", 403)
        try:
            _, revision_id = editable_tour(tour_id)
            scene = get_scene(scene_id)
            if not scene or int(scene["revision_id"]) != revision_id:
                raise ValueError("Scene was not found in this draft.")
            data = request.get_json(silent=True) or {}
            allowed = {}
            if "name_en" in data:
                allowed["name_en"] = _clean_text(data["name_en"], label="Scene name", minimum=2, maximum=120)
            if "name_tl" in data:
                allowed["name_tl"] = _clean_text(data["name_tl"], label="Tagalog scene name", maximum=120)
            if "captured_on" in data:
                allowed["captured_on"] = _captured_on(data["captured_on"])
            for field, minimum, maximum, label in (
                ("initial_pitch", -90, 90, "Initial pitch"), ("initial_yaw", -180, 180, "Initial yaw"),
                ("initial_hfov", 30, 150, "Initial field of view"),
            ):
                if field in data:
                    allowed[field] = _number(data[field], minimum=minimum, maximum=maximum, label=label)
            if "is_start_scene" in data:
                allowed["is_start_scene"] = bool(data["is_start_scene"])
            if data.get("panorama_path"):
                width, height = int(data.get("panorama_width") or 0), int(data.get("panorama_height") or 0)
                asset = validate_stored_asset(data["panorama_path"], "panorama", tour_id=tour_id, claimed_width=width, claimed_height=height)
                allowed.update({
                    "panorama_path": str(data["panorama_path"]), "panorama_width": asset["width"],
                    "panorama_height": asset["height"], "panorama_mime": asset["mime"], "validation_status": "valid",
                })
            allowed["updated_at"] = datetime.now(timezone.utc).isoformat()
            return jsonify({"ok": True, "scene": update_scene(scene_id, allowed)})
        except Exception as exc:
            return _json_error(str(exc))

    @app.delete(f"{admin_route_prefix}/virtual-tours/<int:tour_id>/scenes/<int:scene_id>")
    @admin_required
    def admin_virtual_tour_scene_delete(tour_id: int, scene_id: int):
        if not valid_json_csrf():
            return _json_error("Your admin session token expired. Refresh and try again.", 403)
        try:
            _, revision_id = editable_tour(tour_id)
            scene = get_scene(scene_id)
            if not scene or int(scene["revision_id"]) != revision_id:
                raise ValueError("Scene was not found in this draft.")
            scenes = list_scenes(revision_id)
            if len(scenes) <= 1:
                raise ValueError("A tour must keep at least one scene. Upload its replacement first.")
            delete_scene(scene_id)
            remaining = list_scenes(revision_id)
            if scene.get("is_start_scene") and remaining:
                update_scene(int(remaining[0]["id"]), {"is_start_scene": True})
            return jsonify({"ok": True})
        except Exception as exc:
            return _json_error(str(exc))

    @app.post(f"{admin_route_prefix}/virtual-tours/<int:tour_id>/hotspots")
    @admin_required
    def admin_virtual_tour_hotspot_create(tour_id: int):
        if not valid_json_csrf():
            return _json_error("Your admin session token expired. Refresh and try again.", 403)
        try:
            _, revision_id = editable_tour(tour_id)
            data = request.get_json(silent=True) or {}
            scene = get_scene(int(data.get("scene_id") or 0))
            if not scene or int(scene["revision_id"]) != revision_id:
                raise ValueError("Choose a scene from this tour.")
            kind = str(data.get("hotspot_type") or "")
            if kind not in {"item", "navigation"}:
                raise ValueError("Choose an item or navigation hotspot.")
            subtitle_en = _clean_text(data.get("subtitle_en"), label="English subtitle", minimum=2 if kind == "item" else 0)
            subtitle_tl = _clean_text(data.get("subtitle_tl"), label="Tagalog subtitle", minimum=2 if kind == "item" else 0)
            if kind == "item" and not data.get("image_path"):
                raise ValueError("Upload an artifact image before saving the item hotspot.")
            target_id = int(data.get("target_scene_id") or 0) if kind == "navigation" else None
            if target_id:
                target = get_scene(target_id)
                if not target or int(target["revision_id"]) != revision_id or target_id == int(scene["id"]):
                    raise ValueError("Choose a different target scene from this tour.")
            if kind == "item" and data.get("image_path"):
                validate_stored_asset(data["image_path"], "image", tour_id=tour_id)
            if kind == "item" and data.get("glb_path"):
                validate_stored_asset(data["glb_path"], "glb", tour_id=tour_id)
            for field in ("audio_en_path", "audio_tl_path"):
                if kind == "item" and data.get(field):
                    validate_stored_asset(data[field], "audio", tour_id=tour_id)
            payload = {
                "revision_id": revision_id, "scene_id": int(scene["id"]), "hotspot_type": kind,
                "name_en": _clean_text(data.get("name_en"), label="Hotspot name", minimum=2, maximum=120),
                "name_tl": _clean_text(data.get("name_tl"), label="Tagalog hotspot name", maximum=120),
                "pitch": _number(data.get("pitch"), minimum=-90, maximum=90, label="Pitch"),
                "yaw": _number(data.get("yaw"), minimum=-180, maximum=180, label="Yaw"),
                "target_scene_id": target_id, "target_pitch": None, "target_yaw": None, "target_hfov": None,
                "image_path": str(data.get("image_path") or "") or None,
                "glb_path": str(data.get("glb_path") or "") or None,
                "subtitle_en": subtitle_en,
                "subtitle_tl": subtitle_tl,
                "audio_en_path": str(data.get("audio_en_path") or "") or None,
                "audio_tl_path": str(data.get("audio_tl_path") or "") or None,
                "is_enabled": True, "sort_order": len(list_hotspots(revision_id)),
            }
            created = create_hotspot(payload)
            return jsonify({"ok": True, "hotspot": _admin_hotspot_with_asset_urls(created)})
        except Exception as exc:
            return _json_error(str(exc))

    @app.patch(f"{admin_route_prefix}/virtual-tours/<int:tour_id>/hotspots/<int:hotspot_id>")
    @admin_required
    def admin_virtual_tour_hotspot_update(tour_id: int, hotspot_id: int):
        if not valid_json_csrf():
            return _json_error("Your admin session token expired. Refresh and try again.", 403)
        try:
            _, revision_id = editable_tour(tour_id)
            hotspot = get_hotspot(hotspot_id)
            if not hotspot or int(hotspot["revision_id"]) != revision_id:
                raise ValueError("Hotspot was not found in this draft.")
            data = request.get_json(silent=True) or {}
            allowed = {}
            for field in ("name_en", "name_tl"):
                if field in data:
                    allowed[field] = _clean_text(data[field], label="Hotspot name", minimum=2 if field == "name_en" else 0, maximum=120)
            for field in ("subtitle_en", "subtitle_tl"):
                if field in data:
                    allowed[field] = _clean_text(data[field], label="Subtitle", minimum=2 if hotspot["hotspot_type"] == "item" else 0)
            for field, minimum, maximum, label in (("pitch", -90, 90, "Pitch"), ("yaw", -180, 180, "Yaw")):
                if field in data:
                    allowed[field] = _number(data[field], minimum=minimum, maximum=maximum, label=label)
            if hotspot["hotspot_type"] == "navigation" and "target_scene_id" in data:
                target_id = int(data.get("target_scene_id") or 0)
                target = get_scene(target_id)
                scene = get_scene(int(hotspot["scene_id"]))
                if not target or not scene or int(target["revision_id"]) != revision_id or target_id == int(scene["id"]):
                    raise ValueError("Choose a different destination scene from this tour.")
                allowed["target_scene_id"] = target_id
            if hotspot["hotspot_type"] == "item":
                for field, kind in (("image_path", "image"), ("glb_path", "glb"), ("audio_en_path", "audio"), ("audio_tl_path", "audio")):
                    if field in data and data.get(field) and data.get(field) != hotspot.get(field):
                        validate_stored_asset(data[field], kind, tour_id=tour_id)
                        allowed[field] = str(data[field])
                if not (allowed.get("image_path") or hotspot.get("image_path")):
                    raise ValueError("Upload an artifact image before saving the item hotspot.")
            if "is_enabled" in data:
                allowed["is_enabled"] = bool(data["is_enabled"])
            allowed["updated_at"] = datetime.now(timezone.utc).isoformat()
            updated = update_hotspot(hotspot_id, allowed)
            return jsonify({"ok": True, "hotspot": _admin_hotspot_with_asset_urls(updated)})
        except Exception as exc:
            return _json_error(str(exc))

    @app.delete(f"{admin_route_prefix}/virtual-tours/<int:tour_id>/hotspots/<int:hotspot_id>")
    @admin_required
    def admin_virtual_tour_hotspot_delete(tour_id: int, hotspot_id: int):
        if not valid_json_csrf():
            return _json_error("Your admin session token expired. Refresh and try again.", 403)
        try:
            _, revision_id = editable_tour(tour_id)
            hotspot = get_hotspot(hotspot_id)
            if not hotspot or int(hotspot["revision_id"]) != revision_id:
                raise ValueError("Hotspot was not found in this draft.")
            delete_hotspot(hotspot_id)
            return jsonify({"ok": True})
        except Exception as exc:
            return _json_error(str(exc))

    @app.post(f"{admin_route_prefix}/virtual-tours/<int:tour_id>/hotspots/<int:hotspot_id>/tts")
    @admin_required
    def admin_virtual_tour_tts(tour_id: int, hotspot_id: int):
        if not valid_json_csrf():
            return _json_error("Your admin session token expired. Refresh and try again.", 403)
        try:
            _, revision_id = editable_tour(tour_id)
            hotspot = get_hotspot(hotspot_id)
            if not hotspot or int(hotspot["revision_id"]) != revision_id or hotspot["hotspot_type"] != "item":
                raise ValueError("Choose an item hotspot from this draft.")
            data = request.get_json(silent=True) or {}
            requested = data.get("languages")
            if isinstance(requested, list):
                languages = [language for language in ("en", "tl") if language in requested]
            else:
                languages = ["tl" if data.get("language") == "tl" else "en"]
            if not languages:
                raise ValueError("Choose English, Tagalog, or both languages.")

            generated: list[str] = []
            failures: dict[str, str] = {}
            updated = hotspot
            for language in languages:
                script = str(updated.get(f"subtitle_{language}") or "").strip()
                if not script:
                    failures[language] = f"Add the {'Tagalog' if language == 'tl' else 'English'} subtitle first."
                    continue
                try:
                    path, voice_id, model_id = generate_narration(
                        script, language=language, tour_id=tour_id, hotspot_id=hotspot_id
                    )
                    updated = update_hotspot(hotspot_id, {
                        f"audio_{language}_path": path, "tts_voice_id": voice_id,
                        "tts_model_id": model_id, "updated_at": datetime.now(timezone.utc).isoformat(),
                    })
                    generated.append(language)
                except Exception as exc:
                    failures[language] = str(exc)

            if not generated:
                raise ValueError(" ".join(failures.values()) or "Narration could not be generated.")
            updated = _admin_hotspot_with_asset_urls(updated)
            return jsonify({
                "ok": True, "hotspot": updated, "generated": generated,
                "failures": failures, "complete": not failures,
            })
        except Exception as exc:
            app.logger.warning("Narration generation failed: %s", exc)
            return _json_error(str(exc))

    @app.post(f"{admin_route_prefix}/virtual-tours/<int:tour_id>/publish")
    @admin_required
    def admin_virtual_tour_publish(tour_id: int):
        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_virtual_tours"))
        try:
            tour, revision_id = editable_tour(tour_id)
            scenes = list_scenes(revision_id)
            if not scenes:
                raise ValueError("Upload at least one panorama before publishing.")
            if sum(1 for scene in scenes if scene.get("is_start_scene")) != 1:
                raise ValueError("Choose exactly one starting scene before publishing.")
            if any(scene.get("validation_status") != "valid" for scene in scenes):
                raise ValueError("Every panorama must pass validation before publishing.")
            publish_revision(tour, created_by=current_admin())
            return redirect(url_for("admin_virtual_tour_edit", tour_id=tour_id, status="published"))
        except Exception as exc:
            app.logger.exception("Could not publish virtual tour: %s", exc)
            return redirect(url_for("admin_virtual_tour_edit", tour_id=tour_id, error=str(exc)))

    @app.post(f"{admin_route_prefix}/virtual-tours/<int:tour_id>/archive")
    @admin_required
    def admin_virtual_tour_archive(tour_id: int):
        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_virtual_tours"))
        tour = get_tour(tour_id)
        if tour and not tour.get("is_system_original"):
            update_tour(tour_id, {"status": "archived", "updated_at": datetime.now(timezone.utc).isoformat()})
        return redirect(url_for("admin_virtual_tours", status="archived"))

    @app.post(f"{admin_route_prefix}/virtual-tours/<int:tour_id>/restore")
    @admin_required
    def admin_virtual_tour_restore(tour_id: int):
        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_virtual_tours"))
        tour = get_tour(tour_id)
        if tour and not tour.get("is_system_original") and tour.get("status") == "archived":
            next_status = "active" if tour.get("published_revision_id") else "draft"
            update_tour(tour_id, {"status": next_status, "updated_at": datetime.now(timezone.utc).isoformat()})
            return redirect(url_for("admin_virtual_tours", status="activated" if next_status == "active" else "restored"))
        return redirect(url_for("admin_virtual_tours"))

    @app.get("/api/virtual-tours/<slug>/config")
    def public_virtual_tour_config(slug: str):
        from .service import build_public_tour_config
        config = build_public_tour_config(slugify(slug))
        if not config:
            return _json_error("Published tour environment was not found.", 404)
        return jsonify({"ok": True, "config": config})
