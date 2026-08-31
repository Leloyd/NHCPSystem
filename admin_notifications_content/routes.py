from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from flask import jsonify, request, session

from .repository import (
    count_unread_admin_notifications,
    list_admin_notifications,
    mark_admin_notification_read,
    mark_all_admin_notifications_read,
)


def _format_notification(row: dict[str, Any]) -> dict[str, Any]:
    created_at = str(row.get("created_at") or "").strip()
    created_label = "Recently"
    if created_at:
        try:
            parsed = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            created_label = parsed.astimezone().strftime("%b %d, %Y · %I:%M %p")
        except ValueError:
            pass
    return {
        "id": int(row.get("id")),
        "event_type": str(row.get("event_type") or ""),
        "title": str(row.get("title") or "New notification"),
        "message": str(row.get("message") or ""),
        "target_url": str(row.get("target_url") or ""),
        "is_read": bool(row.get("read_at")),
        "created_at": created_at,
        "created_label": created_label,
    }


def register_admin_notification_routes(
    app,
    *,
    admin_route_prefix: str,
    admin_required,
    is_admin_csrf_valid,
    admin_session_user_key: str,
):
    @app.get(f"{admin_route_prefix}/notifications")
    @admin_required
    def admin_notifications_list():
        recipient_email = str(session.get(admin_session_user_key) or "").strip().lower()
        try:
            rows = list_admin_notifications(recipient_email, limit=request.args.get("limit", 30))
            unread_count = count_unread_admin_notifications(recipient_email)
        except (TypeError, ValueError):
            return jsonify({"ok": False, "available": True, "error": "The notification request was invalid."}), 400
        except Exception as exc:  # noqa: BLE001
            app.logger.warning("Administrator notifications could not be loaded: %s", exc)
            return jsonify(
                {
                    "ok": False,
                    "available": False,
                    "error": "Notifications need database setup. Run database_sql/admin_notifications_table.sql in Supabase.",
                }
            )
        return jsonify(
            {
                "ok": True,
                "available": True,
                "unread_count": unread_count,
                "notifications": [_format_notification(row) for row in rows],
            }
        )

    @app.post(f"{admin_route_prefix}/notifications/<int:notification_id>/read")
    @admin_required
    def admin_notification_mark_read(notification_id: int):
        if not is_admin_csrf_valid(request.headers.get("X-CSRF-Token")):
            return jsonify({"ok": False, "error": "Invalid request."}), 400
        recipient_email = str(session.get(admin_session_user_key) or "").strip().lower()
        try:
            item = mark_admin_notification_read(notification_id, recipient_email)
        except Exception as exc:  # noqa: BLE001
            app.logger.warning("Administrator notification could not be marked read: %s", exc)
            return jsonify({"ok": False, "error": "Could not update the notification."}), 503
        if item is None:
            return jsonify({"ok": False, "error": "Notification not found."}), 404
        return jsonify({"ok": True})

    @app.post(f"{admin_route_prefix}/notifications/read-all")
    @admin_required
    def admin_notifications_mark_all_read():
        if not is_admin_csrf_valid(request.headers.get("X-CSRF-Token")):
            return jsonify({"ok": False, "error": "Invalid request."}), 400
        recipient_email = str(session.get(admin_session_user_key) or "").strip().lower()
        try:
            mark_all_admin_notifications_read(recipient_email)
        except Exception as exc:  # noqa: BLE001
            app.logger.warning("Administrator notifications could not be marked read: %s", exc)
            return jsonify({"ok": False, "error": "Could not update notifications."}), 503
        return jsonify({"ok": True})
