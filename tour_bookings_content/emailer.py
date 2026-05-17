from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage


class BookingEmailError(RuntimeError):
    pass


def is_booking_email_configured() -> bool:
    return bool(
        (os.getenv("SMTP_HOST") or "").strip()
        and (os.getenv("SMTP_USERNAME") or "").strip()
        and (os.getenv("SMTP_PASSWORD") or "").strip()
        and (os.getenv("MAIL_FROM_ADDRESS") or "").strip()
    )


def _build_smtp_config() -> tuple[str, int, str, str, str, str, bool]:
    smtp_host = str(os.getenv("SMTP_HOST") or "").strip()
    smtp_port = int(str(os.getenv("SMTP_PORT") or "587").strip() or "587")
    smtp_username = str(os.getenv("SMTP_USERNAME") or "").strip()
    smtp_password = str(os.getenv("SMTP_PASSWORD") or "").strip()
    mail_from_address = str(os.getenv("MAIL_FROM_ADDRESS") or "").strip()
    mail_from_name = str(os.getenv("MAIL_FROM_NAME") or "NHCP Museo ng Libingan").strip() or "NHCP Museo ng Libingan"
    smtp_use_tls = str(os.getenv("SMTP_USE_TLS") or "true").strip().lower() in {"1", "true", "yes", "on"}
    if not smtp_host or not smtp_username or not smtp_password or not mail_from_address:
        raise BookingEmailError("Email delivery is not configured. Set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, and MAIL_FROM_ADDRESS.")
    return smtp_host, smtp_port, smtp_username, smtp_password, mail_from_address, mail_from_name, smtp_use_tls


def _send_message(message: EmailMessage) -> None:
    smtp_host, smtp_port, smtp_username, smtp_password, _from_address, _from_name, smtp_use_tls = _build_smtp_config()
    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as smtp:
            if smtp_use_tls:
                smtp.starttls()
            smtp.login(smtp_username, smtp_password)
            smtp.send_message(message)
    except Exception as exc:
        raise BookingEmailError(f"Could not send email. Details: {exc}") from exc


def send_booking_status_email(
    *,
    to_email: str,
    recipient_name: str,
    scheduled_tour: str,
    status_label: str,
    visit_date_label: str,
    reason: str = "",
    rescheduled_date_label: str = "",
) -> None:
    _smtp_host, _smtp_port, _smtp_username, _smtp_password, mail_from_address, mail_from_name, _smtp_use_tls = _build_smtp_config()
    safe_name = str(recipient_name or "Visitor").strip() or "Visitor"
    safe_tour = str(scheduled_tour or "Museum Tour Booking").strip() or "Museum Tour Booking"
    safe_status = str(status_label or "Updated").strip() or "Updated"
    safe_date = str(visit_date_label or "To be announced").strip() or "To be announced"
    safe_reason = str(reason or "").strip()
    safe_rescheduled_date = str(rescheduled_date_label or "").strip()

    message = EmailMessage()
    message["Subject"] = f"Your NHCP booking has been {safe_status.lower()}"
    message["From"] = f"{mail_from_name} <{mail_from_address}>"
    message["To"] = str(to_email or "").strip()

    plain_lines = [
        f"Hello {safe_name},",
        "",
        f"Your booking request for {safe_tour} has been {safe_status.lower()}.",
        f"Requested booking date: {safe_date}",
    ]
    html_lines = [
        f"<p>Hello {safe_name},</p>",
        f"<p>Your booking request for <strong>{safe_tour}</strong> has been <strong>{safe_status.lower()}</strong>.</p>",
        f"<p><strong>Requested booking date:</strong> {safe_date}</p>",
    ]

    if safe_rescheduled_date:
        plain_lines.extend([f"New schedule: {safe_rescheduled_date}", ""])
        html_lines.append(f"<p><strong>New schedule:</strong> {safe_rescheduled_date}</p>")

    if safe_reason:
        plain_lines.extend([f"Reason: {safe_reason}", ""])
        html_lines.append(f"<p><strong>Reason:</strong> {safe_reason}</p>")

    plain_lines.extend([
        "Please sign in to your NHCP account if you need to review your booking details.",
        "",
        "Thank you.",
    ])
    html_lines.append("<p>Please sign in to your NHCP account if you need to review your booking details.</p>")
    html_lines.append("<p>Thank you.</p>")

    message.set_content("\n".join(plain_lines))
    message.add_alternative(f"<html><body>{''.join(html_lines)}</body></html>", subtype="html")
    _send_message(message)
