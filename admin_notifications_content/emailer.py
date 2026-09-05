from __future__ import annotations

import os
import smtplib
import ssl
from email.message import EmailMessage


class AdminNotificationEmailError(RuntimeError):
    pass


def is_admin_notification_email_configured() -> bool:
    return bool(
        (os.getenv("SMTP_HOST") or "").strip()
        and (os.getenv("SMTP_USERNAME") or "").strip()
        and (os.getenv("SMTP_PASSWORD") or "").strip()
        and (os.getenv("MAIL_FROM_ADDRESS") or "").strip()
        and (
            str(os.getenv("SMTP_USE_TLS") or "true").strip().lower() in {"1", "true", "yes", "on"}
            or str(os.getenv("SMTP_USE_SSL") or "false").strip().lower() in {"1", "true", "yes", "on"}
        )
    )


def _smtp_config() -> tuple[str, int, str, str, str, str, bool, bool]:
    host = str(os.getenv("SMTP_HOST") or "").strip()
    username = str(os.getenv("SMTP_USERNAME") or "").strip()
    password = str(os.getenv("SMTP_PASSWORD") or "").strip()
    from_address = str(os.getenv("MAIL_FROM_ADDRESS") or "").strip()
    from_name = str(os.getenv("MAIL_FROM_NAME") or "NHCP Museo ng Libingan").strip() or "NHCP Museo ng Libingan"
    use_ssl = str(os.getenv("SMTP_USE_SSL") or "false").strip().lower() in {"1", "true", "yes", "on"}
    use_tls = str(os.getenv("SMTP_USE_TLS") or ("false" if use_ssl else "true")).strip().lower() in {
        "1", "true", "yes", "on"
    }
    try:
        port = int(str(os.getenv("SMTP_PORT") or ("465" if use_ssl else "587")).strip())
    except ValueError as exc:
        raise AdminNotificationEmailError("SMTP_PORT must be a number.") from exc
    if not host or not username or not password or not from_address:
        raise AdminNotificationEmailError("Administrator notification email is not configured.")
    if use_ssl and use_tls:
        raise AdminNotificationEmailError("Use either SMTP_USE_SSL or SMTP_USE_TLS, not both.")
    if not use_ssl and not use_tls:
        raise AdminNotificationEmailError("Administrator notification email requires TLS or SSL.")
    return host, port, username, password, from_address, from_name, use_tls, use_ssl


def _send_message(message: EmailMessage) -> None:
    host, port, username, password, _from_address, _from_name, _use_tls, use_ssl = _smtp_config()
    context = ssl.create_default_context()
    try:
        if use_ssl:
            with smtplib.SMTP_SSL(host, port, timeout=12, context=context) as smtp:
                smtp.login(username, password)
                smtp.send_message(message)
        else:
            with smtplib.SMTP(host, port, timeout=12) as smtp:
                smtp.ehlo()
                smtp.starttls(context=context)
                smtp.ehlo()
                smtp.login(username, password)
                smtp.send_message(message)
    except Exception as exc:
        raise AdminNotificationEmailError("Could not send the administrator notification email.") from exc


def send_admin_notification_email(
    *,
    recipient_emails: list[str],
    title: str,
    message_text: str,
) -> None:
    recipients = sorted({str(value or "").strip().lower() for value in recipient_emails if str(value or "").strip()})
    if not recipients:
        raise AdminNotificationEmailError("No active administrator email address is available.")

    _host, _port, _username, _password, mail_from_address, mail_from_name, _use_tls, _use_ssl = _smtp_config()

    safe_title = " ".join(str(title or "New admin notification").split())[:180]
    safe_message = " ".join(str(message_text or "A new item needs administrator review.").split())[:1200]
    email = EmailMessage()
    email["Subject"] = f"NHCP Admin: {safe_title}"
    email["From"] = f"{mail_from_name} <{mail_from_address}>"
    email["To"] = ", ".join(recipients)
    email.set_content(
        f"{safe_title}\n\n{safe_message}\n\n"
        "Sign in to the NHCP administrator portal to review this item."
    )
    email.add_alternative(
        "<html><body>"
        f"<h2>{_escape_html(safe_title)}</h2>"
        f"<p>{_escape_html(safe_message)}</p>"
        "<p>Sign in to the NHCP administrator portal to review this item.</p>"
        "</body></html>",
        subtype="html",
    )

    _send_message(email)


def send_admin_login_lockout_email(
    *,
    recipient_emails: list[str],
    attempted_email: str,
    occurred_at: str,
    client_ip: str,
    browser: str,
    operating_system: str,
    device_type: str,
    user_agent: str,
    failed_attempts: int,
    lockout_minutes: int,
) -> None:
    """Send a security alert without ever including the submitted password."""
    recipients = sorted({str(value or "").strip().lower() for value in recipient_emails if str(value or "").strip()})
    if not recipients:
        raise AdminNotificationEmailError("No active administrator email address is available.")

    _host, _port, _username, _password, mail_from_address, mail_from_name, _use_tls, _use_ssl = _smtp_config()

    details = [
        ("Attempted account", str(attempted_email or "Not provided")[:254]),
        ("Date and time", str(occurred_at or "Unknown")[:100]),
        ("IP address", str(client_ip or "Unknown")[:64]),
        ("Device", str(device_type or "Unknown")[:80]),
        ("Operating system", str(operating_system or "Unknown")[:100]),
        ("Browser", str(browser or "Unknown")[:100]),
        ("Failed attempts", str(max(1, int(failed_attempts)))),
        ("Temporary lock", f"{max(1, int(lockout_minutes))} minute(s)"),
        ("User agent", str(user_agent or "Not supplied")[:500]),
    ]

    email = EmailMessage()
    email["Subject"] = "NHCP Admin Security Alert: Login temporarily locked"
    email["From"] = f"{mail_from_name} <{mail_from_address}>"
    email["To"] = ", ".join(recipients)
    plain_details = "\n".join(f"{label}: {value}" for label, value in details)
    email.set_content(
        "The administrator login was temporarily locked after repeated failed attempts.\n\n"
        f"{plain_details}\n\n"
        "If this was not you, do not share your password or verification codes. Review the activity and change "
        "the administrator password if you suspect it has been exposed."
    )
    detail_rows = "".join(
        "<tr>"
        f"<th style=\"padding:8px 12px;text-align:left;vertical-align:top;border-bottom:1px solid #e5e7eb;\">{_escape_html(label)}</th>"
        f"<td style=\"padding:8px 12px;border-bottom:1px solid #e5e7eb;word-break:break-word;\">{_escape_html(value)}</td>"
        "</tr>"
        for label, value in details
    )
    email.add_alternative(
        "<html><body style=\"font-family:Arial,sans-serif;color:#17211c;line-height:1.5;\">"
        "<div style=\"max-width:680px;margin:0 auto;padding:24px;\">"
        "<h2 style=\"color:#8a2f2f;margin:0 0 12px;\">Administrator login temporarily locked</h2>"
        "<p>Repeated failed login attempts triggered the administrator portal's temporary protection.</p>"
        f"<table style=\"width:100%;border-collapse:collapse;margin:20px 0;background:#f8faf9;\">{detail_rows}</table>"
        "<p><strong>If this was not you:</strong> do not share your password or verification codes. Review the "
        "activity and change the administrator password if you suspect it has been exposed.</p>"
        "<p style=\"font-size:13px;color:#66736c;\">For security, the submitted password is never recorded or included in this email.</p>"
        "</div></body></html>",
        subtype="html",
    )

    _send_message(email)


def _escape_html(value: str) -> str:
    return (
        str(value or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#x27;")
    )
