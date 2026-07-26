from __future__ import annotations

from flask import redirect, render_template, request, session, url_for

from online_gallery_repository import create_online_gallery_item, update_online_gallery_item
from supabase_client import is_supabase_configured

from .service import (
    ONLINE_GALLERY_UPLOAD_DIR,
    build_online_gallery_form_state,
    get_online_gallery_status_message,
    load_admin_online_gallery_categories,
    load_admin_online_gallery_item,
    load_admin_online_gallery_items,
    render_admin_online_gallery_form,
)


CATEGORY_REQUIRES_LOCATION = {"mga-rehiyunal-na-kaugalian-regional-customs"}
CATEGORY_REQUIRES_YEAR = {"kasaysayan-history"}
ONLINE_GALLERY_MODEL_ALLOWED_EXTENSIONS = {".glb"}
ONLINE_GALLERY_MODEL_INVALID_TYPE_MESSAGE = "3D object must be a GLB file."
ONLINE_GALLERY_STATUSES = {"published", "draft", "archived"}


def _build_online_gallery_form_payload(form, files, *, current_item, categories, normalize_checkbox, save_uploaded_image, save_uploaded_file):
    title_en = str(form.get("title_en") or form.get("title") or "").strip()
    title_tl = str(form.get("title_tl") or form.get("title") or "").strip()
    year_label = str(form.get("year_label") or "").strip()
    category_id_text = str(form.get("category_id") or "").strip()
    location_en = str(form.get("location_en") or form.get("location") or "").strip()
    location_tl = str(form.get("location_tl") or form.get("location") or "").strip()
    short_caption_en = str(form.get("short_caption_en") or form.get("short_caption") or "").strip()
    short_caption_tl = str(form.get("short_caption_tl") or form.get("short_caption") or "").strip()
    full_description_en = str(form.get("full_description_en") or form.get("full_description") or "").strip()
    full_description_tl = str(form.get("full_description_tl") or form.get("full_description") or "").strip()

    if not categories:
        raise ValueError("No Online Gallery categories are available. Run online_gallery_tables.sql in Supabase first.")

    if len(title_en) < 3:
        raise ValueError("English title must be at least 3 characters.")
    if len(title_tl) < 3:
        raise ValueError("Tagalog title must be at least 3 characters.")
    if len(short_caption_en) < 12:
        raise ValueError("English short description must be at least 12 characters.")
    if len(short_caption_tl) < 12:
        raise ValueError("Tagalog short description must be at least 12 characters.")
    if len(full_description_en) < 24:
        raise ValueError("English full description must be at least 24 characters.")
    if len(full_description_tl) < 24:
        raise ValueError("Tagalog full description must be at least 24 characters.")

    categories_by_id = {str(category.get("id")): category for category in categories}
    selected_category = categories_by_id.get(category_id_text)
    if selected_category is None:
        raise ValueError("Please choose a valid category.")

    category_slug = str(selected_category.get("slug") or "").strip().lower()
    if category_slug in CATEGORY_REQUIRES_YEAR:
        if len(year_label) < 2:
            raise ValueError("Year must be at least 2 characters.")
    else:
        year_label = ""

    if category_slug in CATEGORY_REQUIRES_LOCATION:
        if len(location_en) < 2:
            raise ValueError("English location must be at least 2 characters.")
        if len(location_tl) < 2:
            raise ValueError("Tagalog location must be at least 2 characters.")
    else:
        location_en = ""
        location_tl = ""

    requested_status = str(form.get("status") or "").strip().lower()
    if requested_status not in ONLINE_GALLERY_STATUSES:
        requested_status = "published" if normalize_checkbox(form.get("is_published")) else "draft"

    payload = {
        "title": title_tl,
        "title_en": title_en,
        "title_tl": title_tl,
        "period": "",
        "year_label": year_label,
        "category_id": int(category_id_text),
        "source": "",
        "location": location_tl,
        "location_en": location_en,
        "location_tl": location_tl,
        "short_caption": short_caption_tl,
        "short_caption_en": short_caption_en,
        "short_caption_tl": short_caption_tl,
        "full_description": full_description_tl,
        "full_description_en": full_description_en,
        "full_description_tl": full_description_tl,
        "teaching_note": "",
        "tags": [],
        "status": requested_status,
        "is_published": requested_status == "published",
        "sort_order": 0,
    }

    uploaded_file = files.get("image_file")
    new_image_filename = save_uploaded_image(uploaded_file, title_en or title_tl, ONLINE_GALLERY_UPLOAD_DIR)
    if new_image_filename:
        payload["image_filename"] = new_image_filename
    elif current_item:
        payload["image_filename"] = current_item.get("image_filename")
    else:
        payload["image_filename"] = None

    uploaded_model_file = files.get("model_file")
    new_model_filename = save_uploaded_file(
        uploaded_model_file,
        title_en or title_tl,
        ONLINE_GALLERY_UPLOAD_DIR,
        ONLINE_GALLERY_MODEL_ALLOWED_EXTENSIONS,
        ONLINE_GALLERY_MODEL_INVALID_TYPE_MESSAGE,
    )
    if new_model_filename:
        payload["model_filename"] = new_model_filename
    elif current_item:
        payload["model_filename"] = current_item.get("model_filename")
    else:
        payload["model_filename"] = None

    if not payload.get("image_filename"):
        raise ValueError("Please upload a gallery image.")

    return payload, new_image_filename, new_model_filename


