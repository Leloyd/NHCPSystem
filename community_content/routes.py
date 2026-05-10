from __future__ import annotations

from typing import Any, Callable

from flask import redirect, render_template, request, session, url_for

from community_events_repository import create_community_event, delete_community_event, list_all_community_events, update_community_event
from community_highlights_repository import create_community_highlight, delete_community_highlight, list_all_community_highlights, update_community_highlight
from supabase_client import is_supabase_configured

from .service import (
    COMMUNITY_EVENTS_UPLOAD_DIR,
    COMMUNITY_HIGHLIGHTS_UPLOAD_DIR,
    COMMUNITY_HIGHLIGHT_CATEGORIES,
    build_community_event_form_state,
    build_community_highlight_form_state,
    get_community_events_status_message,
    get_community_highlights_status_message,
    load_admin_community_event,
    load_admin_community_events,
    load_admin_community_highlight,
    load_admin_community_highlights,
    load_news_community_events,
    load_news_community_highlights,
    load_published_community_event,
    load_published_community_highlight,
    render_admin_community_highlight_form,
    render_admin_event_form,
)


def _build_unique_slug(title: str, *, fallback: str, current_id: int | None, list_items: Callable[[], list[dict[str, Any]]], slugify_text: Callable[[str, str], str]) -> str:
    base_slug = slugify_text(title, fallback=fallback)
    try:
        existing_items = list_items() if is_supabase_configured() else []
    except Exception:
        existing_items = []

    existing_slugs = {
        str(item.get("slug") or "").strip().lower()
        for item in existing_items
        if item.get("id") != current_id
    }

    slug = base_slug
    counter = 2
    while slug in existing_slugs:
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


def _build_unique_community_highlight_slug(title: str, *, current_id: int | None, slugify_text: Callable[[str, str], str]) -> str:
    return _build_unique_slug(
        title,
        fallback="community-highlight",
        current_id=current_id,
        list_items=list_all_community_highlights,
        slugify_text=slugify_text,
    )


def _build_unique_community_event_slug(title: str, *, current_id: int | None, slugify_text: Callable[[str, str], str]) -> str:
    return _build_unique_slug(
        title,
        fallback="community-event",
        current_id=current_id,
        list_items=list_all_community_events,
        slugify_text=slugify_text,
    )


def _build_community_highlight_form_payload(form, files, *, current_item, normalize_checkbox, validate_event_date, save_uploaded_image, slugify_text):
    title = str(form.get("title") or "").strip()
    category = str(form.get("category") or "").strip()
    short_description = str(form.get("short_description") or "").strip()
    long_description = str(form.get("long_description") or "").strip()

    if len(title) < 3:
        raise ValueError("Title must be at least 3 characters.")
    if category not in COMMUNITY_HIGHLIGHT_CATEGORIES:
        raise ValueError("Please choose a valid category.")
    if len(short_description) < 12:
        raise ValueError("Short description must be at least 12 characters.")
    if len(long_description) < 24:
        raise ValueError("More information must be at least 24 characters.")

    payload = {
        "title": title,
        "slug": _build_unique_community_highlight_slug(
            title,
            current_id=current_item.get("id") if current_item else None,
            slugify_text=slugify_text,
        ),
        "category": category,
        "event_date": validate_event_date(form.get("event_date")),
        "short_description": short_description,
        "long_description": long_description,
        "is_published": normalize_checkbox(form.get("is_published")),
    }

    uploaded_file = files.get("image_file")
    new_image_filename = save_uploaded_image(uploaded_file, title, COMMUNITY_HIGHLIGHTS_UPLOAD_DIR)
    if new_image_filename:
        payload["image_filename"] = new_image_filename
    elif current_item:
        payload["image_filename"] = current_item.get("image_filename")
    else:
        payload["image_filename"] = None

    return payload, new_image_filename


