from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from flask import current_app

from public_users_repository import get_public_user_by_id, list_public_users
from supabase_client import SupabaseConfigError, is_supabase_configured


AUTH_PROVIDER_LABELS = {
    "password": "Email & Password",
    "google": "Google",
}


def _format_datetime(raw_value: Any, *, empty: str = "—") -> str:
    raw_text = str(raw_value or "").strip()
    if not raw_text:
        return empty
    try:
        parsed = datetime.fromisoformat(raw_text.replace("Z", "+00:00"))
    except ValueError:
        return raw_text
    return parsed.strftime("%B %d, %Y %I:%M %p")


def _parse_roles(raw_value: Any) -> list[str]:
    if isinstance(raw_value, list):
        return [str(role).strip() for role in raw_value if str(role).strip()]
    text = str(raw_value or "").strip()
    if not text:
        return []
    try:
        parsed = json.loads(text)
    except (ValueError, TypeError):
        return [part.strip() for part in text.split(",") if part.strip()]
    if isinstance(parsed, list):
        return [str(role).strip() for role in parsed if str(role).strip()]
    return []


def _build_location(item: dict[str, Any]) -> str:
    parts = [
        str(item.get("city_text") or "").strip(),
        str(item.get("province_text") or "").strip(),
        str(item.get("country_text") or "").strip(),
    ]
    parts = [part for part in parts if part]
    if parts:
        return ", ".join(parts)
    return str(item.get("location_text") or "").strip() or "—"


def prepare_public_user(item: dict[str, Any] | None) -> dict[str, Any]:
    prepared = dict(item or {})

    full_name = str(prepared.get("full_name") or "").strip()
    username = str(prepared.get("username") or "").strip()
    organization = str(prepared.get("organization") or "").strip()
    phone_number = str(prepared.get("phone_number") or "").strip()
    use_case = str(prepared.get("website_use_case") or "").strip()
    auth_provider = str(prepared.get("auth_provider") or "password").strip().lower()
    roles = _parse_roles(prepared.get("profile_roles"))

    prepared["is_active"] = bool(prepared.get("is_active"))
    prepared["status_label"] = "Active" if prepared["is_active"] else "Deactivated"
    prepared["display_name"] = full_name or username or "Unnamed user"
    prepared["username"] = username
    prepared["organization_display"] = organization or "—"
    prepared["phone_display"] = phone_number or "—"
    prepared["use_case_display"] = use_case or "—"
    prepared["roles_list"] = roles
    prepared["roles_display"] = ", ".join(roles) if roles else "—"
    prepared["location_display"] = _build_location(prepared)
    prepared["auth_provider_label"] = AUTH_PROVIDER_LABELS.get(auth_provider, auth_provider.title() or "Unknown")

    prepared["is_verified"] = bool(str(prepared.get("email_verified_at") or "").strip())
    prepared["verified_label"] = "Verified" if prepared["is_verified"] else "Unverified"
    prepared["is_onboarded"] = bool(str(prepared.get("onboarding_completed_at") or "").strip())
    prepared["onboarding_label"] = "Completed" if prepared["is_onboarded"] else "Not completed"

    prepared["display_created"] = _format_datetime(prepared.get("created_at"))
    prepared["display_updated"] = _format_datetime(prepared.get("updated_at"))
    prepared["display_last_login"] = _format_datetime(prepared.get("last_login_at"), empty="Never signed in")
    prepared["display_verified_at"] = _format_datetime(prepared.get("email_verified_at"), empty="Not verified")
    return prepared


def load_admin_public_users() -> list[dict[str, Any]]:
    if not is_supabase_configured():
        return []
    try:
        return [prepare_public_user(item) for item in list_public_users()]
    except SupabaseConfigError:
        current_app.logger.warning("Supabase user accounts integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        current_app.logger.exception("Failed to load public users: %s", exc)
    return []


def load_admin_public_user(user_id: int) -> dict[str, Any] | None:
    if not is_supabase_configured():
        return None
    try:
        item = get_public_user_by_id(user_id)
        if item is None:
            return None
        return prepare_public_user(item)
    except SupabaseConfigError:
        current_app.logger.warning("Supabase user accounts integration is not fully configured.")
    except Exception as exc:  # noqa: BLE001
        current_app.logger.exception("Failed to load public user %s: %s", user_id, exc)
    return None


def filter_public_users(users: list[dict[str, Any]], *, search: str = "", status: str = "all") -> list[dict[str, Any]]:
    filtered = users

    normalized_status = str(status or "all").strip().lower()
    if normalized_status == "active":
        filtered = [user for user in filtered if user.get("is_active")]
    elif normalized_status == "deactivated":
        filtered = [user for user in filtered if not user.get("is_active")]

    needle = str(search or "").strip().lower()
    if needle:
        searchable_fields = ("full_name", "email", "username", "organization")
        filtered = [
            user
            for user in filtered
            if any(needle in str(user.get(field) or "").lower() for field in searchable_fields)
        ]
    return filtered


def get_public_user_status_message(status_key: Any) -> str | None:
    mapping = {
        "activated": "The account was activated successfully.",
        "deactivated": "The account was deactivated. The user can no longer sign in.",
    }
    return mapping.get(str(status_key or "").strip().lower())
