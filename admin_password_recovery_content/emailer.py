from __future__ import annotations

import html
import os
import smtplib
import ssl
from email.message import EmailMessage


class AdminPasswordRecoveryEmailError(RuntimeError):
    pass


def is_admin_password_recovery_email_configured() -> bool:
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
    use_tls = str(os.getenv("SMTP_USE_TLS") or ("false" if use_ssl else "true")).strip().lower() in {"1", "true", "yes", "on"}
    try:
        port = int(str(os.getenv("SMTP_PORT") or ("465" if use_ssl else "587")).strip())
    except ValueError as exc:
        raise AdminPasswordRecoveryEmailError("SMTP_PORT must be a number.") from exc
    if not host or not username or not password or not from_address:
        raise AdminPasswordRecoveryEmailError("Administrator recovery email is not configured.")
    if use_ssl and use_tls:
        raise AdminPasswordRecoveryEmailError("Use either SMTP_USE_SSL or SMTP_USE_TLS, not both.")
    if not use_ssl and not use_tls:
        raise AdminPasswordRecoveryEmailError("Administrator recovery email requires TLS or SSL.")
    return host, port, username, password, from_address, from_name, use_tls, use_ssl


def _send(message: EmailMessage) -> None:
    host, port, username, password, _from_address, _from_name, use_tls, use_ssl = _smtp_config()
    context = ssl.create_default_context()
    try:
        if use_ssl:
            with smtplib.SMTP_SSL(host, port, timeout=20, context=context) as smtp:
                smtp.login(username, password)
                smtp.send_message(message)
        else:
            with smtplib.SMTP(host, port, timeout=20) as smtp:
                smtp.ehlo()
                smtp.starttls(context=context)
                smtp.ehlo()
                smtp.login(username, password)
                smtp.send_message(message)
    except Exception as exc:
        raise AdminPasswordRecoveryEmailError("The administrator recovery email could not be delivered.") from exc


def send_admin_password_reset_email(*, to_email: str, reset_url: str, expires_minutes: int = 30) -> None:
    _host, _port, _username, _password, from_address, from_name, _use_tls, _use_ssl = _smtp_config()
    safe_url = str(reset_url or "").strip()
    message = EmailMessage()
    message["Subject"] = "Reset your NHCP administrator password"
    message["From"] = f"{from_name} <{from_address}>"
    message["To"] = str(to_email or "").strip().lower()
    message.set_content(
        "A password reset was requested for your NHCP administrator account.\n\n"
        f"Open this link to continue:\n{safe_url}\n\n"
        f"This one-time link expires in {int(expires_minutes)} minutes. Do not share it.\n\n"
        "If you did not request this reset, do not open the link. Your current password remains unchanged."
    )
    escaped_url = html.escape(safe_url, quote=True)
    message.add_alternative(
        "<html><body>"
        "<h2>Administrator password reset</h2>"
        "<p>A password reset was requested for your NHCP administrator account.</p>"
        f'<p><a href="{escaped_url}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#1b4332;color:#fff;text-decoration:none;font-weight:700;">Reset administrator password</a></p>'
        f'<p>If the button does not work, use this link:<br><a href="{escaped_url}">{escaped_url}</a></p>'
        f"<p>This one-time link expires in {int(expires_minutes)} minutes. Do not share it.</p>"
        "<p>If you did not request this reset, do not open the link. Your current password remains unchanged.</p>"
        "</body></html>",
        subtype="html",
    )
    _send(message)


def send_admin_password_changed_email(*, to_email: str) -> None:
    _host, _port, _username, _password, from_address, from_name, _use_tls, _use_ssl = _smtp_config()
    message = EmailMessage()
    message["Subject"] = "Your NHCP administrator password was changed"
    message["From"] = f"{from_name} <{from_address}>"
    message["To"] = str(to_email or "").strip().lower()
    message.set_content(
        "Your NHCP administrator password was changed successfully. All existing administrator sessions were signed out.\n\n"
        "If you did not make this change, contact the Supabase project owner immediately and use the documented emergency recovery procedure."
    )
    message.add_alternative(
        "<html><body><h2>Administrator password changed</h2>"
        "<p>Your NHCP administrator password was changed successfully. All existing administrator sessions were signed out.</p>"
        "<p><strong>If you did not make this change, contact the Supabase project owner immediately and use the documented emergency recovery procedure.</strong></p>"
        "</body></html>",
        subtype="html",
    )
    _send(message)


def send_admin_login_otp_email(
    *,
    to_email: str,
    otp_code: str,
    expires_minutes: int = 10,
    occurred_at: str = "",
    browser: str = "",
    operating_system: str = "",
    device_type: str = "",
) -> None:
    """Deliver the second factor without placing the code in logs or URLs."""

    code = str(otp_code or "").strip()
    if len(code) != 6 or not code.isdigit():
        raise AdminPasswordRecoveryEmailError("Administrator login code must contain six digits.")
    _host, _port, _username, _password, from_address, from_name, _use_tls, _use_ssl = _smtp_config()

    detail_lines = [
        f"Time: {str(occurred_at or 'Not available').strip()}",
        f"Device: {str(device_type or 'Unknown device').strip()}",
        f"Browser: {str(browser or 'Unknown browser').strip()}",
        f"Operating system: {str(operating_system or 'Unknown operating system').strip()}",
    ]
    details_text = "\n".join(detail_lines)
    message = EmailMessage()
    message["Subject"] = "Your NHCP administrator sign-in code"
    message["From"] = f"{from_name} <{from_address}>"
    message["To"] = str(to_email or "").strip().lower()
    message.set_content(
        "A correct password was entered for your NHCP administrator account.\n\n"
        f"Your one-time sign-in code is: {code}\n\n"
        f"This code expires in {int(expires_minutes)} minutes and can be used only once. "
        "Do not share it.\n\n"
        f"Sign-in details:\n{details_text}\n\n"
        "If this was not you, do not use the code and reset your administrator password immediately."
    )
    escaped_details = "".join(
        f"<li>{html.escape(line)}</li>" for line in detail_lines
    )
    message.add_alternative(
        "<html><body>"
        "<h2>Administrator sign-in verification</h2>"
        "<p>A correct password was entered for your NHCP administrator account.</p>"
        f'<p style="font-size:30px;letter-spacing:8px;font-weight:800;color:#1b4332;">{html.escape(code)}</p>'
        f"<p>This one-time code expires in {int(expires_minutes)} minutes and can be used only once. "
        "Do not share it.</p>"
        f"<p><strong>Sign-in details</strong></p><ul>{escaped_details}</ul>"
        "<p>If this was not you, do not use the code and reset your administrator password immediately.</p>"
        "</body></html>",
        subtype="html",
    )
    _send(message)
