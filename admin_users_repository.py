from typing import Any

from supabase_client import get_supabase_client


ADMIN_USERS_TABLE = "admin_users"
ADMIN_USER_SELECT_FIELDS = "id, email, password_hash, is_active, created_at, updated_at"


def list_active_admin_users() -> list[dict[str, Any]]:
    client = get_supabase_client()
    response = (
        client.table(ADMIN_USERS_TABLE)
        .select("id, email")
        .eq("is_active", True)
        .order("id")
        .execute()
    )
    return list(response.data or [])


def get_active_admin_user_by_email(email: str) -> dict[str, Any] | None:
    normalized_email = str(email or "").strip().lower()
    if not normalized_email:
        raise ValueError("Email is required.")

    client = get_supabase_client()
    response = (
        client.table(ADMIN_USERS_TABLE)
        .select(ADMIN_USER_SELECT_FIELDS)
        .eq("email", normalized_email)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    if not rows:
        return None
    return rows[0]


def update_admin_password(admin_user_id: int, password_hash: str, updated_at: str) -> dict[str, Any] | None:
    normalized_hash = str(password_hash or "").strip()
    normalized_updated_at = str(updated_at or "").strip()
    if not normalized_hash:
        raise ValueError("Password hash is required.")
    if not normalized_updated_at:
        raise ValueError("Updated timestamp is required.")

    client = get_supabase_client()
    response = (
        client.table(ADMIN_USERS_TABLE)
        .update({"password_hash": normalized_hash, "updated_at": normalized_updated_at})
        .eq("id", int(admin_user_id))
        .execute()
    )
    rows = list(response.data or [])
    return rows[0] if rows else None


def touch_admin_account(admin_user_id: int, updated_at: str) -> dict[str, Any] | None:
    normalized_updated_at = str(updated_at or "").strip()
    if not normalized_updated_at:
        raise ValueError("Updated timestamp is required.")

    client = get_supabase_client()
    response = (
        client.table(ADMIN_USERS_TABLE)
        .update({"updated_at": normalized_updated_at})
        .eq("id", int(admin_user_id))
        .execute()
    )
    rows = list(response.data or [])
    return rows[0] if rows else None
