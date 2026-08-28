from __future__ import annotations

import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from flask import jsonify, redirect, render_template, request, session, url_for

from admin_notifications_content import dispatch_admin_notification
from participation_submissions_repository import (
    create_participation_submission,
    delete_participation_submission,
    find_recent_participation_submission_by_email,
    get_participation_submission_by_id,
    update_participation_submission,
)
from supabase_client import is_supabase_configured
from media_upload_content import MEDIA_UPLOAD_MAX_BYTES, discard_direct_uploads, validate_direct_upload_reference

from .emailer import EmailDeliveryError, is_participation_email_configured, send_participation_verification_email
from .service import (
    PARTICIPATION_SUBMISSIONS_UPLOAD_DIR,
    build_submission_excerpt,
    get_participation_submissions_status_message,
    infer_teacher_resource_category,
    load_admin_participation_submission,
    load_admin_participation_submissions,
    render_admin_participation_submission_review,
)


VERIFICATION_WINDOW_MINUTES = 30
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
TEACHER_ALLOWED_EXTENSIONS = {".pdf", ".docx", ".ppt", ".pptx"}
ADMIN_SUBMISSION_STATUSES = {"pending_verification", "pending_review", "active", "archived"}


def _get_uploaded_file_size(file_storage) -> int:
    if file_storage is None or not str(getattr(file_storage, "filename", "") or "").strip():
        return 0
    stream = getattr(file_storage, "stream", None)
    if stream is None:
        raise ValueError("The selected upload size could not be verified.")
    try:
        original_position = stream.tell()
        stream.seek(0, 2)
        size = int(stream.tell())
        stream.seek(original_position)
    except (AttributeError, OSError, TypeError, ValueError) as exc:
        raise ValueError("The selected upload size could not be verified.") from exc
    return max(0, size)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _hash_verification_code(code: str) -> str:
    return hashlib.sha256(str(code or "").encode("utf-8")).hexdigest()


def _generate_verification_code() -> str:
    return f"{secrets.randbelow(900000) + 100000}"


def _is_valid_email(value: Any) -> bool:
    return bool(EMAIL_PATTERN.match(str(value or "").strip()))


def _validate_public_submission(form, files, current_user, *, save_uploaded_image, save_uploaded_file):
    submission_type = str(form.get("submission_type") or "").strip().lower()
    is_private = str(form.get("is_private") or "").strip().lower() in {"1", "true", "on", "yes"}

    if submission_type not in {"teacher_corner", "story_submit"}:
        raise ValueError("Please choose a valid submission type.")
    submitter_name = str(current_user.get("full_name") or "").strip()
    submitter_email = str(current_user.get("email") or "").strip().lower()
    if len(submitter_name) < 2:
        raise ValueError("Your account needs a valid name before you can submit.")
    if not _is_valid_email(submitter_email):
        raise ValueError("Your account needs a valid email before you can submit.")

    payload = {
        "user_id": int(current_user.get("id")),
        "submission_type": submission_type,
        "submitter_name": submitter_name,
        "submitter_email": submitter_email,
        "is_private": is_private,
        "resource_category": "",
        "story_category": "",
        "subject_topic": "",
        "description": "",
        "story_content": "",
        "resource_file_filename": None,
        "photo_filename": None,
    }
    uploaded_file_name = None
    uploaded_photo_name = None

    if submission_type == "teacher_corner":
        title = str(form.get("title") or "").strip()
        subject_topic = str(form.get("subject_topic") or "").strip()
        description = str(form.get("description") or "").strip()
        if len(title) < 3:
            raise ValueError("Material title must be at least 3 characters.")
        if len(subject_topic) < 2:
            raise ValueError("Subject / topic is required.")
        if len(description) < 12:
            raise ValueError("Material description must be at least 12 characters.")
        uploaded_file = files.get("resource_file")
        direct_path = str(form.get("resource_object_path") or "").strip()
        direct_upload = (
            validate_direct_upload_reference(
                direct_path,
                "participation_teacher_file",
                audience="public",
                owner_id=current_user.get("id"),
            )
            if direct_path
            else None
        )
        if _get_uploaded_file_size(uploaded_file) > MEDIA_UPLOAD_MAX_BYTES:
            raise ValueError("The classroom material exceeds the 25 MB upload limit.")
        uploaded_file_name = direct_upload["path"] if direct_upload else save_uploaded_file(
            uploaded_file,
            title,
            PARTICIPATION_SUBMISSIONS_UPLOAD_DIR,
            TEACHER_ALLOWED_EXTENSIONS,
            "Teacher Corner upload must be a .pdf, .docx, .ppt, or .pptx file.",
        )
        category = infer_teacher_resource_category(uploaded_file_name)
        if not uploaded_file_name or not category:
            raise ValueError("Please upload a valid .pdf, .docx, .ppt, or .pptx file.")
        payload.update(
            {
                "title": title,
                "resource_category": category,
                "subject_topic": subject_topic,
                "description": description,
                "resource_file_filename": uploaded_file_name,
            }
        )
    else:
        title = str(form.get("story_title") or "").strip()
        story_category = str(form.get("story_category") or form.get("category") or "").strip()
        story_content = str(form.get("story_content") or "").strip()
        if len(title) < 3:
            raise ValueError("Story title must be at least 3 characters.")
        if len(story_category) < 3:
            raise ValueError("Please choose a story category.")
        if len(story_content) < 40:
            raise ValueError("Story content must be at least 40 characters.")
        uploaded_photo = files.get("photo")
        direct_path = str(form.get("photo_object_path") or "").strip()
        direct_upload = (
            validate_direct_upload_reference(
                direct_path,
                "participation_story_photo",
                audience="public",
                owner_id=current_user.get("id"),
            )
            if direct_path
            else None
        )
        if _get_uploaded_file_size(uploaded_photo) > MEDIA_UPLOAD_MAX_BYTES:
            raise ValueError("The story photo exceeds the 25 MB upload limit.")
        uploaded_photo_name = direct_upload["path"] if direct_upload else save_uploaded_image(
            uploaded_photo, title, PARTICIPATION_SUBMISSIONS_UPLOAD_DIR
        )
        payload.update(
            {
                "title": title,
                "resource_category": "Story",
                "story_category": story_category,
                "description": build_submission_excerpt(story_content),
                "story_content": story_content,
                "photo_filename": uploaded_photo_name,
            }
        )

    return payload, uploaded_file_name, uploaded_photo_name


