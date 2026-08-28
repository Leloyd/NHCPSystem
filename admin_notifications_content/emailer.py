from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage


class AdminNotificationEmailError(RuntimeError):
    pass


def is_admin_notification_email_configured() -> bool:
    return bool(
        (os.getenv("SMTP_HOST") or "").strip()
        and (os.getenv("SMTP_USERNAME") or "").strip()
        and (os.getenv("SMTP_PASSWORD") or "").strip()
        and (os.getenv("MAIL_FROM_ADDRESS") or "").strip()
    )


def send_admin_notification_email(
    *,
    recipient_emails: list[str],
    title: str,
    message_text: str,
) -> None:
    recipients = sorted({str(value or "").strip().lower() for value in recipient_emails if str(value or "").strip()})
    if not recipients:
        raise AdminNotificationEmailError("No active administrator email address is available.")

    smtp_host = str(os.getenv("SMTP_HOST") or "").strip()
    smtp_port = int(str(os.getenv("SMTP_PORT") or "587").strip() or "587")
    smtp_username = str(os.getenv("SMTP_USERNAME") or "").strip()
    smtp_password = str(os.getenv("SMTP_PASSWORD") or "").strip()
    mail_from_address = str(os.getenv("MAIL_FROM_ADDRESS") or "").strip()
    mail_from_name = str(os.getenv("MAIL_FROM_NAME") or "NHCP Museo ng Libingan").strip() or "NHCP Museo ng Libingan"
    smtp_use_tls = str(os.getenv("SMTP_USE_TLS") or "true").strip().lower() in {"1", "true", "yes", "on"}

    if not is_admin_notification_email_configured():
        raise AdminNotificationEmailError(
            "Email delivery is not configured. Set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, and MAIL_FROM_ADDRESS."
        )

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

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=12) as smtp:
            if smtp_use_tls:
                smtp.starttls()
            smtp.login(smtp_username, smtp_password)
            smtp.send_message(email)
    except Exception as exc:
        raise AdminNotificationEmailError(f"Could not send the administrator notification email. Details: {exc}") from exc


def _escape_html(value: str) -> str:
    return (
        str(value or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#x27;")
    )
