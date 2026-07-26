from __future__ import annotations

from pathlib import Path
from typing import Any, Callable

from flask import redirect, render_template, request, session, url_for

from edu_resources_repository import create_edu_resource, list_all_edu_resources, update_edu_resource
from supabase_client import is_supabase_configured

from .service import (
    EDU_RESOURCES_UPLOAD_DIR,
    EDU_RESOURCES_UPLOAD_MAX_BYTES,
    EDU_RESOURCE_CATEGORIES,
    EDU_RESOURCE_STATUS_OPTIONS,
    build_edu_resource_form_state,
    get_edu_resources_status_message,
    load_admin_edu_resource,
    load_admin_edu_resources,
    render_admin_edu_resource_form,
)


CATEGORY_ALLOWED_EXTENSIONS = {
    "PPT": ({".ppt", ".pptx"}, "PowerPoint upload must be a .ppt or .pptx file."),
    "DOCS": ({".docx"}, "Document upload must be a .docx file."),
    "PDF": ({".pdf"}, "Document upload must be a .pdf file."),
}
EDU_RESOURCE_STATUSES = set(EDU_RESOURCE_STATUS_OPTIONS)


def _get_uploaded_file_size(file_storage) -> int:
    if file_storage is None or not str(getattr(file_storage, "filename", "") or "").strip():
        return 0

    stream = getattr(file_storage, "stream", None)
    if stream is None:
        raise ValueError("The selected upload size could not be verified.")

    try:
        original_position = stream.tell()
        stream.seek(0, 2)
        file_size = int(stream.tell())
        stream.seek(original_position)
    except (AttributeError, OSError, TypeError, ValueError) as exc:
        raise ValueError("The selected upload size could not be verified.") from exc

    return max(0, file_size)


def _matches_allowed_extension(file_name: Any, allowed_extensions: set[str]) -> bool:
    extension = Path(str(file_name or "").strip()).suffix.lower()
    return bool(extension and extension in allowed_extensions)


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


def _build_unique_edu_resource_slug(title: str, *, current_id: int | None, slugify_text: Callable[[str, str], str]) -> str:
    return _build_unique_slug(
        title,
        fallback="edu-resource",
        current_id=current_id,
        list_items=list_all_edu_resources,
        slugify_text=slugify_text,
    )


