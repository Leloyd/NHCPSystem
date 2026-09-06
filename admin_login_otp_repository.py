from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from supabase_client import get_supabase_client


ADMIN_LOGIN_OTP_TABLE = "admin_login_otp_challenges"


def _rpc_scalar(data: Any) -> str:
    if isinstance(data, str):
        return data
    if isinstance(data, list) and len(data) == 1 and isinstance(data[0], str):
        return data[0]
    return "invalid"


def issue_admin_login_otp_challenge(
    *,
    admin_user_id: int,
    account_version: str,
    challenge_hash: str,
    otp_hash: str,
    request_ip_hash: str,
    user_agent_hash: str,
) -> str:
    """Create one server-side OTP challenge and invalidate older challenges.

    The RPC applies its own per-account and per-network throttles. It returns
    ``issued``, ``cooldown``, ``rate_limited`` or ``invalid``.
    """

    response = get_supabase_client().rpc(
        "issue_admin_login_otp_challenge",
        {
            "p_admin_user_id": int(admin_user_id),
            "p_account_version": str(account_version or "").strip(),
            "p_challenge_hash": str(challenge_hash or "").strip(),
            "p_otp_hash": str(otp_hash or "").strip(),
            "p_request_ip_hash": str(request_ip_hash or "").strip(),
            "p_user_agent_hash": str(user_agent_hash or "").strip(),
        },
    ).execute()
    return _rpc_scalar(response.data)


def get_active_admin_login_otp_challenge(challenge_hash: str) -> dict[str, Any] | None:
    normalized_hash = str(challenge_hash or "").strip()
    if not normalized_hash:
        return None
    response = (
        get_supabase_client()
        .table(ADMIN_LOGIN_OTP_TABLE)
        .select("admin_user_id, expires_at, created_at")
        .eq("challenge_hash", normalized_hash)
        .is_("used_at", "null")
        .gt("expires_at", datetime.now(timezone.utc).isoformat())
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    return rows[0] if rows else None


def verify_admin_login_otp_challenge(*, challenge_hash: str, otp_hash: str) -> dict[str, Any]:
    response = get_supabase_client().rpc(
        "verify_admin_login_otp_challenge",
        {
            "p_challenge_hash": str(challenge_hash or "").strip(),
            "p_otp_hash": str(otp_hash or "").strip(),
        },
    ).execute()
    rows = list(response.data or [])
    if not rows or not isinstance(rows[0], dict):
        return {"result": "invalid", "admin_user_id": None, "attempts_remaining": 0}
    return rows[0]


def revoke_admin_login_otp_challenge(challenge_hash: str) -> None:
    normalized_hash = str(challenge_hash or "").strip()
    if not normalized_hash:
        return
    (
        get_supabase_client()
        .table(ADMIN_LOGIN_OTP_TABLE)
        .update({"used_at": datetime.now(timezone.utc).isoformat()})
        .eq("challenge_hash", normalized_hash)
        .is_("used_at", "null")
        .execute()
    )
