from __future__ import annotations

from typing import Any, Callable

from flask import redirect, render_template, request, session, url_for

from community_events_repository import create_community_event, list_all_community_events, update_community_event
from community_highlights_repository import clear_featured_community_highlights, create_community_highlight, list_all_community_highlights, update_community_highlight
from supabase_client import is_supabase_configured

from .service import (
    COMMUNITY_EVENT_CATEGORIES,
    COMMUNITY_EVENT_STATUS_OPTIONS,
    COMMUNITY_HIGHLIGHT_MAX_IMAGES,
    COMMUNITY_HIGHLIGHT_UPLOAD_MAX_BYTES,
    COMMUNITY_HIGHLIGHTS_UPLOAD_DIR,
    COMMUNITY_HIGHLIGHT_CATEGORIES,
    COMMUNITY_HIGHLIGHT_STATUS_OPTIONS,
    build_community_event_form_state,
    build_community_highlight_form_state,
    get_community_events_status_message,
    get_community_highlights_status_message,
    load_admin_community_event,
    load_admin_community_events,
    load_admin_community_highlight,
    load_admin_community_highlights,
    load_news_community_highlights,
    load_published_community_event,
    load_published_community_highlight,
    normalize_community_highlight_image_filenames,
    render_admin_community_highlight_form,
    render_admin_event_form,
)

VALID_COMMUNITY_HIGHLIGHT_FILTERS = {"all", "active", "draft", "archived"}


def _get_uploaded_file_size(file_storage) -> int:
    if file_storage is None:
        return 0

    stream = getattr(file_storage, "stream", None)
    if stream is None:
        raise ValueError("The selected image size could not be verified.")

    try:
        original_position = stream.tell()
        stream.seek(0, 2)
        file_size = int(stream.tell())
        stream.seek(original_position)
    except (AttributeError, OSError, TypeError, ValueError) as exc:
        raise ValueError("The selected image size could not be verified.") from exc

    return max(0, file_size)


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


def _build_community_highlight_form_payload(
    form,
    files,
    *,
    current_item,
    normalize_checkbox,
    validate_event_date,
    save_uploaded_image,
    delete_uploaded_image,
    slugify_text,
):
    title = str(form.get("title") or "").strip()
    category = str(form.get("category") or "").strip()
    status = str(form.get("status") or "draft").strip().lower()
    short_description = str(form.get("short_description") or "").strip()
    long_description = str(form.get("long_description") or "").strip()
    short_description_tl = str(form.get("short_description_tl") or "").strip()
    long_description_tl = str(form.get("long_description_tl") or "").strip()

    if len(title) < 3:
        raise ValueError("Title must be at least 3 characters.")
    if category not in COMMUNITY_HIGHLIGHT_CATEGORIES:
        raise ValueError("Please choose a valid category.")
    if status not in COMMUNITY_HIGHLIGHT_STATUS_OPTIONS:
        raise ValueError("Please choose a valid publishing status.")
    if len(short_description) < 12:
        raise ValueError("Short description must be at least 12 characters.")
    if len(long_description) < 24:
        raise ValueError("More information must be at least 24 characters.")
    if len(short_description_tl) < 12:
        raise ValueError("Tagalog short description must be at least 12 characters.")
    if len(long_description_tl) < 24:
        raise ValueError("Tagalog full description must be at least 24 characters.")

    payload = {
        "title": title,
        "slug": _build_unique_community_highlight_slug(
            title,
            current_id=current_item.get("id") if current_item else None,
            slugify_text=slugify_text,
        ),
        "category": category,
        "status": status,
        "event_date": validate_event_date(form.get("event_date")),
        "short_description": short_description,
        "long_description": long_description,
        "short_description_tl": short_description_tl,
        "long_description_tl": long_description_tl,
        "is_published": status == "active",
        "is_featured": bool(current_item and current_item.get("is_featured") and status == "active"),
    }

    existing_image_filenames = normalize_community_highlight_image_filenames(
        current_item.get("image_filenames") if current_item else [],
        legacy_image_filename=current_item.get("image_filename") if current_item else None,
    )
    requested_removals = {
        str(value or "").strip()
        for value in form.getlist("remove_image_filenames")
        if str(value or "").strip()
    }
    removed_image_filenames = [
        filename for filename in existing_image_filenames if filename in requested_removals
    ]
    retained_image_filenames = [
        filename for filename in existing_image_filenames if filename not in requested_removals
    ]

    uploaded_files = [
        file_storage
        for file_storage in files.getlist("image_files")
        if file_storage is not None and str(getattr(file_storage, "filename", "") or "").strip()
    ]
    if not uploaded_files:
        legacy_upload = files.get("image_file")
        if legacy_upload is not None and str(getattr(legacy_upload, "filename", "") or "").strip():
            uploaded_files = [legacy_upload]

    if len(retained_image_filenames) + len(uploaded_files) > COMMUNITY_HIGHLIGHT_MAX_IMAGES:
        raise ValueError(
            f"A community highlight can contain up to {COMMUNITY_HIGHLIGHT_MAX_IMAGES} images."
        )

    upload_size_bytes = sum(_get_uploaded_file_size(file_storage) for file_storage in uploaded_files)
    if upload_size_bytes > COMMUNITY_HIGHLIGHT_UPLOAD_MAX_BYTES:
        upload_size_mb = upload_size_bytes / (1024 * 1024)
        max_upload_mb = COMMUNITY_HIGHLIGHT_UPLOAD_MAX_BYTES / (1024 * 1024)
        raise ValueError(
            f"The newly selected images total {upload_size_mb:.2f} MB. "
            f"Keep each save at or below {max_upload_mb:.1f} MB to stay within Vercel's upload limit."
        )

    new_image_filenames: list[str] = []
    try:
        for file_storage in uploaded_files:
            uploaded_filename = save_uploaded_image(
                file_storage,
                title,
                COMMUNITY_HIGHLIGHTS_UPLOAD_DIR,
            )
            if uploaded_filename:
                new_image_filenames.append(uploaded_filename)
    except Exception:
        for uploaded_filename in new_image_filenames:
            delete_uploaded_image(uploaded_filename, COMMUNITY_HIGHLIGHTS_UPLOAD_DIR)
        raise

    final_image_filenames = retained_image_filenames + new_image_filenames
    payload["image_filenames"] = final_image_filenames
    payload["image_filename"] = final_image_filenames[0] if final_image_filenames else None

    return payload, new_image_filenames, removed_image_filenames


