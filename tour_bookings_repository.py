from typing import Any

from supabase_client import get_supabase_client


TOUR_BOOKINGS_TABLE = "tour_bookings"
TOUR_BOOKINGS_SELECT_FIELDS = (
    "id, user_id, display_title, scheduled_tour, booking_type, visit_date, rescheduled_visit_date, start_time, end_time, group_size, institution_name, contact_person, contact_number, tour_agency, male_visitors, female_visitors, pwd_visitors, total_visitors, purpose, notes, location, status, admin_notes, decision_reason, reviewed_at, reviewed_by, created_at, updated_at"
)


def list_public_approved_tour_bookings(limit: int | None = None) -> list[dict[str, Any]]:
    client = get_supabase_client()
    query = (
        client.table(TOUR_BOOKINGS_TABLE)
        .select(TOUR_BOOKINGS_SELECT_FIELDS)
        .eq("status", "confirmed")
        .order("visit_date", desc=False)
        .order("start_time", desc=False)
    )
    if isinstance(limit, int) and limit > 0:
        query = query.limit(limit)
    response = query.execute()
    return list(response.data or [])


def list_all_tour_bookings() -> list[dict[str, Any]]:
    client = get_supabase_client()
    response = (
        client.table(TOUR_BOOKINGS_TABLE)
        .select(TOUR_BOOKINGS_SELECT_FIELDS)
        .order("visit_date", desc=False)
        .order("created_at", desc=True)
        .execute()
    )
    return list(response.data or [])


def list_tour_bookings_for_user(user_id: int) -> list[dict[str, Any]]:
    client = get_supabase_client()
    response = (
        client.table(TOUR_BOOKINGS_TABLE)
        .select(TOUR_BOOKINGS_SELECT_FIELDS)
        .eq("user_id", int(user_id))
        .order("created_at", desc=True)
        .execute()
    )
    return list(response.data or [])


def get_tour_booking_by_id(booking_id: int) -> dict[str, Any] | None:
    client = get_supabase_client()
    response = (
        client.table(TOUR_BOOKINGS_TABLE)
        .select(TOUR_BOOKINGS_SELECT_FIELDS)
        .eq("id", int(booking_id))
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    if not rows:
        return None
    return rows[0]


def create_tour_booking(payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    response = client.table(TOUR_BOOKINGS_TABLE).insert(payload).execute()
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("Supabase did not return the created booking row.")
    return rows[0]


def update_tour_booking(
    booking_id: int,
    payload: dict[str, Any],
    *,
    expected_status: str | None = None,
) -> dict[str, Any]:
    client = get_supabase_client()
    query = client.table(TOUR_BOOKINGS_TABLE).update(payload).eq("id", int(booking_id))
    if expected_status:
        query = query.eq("status", str(expected_status).strip().lower())
    response = query.execute()
    rows = list(response.data or [])
    if not rows:
        if expected_status:
            raise RuntimeError(
                "The booking is no longer in the expected status and was not updated."
            )
        raise RuntimeError("Supabase did not return the updated booking row.")
    return rows[0]
