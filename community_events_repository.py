from typing import Any

from supabase_client import get_supabase_client


COMMUNITY_EVENTS_TABLE = "community_events"
COMMUNITY_EVENTS_SELECT_FIELDS = (
    "id, title, slug, category, event_date, event_time, location, short_description, status, is_published, created_at, updated_at"
)


def list_published_community_events(limit: int | None = None) -> list[dict[str, Any]]:
    client = get_supabase_client()
    query = (
        client.table(COMMUNITY_EVENTS_TABLE)
        .select(COMMUNITY_EVENTS_SELECT_FIELDS)
        .eq("is_published", True)
        .order("event_date", desc=True)
        .order("created_at", desc=True)
    )

    if isinstance(limit, int) and limit > 0:
        query = query.limit(limit)

    response = query.execute()
    return list(response.data or [])


def list_all_community_events() -> list[dict[str, Any]]:
    client = get_supabase_client()
    response = (
        client.table(COMMUNITY_EVENTS_TABLE)
        .select(COMMUNITY_EVENTS_SELECT_FIELDS)
        .order("event_date", desc=True)
        .order("created_at", desc=True)
        .execute()
    )
    return list(response.data or [])


def get_community_event_by_id(event_id: int) -> dict[str, Any] | None:
    client = get_supabase_client()
    response = (
        client.table(COMMUNITY_EVENTS_TABLE)
        .select(COMMUNITY_EVENTS_SELECT_FIELDS)
        .eq("id", int(event_id))
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    if not rows:
        return None
    return rows[0]


def get_published_community_event_by_slug(slug: str) -> dict[str, Any] | None:
    client = get_supabase_client()
    response = (
        client.table(COMMUNITY_EVENTS_TABLE)
        .select(COMMUNITY_EVENTS_SELECT_FIELDS)
        .eq("slug", str(slug or "").strip())
        .eq("is_published", True)
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    if not rows:
        return None
    return rows[0]


def create_community_event(payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    response = client.table(COMMUNITY_EVENTS_TABLE).insert(payload).execute()
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("Supabase did not return the created community event row.")
    return rows[0]


def update_community_event(event_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    response = client.table(COMMUNITY_EVENTS_TABLE).update(payload).eq("id", int(event_id)).execute()
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("Supabase did not return the updated community event row.")
    return rows[0]


def delete_community_event(event_id: int) -> None:
    client = get_supabase_client()
    client.table(COMMUNITY_EVENTS_TABLE).delete().eq("id", int(event_id)).execute()
