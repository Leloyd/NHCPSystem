from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage


class EmailDeliveryError(RuntimeError):
    pass


def is_participation_email_configured() -> bool:
    return bool(
        (os.getenv("SMTP_HOST") or "").strip()
        and (os.getenv("SMTP_USERNAME") or "").strip()
        and (os.getenv("SMTP_PASSWORD") or "").strip()
        and (os.getenv("MAIL_FROM_ADDRESS") or "").strip()
    )


def send_participation_verification_email(*, to_email: str, recipient_name: str, verification_code: str, valid_minutes: int) -> None:
    smtp_host = str(os.getenv("SMTP_HOST") or "").strip()
    smtp_port = int(str(os.getenv("SMTP_PORT") or "587").strip() or "587")
    smtp_username = str(os.getenv("SMTP_USERNAME") or "").strip()
    smtp_password = str(os.getenv("SMTP_PASSWORD") or "").strip()
    mail_from_address = str(os.getenv("MAIL_FROM_ADDRESS") or "").strip()
    mail_from_name = str(os.getenv("MAIL_FROM_NAME") or "NHCP Museo ng Libingan").strip() or "NHCP Museo ng Libingan"
    smtp_use_tls = str(os.getenv("SMTP_USE_TLS") or "true").strip().lower() in {"1", "true", "yes", "on"}

    if not smtp_host or not smtp_username or not smtp_password or not mail_from_address:
        raise EmailDeliveryError("Email delivery is not configured. Set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, and MAIL_FROM_ADDRESS.")

    message = EmailMessage()
    message["Subject"] = "Verify your Community Participation submission"
    message["From"] = f"{mail_from_name} <{mail_from_address}>"
    message["To"] = str(to_email or "").strip()

    safe_name = str(recipient_name or "Contributor").strip() or "Contributor"
    plain_text = (
        f"Hello {safe_name},\n\n"
        f"Your verification code is: {verification_code}\n\n"
        f"This code is valid for {valid_minutes} minutes.\n\n"
        "If you did not request this, you can ignore this email."
    )
    html_text = (
        f"<p>Hello {safe_name},</p>"
        f"<p>Your verification code is <strong style=\"font-size:1.25rem;letter-spacing:0.18em;\">{verification_code}</strong>.</p>"
        f"<p>This code is valid for {valid_minutes} minutes.</p>"
        "<p>If you did not request this, you can ignore this email.</p>"
    )
    message.set_content(plain_text)
    message.add_alternative(f"<html><body>{html_text}</body></html>", subtype="html")

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as smtp:
            if smtp_use_tls:
                smtp.starttls()
            smtp.login(smtp_username, smtp_password)
            smtp.send_message(message)
    except Exception as exc:
        raise EmailDeliveryError(f"Could not send the verification email. Details: {exc}") from exc
