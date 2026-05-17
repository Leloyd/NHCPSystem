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
    "confirmed",
    "cancelled",
    "rescheduled",
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
    "confirmed": "Confirmed",
    "cancelled": "Cancelled",
    "rescheduled": "Rescheduled",
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


def _to_int(value: Any, default: int = 0) -> int:
    try:
        return int(str(value or default).strip())
    except (TypeError, ValueError):
        return default


def prepare_tour_booking_item(item: dict[str, Any] | None, *, public_view: bool = False) -> dict[str, Any]:
    prepared = dict(item or {})
    booking_type = str(prepared.get("booking_type") or TOUR_BOOKING_TYPES[-1]).strip().lower()
    status = str(prepared.get("status") or "pending").strip().lower()
    if status == "approved":
        status = "confirmed"
    elif status == "rejected":
        status = "cancelled"

    scheduled_tour = str(prepared.get("scheduled_tour") or prepared.get("display_title") or "Museum Tour Booking").strip() or "Museum Tour Booking"
    display_title = str(prepared.get("display_title") or scheduled_tour).strip() or scheduled_tour
    start_time = str(prepared.get("start_time") or "").strip()
    end_time = str(prepared.get("end_time") or "").strip()
    time_label = " - ".join(part for part in [start_time, end_time] if part)
    visit_date = str(prepared.get("visit_date") or "").strip()
    rescheduled_visit_date = str(prepared.get("rescheduled_visit_date") or "").strip()
    institution_name = str(prepared.get("institution_name") or "").strip()
    contact_person = str(prepared.get("contact_person") or "").strip()
    contact_number = str(prepared.get("contact_number") or "").strip()
    tour_agency = str(prepared.get("tour_agency") or "").strip()
    male_visitors = max(_to_int(prepared.get("male_visitors"), 0), 0)
    female_visitors = max(_to_int(prepared.get("female_visitors"), 0), 0)
    pwd_visitors = max(_to_int(prepared.get("pwd_visitors"), 0), 0)
    total_visitors = max(_to_int(prepared.get("total_visitors"), _to_int(prepared.get("group_size"), 0)), 0)
    group_size = total_visitors or max(_to_int(prepared.get("group_size"), 0), 0)
    decision_reason = str(prepared.get("decision_reason") or "").strip()
    admin_notes = str(prepared.get("admin_notes") or "").strip()
    public_date = visit_date

    prepared["booking_type"] = booking_type
    prepared["booking_type_label"] = TOUR_BOOKING_TYPE_LABELS.get(booking_type, "Tour Booking")
    prepared["status"] = status
    prepared["status_label"] = TOUR_BOOKING_STATUS_LABELS.get(status, "Pending Review")
    prepared["scheduled_tour"] = scheduled_tour
    prepared["display_title"] = display_title
    prepared["display_date"] = format_booking_date(visit_date)
    prepared["date"] = visit_date
    prepared["rescheduled_date"] = rescheduled_visit_date
    prepared["rescheduled_display_date"] = format_booking_date(rescheduled_visit_date) if rescheduled_visit_date else ""
    prepared["time"] = time_label or start_time or "Schedule to be coordinated"
    prepared["start_time"] = start_time
    prepared["end_time"] = end_time
    prepared["institution_name"] = institution_name
    prepared["contact_person"] = contact_person
    prepared["contact_number"] = contact_number
    prepared["tour_agency"] = tour_agency
    prepared["male_visitors"] = male_visitors
    prepared["female_visitors"] = female_visitors
    prepared["pwd_visitors"] = pwd_visitors
    prepared["total_visitors"] = total_visitors
    prepared["group_size"] = group_size
    prepared["decision_reason"] = decision_reason
    prepared["admin_notes"] = admin_notes
    prepared["location"] = str(prepared.get("location") or "Museo ng Libingan sa Ilalim ng Lupa").strip() or "Museo ng Libingan sa Ilalim ng Lupa"
    prepared["description"] = str(prepared.get("purpose") or scheduled_tour or prepared.get("booking_type_label") or "").strip()
    prepared["category"] = "Confirmed Booking"

    if public_view:
        prepared["title"] = "Confirmed Booking"
        prepared["description"] = "A confirmed museum booking is scheduled on this date. Booking details are available only to museum staff."
        prepared["time"] = "Booking scheduled"
        prepared["location"] = "Museum schedule"
        prepared["date"] = public_date
    else:
        prepared["title"] = display_title

    return prepared


def prepare_tour_booking_items(items: list[dict[str, Any]] | None, *, public_view: bool = False) -> list[dict[str, Any]]:
    return [prepare_tour_booking_item(item, public_view=public_view) for item in list(items or [])]


def load_public_tour_bookings(limit: int | None = None) -> list[dict[str, Any]]:
    if not is_supabase_configured():
        return []
    try:
        return prepare_tour_booking_items(list_public_approved_tour_bookings(limit=limit), public_view=True)
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
        "confirmed": "Booking confirmed successfully.",
        "cancelled": "Booking cancelled successfully.",
        "rescheduled": "Booking rescheduled successfully.",
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
