from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage
from html import escape


class EmailDeliveryError(RuntimeError):
    pass


def is_participation_email_configured() -> bool:
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
        raise EmailDeliveryError(
            "Email delivery is not configured. Set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, and MAIL_FROM_ADDRESS."
        )
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
        raise EmailDeliveryError(f"Could not send the participation email. Details: {exc}") from exc


def send_participation_verification_email(*, to_email: str, recipient_name: str, verification_code: str, valid_minutes: int) -> None:
    _smtp_host, _smtp_port, _smtp_username, _smtp_password, mail_from_address, mail_from_name, _smtp_use_tls = _build_smtp_config()

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

    _send_message(message)


def send_participation_decision_email(
    *,
    to_email: str,
    recipient_name: str,
    submission_title: str,
    decision: str,
    feedback: str,
    account_url: str,
) -> None:
    """Notify a contributor after an approval or rejection is saved."""
    normalized_decision = str(decision or "").strip().lower()
    if normalized_decision not in {"approved", "rejected"}:
        raise ValueError("Participation decision must be approved or rejected.")

    _smtp_host, _smtp_port, _smtp_username, _smtp_password, mail_from_address, mail_from_name, _smtp_use_tls = _build_smtp_config()
    recipient = str(to_email or "").strip()
    if not recipient:
        raise EmailDeliveryError("The contributor does not have an email address.")

    safe_name = str(recipient_name or "Contributor").strip() or "Contributor"
    safe_title = str(submission_title or "Community contribution").strip() or "Community contribution"
    safe_feedback = str(feedback or "").strip()
    safe_account_url = str(account_url or "").strip()
    approved = normalized_decision == "approved"
    status_phrase = "approved and published" if approved else "returned for changes"
    subject_status = "approved" if approved else "needs changes"

    message = EmailMessage()
    message["Subject"] = f"Your NHCP contribution was {subject_status}"
    message["From"] = f"{mail_from_name} <{mail_from_address}>"
    message["To"] = recipient

    plain_lines = [
        f"Hello {safe_name},",
        "",
        f'Your contribution “{safe_title}” has been {status_phrase}.',
        "",
        "Administrator feedback:",
        safe_feedback,
        "",
    ]
    if approved:
        plain_lines.append("The accepted contribution is now final and can no longer be edited.")
    else:
        plain_lines.append("You can edit and resubmit it from Your Contributions in your Account Profile.")
    if safe_account_url:
        plain_lines.extend(["", f"View your contribution: {safe_account_url}"])
    plain_lines.extend(["", "Thank you for contributing to the museum's digital heritage collection."])

    feedback_html = escape(safe_feedback).replace("\n", "<br>")
    title_html = escape(safe_title)
    name_html = escape(safe_name)
    account_url_html = escape(safe_account_url, quote=True)
    html_lines = [
        f"<p>Hello {name_html},</p>",
        f"<p>Your contribution <strong>“{title_html}”</strong> has been <strong>{escape(status_phrase)}</strong>.</p>",
        '<div style="margin:18px 0;padding:16px;border-left:4px solid #C9A84C;background:#F8F2E5;color:#2C1A0E;">'
        f"<strong>Administrator feedback</strong><p style=\"margin:8px 0 0;\">{feedback_html}</p></div>",
    ]
    if approved:
        html_lines.append("<p>The accepted contribution is now final and can no longer be edited.</p>")
    else:
        html_lines.append("<p>You can edit and resubmit it from <strong>Your Contributions</strong> in your Account Profile.</p>")
    if account_url_html:
        html_lines.append(
            f'<p><a href="{account_url_html}" style="display:inline-block;padding:12px 18px;border-radius:10px;'
            'background:#2C1A0E;color:#F5EDD6;text-decoration:none;font-weight:700;">View Your Contribution</a></p>'
        )
    html_lines.append("<p>Thank you for contributing to the museum's digital heritage collection.</p>")

    message.set_content("\n".join(plain_lines))
    message.add_alternative(f"<html><body>{''.join(html_lines)}</body></html>", subtype="html")
    _send_message(message)
