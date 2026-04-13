from __future__ import annotations

from flask import redirect, render_template, request, session, url_for

from exhibits_repository import create_exhibit, delete_exhibit, update_exhibit
from supabase_client import is_supabase_configured

from .service import (
    EXHIBITS_UPLOAD_DIR,
    build_exhibit_form_state,
    build_unique_exhibit_slug,
    get_exhibits_status_message,
    load_admin_exhibit,
    load_admin_exhibits,
    load_landing_exhibits,
    load_published_exhibit,
    render_admin_exhibit_form,
)


def _build_exhibit_form_payload(form, files, *, current_item, normalize_checkbox, validate_event_date, save_uploaded_image, slugify_text):
    title = str(form.get("title") or "").strip()
    short_description = str(form.get("short_description") or "").strip()
    long_description = str(form.get("long_description") or "").strip()

    if len(title) < 3:
        raise ValueError("Title must be at least 3 characters.")
    if len(short_description) < 12:
        raise ValueError("Short description must be at least 12 characters.")
    if len(long_description) < 24:
        raise ValueError("More information must be at least 24 characters.")

    payload = {
        "title": title,
        "slug": build_unique_exhibit_slug(
            title,
            current_id=current_item.get("id") if current_item else None,
            slugify_text=slugify_text,
        ),
        "event_date": validate_event_date(form.get("event_date")),
        "short_description": short_description,
        "long_description": long_description,
        "is_published": normalize_checkbox(form.get("is_published")),
    }

    uploaded_file = files.get("image_file")
    new_image_filename = save_uploaded_image(uploaded_file, title, EXHIBITS_UPLOAD_DIR)
    if new_image_filename:
        payload["image_filename"] = new_image_filename
    elif current_item:
        payload["image_filename"] = current_item.get("image_filename")
    else:
        payload["image_filename"] = None

    return payload, new_image_filename


