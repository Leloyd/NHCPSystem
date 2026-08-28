from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from supabase_client import get_supabase_client


RESET_TOKEN_TABLE = "admin_password_reset_tokens"


def _rpc_boolean(data: Any) -> bool:
    if isinstance(data, bool):
        return data
    if isinstance(data, list) and len(data) == 1:
        return bool(data[0])
    return False


def issue_reset_token(*, email: str, email_hash: str, request_ip_hash: str, token_hash: str) -> bool:
    response = get_supabase_client().rpc(
        "issue_admin_password_reset_token",
        {
            "p_email": str(email or "").strip().lower(),
            "p_email_hash": str(email_hash or "").strip(),
            "p_request_ip_hash": str(request_ip_hash or "").strip(),
            "p_token_hash": str(token_hash or "").strip(),
        },
    ).execute()
    return _rpc_boolean(response.data)


def get_valid_reset_token(token_hash: str) -> dict[str, Any] | None:
    normalized_hash = str(token_hash or "").strip()
    if not normalized_hash:
        return None
    response = (
        get_supabase_client()
        .table(RESET_TOKEN_TABLE)
        .select("id, admin_user_id, expires_at, created_at")
        .eq("token_hash", normalized_hash)
        .is_("used_at", "null")
        .gt("expires_at", datetime.now(timezone.utc).isoformat())
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    return rows[0] if rows else None


def consume_reset_token(*, token_hash: str, password_hash: str) -> bool:
    response = get_supabase_client().rpc(
        "consume_admin_password_reset_token",
        {
            "p_token_hash": str(token_hash or "").strip(),
            "p_password_hash": str(password_hash or ""),
        },
    ).execute()
    return _rpc_boolean(response.data)
