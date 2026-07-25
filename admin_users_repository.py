from typing import Any

from supabase_client import get_supabase_client


ADMIN_USERS_TABLE = "admin_users"
ADMIN_USER_SELECT_FIELDS = "id, email, password_hash, is_active, created_at, updated_at"


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
