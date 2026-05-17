from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage


class PublicAuthEmailError(RuntimeError):
    pass


def is_public_auth_email_configured() -> bool:
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
        raise PublicAuthEmailError("Email delivery is not configured. Set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, and MAIL_FROM_ADDRESS.")
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
        raise PublicAuthEmailError(f"Could not send email. Details: {exc}") from exc


def send_public_account_verification_email(*, to_email: str, verification_url: str) -> None:
    _smtp_host, _smtp_port, _smtp_username, _smtp_password, mail_from_address, mail_from_name, _smtp_use_tls = _build_smtp_config()
    message = EmailMessage()
    message["Subject"] = "Verify your NHCP account"
    message["From"] = f"{mail_from_name} <{mail_from_address}>"
    message["To"] = str(to_email or "").strip()
    plain_text = (
        "Welcome to NHCP Museo ng Libingan sa Ilalim ng Lupa.\n\n"
        f"Please verify your email by opening this link:\n{verification_url}\n\n"
        "If you did not create this account, you can ignore this email."
    )
    html_text = (
        "<p>Welcome to NHCP Museo ng Libingan sa Ilalim ng Lupa.</p>"
        f"<p>Please verify your email by clicking the button below.</p>"
        f"<p><a href=\"{verification_url}\" style=\"display:inline-block;padding:12px 20px;border-radius:12px;background:#2C1A0E;color:#F5EDD6;text-decoration:none;font-weight:600;\">Verify Email</a></p>"
        f"<p>If the button does not work, use this link:<br><a href=\"{verification_url}\">{verification_url}</a></p>"
        "<p>If you did not create this account, you can ignore this email.</p>"
    )
    message.set_content(plain_text)
    message.add_alternative(f"<html><body>{html_text}</body></html>", subtype="html")
    _send_message(message)


def send_public_password_reset_email(*, to_email: str, reset_url: str) -> None:
    _smtp_host, _smtp_port, _smtp_username, _smtp_password, mail_from_address, mail_from_name, _smtp_use_tls = _build_smtp_config()
    message = EmailMessage()
    message["Subject"] = "Reset your NHCP account password"
    message["From"] = f"{mail_from_name} <{mail_from_address}>"
    message["To"] = str(to_email or "").strip()
    plain_text = (
        "We received a request to reset your NHCP account password.\n\n"
        f"Open this link to continue:\n{reset_url}\n\n"
        "If you did not request a password reset, you can ignore this email."
    )
    html_text = (
        "<p>We received a request to reset your NHCP account password.</p>"
        f"<p><a href=\"{reset_url}\" style=\"display:inline-block;padding:12px 20px;border-radius:12px;background:#2C1A0E;color:#F5EDD6;text-decoration:none;font-weight:600;\">Reset Password</a></p>"
        f"<p>If the button does not work, use this link:<br><a href=\"{reset_url}\">{reset_url}</a></p>"
        "<p>If you did not request a password reset, you can ignore this email.</p>"
    )
    message.set_content(plain_text)
    message.add_alternative(f"<html><body>{html_text}</body></html>", subtype="html")
    _send_message(message)
