from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from supabase_client import get_supabase_client


ADMIN_NOTIFICATIONS_TABLE = "admin_notifications"
ADMIN_NOTIFICATION_FIELDS = (
    "id, recipient_email, event_type, source_id, title, message, target_url, "
    "read_at, emailed_at, email_error, created_at"
)


def create_admin_notifications(payloads: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not payloads:
        return []
    response = get_supabase_client().table(ADMIN_NOTIFICATIONS_TABLE).insert(payloads).execute()
    return list(response.data or [])


def list_admin_notifications(recipient_email: str, *, limit: int = 30) -> list[dict[str, Any]]:
    response = (
        get_supabase_client()
        .table(ADMIN_NOTIFICATIONS_TABLE)
        .select(ADMIN_NOTIFICATION_FIELDS)
        .eq("recipient_email", str(recipient_email or "").strip().lower())
        .order("created_at", desc=True)
        .limit(max(1, min(int(limit), 50)))
        .execute()
    )
    return list(response.data or [])


def count_unread_admin_notifications(recipient_email: str) -> int:
    response = (
        get_supabase_client()
        .table(ADMIN_NOTIFICATIONS_TABLE)
        .select("id", count="exact")
        .eq("recipient_email", str(recipient_email or "").strip().lower())
        .is_("read_at", "null")
        .execute()
    )
    return int(response.count or 0)


def mark_admin_notification_read(notification_id: int, recipient_email: str) -> dict[str, Any] | None:
    response = (
        get_supabase_client()
        .table(ADMIN_NOTIFICATIONS_TABLE)
        .update({"read_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", int(notification_id))
        .eq("recipient_email", str(recipient_email or "").strip().lower())
        .execute()
    )
    rows = list(response.data or [])
    return rows[0] if rows else None


def mark_all_admin_notifications_read(recipient_email: str) -> None:
    (
        get_supabase_client()
        .table(ADMIN_NOTIFICATIONS_TABLE)
        .update({"read_at": datetime.now(timezone.utc).isoformat()})
        .eq("recipient_email", str(recipient_email or "").strip().lower())
        .is_("read_at", "null")
        .execute()
    )


def record_admin_notification_email_result(
    notification_ids: list[int],
    *,
    sent: bool,
    error: str = "",
) -> None:
    if not notification_ids:
        return
    payload = {
        "emailed_at": datetime.now(timezone.utc).isoformat() if sent else None,
        "email_error": "" if sent else str(error or "Email delivery failed.")[:500],
    }
    (
        get_supabase_client()
        .table(ADMIN_NOTIFICATIONS_TABLE)
        .update(payload)
        .in_("id", [int(value) for value in notification_ids])
        .execute()
    )
