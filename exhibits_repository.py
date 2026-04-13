from typing import Any

from supabase_client import get_supabase_client


EXHIBITS_TABLE = "exhibits_news"
EXHIBIT_SELECT_FIELDS = (
    "id, title, slug, event_date, short_description, long_description, image_filename, is_published, sort_order, created_at, updated_at"
)


def list_published_exhibits(limit: int | None = None) -> list[dict[str, Any]]:
    client = get_supabase_client()
    query = (
        client.table(EXHIBITS_TABLE)
        .select(EXHIBIT_SELECT_FIELDS)
        .eq("is_published", True)
        .order("sort_order", desc=False)
        .order("event_date", desc=True)
    )

    if isinstance(limit, int) and limit > 0:
        query = query.limit(limit)

    response = query.execute()
    return list(response.data or [])


def list_all_exhibits() -> list[dict[str, Any]]:
    client = get_supabase_client()
    response = (
        client.table(EXHIBITS_TABLE)
        .select(EXHIBIT_SELECT_FIELDS)
        .order("sort_order", desc=False)
        .order("event_date", desc=True)
        .execute()
    )
    return list(response.data or [])


def get_exhibit_by_id(exhibit_id: int) -> dict[str, Any] | None:
    client = get_supabase_client()
    response = (
        client.table(EXHIBITS_TABLE)
        .select(EXHIBIT_SELECT_FIELDS)
        .eq("id", int(exhibit_id))
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    if not rows:
        return None
    return rows[0]


def get_published_exhibit_by_slug(slug: str) -> dict[str, Any] | None:
    client = get_supabase_client()
    response = (
        client.table(EXHIBITS_TABLE)
        .select(EXHIBIT_SELECT_FIELDS)
        .eq("slug", str(slug or "").strip())
        .eq("is_published", True)
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    if not rows:
        return None
    return rows[0]


def create_exhibit(payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    response = client.table(EXHIBITS_TABLE).insert(payload).execute()
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("Supabase did not return the created exhibit row.")
    return rows[0]


def update_exhibit(exhibit_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    response = client.table(EXHIBITS_TABLE).update(payload).eq("id", int(exhibit_id)).execute()
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("Supabase did not return the updated exhibit row.")
    return rows[0]


def delete_exhibit(exhibit_id: int) -> None:
    client = get_supabase_client()
    client.table(EXHIBITS_TABLE).delete().eq("id", int(exhibit_id)).execute()