def _build_edu_resource_form_payload(form, files, *, current_item, save_uploaded_image, save_uploaded_file, slugify_text):
    title = str(form.get("title") or "").strip()
    category = str(form.get("category") or "").strip()
    status = str(form.get("status") or "draft").strip().lower()
    description = str(form.get("description") or "").strip()
    author = str(form.get("author") or "").strip()
    year_label = str(form.get("year_label") or "").strip()
    educator_name = str(form.get("educator_name") or "").strip()
    grade_level = str(form.get("grade_level") or "").strip()
    subject_topic = str(form.get("subject_topic") or "").strip()

    if len(title) < 3:
        raise ValueError("Title must be at least 3 characters.")
    if category not in EDU_RESOURCE_CATEGORIES:
        raise ValueError("Please choose a valid category.")
    if status not in EDU_RESOURCE_STATUS_OPTIONS:
        raise ValueError("Please choose a valid publishing status.")
    if len(description) < 12:
        raise ValueError("Material description must be at least 12 characters.")

    payload = {
        "title": title,
        "slug": _build_unique_edu_resource_slug(
            title,
            current_id=current_item.get("id") if current_item else None,
            slugify_text=slugify_text,
        ),
        "category": category,
        "description": description,
        "status": status,
        "is_published": status == "active",
        "author": "",
        "year_label": "",
        "educator_name": "",
        "grade_level": "",
        "subject_topic": "",
        "file_filename": None,
        "cover_image_filename": None,
    }

    new_file_filename = None
    new_cover_image_filename = None
    uploaded_file = files.get("resource_file")
    uploaded_cover = files.get("cover_image_file")
    upload_size_bytes = _get_uploaded_file_size(uploaded_file) + _get_uploaded_file_size(uploaded_cover)
    if upload_size_bytes > EDU_RESOURCES_UPLOAD_MAX_BYTES:
        upload_size_mb = upload_size_bytes / (1024 * 1024)
        max_upload_mb = EDU_RESOURCES_UPLOAD_MAX_BYTES / (1024 * 1024)
        raise ValueError(
            f"The selected upload is {upload_size_mb:.2f} MB. "
            f"Keep each save at or below {max_upload_mb:.1f} MB to stay within Vercel's upload limit."
        )

    if category == "Books":
        if len(author) < 2:
            raise ValueError("Author must be at least 2 characters.")
        if len(year_label) < 4:
            raise ValueError("Year must be at least 4 characters.")
        payload["author"] = author
        payload["year_label"] = year_label

        new_cover_image_filename = save_uploaded_image(uploaded_cover, title, EDU_RESOURCES_UPLOAD_DIR)
        if new_cover_image_filename:
            payload["cover_image_filename"] = new_cover_image_filename
        elif current_item and current_item.get("cover_image_filename"):
            payload["cover_image_filename"] = current_item.get("cover_image_filename")
        else:
            raise ValueError("Please upload a book cover image.")
    else:
        if len(educator_name) < 2:
            raise ValueError("Educator name / source must be at least 2 characters.")
        if len(grade_level) < 2:
            raise ValueError("Grade level must be at least 2 characters.")
        if len(subject_topic) < 2:
            raise ValueError("Subject / topic must be at least 2 characters.")

        payload["educator_name"] = educator_name
        payload["grade_level"] = grade_level
        payload["subject_topic"] = subject_topic

        allowed_extensions, invalid_type_message = CATEGORY_ALLOWED_EXTENSIONS[category]
        new_file_filename = save_uploaded_file(
            uploaded_file,
            title,
            EDU_RESOURCES_UPLOAD_DIR,
            allowed_extensions,
            invalid_type_message,
        )
        if new_file_filename:
            payload["file_filename"] = new_file_filename
        elif current_item and current_item.get("file_filename") and _matches_allowed_extension(current_item.get("file_filename"), allowed_extensions):
            payload["file_filename"] = current_item.get("file_filename")
        else:
            raise ValueError("Please upload the resource file for this category.")

    return payload, new_file_filename, new_cover_image_filename


