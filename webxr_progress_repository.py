from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from supabase_client import get_supabase_client


WEBXR_PLAYER_ITEMS_TABLE = "webxr_player_items"
WEBXR_MUSEUM_VIEWS_TABLE = "webxr_player_museum_views"


def list_webxr_items(user_id: int) -> list[dict[str, Any]]:
    response = (
        get_supabase_client()
        .table(WEBXR_PLAYER_ITEMS_TABLE)
        .select("item_key, status, acquired_scene, acquired_at, deposited_at")
        .eq("user_id", int(user_id))
        .order("acquired_at")
        .execute()
    )
    return list(response.data or [])


def upsert_webxr_item(user_id: int, item_key: str, scene: str, deposit: bool = False) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "user_id": int(user_id),
        "item_key": item_key,
        "acquired_scene": scene,
    }
    if deposit:
        payload["status"] = "deposited"
        payload["deposited_at"] = datetime.now(timezone.utc).isoformat()
    response = (
        get_supabase_client()
        .table(WEBXR_PLAYER_ITEMS_TABLE)
        .upsert(payload, on_conflict="user_id,item_key")
        .execute()
    )
    rows = list(response.data or [])
    return rows[0] if rows else {}


def deposit_webxr_items(user_id: int, item_keys: list[str]) -> list[dict[str, Any]]:
    if not item_keys:
        return []
    response = (
        get_supabase_client()
        .table(WEBXR_PLAYER_ITEMS_TABLE)
        .update({
            "status": "deposited",
            "deposited_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("user_id", int(user_id))
        .eq("status", "inventory")
        .in_("item_key", item_keys)
        .execute()
    )
    return list(response.data or [])


def list_webxr_museum_views(user_id: int) -> list[dict[str, Any]]:
    response = (
        get_supabase_client()
        .table(WEBXR_MUSEUM_VIEWS_TABLE)
        .select("hotspot_key, viewed_at")
        .eq("user_id", int(user_id))
        .order("viewed_at")
        .execute()
    )
    return list(response.data or [])


def upsert_webxr_museum_view(user_id: int, hotspot_key: str) -> dict[str, Any]:
    response = (
        get_supabase_client()
        .table(WEBXR_MUSEUM_VIEWS_TABLE)
        .upsert(
            {"user_id": int(user_id), "hotspot_key": hotspot_key},
            on_conflict="user_id,hotspot_key",
        )
        .execute()
    )
    rows = list(response.data or [])
    return rows[0] if rows else {}