def _build_community_event_form_payload(form, files, *, current_item, normalize_checkbox, validate_event_date, save_uploaded_image, slugify_text):
    title = str(form.get("title") or "").strip()
    category = str(form.get("category") or "").strip()
    status = str(form.get("status") or "draft").strip().lower()
    event_time = str(form.get("event_time") or "").strip()
    location = str(form.get("location") or "").strip()
    short_description = str(form.get("short_description") or "").strip()

    if len(title) < 3:
        raise ValueError("Title must be at least 3 characters.")
    if category not in COMMUNITY_EVENT_CATEGORIES:
        raise ValueError("Please choose a valid category.")
    if status not in COMMUNITY_EVENT_STATUS_OPTIONS:
        raise ValueError("Please choose a valid publishing status.")
    if len(event_time) < 3:
        raise ValueError("Time must be at least 3 characters.")
    if len(location) < 3:
        raise ValueError("Location must be at least 3 characters.")
    if len(short_description) < 12:
        raise ValueError("Details must be at least 12 characters.")

    payload = {
        "title": title,
        "slug": _build_unique_community_event_slug(
            title,
            current_id=current_item.get("id") if current_item else None,
            slugify_text=slugify_text,
        ),
        "category": category,
        "status": status,
        "event_date": validate_event_date(form.get("event_date")),
        "event_time": event_time,
        "location": location,
        "short_description": short_description,
        "long_description": short_description,
        "is_published": status == "active",
    }

    return payload, None


