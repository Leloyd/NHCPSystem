from typing import Any

from supabase_client import get_supabase_client


EDU_RESOURCES_TABLE = "edu_resources"
EDU_RESOURCES_FIELDS = "*"


def list_published_edu_resources() -> list[dict[str, Any]]:
    client = get_supabase_client()
    response = (
        client.table(EDU_RESOURCES_TABLE)
        .select(EDU_RESOURCES_FIELDS)
        .eq("is_published", True)
        .order("created_at", desc=True)
        .execute()
    )
    return list(response.data or [])


def list_all_edu_resources() -> list[dict[str, Any]]:
    client = get_supabase_client()
    response = (
        client.table(EDU_RESOURCES_TABLE)
        .select(EDU_RESOURCES_FIELDS)
        .order("created_at", desc=True)
        .execute()
    )
    return list(response.data or [])


def get_edu_resource_by_id(item_id: int) -> dict[str, Any] | None:
    client = get_supabase_client()
    response = (
        client.table(EDU_RESOURCES_TABLE)
        .select(EDU_RESOURCES_FIELDS)
        .eq("id", int(item_id))
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    if not rows:
        return None
    return rows[0]


def create_edu_resource(payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    response = client.table(EDU_RESOURCES_TABLE).insert(payload).execute()
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("Supabase did not return the created edu resource row.")
    return rows[0]


def update_edu_resource(item_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    response = client.table(EDU_RESOURCES_TABLE).update(payload).eq("id", int(item_id)).execute()
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("Supabase did not return the updated edu resource row.")
    return rows[0]
