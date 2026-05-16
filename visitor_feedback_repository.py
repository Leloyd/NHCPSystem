from typing import Any

from supabase_client import get_supabase_client


VISITOR_FEEDBACK_TABLE = "visitor_feedback"
VISITOR_FEEDBACK_SELECT_FIELDS = (
    "id, user_id, visit_type, rating, visitor_name, comments, status, reviewed_at, reviewed_by, created_at, updated_at"
)


def list_all_visitor_feedback() -> list[dict[str, Any]]:
    client = get_supabase_client()
    response = (
        client.table(VISITOR_FEEDBACK_TABLE)
        .select(VISITOR_FEEDBACK_SELECT_FIELDS)
        .order("created_at", desc=True)
        .execute()
    )
    return list(response.data or [])


def list_visitor_feedback_for_user(user_id: int) -> list[dict[str, Any]]:
    client = get_supabase_client()
    response = (
        client.table(VISITOR_FEEDBACK_TABLE)
        .select(VISITOR_FEEDBACK_SELECT_FIELDS)
        .eq("user_id", int(user_id))
        .order("created_at", desc=True)
        .execute()
    )
    return list(response.data or [])


def get_visitor_feedback_by_id(feedback_id: int) -> dict[str, Any] | None:
    client = get_supabase_client()
    response = (
        client.table(VISITOR_FEEDBACK_TABLE)
        .select(VISITOR_FEEDBACK_SELECT_FIELDS)
        .eq("id", int(feedback_id))
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    if not rows:
        return None
    return rows[0]


def create_visitor_feedback(payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    response = client.table(VISITOR_FEEDBACK_TABLE).insert(payload).execute()
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("Supabase did not return the created visitor feedback row.")
    return rows[0]


def update_visitor_feedback(feedback_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    response = client.table(VISITOR_FEEDBACK_TABLE).update(payload).eq("id", int(feedback_id)).execute()
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("Supabase did not return the updated visitor feedback row.")
    return rows[0]
