from __future__ import annotations

from typing import Any

from supabase_client import get_supabase_client


ANALYTICS_EVENTS_TABLE = "analytics_events"
ANALYTICS_EVENT_FIELDS = (
    "id, event_type, module, target_id, visitor_hash, user_id, device_type, "
    "browser_family, os_family, page_path, metadata, created_at"
)


def insert_analytics_events(payloads: list[dict[str, Any]]) -> None:
    if not payloads:
        return
    get_supabase_client().table(ANALYTICS_EVENTS_TABLE).insert(payloads).execute()


def list_analytics_events_since(
    since_iso: str,
    *,
    limit: int = 10000,
) -> list[dict[str, Any]]:
    response = (
        get_supabase_client()
        .table(ANALYTICS_EVENTS_TABLE)
        .select(ANALYTICS_EVENT_FIELDS)
        .gte("created_at", since_iso)
        .order("created_at", desc=True)
        .limit(max(1, min(int(limit), 20000)))
        .execute()
    )
    return list(response.data or [])

