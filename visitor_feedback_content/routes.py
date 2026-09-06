from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from flask import jsonify, redirect, render_template, request, session, url_for

from admin_notifications_content import dispatch_admin_notification
from supabase_client import is_supabase_configured
from visitor_feedback_repository import (
    create_visitor_feedback,
    create_visitor_feedback_moderation_log,
    get_recent_visitor_feedback,
    moderate_visitor_feedback,
    update_visitor_feedback,
)
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
ADMIN_FEEDBACK_FILTERS = {"pending", "published", "withheld", "excluded"}
COMMENT_WITHHOLD_REASONS = {"personal_information", "harassment", "hate_or_abuse", "obscene", "advertising", "off_topic", "spam", "other"}
RATING_EXCLUSION_REASONS = {"fraud", "duplicate", "ineligible", "conflict_of_interest", "manipulation"}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _validate_visitor_feedback_payload(form) -> dict[str, Any]:
    visit_type = str(form.get("visit_type") or "").strip().lower()
    visitor_name = str(form.get("name") or "").strip()
    comments = str(form.get("comments") or "").strip()
    public_display_consent = str(form.get("public_display_consent") or "").lower() in {"1", "true", "on", "yes"}
    public_name_preference = str(form.get("public_name_preference") or "anonymous").strip().lower()

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
    if public_name_preference not in {"anonymous", "first_name"}:
        raise ValueError("Please choose a valid public name option.")

    return {
        "visit_type": visit_type,
        "rating": rating,
        "visitor_name": visitor_name,
        "comments": comments,
        "status": VISITOR_FEEDBACK_STATUS_OPTIONS[0],
        "public_display_consent": public_display_consent,
        "public_name_preference": public_name_preference,
        "rating_status": "counted",
        "comment_status": "pending" if public_display_consent and comments else ("withheld" if comments else "not_provided"),
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
            payload["visitor_name"] = str(current_user.get("full_name") or "").strip()
            recent_feedback = get_recent_visitor_feedback(
                payload["user_id"],
                payload["visit_type"],
                (_utcnow() - timedelta(days=30)).isoformat(),
            )
            if recent_feedback:
                raise ValueError("You can submit one review for each experience type every 30 days.")
            payload.update(analyze_feedback_sentiment(payload.get("comments"), payload.get("rating")))
            created_feedback = create_visitor_feedback(payload)
            visitor_label = str(payload.get("visitor_name") or "A visitor").strip() or "A visitor"
            dispatch_admin_notification(
                event_type="visitor_feedback",
                source_id=int(created_feedback["id"]),
                title="New visitor feedback",
                message=(
                    f"{visitor_label} submitted a {payload['rating']}-star "
                    f"{payload['visit_type']} experience review."
                ),
                target_url=url_for(
                    "admin_visitor_feedback_review",
                    feedback_id=int(created_feedback["id"]),
                ),
            )
            return jsonify({"ok": True, "message": "Thank you. Your eligible rating is recorded separately while your optional comment awaits a safety review."})
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
        if status_filter not in ADMIN_FEEDBACK_FILTERS | {"all"}:
            status_filter = "all"
        feedback_analytics = build_visitor_feedback_analytics(feedback_items)
        feedback_channel_analytics = {
            "on-site": build_visitor_feedback_analytics([item for item in feedback_items if item.get("visit_type") == "on-site"]),
            "website": build_visitor_feedback_analytics([item for item in feedback_items if item.get("visit_type") == "website"]),
        }
        status_message = get_visitor_feedback_status_message(request.args.get("status"))
        config_error = None if is_supabase_configured() else "Supabase visitor feedback integration is not configured."
        return render_template(
            "admin/AdminVisitorFeedback.html",
            csrf_token=csrf_token,
            admin_username=current_admin_username,
            feedback_items=feedback_items,
            status_filter=status_filter,
            feedback_analytics=feedback_analytics,
            feedback_channel_analytics=feedback_channel_analytics,
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
                create_visitor_feedback_moderation_log({
                    "feedback_id": feedback_id,
                    "action": "reanalyze",
                    "admin_username": session.get(admin_session_user_key, admin_username),
                })
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

        reason_code = str(request.form.get("reason_code") or "").strip().lower()
        moderation_note = str(request.form.get("moderation_note") or "").strip()
        admin_actor = str(session.get(admin_session_user_key, admin_username) or "").strip()
        update_payload: dict[str, Any] | None = None
        result_key = ""

        if moderation_action == "publish_comment":
            if not feedback_item.get("public_display_consent") or not feedback_item.get("comments") or feedback_item.get("rating_status") == "excluded":
                update_payload = None
            else:
                update_payload = {"comment_status": "published", "status": "reviewed", "moderation_reason_code": "", "moderation_note": ""}
                result_key = "comment-published"
        elif moderation_action == "withhold_comment":
            if reason_code not in COMMENT_WITHHOLD_REASONS or len(moderation_note) < 10:
                update_payload = None
            else:
                update_payload = {"comment_status": "withheld", "status": "reviewed", "moderation_reason_code": reason_code, "moderation_note": moderation_note}
                result_key = "comment-withheld"
        elif moderation_action == "exclude_rating":
            if reason_code not in RATING_EXCLUSION_REASONS or len(moderation_note) < 10:
                update_payload = None
            else:
                update_payload = {"rating_status": "excluded", "comment_status": "withheld", "status": "reviewed", "moderation_reason_code": reason_code, "moderation_note": moderation_note}
                result_key = "rating-excluded"
        elif moderation_action == "reinstate_rating":
            update_payload = {"rating_status": "counted", "moderation_reason_code": "", "moderation_note": ""}
            result_key = "rating-reinstated"

        if update_payload is None:
            return render_admin_visitor_feedback_review(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                feedback_item=feedback_item,
                error_message="This action is unavailable or requires a valid reason and a note of at least 10 characters.",
            )

        try:
            moderate_visitor_feedback(feedback_id, moderation_action, reason_code, moderation_note, admin_actor)
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
                status=result_key,
            )
        )
