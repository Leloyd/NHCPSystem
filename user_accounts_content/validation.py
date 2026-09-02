from __future__ import annotations

import re
from typing import Any


_LOCAL_ATOM = r"[a-z0-9!#$%&'*+/=?^_`{|}~-]+"
_DOMAIN_LABEL = r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"
EMAIL_PATTERN = re.compile(
    rf"{_LOCAL_ATOM}(?:\.{_LOCAL_ATOM})*@{_DOMAIN_LABEL}(?:\.{_DOMAIN_LABEL})+",
    re.IGNORECASE,
)


def normalize_email_address(raw_value: Any) -> str:
    """Return a normalized address or raise for malformed input.

    This intentionally validates the complete value. The former broad pattern
    treated punctuation after a domain (for example ``a@a.com!``) as part of a
    valid domain. Inbox ownership is still established only by the OTP.
    """

    email = str(raw_value or "").strip().lower()
    if not email or len(email) > 254 or not EMAIL_PATTERN.fullmatch(email):
        raise ValueError("Please provide a valid email address.")

    local_part, domain = email.rsplit("@", 1)
    if len(local_part) > 64:
        raise ValueError("Please provide a valid email address.")

    domain_labels = domain.split(".")
    final_label = domain_labels[-1]
    if len(final_label) < 2 or final_label.isdigit():
        raise ValueError("Please provide a valid email address.")
    return email


def is_valid_email_address(raw_value: Any) -> bool:
    try:
        normalize_email_address(raw_value)
    except ValueError:
        return False
    return True
