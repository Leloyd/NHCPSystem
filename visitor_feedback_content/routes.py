from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from flask import jsonify, redirect, render_template, request, session, url_for

from supabase_client import is_supabase_configured
from visitor_feedback_repository import create_visitor_feedback, update_visitor_feedback
from visitor_feedback_sentiment import analyze_feedback_sentiment

from .service import (
    VISITOR_FEEDBACK_STATUS_OPTIONS,
    build_visitor_feedback_analytics,
    get_visitor_feedback_status_message,
    load_admin_visitor_feedback,
    load_admin_visitor_feedback_item,
    render_admin_visitor_feedback_review,
)


VALID_VISIT_TYPES = {"on-site", "website"}
ADMIN_FEEDBACK_STATUSES = set(VISITOR_FEEDBACK_STATUS_OPTIONS)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _validate_visitor_feedback_payload(form) -> dict[str, Any]:
    visit_type = str(form.get("visit_type") or "").strip().lower()
    visitor_name = str(form.get("name") or "").strip()
    comments = str(form.get("comments") or "").strip()

    try:
        rating = int(str(form.get("rating") or "").strip())
    except ValueError as exc:
        raise ValueError("Please choose a valid rating.") from exc

    if visit_type not in VALID_VISIT_TYPES:
        raise ValueError("Please choose a valid visit type.")
    if rating < 1 or rating > 5:
        raise ValueError("Rating must be between 1 and 5.")
    if len(visitor_name) > 120:
        raise ValueError("Name must be 120 characters or fewer.")
    if len(comments) > 3000:
        raise ValueError("Comments must be 3000 characters or fewer.")

    return {
        "visit_type": visit_type,
        "rating": rating,
        "visitor_name": visitor_name,
        "comments": comments,
        "status": VISITOR_FEEDBACK_STATUS_OPTIONS[0],
    }


def register_visitor_feedback_routes(
    app,
    *,
    admin_route_prefix: str,
    admin_required,
    ensure_admin_csrf_token,
    is_admin_csrf_valid,
    admin_session_user_key: str,
    admin_username: str,
    public_login_required,
    is_public_csrf_valid,
    get_current_public_user,
    consume_public_action_rate_limit,
):
    @app.route("/community-participation/visitor-feedback", methods=["POST"])
    @public_login_required
    def community_participation_submit_visitor_feedback():
        if not is_supabase_configured():
            return jsonify({"ok": False, "error": "Supabase visitor feedback integration is not configured."}), 503
        if not is_public_csrf_valid(request.headers.get("X-CSRF-Token") or request.form.get("csrf_token")):
            return jsonify({"ok": False, "error": "Invalid request."}), 400

        retry_after = consume_public_action_rate_limit("visitor-feedback")
        if retry_after:
            return jsonify({"ok": False, "error": f"Too many feedback submissions. Try again in {retry_after} seconds."}), 429

        current_user = get_current_public_user()
        if not current_user:
            return jsonify({"ok": False, "error": "Please sign in to submit feedback.", "login_required": True}), 401

        try:
            payload = _validate_visitor_feedback_payload(request.form)
            payload["user_id"] = int(current_user.get("id"))
            if not str(payload.get("visitor_name") or "").strip():
                payload["visitor_name"] = str(current_user.get("full_name") or "").strip()
            payload.update(analyze_feedback_sentiment(payload.get("comments"), payload.get("rating")))
            create_visitor_feedback(payload)
            return jsonify({"ok": True, "message": "Thank you for sharing your experience. Your feedback was received."})
        except ValueError as exc:
            return jsonify({"ok": False, "error": str(exc)}), 400
        except Exception as exc:
            app.logger.exception("Failed to save visitor feedback: %s", exc)
            return jsonify({"ok": False, "error": "Could not submit your feedback right now."}), 500

    @app.route(f"{admin_route_prefix}/visitor-feedback")
    @admin_required
    def admin_visitor_feedback():
        csrf_token = ensure_admin_csrf_token()
        current_admin_username = session.get(admin_session_user_key, admin_username)
        feedback_items = load_admin_visitor_feedback()
        status_filter = str(request.args.get("filter") or "all").strip().lower()
        if status_filter not in ADMIN_FEEDBACK_STATUSES | {"all"}:
            status_filter = "all"
        feedback_analytics = build_visitor_feedback_analytics(feedback_items)
        status_message = get_visitor_feedback_status_message(request.args.get("status"))
        config_error = None if is_supabase_configured() else "Supabase visitor feedback integration is not configured."
        return render_template(
            "admin/AdminVisitorFeedback.html",
            csrf_token=csrf_token,
            admin_username=current_admin_username,
            feedback_items=feedback_items,
            status_filter=status_filter,
            feedback_analytics=feedback_analytics,
            status_message=status_message,
            config_error=config_error,
        )

    @app.route(f"{admin_route_prefix}/visitor-feedback/<int:feedback_id>", methods=["GET", "POST"])
    @admin_required
    def admin_visitor_feedback_review(feedback_id):
        feedback_item = load_admin_visitor_feedback_item(feedback_id)
        if feedback_item is None:
            return redirect(url_for("admin_visitor_feedback"))

        if request.method == "GET":
            return render_admin_visitor_feedback_review(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                feedback_item=feedback_item,
            )

        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_visitor_feedback"))

        moderation_action = str(request.form.get("moderation_action") or "").strip().lower()
        if moderation_action == "reanalyze":
            try:
                analysis = analyze_feedback_sentiment(
                    feedback_item.get("comments"),
                    feedback_item.get("rating"),
                )
                update_visitor_feedback(feedback_id, analysis)
            except Exception as exc:
                app.logger.exception("Failed to analyze visitor feedback %s: %s", feedback_id, exc)
                return render_admin_visitor_feedback_review(
                    ensure_admin_csrf_token=ensure_admin_csrf_token,
                    admin_session_user_key=admin_session_user_key,
                    admin_username=admin_username,
                    feedback_item=feedback_item,
                    error_message="Could not update the sentiment analysis right now.",
                )
            return redirect(url_for("admin_visitor_feedback_review", feedback_id=feedback_id, analysis="updated"))

        transitions = {
            "reviewed": {
                "from": {"new"},
                "status": "reviewed",
                "result": "reviewed",
            },
            "archive": {
                "from": {"new", "reviewed"},
                "status": "archived",
                "result": "archived",
            },
            "restore": {
                "from": {"archived"},
                "status": "new",
                "result": "restored",
            },
        }
        transition = transitions.get(moderation_action)
        current_status = str(feedback_item.get("status") or "").strip().lower()
        if transition is None or current_status not in transition["from"]:
            return render_admin_visitor_feedback_review(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                feedback_item=feedback_item,
                error_message="This moderation action is not available for the feedback's current status.",
            )

        next_status = transition["status"]
        try:
            update_visitor_feedback(
                feedback_id,
                {
                    "status": next_status,
                    "reviewed_at": _utcnow().isoformat(),
                    "reviewed_by": session.get(admin_session_user_key, admin_username),
                },
            )
        except Exception as exc:
            app.logger.exception("Failed to moderate visitor feedback %s: %s", feedback_id, exc)
            return render_admin_visitor_feedback_review(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                feedback_item=feedback_item,
                error_message="Could not update the visitor feedback right now.",
            )

        return redirect(
            url_for(
                "admin_visitor_feedback",
                filter=str(request.form.get("return_filter") or "all").strip().lower(),
                status=transition["result"],
            )
        )
