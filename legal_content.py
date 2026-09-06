"""Versioned public legal documents and signed-session acceptance helpers."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, MutableMapping

PUBLIC_TERMS_VERSION = "2026-09-07"
PUBLIC_TERMS_EFFECTIVE_DATE = "September 7, 2026"
PUBLIC_TERMS_ACCEPTANCE_SESSION_KEY = "public_terms_acceptance"
PUBLIC_TERMS_REVIEW_SESSION_KEY = "public_terms_review"


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
