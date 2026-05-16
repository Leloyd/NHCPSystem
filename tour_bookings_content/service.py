from __future__ import annotations

from datetime import datetime
from typing import Any

from flask import current_app, render_template, session

from supabase_client import SupabaseConfigError, is_supabase_configured
from tour_bookings_repository import get_tour_booking_by_id, list_all_tour_bookings, list_public_approved_tour_bookings, list_tour_bookings_for_user


TOUR_BOOKING_TYPES = (
    "school_group",
    "community_group",
    "family_group",
    "research_visit",
    "general_tour",
)
TOUR_BOOKING_STATUS_OPTIONS = (
    "pending",
    "approved",
    "rejected",
    "cancelled",
)
TOUR_BOOKING_TYPE_LABELS = {
    "school_group": "School Group",
    "community_group": "Community Group",
    "family_group": "Family Group",
    "research_visit": "Research Visit",
    "general_tour": "General Tour",
}
TOUR_BOOKING_STATUS_LABELS = {
    "pending": "Pending Review",
    "approved": "Approved",
    "rejected": "Rejected",
    "cancelled": "Cancelled",
}


def format_booking_date(raw_value: Any) -> str:
    raw_text = str(raw_value or "").strip()
    if not raw_text:
        return "Date unavailable"
    try:
        parsed = datetime.fromisoformat(raw_text.replace("Z", "+00:00"))
    except ValueError:
        try:
            parsed = datetime.strptime(raw_text, "%Y-%m-%d")
        except ValueError:
            return raw_text
    return parsed.strftime("%B %d, %Y")


def prepare_tour_booking_item(item: dict[str, Any] | None) -> dict[str, Any]:
    prepared = dict(item or {})
    booking_type = str(prepared.get("booking_type") or TOUR_BOOKING_TYPES[-1]).strip().lower()
    status = str(prepared.get("status") or "pending").strip().lower()
    display_title = str(prepared.get("display_title") or "Tour Booking").strip() or "Tour Booking"
    start_time = str(prepared.get("start_time") or "").strip()
    end_time = str(prepared.get("end_time") or "").strip()
    time_label = " - ".join(part for part in [start_time, end_time] if part)
    prepared["booking_type"] = booking_type
    prepared["booking_type_label"] = TOUR_BOOKING_TYPE_LABELS.get(booking_type, "Tour Booking")
    prepared["status"] = status
    prepared["status_label"] = TOUR_BOOKING_STATUS_LABELS.get(status, "Pending Review")
    prepared["display_title"] = display_title
    prepared["display_date"] = format_booking_date(prepared.get("visit_date"))
    prepared["date"] = str(prepared.get("visit_date") or "").strip()
    prepared["time"] = time_label or start_time or "Time unavailable"
    prepared["start_time"] = start_time
    prepared["end_time"] = end_time
    prepared["location"] = str(prepared.get("location") or "Museo ng Libingan sa Ilalim ng Lupa").strip() or "Museo ng Libingan sa Ilalim ng Lupa"
    prepared["description"] = str(prepared.get("purpose") or prepared.get("notes") or prepared.get("booking_type_label") or "").strip()
    prepared["category"] = "Approved Booking" if status == "approved" else "Pending Booking"
    prepared["group_size"] = int(prepared.get("group_size") or 0)
    return prepared


def prepare_tour_booking_items(items: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    return [prepare_tour_booking_item(item) for item in list(items or [])]


def load_public_tour_bookings(limit: int | None = None) -> list[dict[str, Any]]:
    if not is_supabase_configured():
        return []
    try:
        return prepare_tour_booking_items(list_public_approved_tour_bookings(limit=limit))
    except SupabaseConfigError:
        current_app.logger.warning("Supabase tour bookings integration is not fully configured.")
    except Exception as exc:
        current_app.logger.exception("Failed to load public tour bookings from Supabase: %s", exc)
    return []


def load_admin_tour_bookings() -> list[dict[str, Any]]:
    if not is_supabase_configured():
        return []
    try:
        return prepare_tour_booking_items(list_all_tour_bookings())
    except SupabaseConfigError:
        current_app.logger.warning("Supabase tour bookings integration is not fully configured.")
    except Exception as exc:
        current_app.logger.exception("Failed to load admin tour bookings from Supabase: %s", exc)
    return []


def load_admin_tour_booking(booking_id: int) -> dict[str, Any] | None:
    if not is_supabase_configured():
        return None
    try:
        item = get_tour_booking_by_id(booking_id)
        if item is None:
            return None
        return prepare_tour_booking_item(item)
    except SupabaseConfigError:
        current_app.logger.warning("Supabase tour bookings integration is not fully configured.")
    except Exception as exc:
        current_app.logger.exception("Failed to load admin tour booking %s: %s", booking_id, exc)
    return None


def load_user_tour_bookings(user_id: int) -> list[dict[str, Any]]:
    if not is_supabase_configured():
        return []
    try:
        return prepare_tour_booking_items(list_tour_bookings_for_user(user_id))
    except SupabaseConfigError:
        current_app.logger.warning("Supabase tour bookings integration is not fully configured.")
    except Exception as exc:
        current_app.logger.exception("Failed to load user tour bookings for %s: %s", user_id, exc)
    return []


def get_tour_bookings_status_message(status_key: Any) -> str | None:
    mapping = {
        "approved": "Booking approved successfully.",
        "rejected": "Booking rejected successfully.",
        "cancelled": "Booking cancelled successfully.",
    }
    return mapping.get(str(status_key or "").strip().lower())


def render_admin_tour_booking_review(
    *,
    ensure_admin_csrf_token,
    admin_session_user_key: str,
    admin_username: str,
    booking_item: dict[str, Any],
    error_message: str | None = None,
):
    csrf_token = ensure_admin_csrf_token()
    current_admin_username = session.get(admin_session_user_key, admin_username)
    return render_template(
        "admin/AdminTourBookingReview.html",
        csrf_token=csrf_token,
        admin_username=current_admin_username,
        booking_item=booking_item,
        error_message=error_message,
    )
