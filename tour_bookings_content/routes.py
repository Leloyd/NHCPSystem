from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from flask import jsonify, redirect, render_template, request, session, url_for

from admin_notifications_content import dispatch_admin_notification
from public_users_repository import get_public_user_profile_by_id
from supabase_client import is_supabase_configured
from tour_bookings_repository import create_tour_booking, update_tour_booking

from .emailer import BookingEmailError, is_booking_email_configured, send_booking_status_email
from .service import (
    TOUR_BOOKING_STATUS_OPTIONS,
    TOUR_BOOKING_TYPES,
    format_booking_date,
    get_tour_bookings_status_message,
    load_admin_tour_booking,
    load_admin_tour_bookings,
    render_admin_tour_booking_review,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _parse_nonnegative_int(raw_value: Any, *, label: str) -> int:
    raw_text = str(raw_value or "").strip()
    if not raw_text:
        raise ValueError(f"{label} is required.")
    try:
        parsed = int(raw_text)
    except ValueError as exc:
        raise ValueError(f"{label} must be a whole number.") from exc
    if parsed < 0:
        raise ValueError(f"{label} cannot be negative.")
    return parsed


def _validate_tour_booking_payload(form, *, current_user: dict[str, Any]) -> dict[str, Any]:
    visit_date = str(form.get("visit_date") or "").strip()
    booking_type = str(form.get("booking_type") or "general_tour").strip().lower()
    institution_name = str(form.get("institution_name") or "").strip()
    contact_person = str(form.get("contact_person") or current_user.get("full_name") or "").strip()
    contact_number = str(form.get("contact_number") or "").strip()
    tour_agency = str(form.get("tour_agency") or "").strip()
    location = str(form.get("location") or "Museo ng Libingan sa Ilalim ng Lupa").strip()
    male_visitors = _parse_nonnegative_int(form.get("male_visitors"), label="Male visitors")
    female_visitors = _parse_nonnegative_int(form.get("female_visitors"), label="Female visitors")
    pwd_visitors = _parse_nonnegative_int(form.get("pwd_visitors"), label="PWD visitors")
    total_visitors = male_visitors + female_visitors

    if booking_type not in TOUR_BOOKING_TYPES:
        raise ValueError("Please choose a valid booking type.")
    if not visit_date:
        raise ValueError("Visit date is required.")
    try:
        parsed_visit_date = date.fromisoformat(visit_date)
    except ValueError as exc:
        raise ValueError("Scheduled tour date is invalid.") from exc
    if parsed_visit_date <= date.today():
        raise ValueError("Scheduled tour date must be after today.")
    if total_visitors < 1 or total_visitors > 500:
        raise ValueError("Total visitors must be between 1 and 500.")
    if pwd_visitors > total_visitors:
        raise ValueError("PWD visitors cannot be greater than the total visitors.")
    if len(contact_person) < 3:
        raise ValueError("Contact person must be at least 3 characters.")
    if len(institution_name) < 3:
        raise ValueError("Institution or organization must be at least 3 characters.")
    if len(institution_name) > 180:
        raise ValueError("Institution name must be 180 characters or fewer.")
    if len(contact_person) > 160:
        raise ValueError("Contact person must be 160 characters or fewer.")
    if len(contact_number) > 64:
        raise ValueError("Contact number must be 64 characters or fewer.")
    if not contact_number:
        raise ValueError("Contact number is required.")
    if len(tour_agency) > 180:
        raise ValueError("Tour agency must be 180 characters or fewer.")

    return {
        "user_id": int(current_user.get("id")),
        "display_title": institution_name,
        "scheduled_tour": format_booking_date(visit_date),
        "booking_type": booking_type,
        "visit_date": visit_date,
        "start_time": "",
        "end_time": "",
        "group_size": total_visitors,
        "institution_name": institution_name,
        "contact_person": contact_person,
        "contact_number": contact_number,
        "tour_agency": tour_agency,
        "male_visitors": male_visitors,
        "female_visitors": female_visitors,
        "pwd_visitors": pwd_visitors,
        "total_visitors": total_visitors,
        "purpose": f"Booking request for {format_booking_date(visit_date)}",
        "notes": "",
        "location": location,
        "status": TOUR_BOOKING_STATUS_OPTIONS[0],
        "decision_reason": "",
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
            return jsonify({"ok": False, "error": "Please sign in to request a booking.", "login_required": True, "login_url": url_for("public_login", next=url_for("community_participation"))}), 401

        try:
            payload = _validate_tour_booking_payload(request.form, current_user=current_user)
            created_booking = create_tour_booking(payload)
            dispatch_admin_notification(
                event_type="tour_booking",
                source_id=int(created_booking["id"]),
                title="New tour booking request",
                message=(
                    f"{payload['contact_person']} requested {payload['scheduled_tour']} for "
                    f"{payload['total_visitors']} visitors from {payload['institution_name']}."
                ),
                target_url=url_for("admin_tour_booking_review", booking_id=int(created_booking["id"])),
            )
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
        confirmed_items = [item for item in booking_items if item.get("status") == "confirmed"]
        cancelled_items = [item for item in booking_items if item.get("status") == "cancelled"]
        rescheduled_items = [item for item in booking_items if item.get("status") == "rescheduled"]
        status_message = get_tour_bookings_status_message(request.args.get("status"))
        config_error = None if is_supabase_configured() else "Supabase tour bookings integration is not configured."
        return render_template(
            "admin/AdminTourBookings.html",
            csrf_token=csrf_token,
            admin_username=current_admin_username,
            booking_items=booking_items,
            pending_items=pending_items,
            confirmed_items=confirmed_items,
            cancelled_items=cancelled_items,
            rescheduled_items=rescheduled_items,
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

        if booking_item.get("status") != "pending":
            return (
                render_admin_tour_booking_review(
                    ensure_admin_csrf_token=ensure_admin_csrf_token,
                    admin_session_user_key=admin_session_user_key,
                    admin_username=admin_username,
                    booking_item=booking_item,
                    error_message="This booking already has a final staff decision and can no longer be changed.",
                ),
                409,
            )

        moderation_action = str(request.form.get("moderation_action") or "").strip().lower()
        if moderation_action not in {"confirm", "cancel", "reschedule"}:
            return render_admin_tour_booking_review(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                booking_item=booking_item,
                error_message="Please choose a valid moderation action.",
            )

        decision_reason = str(request.form.get("decision_reason") or "").strip()
        rescheduled_visit_date = str(request.form.get("rescheduled_visit_date") or "").strip()
        admin_notes = str(request.form.get("admin_notes") or "").strip()

        if moderation_action in {"cancel", "reschedule"} and len(decision_reason) < 3:
            return render_admin_tour_booking_review(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                booking_item=booking_item,
                error_message="Please provide a reason for cancellation or reschedule.",
            )

        if moderation_action == "reschedule" and not rescheduled_visit_date:
            return render_admin_tour_booking_review(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                booking_item=booking_item,
                error_message="Please choose the new date for a rescheduled booking.",
            )

        next_status = {
            "confirm": "confirmed",
            "cancel": "cancelled",
            "reschedule": "rescheduled",
        }[moderation_action]

        update_payload = {
            "status": next_status,
            "admin_notes": admin_notes,
            "decision_reason": decision_reason if moderation_action in {"cancel", "reschedule"} else "",
            "reviewed_at": _utcnow().isoformat(),
            "reviewed_by": session.get(admin_session_user_key, admin_username),
        }

        if moderation_action == "confirm":
            if booking_item.get("rescheduled_date"):
                update_payload["visit_date"] = booking_item.get("rescheduled_date")
            update_payload["rescheduled_visit_date"] = None
        elif moderation_action == "reschedule":
            update_payload["rescheduled_visit_date"] = rescheduled_visit_date

        try:
            update_tour_booking(
                booking_id,
                update_payload,
                expected_status="pending",
            )
            updated_booking = load_admin_tour_booking(booking_id)
            user_profile = get_public_user_profile_by_id(int(booking_item.get("user_id") or 0)) if booking_item.get("user_id") else None
        except Exception as exc:
            current_booking = load_admin_tour_booking(booking_id)
            if current_booking and current_booking.get("status") != "pending":
                return (
                    render_admin_tour_booking_review(
                        ensure_admin_csrf_token=ensure_admin_csrf_token,
                        admin_session_user_key=admin_session_user_key,
                        admin_username=admin_username,
                        booking_item=current_booking,
                        error_message="Another administrator already finalized this booking. The saved decision is shown below.",
                    ),
                    409,
                )
            app.logger.exception("Failed to moderate booking %s: %s", booking_id, exc)
            return render_admin_tour_booking_review(
                ensure_admin_csrf_token=ensure_admin_csrf_token,
                admin_session_user_key=admin_session_user_key,
                admin_username=admin_username,
                booking_item=booking_item,
                error_message="Could not update the booking right now.",
            )

        if updated_booking and user_profile and user_profile.get("email") and is_booking_email_configured():
            try:
                send_booking_status_email(
                    to_email=str(user_profile.get("email") or "").strip(),
                    recipient_name=str(user_profile.get("full_name") or user_profile.get("username") or user_profile.get("email") or "Visitor").strip(),
                    scheduled_tour=str(updated_booking.get("scheduled_tour") or updated_booking.get("display_title") or "Museum Tour Booking").strip(),
                    status_label=str(updated_booking.get("status_label") or next_status.title()).strip(),
                    visit_date_label=format_booking_date(updated_booking.get("date")),
                    reason=decision_reason if moderation_action in {"cancel", "reschedule"} else "",
                    rescheduled_date_label=updated_booking.get("rescheduled_display_date") if moderation_action == "reschedule" else "",
                )
            except BookingEmailError as exc:
                app.logger.exception("Failed to send booking status email for booking %s: %s", booking_id, exc)

        return redirect(url_for("admin_tour_bookings", status=next_status))
