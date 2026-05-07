from typing import Any

from supabase_client import get_supabase_client


ONLINE_GALLERY_CATEGORIES_TABLE = "online_gallery_categories"
ONLINE_GALLERY_ITEMS_TABLE = "online_gallery_items"
ONLINE_GALLERY_CATEGORY_FIELDS = "id, slug, display_name, sort_order, is_active, created_at, updated_at"
ONLINE_GALLERY_ITEM_FIELDS = (
    "id, category_id, title, period, year_label, source, location, short_caption, full_description, "
    "teaching_note, tags, image_filename, is_published, sort_order, created_at, updated_at"
)


def list_active_online_gallery_categories() -> list[dict[str, Any]]:
    client = get_supabase_client()
    response = (
        client.table(ONLINE_GALLERY_CATEGORIES_TABLE)
        .select(ONLINE_GALLERY_CATEGORY_FIELDS)
        .eq("is_active", True)
        .order("sort_order")
        .order("display_name")
        .execute()
    )
    return list(response.data or [])


def list_all_online_gallery_categories() -> list[dict[str, Any]]:
    client = get_supabase_client()
    response = (
        client.table(ONLINE_GALLERY_CATEGORIES_TABLE)
        .select(ONLINE_GALLERY_CATEGORY_FIELDS)
        .order("sort_order")
        .order("display_name")
        .execute()
    )
    return list(response.data or [])


def list_published_online_gallery_items() -> list[dict[str, Any]]:
    client = get_supabase_client()
    response = (
        client.table(ONLINE_GALLERY_ITEMS_TABLE)
        .select(ONLINE_GALLERY_ITEM_FIELDS)
        .eq("is_published", True)
        .order("sort_order")
        .order("created_at", desc=True)
        .execute()
    )
    return list(response.data or [])


def list_all_online_gallery_items() -> list[dict[str, Any]]:
    client = get_supabase_client()
    response = (
        client.table(ONLINE_GALLERY_ITEMS_TABLE)
        .select(ONLINE_GALLERY_ITEM_FIELDS)
        .order("sort_order")
        .order("created_at", desc=True)
        .execute()
    )
    return list(response.data or [])


def get_online_gallery_item_by_id(item_id: int) -> dict[str, Any] | None:
    client = get_supabase_client()
    response = (
        client.table(ONLINE_GALLERY_ITEMS_TABLE)
        .select(ONLINE_GALLERY_ITEM_FIELDS)
        .eq("id", int(item_id))
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    if not rows:
        return None
    return rows[0]


def create_online_gallery_item(payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    response = client.table(ONLINE_GALLERY_ITEMS_TABLE).insert(payload).execute()
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("Supabase did not return the created online gallery row.")
    return rows[0]


def update_online_gallery_item(item_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    response = client.table(ONLINE_GALLERY_ITEMS_TABLE).update(payload).eq("id", int(item_id)).execute()
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("Supabase did not return the updated online gallery row.")
    return rows[0]


def delete_online_gallery_item(item_id: int) -> None:
    client = get_supabase_client()
    client.table(ONLINE_GALLERY_ITEMS_TABLE).delete().eq("id", int(item_id)).execute()
