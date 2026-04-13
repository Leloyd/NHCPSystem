from typing import Any

from supabase_client import get_supabase_client


COMMUNITY_HIGHLIGHTS_TABLE = "community_highlights"
COMMUNITY_HIGHLIGHTS_SELECT_FIELDS = (
    "id, title, slug, category, event_date, short_description, long_description, image_filename, is_published, created_at, updated_at"
)


def list_published_community_highlights(limit: int | None = None) -> list[dict[str, Any]]:
    client = get_supabase_client()
    query = (
        client.table(COMMUNITY_HIGHLIGHTS_TABLE)
        .select(COMMUNITY_HIGHLIGHTS_SELECT_FIELDS)
        .eq("is_published", True)
        .order("event_date", desc=True)
        .order("created_at", desc=True)
    )

    if isinstance(limit, int) and limit > 0:
        query = query.limit(limit)

    response = query.execute()
    return list(response.data or [])


def list_all_community_highlights() -> list[dict[str, Any]]:
    client = get_supabase_client()
    response = (
        client.table(COMMUNITY_HIGHLIGHTS_TABLE)
        .select(COMMUNITY_HIGHLIGHTS_SELECT_FIELDS)
        .order("event_date", desc=True)
        .order("created_at", desc=True)
        .execute()
    )
    return list(response.data or [])


def get_community_highlight_by_id(highlight_id: int) -> dict[str, Any] | None:
    client = get_supabase_client()
    response = (
        client.table(COMMUNITY_HIGHLIGHTS_TABLE)
        .select(COMMUNITY_HIGHLIGHTS_SELECT_FIELDS)
        .eq("id", int(highlight_id))
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    if not rows:
        return None
    return rows[0]


def get_published_community_highlight_by_slug(slug: str) -> dict[str, Any] | None:
    client = get_supabase_client()
    response = (
        client.table(COMMUNITY_HIGHLIGHTS_TABLE)
        .select(COMMUNITY_HIGHLIGHTS_SELECT_FIELDS)
        .eq("slug", str(slug or "").strip())
        .eq("is_published", True)
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    if not rows:
        return None
    return rows[0]


def create_community_highlight(payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    response = client.table(COMMUNITY_HIGHLIGHTS_TABLE).insert(payload).execute()
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("Supabase did not return the created community highlight row.")
    return rows[0]


def update_community_highlight(highlight_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    response = client.table(COMMUNITY_HIGHLIGHTS_TABLE).update(payload).eq("id", int(highlight_id)).execute()
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("Supabase did not return the updated community highlight row.")
    return rows[0]


def delete_community_highlight(highlight_id: int) -> None:
    client = get_supabase_client()
    client.table(COMMUNITY_HIGHLIGHTS_TABLE).delete().eq("id", int(highlight_id)).execute()