def register_exhibits_content_routes(
    app,
    *,
    admin_route_prefix: str,
    admin_required,
    ensure_admin_csrf_token,
    is_admin_csrf_valid,
    admin_session_user_key: str,
    admin_username: str,
    normalize_checkbox,
    validate_event_date,
    save_uploaded_image,
    delete_local_image,
    current_exhibits_news_url: str,
    slugify_text,
):
    @app.route(f"{admin_route_prefix}/exhibits")
    @admin_required
    def admin_exhibits():
        csrf_token = ensure_admin_csrf_token()
        current_admin_username = session.get(admin_session_user_key, admin_username)
        exhibits_items = load_admin_exhibits()
        status_message = get_exhibits_status_message(request.args.get("status"))
        config_error = None if is_supabase_configured() else "Supabase exhibits integration is not configured."
        return render_template(
            "admin/AdminExhibits.html",
            csrf_token=csrf_token,
            admin_username=current_admin_username,
            exhibits_items=exhibits_items,
            status_message=status_message,
            config_error=config_error,
        )

    @app.route(f"{admin_route_prefix}/exhibits/new", methods=["GET", "POST"])
    @admin_required
    def admin_exhibit_new():
        if request.method == "GET":
            return render_admin_exhibit_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Exhibit Card",
                submit_label="Create Exhibit",
                form_action=url_for("admin_exhibit_new"),
                exhibit_form=build_exhibit_form_state({"is_published": True}),
            )

        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_exhibits"))

        if not is_supabase_configured():
            return render_admin_exhibit_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Exhibit Card",
                submit_label="Create Exhibit",
                form_action=url_for("admin_exhibit_new"),
                exhibit_form=build_exhibit_form_state(request.form),
                error_message="Supabase exhibits integration is not configured.",
            )

        new_image_filename = None
        try:
            payload, new_image_filename = _build_exhibit_form_payload(
                request.form,
                request.files,
                current_item=None,
                normalize_checkbox=normalize_checkbox,
                validate_event_date=validate_event_date,
                save_uploaded_image=save_uploaded_image,
                slugify_text=slugify_text,
            )
            create_exhibit(payload)
        except ValueError as exc:
            if new_image_filename:
                delete_local_image(new_image_filename, EXHIBITS_UPLOAD_DIR)
            return render_admin_exhibit_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Exhibit Card",
                submit_label="Create Exhibit",
                form_action=url_for("admin_exhibit_new"),
                exhibit_form=build_exhibit_form_state({**request.form, "is_published": normalize_checkbox(request.form.get("is_published"))}),
                error_message=str(exc),
            )
        except Exception as exc:
            if new_image_filename:
                delete_local_image(new_image_filename, EXHIBITS_UPLOAD_DIR)
            app.logger.exception("Failed to create exhibit: %s", exc)
            return render_admin_exhibit_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Exhibit Card",
                submit_label="Create Exhibit",
                form_action=url_for("admin_exhibit_new"),
                exhibit_form=build_exhibit_form_state({**request.form, "is_published": normalize_checkbox(request.form.get("is_published"))}),
                error_message="Could not create the exhibit card right now.",
            )

        return redirect(url_for("admin_exhibits", status="created"))

    @app.route(f"{admin_route_prefix}/exhibits/<int:exhibit_id>/edit", methods=["GET", "POST"])
    @admin_required
    def admin_exhibit_edit(exhibit_id):
        current_item = load_admin_exhibit(exhibit_id)
        if current_item is None:
            return redirect(url_for("admin_exhibits"))

        if request.method == "GET":
            return render_admin_exhibit_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Edit Exhibit Card",
                submit_label="Save Changes",
                form_action=url_for("admin_exhibit_edit", exhibit_id=exhibit_id),
                exhibit_form=build_exhibit_form_state(current_item),
            )

        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_exhibits"))

        new_image_filename = None
        previous_image_filename = current_item.get("image_filename")
        try:
            payload, new_image_filename = _build_exhibit_form_payload(
                request.form,
                request.files,
                current_item=current_item,
                normalize_checkbox=normalize_checkbox,
                validate_event_date=validate_event_date,
                save_uploaded_image=save_uploaded_image,
                slugify_text=slugify_text,
            )
            update_exhibit(exhibit_id, payload)
            if new_image_filename and previous_image_filename and previous_image_filename != new_image_filename:
                delete_local_image(previous_image_filename, EXHIBITS_UPLOAD_DIR)
        except ValueError as exc:
            if new_image_filename:
                delete_local_image(new_image_filename, EXHIBITS_UPLOAD_DIR)
            return render_admin_exhibit_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Edit Exhibit Card",
                submit_label="Save Changes",
                form_action=url_for("admin_exhibit_edit", exhibit_id=exhibit_id),
                exhibit_form=build_exhibit_form_state({**current_item, **request.form, "is_published": normalize_checkbox(request.form.get("is_published"))}),
                error_message=str(exc),
            )
        except Exception as exc:
            if new_image_filename:
                delete_local_image(new_image_filename, EXHIBITS_UPLOAD_DIR)
            app.logger.exception("Failed to update exhibit %s: %s", exhibit_id, exc)
            return render_admin_exhibit_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Edit Exhibit Card",
                submit_label="Save Changes",
                form_action=url_for("admin_exhibit_edit", exhibit_id=exhibit_id),
                exhibit_form=build_exhibit_form_state({**current_item, **request.form, "is_published": normalize_checkbox(request.form.get("is_published"))}),
                error_message="Could not update the exhibit card right now.",
            )

        return redirect(url_for("admin_exhibits", status="updated"))

    @app.route(f"{admin_route_prefix}/exhibits/<int:exhibit_id>/delete", methods=["POST"])
    @admin_required
    def admin_exhibit_delete(exhibit_id):
        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_exhibits"))

        current_item = load_admin_exhibit(exhibit_id)
        if current_item is None:
            return redirect(url_for("admin_exhibits"))

        try:
            delete_exhibit(exhibit_id)
            delete_local_image(current_item.get("image_filename"), EXHIBITS_UPLOAD_DIR)
        except Exception as exc:
            app.logger.exception("Failed to delete exhibit %s: %s", exhibit_id, exc)
            return redirect(url_for("admin_exhibits"))

        return redirect(url_for("admin_exhibits", status="deleted"))

    @app.route(current_exhibits_news_url)
    def current_exhibits_news():
        exhibits_news_items = load_landing_exhibits(limit=None)
        return render_template("CurrentExhibitsNews.html", exhibits_news_items=exhibits_news_items)

    @app.route(f"{current_exhibits_news_url}/<slug>")
    def current_exhibits_news_detail(slug):
        exhibit_item = load_published_exhibit(slug)
        if exhibit_item is None:
            return redirect(url_for("current_exhibits_news"))
        return render_template("CurrentExhibitNewsDetail.html", exhibit_item=exhibit_item)