def register_participation_submission_routes(
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
    public_login_required,
    is_public_csrf_valid,
    get_current_public_user,
    consume_public_action_rate_limit,
):
    def cleanup_pending_direct_uploads(current_user, saved_paths: set[str]) -> None:
        candidates = [
            {
                "purpose": "participation_teacher_file",
                "path": str(request.form.get("resource_object_path") or "").strip(),
            },
            {
                "purpose": "participation_story_photo",
                "path": str(request.form.get("photo_object_path") or "").strip(),
            },
        ]
        candidates = [item for item in candidates if item["path"] and item["path"] not in saved_paths]
        if not candidates:
            return
        try:
            discard_direct_uploads(candidates, audience="public", owner_id=current_user.get("id"))
        except Exception:
            pass

    @app.route("/community-participation/submissions", methods=["POST"])
    @public_login_required
    def community_participation_create_submission():
        if not is_supabase_configured():
            return jsonify({"ok": False, "error": "Supabase participation submissions integration is not configured."}), 503
        if not is_public_csrf_valid(request.headers.get("X-CSRF-Token") or request.form.get("csrf_token")):
            return jsonify({"ok": False, "error": "Invalid request."}), 400

        retry_after = consume_public_action_rate_limit("participation-submission")
        if retry_after:
            return jsonify({"ok": False, "error": f"Too many submissions. Try again in {retry_after} seconds."}), 429

        current_user = get_current_public_user()
        if not current_user:
            return jsonify({"ok": False, "error": "Please sign in to submit participation content.", "login_required": True}), 401

        uploaded_file_name = None
        uploaded_photo_name = None
        try:
            payload, uploaded_file_name, uploaded_photo_name = _validate_public_submission(
                request.form,
                request.files,
                current_user,
                save_uploaded_image=save_uploaded_image,
                save_uploaded_file=save_uploaded_file,
            )
            payload.update(
                {
                    "status": "pending_review",
                    "verification_code_hash": None,
                    "verification_sent_at": None,
                    "verification_expires_at": None,
                    "verified_at": _utcnow().isoformat(),
                }
            )
            created_submission = create_participation_submission(payload)
            is_teacher_submission = payload["submission_type"] == "teacher_corner"
            dispatch_admin_notification(
                event_type="teacher_submission" if is_teacher_submission else "story_submission",
                source_id=int(created_submission["id"]),
                title=(
                    "New Teacher Corner submission"
                    if is_teacher_submission
                    else "New community story submission"
                ),
                message=f"{payload['submitter_name']} submitted “{payload['title']}” for administrator review.",
                target_url=url_for(
                    "admin_participation_submission_review",
                    submission_id=int(created_submission["id"]),
                ),
            )
            return jsonify({"ok": True, "message": "Your submission has been sent to admin for review."})
        except ValueError as exc:
            if uploaded_file_name:
                delete_local_image(uploaded_file_name, PARTICIPATION_SUBMISSIONS_UPLOAD_DIR)
            if uploaded_photo_name:
                delete_local_image(uploaded_photo_name, PARTICIPATION_SUBMISSIONS_UPLOAD_DIR)
            cleanup_pending_direct_uploads(
                current_user, {path for path in (uploaded_file_name, uploaded_photo_name) if path}
            )
            return jsonify({"ok": False, "error": str(exc)}), 400
        except Exception as exc:
            if uploaded_file_name:
                delete_local_image(uploaded_file_name, PARTICIPATION_SUBMISSIONS_UPLOAD_DIR)
            if uploaded_photo_name:
                delete_local_image(uploaded_photo_name, PARTICIPATION_SUBMISSIONS_UPLOAD_DIR)
            cleanup_pending_direct_uploads(
                current_user, {path for path in (uploaded_file_name, uploaded_photo_name) if path}
            )
            app.logger.exception("Failed to create community participation submission: %s", exc)
            return jsonify({"ok": False, "error": "Could not submit your participation content right now."}), 500

    @app.route("/community-participation/submissions/verify", methods=["POST"])
    def community_participation_verify_submission():
        return jsonify({"ok": False, "error": "Email verification is no longer required. Submit while signed in instead."}), 410

    @app.route(f"{admin_route_prefix}/community-participation-submissions")
    @admin_required
    def admin_participation_submissions():
        csrf_token = ensure_admin_csrf_token()
        current_admin_username = session.get(admin_session_user_key, admin_username)
        submissions_items = load_admin_participation_submissions()
        status_filter = str(request.args.get("filter") or "all").strip().lower()
        if status_filter not in ADMIN_SUBMISSION_STATUSES | {"all"}:
            status_filter = "all"
        status_message = get_participation_submissions_status_message(request.args.get("status"))
        config_error = None if is_supabase_configured() else "Supabase participation submissions integration is not configured."
        email_config_error = None
        return render_template(
            "admin/AdminParticipationSubmissions.html",
            csrf_token=csrf_token,
            admin_username=current_admin_username,
            submissions_items=submissions_items,
            status_filter=status_filter,
            status_message=status_message,
            config_error=config_error,
            email_config_error=email_config_error,
        )

    @app.route(f"{admin_route_prefix}/community-participation-submissions/<int:submission_id>", methods=["GET", "POST"])
    @admin_required
    def admin_participation_submission_review(submission_id):
        submission_item = load_admin_participation_submission(submission_id)
        if submission_item is None:
            return redirect(url_for("admin_participation_submissions"))

        if request.method == "GET":
            return render_admin_participation_submission_review(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                submission_item=submission_item,
            )

        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_participation_submissions"))

        moderation_action = str(request.form.get("moderation_action") or "").strip().lower()
        transitions = {
            "approve": {
                "from": {"pending_review"},
                "status": "active",
                "result": "approved",
            },
            "archive": {
                "from": {"pending_review", "active"},
                "status": "archived",
                "result": "archived",
            },
            "restore": {
                "from": {"archived"},
                "status": "pending_review",
                "result": "restored",
            },
        }
        transition = transitions.get(moderation_action)
        current_status = str(submission_item.get("status") or "").strip().lower()
        if transition is None or current_status not in transition["from"]:
            return render_admin_participation_submission_review(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                submission_item=submission_item,
                error_message="This moderation action is not available for the submission's current status.",
            )
        if current_status == "pending_verification":
            return render_admin_participation_submission_review(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                submission_item=submission_item,
                error_message="This submission has not completed email verification yet.",
            )

        next_status = transition["status"]
        try:
            update_participation_submission(
                submission_id,
                {
                    "status": next_status,
                    "reviewed_at": _utcnow().isoformat(),
                    "reviewed_by": session.get(admin_session_user_key, admin_username),
                },
            )
        except Exception as exc:
            app.logger.exception("Failed to moderate participation submission %s: %s", submission_id, exc)
            return render_admin_participation_submission_review(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                submission_item=submission_item,
                error_message="Could not update the submission right now.",
            )

        return redirect(
            url_for(
                "admin_participation_submissions",
                filter=str(request.form.get("return_filter") or "all").strip().lower(),
                status=transition["result"],
            )
        )
