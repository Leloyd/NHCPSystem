"""Versioned public legal documents and signed-session acceptance helpers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, MutableMapping

PUBLIC_TERMS_VERSION = "2026-09-07"
PUBLIC_TERMS_EFFECTIVE_DATE = "September 7, 2026"
PUBLIC_TERMS_ACCEPTANCE_SESSION_KEY = "public_terms_acceptance"
PUBLIC_TERMS_REVIEW_SESSION_KEY = "public_terms_review"
PUBLIC_TERMS_LOGIN_SESSION_KEY = "public_terms_login"
PUBLIC_TERMS_LOGIN_LIFETIME = timedelta(minutes=15)


def user_has_current_public_terms(user: dict[str, Any] | None) -> bool:
    if not isinstance(user, dict):
        return False
    return (
        str(user.get("terms_version") or "") == PUBLIC_TERMS_VERSION
        and bool(str(user.get("terms_accepted_at") or "").strip())
    )


def current_public_terms_acceptance(session_store: MutableMapping[str, Any]) -> dict[str, str] | None:
    value = session_store.get(PUBLIC_TERMS_ACCEPTANCE_SESSION_KEY)
    if not isinstance(value, dict):
        return None
    version = str(value.get("version") or "")
    accepted_at = str(value.get("accepted_at") or "")
    if version != PUBLIC_TERMS_VERSION or not accepted_at:
        return None
    return {"version": version, "accepted_at": accepted_at}


def accept_current_public_terms(session_store: MutableMapping[str, Any]) -> dict[str, str]:
    existing = current_public_terms_acceptance(session_store)
    if existing:
        return existing
    acceptance = {
        "version": PUBLIC_TERMS_VERSION,
        "accepted_at": datetime.now(timezone.utc).isoformat(),
    }
    session_store[PUBLIC_TERMS_ACCEPTANCE_SESSION_KEY] = acceptance
    return acceptance


def clear_public_terms_signup_state(session_store: MutableMapping[str, Any]) -> None:
    session_store.pop(PUBLIC_TERMS_ACCEPTANCE_SESSION_KEY, None)
    session_store.pop(PUBLIC_TERMS_REVIEW_SESSION_KEY, None)


def stage_public_terms_login(
    session_store: MutableMapping[str, Any],
    user: dict[str, Any],
    next_url: str,
) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    state = {
        "user_id": int(user["id"]),
        "account_version": str(user.get("updated_at") or ""),
        "next": str(next_url or "/"),
        "expires_at": (now + PUBLIC_TERMS_LOGIN_LIFETIME).isoformat(),
    }
    session_store[PUBLIC_TERMS_LOGIN_SESSION_KEY] = state
    return state


def current_public_terms_login(session_store: MutableMapping[str, Any]) -> dict[str, Any] | None:
    value = session_store.get(PUBLIC_TERMS_LOGIN_SESSION_KEY)
    if not isinstance(value, dict):
        return None
    try:
        user_id = int(value.get("user_id"))
        expires_at = datetime.fromisoformat(str(value.get("expires_at") or "").replace("Z", "+00:00"))
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        session_store.pop(PUBLIC_TERMS_LOGIN_SESSION_KEY, None)
        return None
    if user_id <= 0 or expires_at <= datetime.now(timezone.utc):
        session_store.pop(PUBLIC_TERMS_LOGIN_SESSION_KEY, None)
        return None
    return {
        "user_id": user_id,
        "account_version": str(value.get("account_version") or ""),
        "next": str(value.get("next") or "/"),
        "expires_at": expires_at.isoformat(),
    }


def clear_public_terms_login(session_store: MutableMapping[str, Any]) -> None:
    session_store.pop(PUBLIC_TERMS_LOGIN_SESSION_KEY, None)