def register_edu_resources_routes(
    app,
    *,
    admin_route_prefix: str,
    admin_required,
    ensure_admin_csrf_token,
    is_admin_csrf_valid,
    admin_session_user_key: str,
    admin_username: str,
    save_uploaded_image,
    save_uploaded_file,
    delete_local_image,
    slugify_text,
):
    @app.route(f"{admin_route_prefix}/edu-resources")
    @admin_required
    def admin_edu_resources():
        csrf_token = ensure_admin_csrf_token()
        current_admin_username = session.get(admin_session_user_key, admin_username)
        resources_items = load_admin_edu_resources()
        status_filter = str(request.args.get("filter") or "all").strip().lower()
        if status_filter not in EDU_RESOURCE_STATUSES | {"all"}:
            status_filter = "all"
        status_message = get_edu_resources_status_message(request.args.get("status"))
        config_error = None if is_supabase_configured() else "Supabase edu resources integration is not configured."
        return render_template(
            "admin/AdminEduResources.html",
            csrf_token=csrf_token,
            admin_username=current_admin_username,
            resources_items=resources_items,
            status_filter=status_filter,
            status_message=status_message,
            config_error=config_error,
        )

    @app.route(f"{admin_route_prefix}/edu-resources/<int:item_id>")
    @admin_required
    def admin_edu_resource_view(item_id):
        resource_item = load_admin_edu_resource(item_id)
        if resource_item is None:
            return redirect(url_for("admin_edu_resources"))

        return render_template(
            "admin/AdminEduResourcesView.html",
            csrf_token=ensure_admin_csrf_token(),
            admin_username=session.get(admin_session_user_key, admin_username),
            resource_item=resource_item,
            status_message=get_edu_resources_status_message(request.args.get("status")),
        )

    @app.route(f"{admin_route_prefix}/edu-resources/new", methods=["GET", "POST"])
    @admin_required
    def admin_edu_resource_new():
        if request.method == "GET":
            return render_admin_edu_resource_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Edu Resource",
                submit_label="Create Resource",
                form_action=url_for("admin_edu_resource_new"),
                resource_form=build_edu_resource_form_state({"status": "draft", "category": EDU_RESOURCE_CATEGORIES[0]}),
            )

        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_edu_resources"))

        if not is_supabase_configured():
            return render_admin_edu_resource_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Edu Resource",
                submit_label="Create Resource",
                form_action=url_for("admin_edu_resource_new"),
                resource_form=build_edu_resource_form_state(request.form),
                error_message="Supabase edu resources integration is not configured.",
            )

        new_file_filename = None
        new_cover_image_filename = None
        try:
            payload, new_file_filename, new_cover_image_filename = _build_edu_resource_form_payload(
                request.form,
                request.files,
                current_item=None,
                save_uploaded_image=save_uploaded_image,
                save_uploaded_file=save_uploaded_file,
                slugify_text=slugify_text,
            )
            create_edu_resource(payload)
        except ValueError as exc:
            if new_file_filename:
                delete_local_image(new_file_filename, EDU_RESOURCES_UPLOAD_DIR)
            if new_cover_image_filename:
                delete_local_image(new_cover_image_filename, EDU_RESOURCES_UPLOAD_DIR)
            return render_admin_edu_resource_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Edu Resource",
                submit_label="Create Resource",
                form_action=url_for("admin_edu_resource_new"),
                resource_form=build_edu_resource_form_state(request.form),
                error_message=str(exc),
            )
        except Exception as exc:
            if new_file_filename:
                delete_local_image(new_file_filename, EDU_RESOURCES_UPLOAD_DIR)
            if new_cover_image_filename:
                delete_local_image(new_cover_image_filename, EDU_RESOURCES_UPLOAD_DIR)
            app.logger.exception("Failed to create edu resource: %s", exc)
            return render_admin_edu_resource_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Create Edu Resource",
                submit_label="Create Resource",
                form_action=url_for("admin_edu_resource_new"),
                resource_form=build_edu_resource_form_state(request.form),
                error_message="Could not create the edu resource right now.",
            )

        return redirect(url_for("admin_edu_resources", status="created"))

    @app.route(f"{admin_route_prefix}/edu-resources/<int:item_id>/edit", methods=["GET", "POST"])
    @admin_required
    def admin_edu_resource_edit(item_id):
        current_item = load_admin_edu_resource(item_id)
        if current_item is None:
            return redirect(url_for("admin_edu_resources"))

        if request.method == "GET":
            return render_admin_edu_resource_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Edit Edu Resource",
                submit_label="Save Changes",
                form_action=url_for("admin_edu_resource_edit", item_id=item_id),
                resource_form=build_edu_resource_form_state(current_item),
            )

        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_edu_resources"))

        previous_file_filename = current_item.get("file_filename")
        previous_cover_image_filename = current_item.get("cover_image_filename")
        new_file_filename = None
        new_cover_image_filename = None
        try:
            payload, new_file_filename, new_cover_image_filename = _build_edu_resource_form_payload(
                request.form,
                request.files,
                current_item=current_item,
                save_uploaded_image=save_uploaded_image,
                save_uploaded_file=save_uploaded_file,
                slugify_text=slugify_text,
            )
            update_edu_resource(item_id, payload)
            if new_file_filename and previous_file_filename and previous_file_filename != new_file_filename:
                delete_local_image(previous_file_filename, EDU_RESOURCES_UPLOAD_DIR)
            if new_cover_image_filename and previous_cover_image_filename and previous_cover_image_filename != new_cover_image_filename:
                delete_local_image(previous_cover_image_filename, EDU_RESOURCES_UPLOAD_DIR)
            if payload.get("category") == "Books" and previous_file_filename:
                delete_local_image(previous_file_filename, EDU_RESOURCES_UPLOAD_DIR)
            if payload.get("category") != "Books" and previous_cover_image_filename:
                delete_local_image(previous_cover_image_filename, EDU_RESOURCES_UPLOAD_DIR)
        except ValueError as exc:
            if new_file_filename:
                delete_local_image(new_file_filename, EDU_RESOURCES_UPLOAD_DIR)
            if new_cover_image_filename:
                delete_local_image(new_cover_image_filename, EDU_RESOURCES_UPLOAD_DIR)
            return render_admin_edu_resource_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Edit Edu Resource",
                submit_label="Save Changes",
                form_action=url_for("admin_edu_resource_edit", item_id=item_id),
                resource_form=build_edu_resource_form_state({**current_item, **request.form}),
                error_message=str(exc),
            )
        except Exception as exc:
            if new_file_filename:
                delete_local_image(new_file_filename, EDU_RESOURCES_UPLOAD_DIR)
            if new_cover_image_filename:
                delete_local_image(new_cover_image_filename, EDU_RESOURCES_UPLOAD_DIR)
            app.logger.exception("Failed to update edu resource %s: %s", item_id, exc)
            return render_admin_edu_resource_form(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                form_title="Edit Edu Resource",
                submit_label="Save Changes",
                form_action=url_for("admin_edu_resource_edit", item_id=item_id),
                resource_form=build_edu_resource_form_state({**current_item, **request.form}),
                error_message="Could not update the edu resource right now.",
            )

        return redirect(url_for("admin_edu_resources", status="updated"))

    @app.route(f"{admin_route_prefix}/edu-resources/<int:item_id>/status", methods=["POST"])
    @admin_required
    def admin_edu_resource_status(item_id):
        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_edu_resources"))

        current_item = load_admin_edu_resource(item_id)
        if current_item is None:
            return redirect(url_for("admin_edu_resources"))

        current_status = str(current_item.get("status") or "").strip().lower()
        status_action = str(request.form.get("status_action") or "").strip().lower()
        transitions = {
            "activate": {
                "from": "draft",
                "payload": {"status": "active", "is_published": True},
                "result": "activated",
            },
            "restore": {
                "from": "archived",
                "payload": {"status": "draft", "is_published": False},
                "result": "restored",
            },
        }
        transition = transitions.get(status_action)
        if transition is None or current_status != transition["from"]:
            return redirect(url_for("admin_edu_resources"))

        try:
            update_edu_resource(item_id, transition["payload"])
        except Exception as exc:
            app.logger.exception(
                "Failed to apply '%s' status action to edu resource %s: %s",
                status_action,
                item_id,
                exc,
            )
            return redirect(url_for("admin_edu_resources"))

        if request.form.get("return_to") == "view":
            return redirect(
                url_for(
                    "admin_edu_resource_view",
                    item_id=item_id,
                    status=transition["result"],
                )
            )

        return redirect(
            url_for(
                "admin_edu_resources",
                filter=str(request.form.get("return_filter") or "all").strip().lower(),
                status=transition["result"],
            )
        )

    @app.route(f"{admin_route_prefix}/edu-resources/<int:item_id>/delete", methods=["POST"])
    @admin_required
    def admin_edu_resource_delete(item_id):
        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_edu_resources"))

        current_item = load_admin_edu_resource(item_id)
        if current_item is None:
            return redirect(url_for("admin_edu_resources"))
        if str(current_item.get("status") or "").strip().lower() == "archived":
            return redirect(url_for("admin_edu_resources", filter="archived"))

        try:
            update_edu_resource(item_id, {"status": "archived", "is_published": False})
        except Exception as exc:
            app.logger.exception("Failed to archive edu resource %s: %s", item_id, exc)
            return redirect(url_for("admin_edu_resources"))

        if request.form.get("return_to") == "view":
            return redirect(url_for("admin_edu_resource_view", item_id=item_id, status="archived"))
        return redirect(
            url_for(
                "admin_edu_resources",
                filter=str(request.form.get("return_filter") or "all").strip().lower(),
                status="archived",
            )
        )
