from __future__ import annotations

from flask import redirect, render_template, request, session, url_for

from online_gallery_repository import create_online_gallery_item, delete_online_gallery_item, update_online_gallery_item
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


def _build_online_gallery_form_payload(form, files, *, current_item, categories, normalize_checkbox, save_uploaded_image):
    title = str(form.get("title") or "").strip()
    year_label = str(form.get("year_label") or "").strip()
    category_id_text = str(form.get("category_id") or "").strip()
    location = str(form.get("location") or "").strip()
    short_caption = str(form.get("short_caption") or "").strip()
    full_description = str(form.get("full_description") or "").strip()

    if not categories:
        raise ValueError("No Online Gallery categories are available. Run online_gallery_tables.sql in Supabase first.")

    if len(title) < 3:
        raise ValueError("Title must be at least 3 characters.")
    if len(short_caption) < 12:
        raise ValueError("Short caption must be at least 12 characters.")
    if len(full_description) < 24:
        raise ValueError("Full description must be at least 24 characters.")

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
        if len(location) < 2:
            raise ValueError("Location must be at least 2 characters.")
    else:
        location = ""

    payload = {
        "title": title,
        "period": "",
        "year_label": year_label,
        "category_id": int(category_id_text),
        "source": "",
        "location": location,
        "short_caption": short_caption,
        "full_description": full_description,
        "teaching_note": "",
        "tags": [],
        "is_published": normalize_checkbox(form.get("is_published")),
        "sort_order": 0,
    }

    uploaded_file = files.get("image_file")
    new_image_filename = save_uploaded_image(uploaded_file, title, ONLINE_GALLERY_UPLOAD_DIR)
    if new_image_filename:
        payload["image_filename"] = new_image_filename
    elif current_item:
        payload["image_filename"] = current_item.get("image_filename")
    else:
        payload["image_filename"] = None

    if not payload.get("image_filename"):
        raise ValueError("Please upload a gallery image.")

    return payload, new_image_filename


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
    delete_local_image,
):
    @app.route(f"{admin_route_prefix}/online-gallery")
    @admin_required
    def admin_online_gallery():
        csrf_token = ensure_admin_csrf_token()
        current_admin_username = session.get(admin_session_user_key, admin_username)
        gallery_items = load_admin_online_gallery_items()
        status_message = get_online_gallery_status_message(request.args.get("status"))
        config_error = None if is_supabase_configured() else "Supabase online gallery integration is not configured."
        return render_template(
            "admin/AdminOnlineGallery.html",
            csrf_token=csrf_token,
            admin_username=current_admin_username,
            gallery_items=gallery_items,
            status_message=status_message,
            config_error=config_error,
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
                gallery_form=build_online_gallery_form_state({"is_published": True}, categories=categories),
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
        try:
            payload, new_image_filename = _build_online_gallery_form_payload(
                request.form,
                request.files,
                current_item=None,
                categories=categories,
                normalize_checkbox=normalize_checkbox,
                save_uploaded_image=save_uploaded_image,
            )
            create_online_gallery_item(payload)
        except ValueError as exc:
            if new_image_filename:
                delete_local_image(new_image_filename, ONLINE_GALLERY_UPLOAD_DIR)
            return render_admin_online_gallery_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Online Gallery Card",
                submit_label="Create Card",
                form_action=url_for("admin_online_gallery_new"),
                gallery_form=build_online_gallery_form_state(
                    {**request.form, "is_published": normalize_checkbox(request.form.get("is_published"))},
                    categories=categories,
                ),
                categories=categories,
                error_message=str(exc),
            )
        except Exception as exc:
            if new_image_filename:
                delete_local_image(new_image_filename, ONLINE_GALLERY_UPLOAD_DIR)
            app.logger.exception("Failed to create online gallery item: %s", exc)
            return render_admin_online_gallery_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Online Gallery Card",
                submit_label="Create Card",
                form_action=url_for("admin_online_gallery_new"),
                gallery_form=build_online_gallery_form_state(
                    {**request.form, "is_published": normalize_checkbox(request.form.get("is_published"))},
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
        previous_image_filename = current_item.get("image_filename")
        try:
            payload, new_image_filename = _build_online_gallery_form_payload(
                request.form,
                request.files,
                current_item=current_item,
                categories=categories,
                normalize_checkbox=normalize_checkbox,
                save_uploaded_image=save_uploaded_image,
            )
            update_online_gallery_item(item_id, payload)
            if new_image_filename and previous_image_filename and previous_image_filename != new_image_filename:
                delete_local_image(previous_image_filename, ONLINE_GALLERY_UPLOAD_DIR)
        except ValueError as exc:
            if new_image_filename:
                delete_local_image(new_image_filename, ONLINE_GALLERY_UPLOAD_DIR)
            return render_admin_online_gallery_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Edit Online Gallery Card",
                submit_label="Save Changes",
                form_action=url_for("admin_online_gallery_edit", item_id=item_id),
                gallery_form=build_online_gallery_form_state(
                    {**current_item, **request.form, "is_published": normalize_checkbox(request.form.get("is_published"))},
                    categories=categories,
                ),
                categories=categories,
                error_message=str(exc),
            )
        except Exception as exc:
            if new_image_filename:
                delete_local_image(new_image_filename, ONLINE_GALLERY_UPLOAD_DIR)
            app.logger.exception("Failed to update online gallery item %s: %s", item_id, exc)
            return render_admin_online_gallery_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Edit Online Gallery Card",
                submit_label="Save Changes",
                form_action=url_for("admin_online_gallery_edit", item_id=item_id),
                gallery_form=build_online_gallery_form_state(
                    {**current_item, **request.form, "is_published": normalize_checkbox(request.form.get("is_published"))},
                    categories=categories,
                ),
                categories=categories,
                error_message=f"Could not update the online gallery card right now. Details: {exc}",
            )

        return redirect(url_for("admin_online_gallery", status="updated"))

    @app.route(f"{admin_route_prefix}/online-gallery/<int:item_id>/delete", methods=["POST"])
    @admin_required
    def admin_online_gallery_delete(item_id):
        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_online_gallery"))

        current_item = load_admin_online_gallery_item(item_id)
        if current_item is None:
            return redirect(url_for("admin_online_gallery"))

        try:
            delete_online_gallery_item(item_id)
            delete_local_image(current_item.get("image_filename"), ONLINE_GALLERY_UPLOAD_DIR)
        except Exception as exc:
            app.logger.exception("Failed to delete online gallery item %s: %s", item_id, exc)
            return redirect(url_for("admin_online_gallery"))

        return redirect(url_for("admin_online_gallery", status="deleted"))