def register_community_content_routes(
    app,
    *,
    admin_route_prefix: str,
    admin_required,
    ensure_admin_csrf_token,
    is_admin_csrf_valid,
    admin_session_user_key: str,
    admin_username: str,
    public_login_required,
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
        status_filter = str(request.args.get("filter") or "all").strip().lower()
        if status_filter not in VALID_COMMUNITY_HIGHLIGHT_FILTERS:
            status_filter = "all"

        highlights_items = load_admin_community_highlights()
        active_highlights_items = [item for item in highlights_items if item.get("status") == "active"]
        draft_highlights_items = [item for item in highlights_items if item.get("status") == "draft"]
        archived_highlights_items = [item for item in highlights_items if item.get("status") == "archived"]
        visible_highlight_ids = {
            int(item.get("id"))
            for item in highlights_items
            if item.get("id") is not None
            and (status_filter == "all" or item.get("status") == status_filter)
        }
        status_message = get_community_highlights_status_message(request.args.get("status"))
        config_error = None if is_supabase_configured() else "Supabase community highlights integration is not configured."
        return render_template(
            "admin/AdminCommunityHighlights.html",
            csrf_token=csrf_token,
            admin_username=current_admin_username,
            highlights_items=highlights_items,
            active_highlights_items=active_highlights_items,
            draft_highlights_items=draft_highlights_items,
            archived_highlights_items=archived_highlights_items,
            visible_highlight_ids=visible_highlight_ids,
            status_filter=status_filter,
            status_message=status_message,
            config_error=config_error,
        )

    @app.route(f"{admin_route_prefix}/community-highlights/<int:highlight_id>")
    @admin_required
    def admin_community_highlight_view(highlight_id):
        highlight_item = load_admin_community_highlight(highlight_id)
        if highlight_item is None:
            return redirect(url_for("admin_community_highlights"))

        return render_template(
            "admin/AdminCommunityHighlightsView.html",
            csrf_token=ensure_admin_csrf_token(),
            admin_username=session.get(admin_session_user_key, admin_username),
            highlight_item=highlight_item,
            status_message=get_community_highlights_status_message(request.args.get("status")),
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
                highlight_form=build_community_highlight_form_state({"status": "draft", "category": COMMUNITY_HIGHLIGHT_CATEGORIES[0]}),
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

        new_image_filenames: list[str] = []
        try:
            payload, new_image_filenames, _ = _build_community_highlight_form_payload(
                request.form,
                request.files,
                current_item=None,
                normalize_checkbox=normalize_checkbox,
                validate_event_date=validate_event_date,
                save_uploaded_image=save_uploaded_image,
                delete_uploaded_image=delete_local_image,
                slugify_text=slugify_text,
            )
            create_community_highlight(payload)
        except ValueError as exc:
            for new_image_filename in new_image_filenames:
                delete_local_image(new_image_filename, COMMUNITY_HIGHLIGHTS_UPLOAD_DIR)
            return render_admin_community_highlight_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Community Highlight",
                submit_label="Create Highlight",
                form_action=url_for("admin_community_highlight_new"),
                highlight_form=build_community_highlight_form_state(request.form),
                error_message=str(exc),
            )
        except Exception as exc:
            for new_image_filename in new_image_filenames:
                delete_local_image(new_image_filename, COMMUNITY_HIGHLIGHTS_UPLOAD_DIR)
            app.logger.exception("Failed to create community highlight: %s", exc)
            return render_admin_community_highlight_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Community Highlight",
                submit_label="Create Highlight",
                form_action=url_for("admin_community_highlight_new"),
                highlight_form=build_community_highlight_form_state(request.form),
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

        new_image_filenames: list[str] = []
        removed_image_filenames: list[str] = []
        try:
            payload, new_image_filenames, removed_image_filenames = _build_community_highlight_form_payload(
                request.form,
                request.files,
                current_item=current_item,
                normalize_checkbox=normalize_checkbox,
                validate_event_date=validate_event_date,
                save_uploaded_image=save_uploaded_image,
                delete_uploaded_image=delete_local_image,
                slugify_text=slugify_text,
            )
            update_community_highlight(highlight_id, payload)
            for removed_image_filename in removed_image_filenames:
                delete_local_image(removed_image_filename, COMMUNITY_HIGHLIGHTS_UPLOAD_DIR)
        except ValueError as exc:
            for new_image_filename in new_image_filenames:
                delete_local_image(new_image_filename, COMMUNITY_HIGHLIGHTS_UPLOAD_DIR)
            return render_admin_community_highlight_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Edit Community Highlight",
                submit_label="Save Changes",
                form_action=url_for("admin_community_highlight_edit", highlight_id=highlight_id),
                highlight_form=build_community_highlight_form_state({**current_item, **request.form}),
                error_message=str(exc),
            )
        except Exception as exc:
            for new_image_filename in new_image_filenames:
                delete_local_image(new_image_filename, COMMUNITY_HIGHLIGHTS_UPLOAD_DIR)
            app.logger.exception("Failed to update community highlight %s: %s", highlight_id, exc)
            return render_admin_community_highlight_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Edit Community Highlight",
                submit_label="Save Changes",
                form_action=url_for("admin_community_highlight_edit", highlight_id=highlight_id),
                highlight_form=build_community_highlight_form_state({**current_item, **request.form}),
                error_message="Could not update the community highlight right now.",
            )

        return redirect(url_for("admin_community_highlights", status="updated"))

    @app.route(f"{admin_route_prefix}/community-highlights/<int:highlight_id>/feature", methods=["POST"])
    @admin_required
    def admin_community_highlight_feature(highlight_id):
        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_community_highlights"))

        current_item = load_admin_community_highlight(highlight_id)
        if current_item is None:
            return redirect(url_for("admin_community_highlights"))

        if current_item.get("status") != "active":
            return redirect(url_for("admin_community_highlights"))

        feature_action = str(request.form.get("feature_action") or "set").strip().lower()

        try:
            if feature_action == "remove":
                update_community_highlight(highlight_id, {"is_featured": False})
                if request.form.get("return_to") == "view":
                    return redirect(url_for("admin_community_highlight_view", highlight_id=highlight_id, status="unfeatured"))
                return redirect(url_for("admin_community_highlights", status="unfeatured"))

            clear_featured_community_highlights(exclude_id=highlight_id)
            update_community_highlight(highlight_id, {"is_featured": True, "status": "active", "is_published": True})
        except Exception as exc:
            app.logger.exception("Failed to update featured community highlight %s: %s", highlight_id, exc)
            return redirect(url_for("admin_community_highlights"))

        if request.form.get("return_to") == "view":
            return redirect(url_for("admin_community_highlight_view", highlight_id=highlight_id, status="featured"))
        return redirect(url_for("admin_community_highlights", status="featured"))

    @app.route(f"{admin_route_prefix}/community-highlights/<int:highlight_id>/status", methods=["POST"])
    @admin_required
    def admin_community_highlight_status(highlight_id):
        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_community_highlights"))

        current_item = load_admin_community_highlight(highlight_id)
        if current_item is None:
            return redirect(url_for("admin_community_highlights"))

        current_status = str(current_item.get("status") or "").strip().lower()
        status_action = str(request.form.get("status_action") or "").strip().lower()
        transitions = {
            "post": {
                "from": "draft",
                "payload": {"status": "active", "is_published": True, "is_featured": False},
                "result": "posted",
            },
            "restore": {
                "from": "archived",
                "payload": {"status": "draft", "is_published": False, "is_featured": False},
                "result": "restored",
            },
        }
        transition = transitions.get(status_action)
        if transition is None or current_status != transition["from"]:
            return redirect(url_for("admin_community_highlights"))

        try:
            update_community_highlight(highlight_id, transition["payload"])
        except Exception as exc:
            app.logger.exception(
                "Failed to apply '%s' status action to community highlight %s: %s",
                status_action,
                highlight_id,
                exc,
            )
            return redirect(url_for("admin_community_highlights"))

        return redirect(
            url_for(
                "admin_community_highlights",
                filter=str(request.form.get("return_filter") or "all").strip().lower(),
                status=transition["result"],
            )
        )

    @app.route(f"{admin_route_prefix}/community-highlights/<int:highlight_id>/delete", methods=["POST"])
    @admin_required
    def admin_community_highlight_delete(highlight_id):
        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_community_highlights"))

        current_item = load_admin_community_highlight(highlight_id)
        if current_item is None:
            return redirect(url_for("admin_community_highlights"))

        try:
            update_community_highlight(highlight_id, {"status": "archived", "is_published": False, "is_featured": False})
        except Exception as exc:
            app.logger.exception("Failed to archive community highlight %s: %s", highlight_id, exc)
            return redirect(url_for("admin_community_highlights"))

        if request.form.get("return_to") == "view":
            return redirect(url_for("admin_community_highlight_view", highlight_id=highlight_id, status="archived"))
        return redirect(url_for("admin_community_highlights", status="archived"))

    @app.route("/community-highlights/<slug>")
    def community_highlight_detail(slug):
        highlight_item = load_published_community_highlight(slug)
        if highlight_item is None:
            return redirect(url_for("community_participation"))
        related_highlights = [
            item
            for item in load_news_community_highlights(limit=8)
            if str(item.get("slug") or "").strip() != str(highlight_item.get("slug") or "").strip()
        ][:4]
        return render_template(
            "CommunityHighlightDetail.html",
            highlight_item=highlight_item,
            related_highlights=related_highlights,
        )

    @app.route("/community-events/<slug>")
    @public_login_required
    def community_event_detail(slug):
        event_item = load_published_community_event(slug)
        if event_item is None:
            return redirect(url_for("community_participation"))
        return render_template("CommunityEventDetail.html", event_item=event_item)

    @app.route("/news")
    def news():
        return redirect(url_for("community_participation"))
