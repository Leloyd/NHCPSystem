from __future__ import annotations

import hashlib
import hmac
import os
from urllib.parse import urlencode, urlsplit


def secret_digest(secret: str, purpose: str, value: str) -> str:
    key = str(secret or "").encode("utf-8")
    message = f"admin-password-recovery:{purpose}:{value}".encode("utf-8")
    return hmac.new(key, message, hashlib.sha256).hexdigest()


def token_digest(raw_token: str) -> str:
    return hashlib.sha256(str(raw_token or "").encode("utf-8")).hexdigest()


def trusted_base_url(*, is_production: bool) -> str:
    configured = str(os.getenv("ADMIN_PASSWORD_RESET_BASE_URL") or "").strip().rstrip("/")
    if not configured:
        raise ValueError("ADMIN_PASSWORD_RESET_BASE_URL is not configured.")
    parsed = urlsplit(configured)
    hostname = str(parsed.hostname or "").strip().lower()
    local_development = hostname in {"localhost", "127.0.0.1", "::1"}
    try:
        parsed_port = parsed.port
    except ValueError as exc:
        raise ValueError("ADMIN_PASSWORD_RESET_BASE_URL contains an invalid port.") from exc
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("ADMIN_PASSWORD_RESET_BASE_URL must contain only the trusted site origin.")
    if parsed.path not in {"", "/"}:
        raise ValueError("ADMIN_PASSWORD_RESET_BASE_URL must not contain a path.")
    if not hostname or parsed.scheme not in {"http", "https"}:
        raise ValueError("ADMIN_PASSWORD_RESET_BASE_URL must be an absolute HTTP(S) origin.")
    if parsed_port is not None and not 1 <= parsed_port <= 65535:
        raise ValueError("ADMIN_PASSWORD_RESET_BASE_URL contains an invalid port.")
    if parsed.scheme != "https" and (is_production or not local_development):
        raise ValueError("Administrator password reset links require HTTPS.")
    return f"{parsed.scheme}://{parsed.netloc}"


def build_reset_url(base_url: str, reset_path: str, raw_token: str) -> str:
    return f"{base_url}{reset_path}?{urlencode({'token': raw_token})}"
