from __future__ import annotations

import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from flask import jsonify, redirect, render_template, request, session, url_for

from participation_submissions_repository import (
    create_participation_submission,
    delete_participation_submission,
    find_recent_participation_submission_by_email,
    get_participation_submission_by_id,
    update_participation_submission,
)
from supabase_client import is_supabase_configured

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


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _hash_verification_code(code: str) -> str:
    return hashlib.sha256(str(code or "").encode("utf-8")).hexdigest()


def _generate_verification_code() -> str:
    return f"{secrets.randbelow(900000) + 100000}"


def _is_valid_email(value: Any) -> bool:
    return bool(EMAIL_PATTERN.match(str(value or "").strip()))


def _validate_public_submission(form, files, *, save_uploaded_image, save_uploaded_file):
    submission_type = str(form.get("submission_type") or "").strip().lower()
    submitter_name = str(form.get("submitter_name") or "").strip()
    submitter_email = str(form.get("submitter_email") or "").strip().lower()
    is_private = str(form.get("is_private") or "").strip().lower() in {"1", "true", "on", "yes"}

    if submission_type not in {"teacher_corner", "story_submit"}:
        raise ValueError("Please choose a valid submission type.")
    if len(submitter_name) < 2:
        raise ValueError("Name must be at least 2 characters.")
    if not _is_valid_email(submitter_email):
        raise ValueError("Please provide a valid email address.")

    payload = {
        "submission_type": submission_type,
        "submitter_name": submitter_name,
        "submitter_email": submitter_email,
        "is_private": is_private,
        "resource_category": "",
        "story_category": "",
        "grade_level": "",
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
        grade_level = str(form.get("grade_level") or "").strip()
        subject_topic = str(form.get("subject_topic") or "").strip()
        description = str(form.get("description") or "").strip()
        if len(title) < 3:
            raise ValueError("Material title must be at least 3 characters.")
        if len(grade_level) < 2:
            raise ValueError("Grade level is required.")
        if len(subject_topic) < 2:
            raise ValueError("Subject / topic is required.")
        if len(description) < 12:
            raise ValueError("Material description must be at least 12 characters.")
        uploaded_file = files.get("resource_file")
        uploaded_file_name = save_uploaded_file(
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
                "grade_level": grade_level,
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
        uploaded_photo_name = save_uploaded_image(uploaded_photo, title, PARTICIPATION_SUBMISSIONS_UPLOAD_DIR)
        payload.update(
            {
                "title": title,
                "resource_category": "Books",
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
):
    @app.route("/community-participation/submissions/request-verification", methods=["POST"])
    def community_participation_request_verification():
        if not is_supabase_configured():
            return jsonify({"ok": False, "error": "Supabase participation submissions integration is not configured."}), 503
        if not is_participation_email_configured():
            return jsonify({"ok": False, "error": "Email verification is not configured yet. Set the SMTP environment variables first."}), 503

        recent_window_start = (_utcnow() - timedelta(minutes=VERIFICATION_WINDOW_MINUTES)).isoformat()
        recent_submission = find_recent_participation_submission_by_email(
            str(request.form.get("submitter_email") or "").strip().lower(),
            since_iso=recent_window_start,
        )
        if recent_submission is not None:
            can_verify = str(recent_submission.get("status") or "") == "pending_verification"
            return jsonify(
                {
                    "ok": False,
                    "error": "A verification code was already sent to this email within the last 30 minutes.",
                    "submission_id": recent_submission.get("id"),
                    "requires_verification": can_verify,
                }
            ), 429

        uploaded_file_name = None
        uploaded_photo_name = None
        try:
            payload, uploaded_file_name, uploaded_photo_name = _validate_public_submission(
                request.form,
                request.files,
                save_uploaded_image=save_uploaded_image,
                save_uploaded_file=save_uploaded_file,
            )
            verification_code = _generate_verification_code()
            expires_at = _utcnow() + timedelta(minutes=VERIFICATION_WINDOW_MINUTES)
            payload.update(
                {
                    "status": "pending_verification",
                    "verification_code_hash": _hash_verification_code(verification_code),
                    "verification_sent_at": _utcnow().isoformat(),
                    "verification_expires_at": expires_at.isoformat(),
                }
            )
            created_submission = create_participation_submission(payload)
            send_participation_verification_email(
                to_email=payload["submitter_email"],
                recipient_name=payload["submitter_name"],
                verification_code=verification_code,
                valid_minutes=VERIFICATION_WINDOW_MINUTES,
            )
            return jsonify(
                {
                    "ok": True,
                    "submission_id": created_submission.get("id"),
                    "message": "We sent a verification code to your email. Enter it below to complete your submission.",
                }
            )
        except ValueError as exc:
            if uploaded_file_name:
                delete_local_image(uploaded_file_name, PARTICIPATION_SUBMISSIONS_UPLOAD_DIR)
            if uploaded_photo_name:
                delete_local_image(uploaded_photo_name, PARTICIPATION_SUBMISSIONS_UPLOAD_DIR)
            return jsonify({"ok": False, "error": str(exc)}), 400
        except EmailDeliveryError as exc:
            if uploaded_file_name:
                delete_local_image(uploaded_file_name, PARTICIPATION_SUBMISSIONS_UPLOAD_DIR)
            if uploaded_photo_name:
                delete_local_image(uploaded_photo_name, PARTICIPATION_SUBMISSIONS_UPLOAD_DIR)
            if 'created_submission' in locals() and created_submission.get("id"):
                delete_participation_submission(int(created_submission.get("id")))
            return jsonify({"ok": False, "error": str(exc)}), 503
        except Exception as exc:
            if uploaded_file_name:
                delete_local_image(uploaded_file_name, PARTICIPATION_SUBMISSIONS_UPLOAD_DIR)
            if uploaded_photo_name:
                delete_local_image(uploaded_photo_name, PARTICIPATION_SUBMISSIONS_UPLOAD_DIR)
            if 'created_submission' in locals() and created_submission.get("id"):
                delete_participation_submission(int(created_submission.get("id")))
            app.logger.exception("Failed to create community participation submission: %s", exc)
            return jsonify({"ok": False, "error": "Could not start the verification right now."}), 500

    @app.route("/community-participation/submissions/verify", methods=["POST"])
    def community_participation_verify_submission():
        if not is_supabase_configured():
            return jsonify({"ok": False, "error": "Supabase participation submissions integration is not configured."}), 503

        submission_id = request.form.get("submission_id")
        email = str(request.form.get("submitter_email") or "").strip().lower()
        verification_code = str(request.form.get("verification_code") or "").strip()
        if not str(submission_id or "").strip().isdigit():
            return jsonify({"ok": False, "error": "Invalid submission reference."}), 400
        if not _is_valid_email(email):
            return jsonify({"ok": False, "error": "Please provide a valid email address."}), 400
        if not verification_code:
            return jsonify({"ok": False, "error": "Please enter the verification code."}), 400

        submission = get_participation_submission_by_id(int(submission_id))
        if submission is None:
            return jsonify({"ok": False, "error": "Submission not found."}), 404
        if str(submission.get("submitter_email") or "").strip().lower() != email:
            return jsonify({"ok": False, "error": "The email address does not match this submission."}), 400
        if str(submission.get("status") or "") != "pending_verification":
            return jsonify({"ok": False, "error": "This submission no longer needs verification."}), 400

        expires_at_raw = str(submission.get("verification_expires_at") or "").strip()
        expires_at = None
        if expires_at_raw:
            try:
                expires_at = datetime.fromisoformat(expires_at_raw.replace("Z", "+00:00"))
            except ValueError:
                expires_at = None
        if expires_at is not None and expires_at < _utcnow():
            return jsonify({"ok": False, "error": "Your verification code has expired. Please wait and submit again after 30 minutes."}), 400
        if _hash_verification_code(verification_code) != str(submission.get("verification_code_hash") or ""):
            return jsonify({"ok": False, "error": "The verification code is incorrect."}), 400

        update_participation_submission(
            int(submission_id),
            {
                "status": "pending_review",
                "verified_at": _utcnow().isoformat(),
                "verification_code_hash": None,
            },
        )
        return jsonify({"ok": True, "message": "Your submission has been verified and sent to admin for review."})

    @app.route(f"{admin_route_prefix}/community-participation-submissions")
    @admin_required
    def admin_participation_submissions():
        csrf_token = ensure_admin_csrf_token()
        current_admin_username = session.get(admin_session_user_key, admin_username)
        submissions_items = load_admin_participation_submissions()
        pending_review_items = [item for item in submissions_items if item.get("status") == "pending_review"]
        active_items = [item for item in submissions_items if item.get("status") == "active"]
        archived_items = [item for item in submissions_items if item.get("status") == "archived"]
        awaiting_verification_items = [item for item in submissions_items if item.get("status") == "pending_verification"]
        status_message = get_participation_submissions_status_message(request.args.get("status"))
        config_error = None if is_supabase_configured() else "Supabase participation submissions integration is not configured."
        email_config_error = None if is_participation_email_configured() else "SMTP email verification is not configured yet."
        return render_template(
            "admin/AdminParticipationSubmissions.html",
            csrf_token=csrf_token,
            admin_username=current_admin_username,
            submissions_items=submissions_items,
            pending_review_items=pending_review_items,
            active_items=active_items,
            archived_items=archived_items,
            awaiting_verification_items=awaiting_verification_items,
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
        if moderation_action not in {"approve", "archive"}:
            return render_admin_participation_submission_review(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                submission_item=submission_item,
                error_message="Please choose a valid moderation action.",
            )
        if submission_item.get("status") == "pending_verification":
            return render_admin_participation_submission_review(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                submission_item=submission_item,
                error_message="This submission has not completed email verification yet.",
            )

        next_status = "active" if moderation_action == "approve" else "archived"
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

        return redirect(url_for("admin_participation_submissions", status="approved" if next_status == "active" else "archived"))