def _build_community_event_form_payload(form, files, *, current_item, normalize_checkbox, validate_event_date, save_uploaded_image, slugify_text):
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
        "slug": _build_unique_community_event_slug(
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
    new_image_filename = save_uploaded_image(uploaded_file, title, COMMUNITY_EVENTS_UPLOAD_DIR)
    if new_image_filename:
        payload["image_filename"] = new_image_filename
    elif current_item:
        payload["image_filename"] = current_item.get("image_filename")
    else:
        payload["image_filename"] = None

    return payload, new_image_filename


def register_community_content_routes(
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
    slugify_text,
):
    @app.route(f"{admin_route_prefix}/community-highlights")
    @admin_required
    def admin_community_highlights():
        csrf_token = ensure_admin_csrf_token()
        current_admin_username = session.get(admin_session_user_key, admin_username)
        highlights_items = load_admin_community_highlights()
        status_message = get_community_highlights_status_message(request.args.get("status"))
        config_error = None if is_supabase_configured() else "Supabase community highlights integration is not configured."
        return render_template(
            "admin/AdminCommunityHighlights.html",
            csrf_token=csrf_token,
            admin_username=current_admin_username,
            highlights_items=highlights_items,
            status_message=status_message,
            config_error=config_error,
        )

    @app.route(f"{admin_route_prefix}/community-highlights/new", methods=["GET", "POST"])
    @admin_required
    def admin_community_highlight_new():
        if request.method == "GET":
            return render_admin_community_highlight_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Community Highlight",
                submit_label="Create Highlight",
                form_action=url_for("admin_community_highlight_new"),
                highlight_form=build_community_highlight_form_state({"is_published": True, "category": COMMUNITY_HIGHLIGHT_CATEGORIES[0]}),
            )

        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_community_highlights"))

        if not is_supabase_configured():
            return render_admin_community_highlight_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Community Highlight",
                submit_label="Create Highlight",
                form_action=url_for("admin_community_highlight_new"),
                highlight_form=build_community_highlight_form_state(request.form),
                error_message="Supabase community highlights integration is not configured.",
            )

        new_image_filename = None
        try:
            payload, new_image_filename = _build_community_highlight_form_payload(
                request.form,
                request.files,
                current_item=None,
                normalize_checkbox=normalize_checkbox,
                validate_event_date=validate_event_date,
                save_uploaded_image=save_uploaded_image,
                slugify_text=slugify_text,
            )
            create_community_highlight(payload)
        except ValueError as exc:
            if new_image_filename:
                delete_local_image(new_image_filename, COMMUNITY_HIGHLIGHTS_UPLOAD_DIR)
            return render_admin_community_highlight_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Community Highlight",
                submit_label="Create Highlight",
                form_action=url_for("admin_community_highlight_new"),
                highlight_form=build_community_highlight_form_state({**request.form, "is_published": normalize_checkbox(request.form.get("is_published"))}),
                error_message=str(exc),
            )
        except Exception as exc:
            if new_image_filename:
                delete_local_image(new_image_filename, COMMUNITY_HIGHLIGHTS_UPLOAD_DIR)
            app.logger.exception("Failed to create community highlight: %s", exc)
            return render_admin_community_highlight_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Community Highlight",
                submit_label="Create Highlight",
                form_action=url_for("admin_community_highlight_new"),
                highlight_form=build_community_highlight_form_state({**request.form, "is_published": normalize_checkbox(request.form.get("is_published"))}),
                error_message="Could not create the community highlight right now.",
            )

        return redirect(url_for("admin_community_highlights", status="created"))

    @app.route(f"{admin_route_prefix}/community-highlights/<int:highlight_id>/edit", methods=["GET", "POST"])
    @admin_required
    def admin_community_highlight_edit(highlight_id):
        current_item = load_admin_community_highlight(highlight_id)
        if current_item is None:
            return redirect(url_for("admin_community_highlights"))

        if request.method == "GET":
            return render_admin_community_highlight_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Edit Community Highlight",
                submit_label="Save Changes",
                form_action=url_for("admin_community_highlight_edit", highlight_id=highlight_id),
                highlight_form=build_community_highlight_form_state(current_item),
            )

        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_community_highlights"))

        new_image_filename = None
        previous_image_filename = current_item.get("image_filename")
        try:
            payload, new_image_filename = _build_community_highlight_form_payload(
                request.form,
                request.files,
                current_item=current_item,
                normalize_checkbox=normalize_checkbox,
                validate_event_date=validate_event_date,
                save_uploaded_image=save_uploaded_image,
                slugify_text=slugify_text,
            )
            update_community_highlight(highlight_id, payload)
            if new_image_filename and previous_image_filename and previous_image_filename != new_image_filename:
                delete_local_image(previous_image_filename, COMMUNITY_HIGHLIGHTS_UPLOAD_DIR)
        except ValueError as exc:
            if new_image_filename:
                delete_local_image(new_image_filename, COMMUNITY_HIGHLIGHTS_UPLOAD_DIR)
            return render_admin_community_highlight_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Edit Community Highlight",
                submit_label="Save Changes",
                form_action=url_for("admin_community_highlight_edit", highlight_id=highlight_id),
                highlight_form=build_community_highlight_form_state({**current_item, **request.form, "is_published": normalize_checkbox(request.form.get("is_published"))}),
                error_message=str(exc),
            )
        except Exception as exc:
            if new_image_filename:
                delete_local_image(new_image_filename, COMMUNITY_HIGHLIGHTS_UPLOAD_DIR)
            app.logger.exception("Failed to update community highlight %s: %s", highlight_id, exc)
            return render_admin_community_highlight_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Edit Community Highlight",
                submit_label="Save Changes",
                form_action=url_for("admin_community_highlight_edit", highlight_id=highlight_id),
                highlight_form=build_community_highlight_form_state({**current_item, **request.form, "is_published": normalize_checkbox(request.form.get("is_published"))}),
                error_message="Could not update the community highlight right now.",
            )

        return redirect(url_for("admin_community_highlights", status="updated"))

    @app.route(f"{admin_route_prefix}/community-highlights/<int:highlight_id>/delete", methods=["POST"])
    @admin_required
    def admin_community_highlight_delete(highlight_id):
        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_community_highlights"))

        current_item = load_admin_community_highlight(highlight_id)
        if current_item is None:
            return redirect(url_for("admin_community_highlights"))

        try:
            delete_community_highlight(highlight_id)
            delete_local_image(current_item.get("image_filename"), COMMUNITY_HIGHLIGHTS_UPLOAD_DIR)
        except Exception as exc:
            app.logger.exception("Failed to delete community highlight %s: %s", highlight_id, exc)
            return redirect(url_for("admin_community_highlights"))

        return redirect(url_for("admin_community_highlights", status="deleted"))

    @app.route(f"{admin_route_prefix}/events")
    @admin_required
    def admin_events():
        csrf_token = ensure_admin_csrf_token()
        current_admin_username = session.get(admin_session_user_key, admin_username)
        events_items = load_admin_community_events()
        status_message = get_community_events_status_message(request.args.get("status"))
        config_error = None if is_supabase_configured() else "Supabase community events integration is not configured."
        return render_template(
            "admin/AdminEvents.html",
            csrf_token=csrf_token,
            admin_username=current_admin_username,
            events_items=events_items,
            status_message=status_message,
            config_error=config_error,
        )

    @app.route(f"{admin_route_prefix}/events/new", methods=["GET", "POST"])
    @admin_required
    def admin_event_new():
        if request.method == "GET":
            return render_admin_event_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Event Card",
                submit_label="Create Event",
                form_action=url_for("admin_event_new"),
                event_form=build_community_event_form_state({"is_published": True}),
            )

        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_events"))

        if not is_supabase_configured():
            return render_admin_event_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Event Card",
                submit_label="Create Event",
                form_action=url_for("admin_event_new"),
                event_form=build_community_event_form_state(request.form),
                error_message="Supabase community events integration is not configured.",
            )

        new_image_filename = None
        try:
            payload, new_image_filename = _build_community_event_form_payload(
                request.form,
                request.files,
                current_item=None,
                normalize_checkbox=normalize_checkbox,
                validate_event_date=validate_event_date,
                save_uploaded_image=save_uploaded_image,
                slugify_text=slugify_text,
            )
            create_community_event(payload)
        except ValueError as exc:
            if new_image_filename:
                delete_local_image(new_image_filename, COMMUNITY_EVENTS_UPLOAD_DIR)
            return render_admin_event_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Event Card",
                submit_label="Create Event",
                form_action=url_for("admin_event_new"),
                event_form=build_community_event_form_state({**request.form, "is_published": normalize_checkbox(request.form.get("is_published"))}),
                error_message=str(exc),
            )
        except Exception as exc:
            if new_image_filename:
                delete_local_image(new_image_filename, COMMUNITY_EVENTS_UPLOAD_DIR)
            app.logger.exception("Failed to create community event: %s", exc)
            return render_admin_event_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Event Card",
                submit_label="Create Event",
                form_action=url_for("admin_event_new"),
                event_form=build_community_event_form_state({**request.form, "is_published": normalize_checkbox(request.form.get("is_published"))}),
                error_message="Could not create the event card right now.",
            )

        return redirect(url_for("admin_events", status="created"))

    @app.route(f"{admin_route_prefix}/events/<int:event_id>/edit", methods=["GET", "POST"])
    @admin_required
    def admin_event_edit(event_id):
        current_item = load_admin_community_event(event_id)
        if current_item is None:
            return redirect(url_for("admin_events"))

        if request.method == "GET":
            return render_admin_event_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Edit Event Card",
                submit_label="Save Changes",
                form_action=url_for("admin_event_edit", event_id=event_id),
                event_form=build_community_event_form_state(current_item),
            )

        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_events"))

        new_image_filename = None
        previous_image_filename = current_item.get("image_filename")
        try:
            payload, new_image_filename = _build_community_event_form_payload(
                request.form,
                request.files,
                current_item=current_item,
                normalize_checkbox=normalize_checkbox,
                validate_event_date=validate_event_date,
                save_uploaded_image=save_uploaded_image,
                slugify_text=slugify_text,
            )
            update_community_event(event_id, payload)
            if new_image_filename and previous_image_filename and previous_image_filename != new_image_filename:
                delete_local_image(previous_image_filename, COMMUNITY_EVENTS_UPLOAD_DIR)
        except ValueError as exc:
            if new_image_filename:
                delete_local_image(new_image_filename, COMMUNITY_EVENTS_UPLOAD_DIR)
            return render_admin_event_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Edit Event Card",
                submit_label="Save Changes",
                form_action=url_for("admin_event_edit", event_id=event_id),
                event_form=build_community_event_form_state({**current_item, **request.form, "is_published": normalize_checkbox(request.form.get("is_published"))}),
                error_message=str(exc),
            )
        except Exception as exc:
            if new_image_filename:
                delete_local_image(new_image_filename, COMMUNITY_EVENTS_UPLOAD_DIR)
            app.logger.exception("Failed to update community event %s: %s", event_id, exc)
            return render_admin_event_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Edit Event Card",
                submit_label="Save Changes",
                form_action=url_for("admin_event_edit", event_id=event_id),
                event_form=build_community_event_form_state({**current_item, **request.form, "is_published": normalize_checkbox(request.form.get("is_published"))}),
                error_message="Could not update the event card right now.",
            )

        return redirect(url_for("admin_events", status="updated"))

    @app.route(f"{admin_route_prefix}/events/<int:event_id>/delete", methods=["POST"])
    @admin_required
    def admin_event_delete(event_id):
        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_events"))

        current_item = load_admin_community_event(event_id)
        if current_item is None:
            return redirect(url_for("admin_events"))

        try:
            delete_community_event(event_id)
            delete_local_image(current_item.get("image_filename"), COMMUNITY_EVENTS_UPLOAD_DIR)
        except Exception as exc:
            app.logger.exception("Failed to delete community event %s: %s", event_id, exc)
            return redirect(url_for("admin_events"))

        return redirect(url_for("admin_events", status="deleted"))

    @app.route("/community-highlights/<slug>")
    def community_highlight_detail(slug):
        highlight_item = load_published_community_highlight(slug)
        if highlight_item is None:
            return redirect(url_for("community_participation"))
        return render_template("CommunityHighlightDetail.html", highlight_item=highlight_item)

    @app.route("/community-events/<slug>")
    def community_event_detail(slug):
        event_item = load_published_community_event(slug)
        if event_item is None:
            return redirect(url_for("community_participation"))
        return render_template("CommunityEventDetail.html", event_item=event_item)

    @app.route("/community-participation")
    def community_participation():
        community_highlights_items = load_news_community_highlights(limit=12)
        community_events_items = load_news_community_events(limit=12)
        return render_template(
            "CommunityParticipation.html",
            community_highlights_items=community_highlights_items,
            community_events_items=community_events_items,
        )

    @app.route("/news")
    def news():
        return redirect(url_for("community_participation"))
