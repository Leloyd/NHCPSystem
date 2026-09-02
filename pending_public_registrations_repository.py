from __future__ import annotations

from typing import Any

from supabase_client import get_supabase_client


PENDING_PUBLIC_REGISTRATIONS_TABLE = "pending_public_registrations"
PENDING_PUBLIC_REGISTRATION_FIELDS = (
    "email, full_name, password_hash, verification_code_hash, verification_expires_at, "
    "verification_sent_at, verification_attempts, created_at, updated_at"
)


def get_pending_public_registration(email: str) -> dict[str, Any] | None:
    normalized_email = str(email or "").strip().lower()
    if not normalized_email:
        raise ValueError("Email is required.")
    response = (
        get_supabase_client()
        .table(PENDING_PUBLIC_REGISTRATIONS_TABLE)
        .select(PENDING_PUBLIC_REGISTRATION_FIELDS)
        .eq("email", normalized_email)
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    return rows[0] if rows else None


def save_pending_public_registration(payload: dict[str, Any]) -> dict[str, Any]:
    """Insert or replace the pending state for one normalized email."""

    response = (
        get_supabase_client()
        .table(PENDING_PUBLIC_REGISTRATIONS_TABLE)
        .upsert(payload, on_conflict="email")
        .execute()
    )
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("Supabase did not return the pending registration row.")
    return rows[0]


def update_pending_public_registration(email: str, payload: dict[str, Any]) -> dict[str, Any]:
    normalized_email = str(email or "").strip().lower()
    response = (
        get_supabase_client()
        .table(PENDING_PUBLIC_REGISTRATIONS_TABLE)
        .update(payload)
        .eq("email", normalized_email)
        .execute()
    )
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("The pending registration could not be updated.")
    return rows[0]


def delete_pending_public_registration(email: str) -> None:
    normalized_email = str(email or "").strip().lower()
    if normalized_email:
        (
            get_supabase_client()
            .table(PENDING_PUBLIC_REGISTRATIONS_TABLE)
            .delete()
            .eq("email", normalized_email)
            .execute()
        )


def purge_expired_pending_public_registrations(expired_before: str) -> None:
    (
        get_supabase_client()
        .table(PENDING_PUBLIC_REGISTRATIONS_TABLE)
        .delete()
        .lt("verification_expires_at", str(expired_before))
        .execute()
    )
