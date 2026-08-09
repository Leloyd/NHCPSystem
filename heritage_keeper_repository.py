from __future__ import annotations

from typing import Any

from supabase_client import get_supabase_client


HERITAGE_KEEPER_EVENTS_TABLE = "heritage_keeper_events"
HERITAGE_KEEPER_AWARDS_TABLE = "heritage_keeper_awards"


def list_heritage_keeper_events(user_id: int) -> list[dict[str, Any]]:
    response = (
        get_supabase_client()
        .table(HERITAGE_KEEPER_EVENTS_TABLE)
        .select("id, user_id, source, item_key, completed_at")
        .eq("user_id", int(user_id))
        .order("completed_at")
        .execute()
    )
    return list(response.data or [])


def create_heritage_keeper_event(user_id: int, source: str, item_key: str) -> dict[str, Any]:
    response = (
        get_supabase_client()
        .table(HERITAGE_KEEPER_EVENTS_TABLE)
        .insert({"user_id": int(user_id), "source": source, "item_key": item_key})
        .execute()
    )
    rows = list(response.data or [])
    return rows[0] if rows else {}


def get_heritage_keeper_award(user_id: int) -> dict[str, Any] | None:
    response = (
        get_supabase_client()
        .table(HERITAGE_KEEPER_AWARDS_TABLE)
        .select("user_id, unlocked_at")
        .eq("user_id", int(user_id))
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    return rows[0] if rows else None


def create_heritage_keeper_award(user_id: int) -> dict[str, Any]:
    response = (
        get_supabase_client()
        .table(HERITAGE_KEEPER_AWARDS_TABLE)
        .insert({"user_id": int(user_id)})
        .execute()
    )
    rows = list(response.data or [])
    return rows[0] if rows else {}
