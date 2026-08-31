from __future__ import annotations

from typing import Any

from flask import current_app

from admin_users_repository import list_active_admin_users

from .emailer import AdminNotificationEmailError, is_admin_notification_email_configured, send_admin_notification_email
from .repository import create_admin_notifications, record_admin_notification_email_result


ALLOWED_EVENT_TYPES = {"tour_booking", "teacher_submission", "story_submission", "visitor_feedback"}


def _clean_text(value: Any, *, limit: int, fallback: str = "") -> str:
    normalized = " ".join(str(value or "").strip().split())
    return (normalized or fallback)[:limit]


def dispatch_admin_notification(
    *,
    event_type: str,
    source_id: int,
    title: str,
    message: str,
    target_url: str,
) -> None:
    """Persist and email an admin alert without failing the visitor's submission."""
    try:
        _dispatch_admin_notification(
            event_type=event_type,
            source_id=source_id,
            title=title,
            message=message,
            target_url=target_url,
        )
    except Exception as exc:  # noqa: BLE001 - this secondary channel must never fail the saved public action
        current_app.logger.warning("Administrator notification dispatch failed safely: %s", exc)


def _dispatch_admin_notification(
    *,
    event_type: str,
    source_id: int,
    title: str,
    message: str,
    target_url: str,
) -> None:
    normalized_type = _clean_text(event_type, limit=50).lower()
    safe_target = str(target_url or "").strip()
    if normalized_type not in ALLOWED_EVENT_TYPES or not safe_target.startswith("/_admin/"):
        current_app.logger.warning("Ignored an invalid administrator notification payload.")
        return

    try:
        admin_users = list_active_admin_users()
    except Exception as exc:  # noqa: BLE001 - notifications must not break public requests
        current_app.logger.warning("Administrator notification recipients could not be loaded: %s", exc)
        return

    recipient_emails = sorted(
        {
            str(item.get("email") or "").strip().lower()
            for item in admin_users
            if str(item.get("email") or "").strip()
        }
    )
    if not recipient_emails:
        current_app.logger.warning("No active administrator email is available for notifications.")
        return

    safe_title = _clean_text(title, limit=180, fallback="New admin notification")
    safe_message = _clean_text(message, limit=1200, fallback="A new item needs administrator review.")
    created_rows: list[dict[str, Any]] = []
    try:
        created_rows = create_admin_notifications(
            [
                {
                    "recipient_email": email,
                    "event_type": normalized_type,
                    "source_id": int(source_id),
                    "title": safe_title,
                    "message": safe_message,
                    "target_url": safe_target[:500],
                }
                for email in recipient_emails
            ]
        )
    except Exception as exc:  # noqa: BLE001 - the primary submission is already safely stored
        current_app.logger.warning(
            "Administrator inbox notification could not be stored. Run database_sql/admin_notifications_table.sql if needed: %s",
            exc,
        )

    notification_ids = [int(row["id"]) for row in created_rows if row.get("id") is not None]
    if not is_admin_notification_email_configured():
        if notification_ids:
            try:
                record_admin_notification_email_result(
                    notification_ids,
                    sent=False,
                    error="SMTP email delivery is not configured.",
                )
            except Exception:  # noqa: BLE001
                pass
        return

    try:
        send_admin_notification_email(
            recipient_emails=recipient_emails,
            title=safe_title,
            message_text=safe_message,
        )
        if notification_ids:
            try:
                record_admin_notification_email_result(notification_ids, sent=True)
            except Exception as exc:  # noqa: BLE001
                current_app.logger.warning("Notification email status could not be recorded: %s", exc)
    except AdminNotificationEmailError as exc:
        current_app.logger.warning("Administrator notification email failed: %s", exc)
        if notification_ids:
            try:
                record_admin_notification_email_result(notification_ids, sent=False, error=str(exc))
            except Exception:  # noqa: BLE001
                pass
    except Exception as exc:  # noqa: BLE001 - malformed SMTP configuration must not fail a submission
        current_app.logger.warning("Administrator notification email could not be attempted: %s", exc)
        if notification_ids:
            try:
                record_admin_notification_email_result(notification_ids, sent=False, error=str(exc))
            except Exception:  # noqa: BLE001
                pass
