from typing import Any

from supabase_client import get_supabase_client


PUBLIC_USERS_TABLE = "public_users"
PUBLIC_USER_PROFILE_FIELDS = (
    "id, email, username, full_name, phone_number, organization, is_active, last_login_at, "
    "email_verified_at, onboarding_completed_at, website_use_case, profile_roles, location_text, country_text, province_text, city_text, auth_provider, "
    "profile_picture, theme_preference, language_preference, local_password_enabled, created_at, updated_at"
)
PUBLIC_USER_AUTH_FIELDS = (
    f"{PUBLIC_USER_PROFILE_FIELDS}, password_hash, email_verification_token_hash, email_verification_expires_at, "
    "email_verification_sent_at, email_verification_attempts, oauth_subject, "
    "password_reset_token_hash, password_reset_expires_at, security_code_hash, security_code_expires_at, "
    "security_code_sent_at, security_code_attempts"
)


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


def get_public_user_auth_by_oauth_subject(provider: str, subject: str) -> dict[str, Any] | None:
    normalized_provider = str(provider or "").strip().lower()
    normalized_subject = str(subject or "").strip()
    if not normalized_provider or not normalized_subject:
        raise ValueError("OAuth provider and subject are required.")

    client = get_supabase_client()
    response = (
        client.table(PUBLIC_USERS_TABLE)
        .select(PUBLIC_USER_AUTH_FIELDS)
        .eq("auth_provider", normalized_provider)
        .eq("oauth_subject", normalized_subject)
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    if not rows:
        return None
    return rows[0]


def get_public_user_by_email_verification_token_hash(token_hash: str) -> dict[str, Any] | None:
    normalized_hash = str(token_hash or "").strip()
    if not normalized_hash:
        raise ValueError("Verification token hash is required.")

    client = get_supabase_client()
    response = (
        client.table(PUBLIC_USERS_TABLE)
        .select(PUBLIC_USER_AUTH_FIELDS)
        .eq("email_verification_token_hash", normalized_hash)
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    if not rows:
        return None
    return rows[0]


def get_public_user_by_password_reset_token_hash(token_hash: str) -> dict[str, Any] | None:
    normalized_hash = str(token_hash or "").strip()
    if not normalized_hash:
        raise ValueError("Password reset token hash is required.")

    client = get_supabase_client()
    response = (
        client.table(PUBLIC_USERS_TABLE)
        .select(PUBLIC_USER_AUTH_FIELDS)
        .eq("password_reset_token_hash", normalized_hash)
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    if not rows:
        return None
    return rows[0]


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


def delete_public_user(user_id: int) -> None:
    get_supabase_client().table(PUBLIC_USERS_TABLE).delete().eq("id", int(user_id)).execute()


def list_public_users() -> list[dict[str, Any]]:
    """Verified visitor accounts, newest first, for User Management.

    Deactivated accounts remain visible, while legacy incomplete registrations
    are excluded because they were never actual visitor accounts.
    """
    client = get_supabase_client()
    response = (
        client.table(PUBLIC_USERS_TABLE)
        .select(PUBLIC_USER_PROFILE_FIELDS)
        .order("created_at", desc=True)
        .execute()
    )
    return [row for row in list(response.data or []) if row.get("email_verified_at")]


def get_public_user_by_id(user_id: int) -> dict[str, Any] | None:
    """A single account by id regardless of active state (admin detail view)."""
    client = get_supabase_client()
    response = (
        client.table(PUBLIC_USERS_TABLE)
        .select(PUBLIC_USER_PROFILE_FIELDS)
        .eq("id", int(user_id))
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    if not rows or not rows[0].get("email_verified_at"):
        return None
    return rows[0]
