from typing import Any

from supabase_client import get_supabase_client


USER_BOOKMARKS_TABLE = "user_bookmarks"
USER_BOOKMARKS_SELECT_FIELDS = "id, user_id, item_type, item_id, created_at"


def list_user_bookmarks(user_id: int, *, item_type: str | None = None) -> list[dict[str, Any]]:
    client = get_supabase_client()
    query = (
        client.table(USER_BOOKMARKS_TABLE)
        .select(USER_BOOKMARKS_SELECT_FIELDS)
        .eq("user_id", int(user_id))
        .order("created_at", desc=True)
    )
    if item_type:
        query = query.eq("item_type", str(item_type).strip().lower())
    response = query.execute()
    return list(response.data or [])


def get_user_bookmark(user_id: int, *, item_type: str, item_id: int) -> dict[str, Any] | None:
    client = get_supabase_client()
    response = (
        client.table(USER_BOOKMARKS_TABLE)
        .select(USER_BOOKMARKS_SELECT_FIELDS)
        .eq("user_id", int(user_id))
        .eq("item_type", str(item_type).strip().lower())
        .eq("item_id", int(item_id))
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    if not rows:
        return None
    return rows[0]


def create_user_bookmark(payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    response = client.table(USER_BOOKMARKS_TABLE).insert(payload).execute()
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("Supabase did not return the created bookmark row.")
    return rows[0]


def delete_user_bookmark(user_id: int, *, item_type: str, item_id: int) -> None:
    client = get_supabase_client()
    (
        client.table(USER_BOOKMARKS_TABLE)
        .delete()
        .eq("user_id", int(user_id))
        .eq("item_type", str(item_type).strip().lower())
        .eq("item_id", int(item_id))
        .execute()
    )
