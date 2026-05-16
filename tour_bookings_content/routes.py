from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from flask import jsonify, redirect, render_template, request, session, url_for

from supabase_client import is_supabase_configured
from tour_bookings_repository import create_tour_booking, update_tour_booking

from .service import (
    TOUR_BOOKING_STATUS_OPTIONS,
    TOUR_BOOKING_TYPES,
    get_tour_bookings_status_message,
    load_admin_tour_booking,
    load_admin_tour_bookings,
    render_admin_tour_booking_review,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _validate_tour_booking_payload(form, *, current_user: dict[str, Any]) -> dict[str, Any]:
    visit_date = str(form.get("visit_date") or "").strip()
    start_time = str(form.get("start_time") or "").strip()
    end_time = str(form.get("end_time") or "").strip()
    booking_type = str(form.get("booking_type") or "general_tour").strip().lower()
    institution_name = str(form.get("institution_name") or current_user.get("organization") or "").strip()
    contact_number = str(form.get("contact_number") or current_user.get("phone_number") or "").strip()
    purpose = str(form.get("purpose") or "").strip()
    notes = str(form.get("notes") or "").strip()
    location = str(form.get("location") or "Museo ng Libingan sa Ilalim ng Lupa").strip()
    display_title = str(form.get("display_title") or "Guided Tour Booking").strip()

    try:
        group_size = int(str(form.get("group_size") or "").strip())
    except ValueError as exc:
        raise ValueError("Group size must be a whole number.") from exc

    if booking_type not in TOUR_BOOKING_TYPES:
        raise ValueError("Please choose a valid booking type.")
    if not visit_date:
        raise ValueError("Visit date is required.")
    if not start_time:
        raise ValueError("Start time is required.")
    if not end_time:
        raise ValueError("End time is required.")
    if group_size < 1 or group_size > 500:
        raise ValueError("Group size must be between 1 and 500.")
    if len(display_title) < 3:
        raise ValueError("Display title must be at least 3 characters.")
    if len(purpose) < 8:
        raise ValueError("Purpose must be at least 8 characters.")
    if len(notes) > 2000:
        raise ValueError("Notes must be 2000 characters or fewer.")
    if len(institution_name) > 180:
        raise ValueError("Institution name must be 180 characters or fewer.")
    if len(contact_number) > 64:
        raise ValueError("Contact number must be 64 characters or fewer.")

    return {
        "user_id": int(current_user.get("id")),
        "display_title": display_title,
        "booking_type": booking_type,
        "visit_date": visit_date,
        "start_time": start_time,
        "end_time": end_time,
        "group_size": group_size,
        "institution_name": institution_name,
        "contact_number": contact_number,
        "purpose": purpose,
        "notes": notes,
        "location": location,
        "status": TOUR_BOOKING_STATUS_OPTIONS[0],
    }


def register_tour_booking_routes(
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
    @app.route("/community-participation/bookings/request", methods=["POST"])
    @public_login_required
    def request_tour_booking():
        if not is_supabase_configured():
            return jsonify({"ok": False, "error": "Supabase tour bookings integration is not configured."}), 503
        if not is_public_csrf_valid(request.headers.get("X-CSRF-Token") or request.form.get("csrf_token")):
            return jsonify({"ok": False, "error": "Invalid request."}), 400

        retry_after = consume_public_action_rate_limit("tour-booking")
        if retry_after:
            return jsonify({"ok": False, "error": f"Too many booking requests. Try again in {retry_after} seconds."}), 429

        current_user = get_current_public_user()
        if not current_user:
            return jsonify({"ok": False, "error": "Please sign in to request a booking.", "login_required": True}), 401

        try:
            payload = _validate_tour_booking_payload(request.form, current_user=current_user)
            create_tour_booking(payload)
            return jsonify({"ok": True, "message": "Your tour booking request has been sent to admin for review."})
        except ValueError as exc:
            return jsonify({"ok": False, "error": str(exc)}), 400
        except Exception as exc:
            app.logger.exception("Failed to create tour booking request: %s", exc)
            return jsonify({"ok": False, "error": "Could not submit your booking request right now."}), 500

    @app.route(f"{admin_route_prefix}/bookings")
    @admin_required
    def admin_tour_bookings():
        csrf_token = ensure_admin_csrf_token()
        current_admin_username = session.get(admin_session_user_key, admin_username)
        booking_items = load_admin_tour_bookings()
        pending_items = [item for item in booking_items if item.get("status") == "pending"]
        approved_items = [item for item in booking_items if item.get("status") == "approved"]
        rejected_items = [item for item in booking_items if item.get("status") == "rejected"]
        cancelled_items = [item for item in booking_items if item.get("status") == "cancelled"]
        status_message = get_tour_bookings_status_message(request.args.get("status"))
        config_error = None if is_supabase_configured() else "Supabase tour bookings integration is not configured."
        return render_template(
            "admin/AdminTourBookings.html",
            csrf_token=csrf_token,
            admin_username=current_admin_username,
            booking_items=booking_items,
            pending_items=pending_items,
            approved_items=approved_items,
            rejected_items=rejected_items,
            cancelled_items=cancelled_items,
            status_message=status_message,
            config_error=config_error,
        )

    @app.route(f"{admin_route_prefix}/bookings/<int:booking_id>", methods=["GET", "POST"])
    @admin_required
    def admin_tour_booking_review(booking_id):
        booking_item = load_admin_tour_booking(booking_id)
        if booking_item is None:
            return redirect(url_for("admin_tour_bookings"))

        if request.method == "GET":
            return render_admin_tour_booking_review(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                booking_item=booking_item,
            )

        if not is_admin_csrf_valid(request.form.get("csrf_token")):
            return redirect(url_for("admin_tour_bookings"))

        moderation_action = str(request.form.get("moderation_action") or "").strip().lower()
        if moderation_action not in {"approve", "reject", "cancel"}:
            return render_admin_tour_booking_review(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                booking_item=booking_item,
                error_message="Please choose a valid moderation action.",
            )

        next_status = {
            "approve": "approved",
            "reject": "rejected",
            "cancel": "cancelled",
        }[moderation_action]

        try:
            update_tour_booking(
                booking_id,
                {
                    "status": next_status,
                    "admin_notes": str(request.form.get("admin_notes") or "").strip(),
                    "reviewed_at": _utcnow().isoformat(),
                    "reviewed_by": session.get(admin_session_user_key, admin_username),
                },
            )
        except Exception as exc:
            app.logger.exception("Failed to moderate booking %s: %s", booking_id, exc)
            return render_admin_tour_booking_review(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                booking_item=booking_item,
                error_message="Could not update the booking right now.",
            )

        return redirect(url_for("admin_tour_bookings", status=next_status))
