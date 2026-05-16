from typing import Any

from supabase_client import get_supabase_client


PUBLIC_USERS_TABLE = "public_users"
PUBLIC_USER_PROFILE_FIELDS = (
    "id, email, username, full_name, phone_number, organization, is_active, last_login_at, created_at, updated_at"
)
PUBLIC_USER_AUTH_FIELDS = f"{PUBLIC_USER_PROFILE_FIELDS}, password_hash"


def get_public_user_profile_by_id(user_id: int) -> dict[str, Any] | None:
    client = get_supabase_client()
    response = (
        client.table(PUBLIC_USERS_TABLE)
        .select(PUBLIC_USER_PROFILE_FIELDS)
        .eq("id", int(user_id))
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    if not rows:
        return None
    return rows[0]


def get_public_user_auth_by_email(email: str) -> dict[str, Any] | None:
    normalized_email = str(email or "").strip().lower()
    if not normalized_email:
        raise ValueError("Email is required.")

    client = get_supabase_client()
    response = (
        client.table(PUBLIC_USERS_TABLE)
        .select(PUBLIC_USER_AUTH_FIELDS)
        .eq("email", normalized_email)
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    if not rows:
        return None
    return rows[0]


def get_public_user_auth_by_username(username: str) -> dict[str, Any] | None:
    normalized_username = str(username or "").strip().lower()
    if not normalized_username:
        raise ValueError("Username is required.")

    client = get_supabase_client()
    response = (
        client.table(PUBLIC_USERS_TABLE)
        .select(PUBLIC_USER_AUTH_FIELDS)
        .eq("username", normalized_username)
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    if not rows:
        return None
    return rows[0]


def get_public_user_auth_by_identifier(identifier: str) -> dict[str, Any] | None:
    raw_identifier = str(identifier or "").strip()
    if not raw_identifier:
        raise ValueError("Login identifier is required.")

    if "@" in raw_identifier:
        return get_public_user_auth_by_email(raw_identifier) or get_public_user_auth_by_username(raw_identifier)
    return get_public_user_auth_by_username(raw_identifier) or get_public_user_auth_by_email(raw_identifier)


def create_public_user(payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    response = client.table(PUBLIC_USERS_TABLE).insert(payload).execute()
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("Supabase did not return the created public user row.")
    return rows[0]


def update_public_user(user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    response = client.table(PUBLIC_USERS_TABLE).update(payload).eq("id", int(user_id)).execute()
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("Supabase did not return the updated public user row.")
    return rows[0]