def register_online_gallery_content_routes(
    app,
    *,
    admin_route_prefix: str,
    admin_required,
    ensure_admin_csrf_token,
    is_admin_csrf_valid,
    admin_session_user_key: str,
    admin_username: str,
    normalize_checkbox,
    save_uploaded_image,
    save_uploaded_file,
    delete_local_image,
):
    @app.route(f"{admin_route_prefix}/online-gallery")
    @admin_required
    def admin_online_gallery():
        csrf_token = ensure_admin_csrf_token()
        current_admin_username = session.get(admin_session_user_key, admin_username)
        gallery_items = load_admin_online_gallery_items()
        status_filter = str(request.args.get("filter") or "all").strip().lower()
        if status_filter not in ONLINE_GALLERY_STATUSES | {"all"}:
            status_filter = "all"
        status_message = get_online_gallery_status_message(request.args.get("status"))
        config_error = None if is_supabase_configured() else "Supabase online gallery integration is not configured."
        return render_template(
            "admin/AdminOnlineGallery.html",
            csrf_token=csrf_token,
            admin_username=current_admin_username,
            gallery_items=gallery_items,
            status_filter=status_filter,
            status_message=status_message,
            config_error=config_error,
        )

    @app.route(f"{admin_route_prefix}/online-gallery/<int:item_id>")
    @admin_required
    def admin_online_gallery_view(item_id):
        gallery_item = load_admin_online_gallery_item(item_id)
        if gallery_item is None:
            return redirect(url_for("admin_online_gallery"))

        return render_template(
            "admin/AdminOnlineGalleryView.html",
            csrf_token=ensure_admin_csrf_token(),
            admin_username=session.get(admin_session_user_key, admin_username),
            gallery_item=gallery_item,
            status_message=get_online_gallery_status_message(request.args.get("status")),
        )

    @app.route(f"{admin_route_prefix}/online-gallery/new", methods=["GET", "POST"])
    @admin_required
    def admin_online_gallery_new():
        categories = load_admin_online_gallery_categories()
        if request.method == "GET":
            return render_admin_online_gallery_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Online Gallery Card",
                submit_label="Create Card",
                form_action=url_for("admin_online_gallery_new"),
                gallery_form=build_online_gallery_form_state({"status": "draft"}, categories=categories),
                categories=categories,
                error_message=None if categories else "No Online Gallery categories are available. Run online_gallery_tables.sql in Supabase first.",
            )

        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_online_gallery"))

        if not is_supabase_configured():
            return render_admin_online_gallery_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Online Gallery Card",
                submit_label="Create Card",
                form_action=url_for("admin_online_gallery_new"),
                gallery_form=build_online_gallery_form_state(request.form, categories=categories),
                categories=categories,
                error_message="Supabase online gallery integration is not configured.",
            )

        new_image_filename = None
        new_model_filename = None
        try:
            payload, new_image_filename, new_model_filename = _build_online_gallery_form_payload(
                request.form,
                request.files,
                current_item=None,
                categories=categories,
                normalize_checkbox=normalize_checkbox,
                save_uploaded_image=save_uploaded_image,
                save_uploaded_file=save_uploaded_file,
            )
            create_online_gallery_item(payload)
        except ValueError as exc:
            if new_image_filename:
                delete_local_image(new_image_filename, ONLINE_GALLERY_UPLOAD_DIR)
            if new_model_filename:
                delete_local_image(new_model_filename, ONLINE_GALLERY_UPLOAD_DIR)
            return render_admin_online_gallery_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Online Gallery Card",
                submit_label="Create Card",
                form_action=url_for("admin_online_gallery_new"),
                gallery_form=build_online_gallery_form_state(
                    dict(request.form),
                    categories=categories,
                ),
                categories=categories,
                error_message=str(exc),
            )
        except Exception as exc:
            if new_image_filename:
                delete_local_image(new_image_filename, ONLINE_GALLERY_UPLOAD_DIR)
            if new_model_filename:
                delete_local_image(new_model_filename, ONLINE_GALLERY_UPLOAD_DIR)
            app.logger.exception("Failed to create online gallery item: %s", exc)
            return render_admin_online_gallery_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Online Gallery Card",
                submit_label="Create Card",
                form_action=url_for("admin_online_gallery_new"),
                gallery_form=build_online_gallery_form_state(
                    dict(request.form),
                    categories=categories,
                ),
                categories=categories,
                error_message=f"Could not create the online gallery card right now. Details: {exc}",
            )

        return redirect(url_for("admin_online_gallery", status="created"))

    @app.route(f"{admin_route_prefix}/online-gallery/<int:item_id>/edit", methods=["GET", "POST"])
    @admin_required
    def admin_online_gallery_edit(item_id):
        current_item = load_admin_online_gallery_item(item_id)
        categories = load_admin_online_gallery_categories()
        if current_item is None:
            return redirect(url_for("admin_online_gallery"))

        if request.method == "GET":
            return render_admin_online_gallery_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Edit Online Gallery Card",
                submit_label="Save Changes",
                form_action=url_for("admin_online_gallery_edit", item_id=item_id),
                gallery_form=build_online_gallery_form_state(current_item, categories=categories),
                categories=categories,
                error_message=None if categories else "No Online Gallery categories are available. Run online_gallery_tables.sql in Supabase first.",
            )

        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_online_gallery"))

        new_image_filename = None
        new_model_filename = None
        previous_image_filename = current_item.get("image_filename")
        previous_model_filename = current_item.get("model_filename")
        try:
            payload, new_image_filename, new_model_filename = _build_online_gallery_form_payload(
                request.form,
                request.files,
                current_item=current_item,
                categories=categories,
                normalize_checkbox=normalize_checkbox,
                save_uploaded_image=save_uploaded_image,
                save_uploaded_file=save_uploaded_file,
            )
            update_online_gallery_item(item_id, payload)
            if new_image_filename and previous_image_filename and previous_image_filename != new_image_filename:
                delete_local_image(previous_image_filename, ONLINE_GALLERY_UPLOAD_DIR)
            if new_model_filename and previous_model_filename and previous_model_filename != new_model_filename:
                delete_local_image(previous_model_filename, ONLINE_GALLERY_UPLOAD_DIR)
        except ValueError as exc:
            if new_image_filename:
                delete_local_image(new_image_filename, ONLINE_GALLERY_UPLOAD_DIR)
            if new_model_filename:
                delete_local_image(new_model_filename, ONLINE_GALLERY_UPLOAD_DIR)
            return render_admin_online_gallery_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Edit Online Gallery Card",
                submit_label="Save Changes",
                form_action=url_for("admin_online_gallery_edit", item_id=item_id),
                gallery_form=build_online_gallery_form_state(
                    {**current_item, **request.form},
                    categories=categories,
                ),
                categories=categories,
                error_message=str(exc),
            )
        except Exception as exc:
            if new_image_filename:
                delete_local_image(new_image_filename, ONLINE_GALLERY_UPLOAD_DIR)
            if new_model_filename:
                delete_local_image(new_model_filename, ONLINE_GALLERY_UPLOAD_DIR)
            app.logger.exception("Failed to update online gallery item %s: %s", item_id, exc)
            return render_admin_online_gallery_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Edit Online Gallery Card",
                submit_label="Save Changes",
                form_action=url_for("admin_online_gallery_edit", item_id=item_id),
                gallery_form=build_online_gallery_form_state(
                    {**current_item, **request.form},
                    categories=categories,
                ),
                categories=categories,
                error_message=f"Could not update the online gallery card right now. Details: {exc}",
            )

        return redirect(url_for("admin_online_gallery", status="updated"))

    @app.route(f"{admin_route_prefix}/online-gallery/<int:item_id>/status", methods=["POST"])
    @admin_required
    def admin_online_gallery_status(item_id):
        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_online_gallery"))

        current_item = load_admin_online_gallery_item(item_id)
        if current_item is None:
            return redirect(url_for("admin_online_gallery"))

        current_status = str(current_item.get("status") or "").strip().lower()
        status_action = str(request.form.get("status_action") or "").strip().lower()
        transitions = {
            "publish": {
                "from": "draft",
                "payload": {"status": "published", "is_published": True},
                "result": "published",
            },
            "restore": {
                "from": "archived",
                "payload": {"status": "draft", "is_published": False},
                "result": "restored",
            },
        }
        transition = transitions.get(status_action)
        if transition is None or current_status != transition["from"]:
            return redirect(url_for("admin_online_gallery"))

        try:
            update_online_gallery_item(item_id, transition["payload"])
        except Exception as exc:
            app.logger.exception(
                "Failed to apply '%s' status action to online gallery item %s: %s",
                status_action,
                item_id,
                exc,
            )
            return redirect(url_for("admin_online_gallery"))

        if request.form.get("return_to") == "view":
            return redirect(
                url_for(
                    "admin_online_gallery_view",
                    item_id=item_id,
                    status=transition["result"],
                )
            )

        return redirect(
            url_for(
                "admin_online_gallery",
                filter=str(request.form.get("return_filter") or "all").strip().lower(),
                status=transition["result"],
            )
        )

    @app.route(f"{admin_route_prefix}/online-gallery/<int:item_id>/delete", methods=["POST"])
    @admin_required
    def admin_online_gallery_delete(item_id):
        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_online_gallery"))

        current_item = load_admin_online_gallery_item(item_id)
        if current_item is None:
            return redirect(url_for("admin_online_gallery"))
        if str(current_item.get("status") or "").strip().lower() == "archived":
            return redirect(url_for("admin_online_gallery", filter="archived"))

        try:
            update_online_gallery_item(item_id, {"status": "archived", "is_published": False})
        except Exception as exc:
            app.logger.exception("Failed to archive online gallery item %s: %s", item_id, exc)
            return redirect(url_for("admin_online_gallery"))

        if request.form.get("return_to") == "view":
            return redirect(url_for("admin_online_gallery_view", item_id=item_id, status="archived"))
        return redirect(
            url_for(
                "admin_online_gallery",
                filter=str(request.form.get("return_filter") or "all").strip().lower(),
                status="archived",
            )
        )
