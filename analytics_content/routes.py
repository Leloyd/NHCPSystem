from __future__ import annotations

import csv
import io
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlparse

from flask import Response, current_app, jsonify, request, session

from supabase_client import is_supabase_configured

from .repository import list_analytics_events_since
from .service import (
    normalize_analytics_event,
    normalize_ar_event,
    persist_analytics_events,
)


ANALYTICS_RATE_WINDOW_SECONDS = 60
ANALYTICS_RATE_MAX_EVENTS = 120
_RATE_BUCKETS: dict[str, dict[str, float | int]] = {}
_RATE_LOCK = threading.Lock()


def _client_ip() -> str:
    return str(request.remote_addr or "unknown")[:64]


def _consume_rate_limit(event_count: int) -> int:
    now = time.monotonic()
    key = _client_ip()
    with _RATE_LOCK:
        expired = [
            bucket_key
            for bucket_key, bucket in _RATE_BUCKETS.items()
            if now - float(bucket.get("window_start", now)) > ANALYTICS_RATE_WINDOW_SECONDS
        ]
        for bucket_key in expired:
            _RATE_BUCKETS.pop(bucket_key, None)
        bucket = _RATE_BUCKETS.get(key)
        if not bucket:
            bucket = {"window_start": now, "events": 0}
        if int(bucket.get("events", 0)) + event_count > ANALYTICS_RATE_MAX_EVENTS:
            return max(
                1,
                int(ANALYTICS_RATE_WINDOW_SECONDS - (now - float(bucket.get("window_start", now)))),
            )
        bucket["events"] = int(bucket.get("events", 0)) + event_count
        _RATE_BUCKETS[key] = bucket
    return 0


def _is_same_origin_request() -> bool:
    fetch_site = str(request.headers.get("Sec-Fetch-Site") or "").lower()
    if fetch_site and fetch_site not in {"same-origin", "same-site", "none"}:
        return False
    origin = str(request.headers.get("Origin") or "").strip()
    if not origin:
        return True
    parsed = urlparse(origin)
    return parsed.scheme in {"http", "https"} and parsed.netloc == request.host


def _user_id(session_key: str) -> int | None:
    try:
        return int(session.get(session_key)) if session.get(session_key) is not None else None
    except (TypeError, ValueError):
        return None


def _csv_safe(value: Any) -> str:
    text = str(value or "")
    if text.startswith(("=", "+", "-", "@")):
        return "'" + text
    return text


def register_analytics_routes(
    app,
    *,
    admin_route_prefix: str,
    admin_required,
    public_session_user_id_key: str,
):
    @app.route("/api/analytics/events", methods=["POST"])
    def analytics_events():
        if not is_supabase_configured():
            return jsonify({"ok": False, "error": "Analytics storage is unavailable."}), 503
        if not _is_same_origin_request():
            return jsonify({"ok": False, "error": "Cross-origin analytics requests are not accepted."}), 403
        if (request.content_length or 0) > 32768:
            return jsonify({"ok": False, "error": "Analytics payload is too large."}), 413
        payload = request.get_json(silent=True)
        raw_events = payload.get("events") if isinstance(payload, dict) else None
        if not isinstance(raw_events, list) or not 1 <= len(raw_events) <= 20:
            return jsonify({"ok": False, "error": "Provide between 1 and 20 analytics events."}), 400
        events = [event for event in (normalize_analytics_event(item) for item in raw_events) if event]
        if not events:
            return jsonify({"ok": False, "error": "No supported analytics events were provided."}), 400
        retry_after = _consume_rate_limit(len(events))
        if retry_after:
            response = jsonify({"ok": False, "error": "Analytics rate limit reached."})
            response.headers["Retry-After"] = str(retry_after)
            return response, 429
        client_id = str(payload.get("client_id") or "")[:100]
        try:
            persist_analytics_events(
                events,
                client_id=client_id,
                user_id=_user_id(public_session_user_id_key),
                user_agent=request.headers.get("User-Agent", ""),
                secret_key=str(current_app.config["SECRET_KEY"]),
            )
        except Exception as exc:
            current_app.logger.warning("Analytics events could not be saved: %s", exc)
            return jsonify({"ok": False, "error": "Analytics storage is not ready."}), 503
        return jsonify({"ok": True, "accepted": len(events)}), 202

    @app.route("/api/ar/analytics", methods=["POST"])
    def ar_analytics():
        if not is_supabase_configured() or not _is_same_origin_request():
            return jsonify({"ok": True}), 202
        if (request.content_length or 0) > 8192:
            return jsonify({"ok": False}), 413
        event = normalize_ar_event(request.get_json(silent=True))
        if event is None:
            return jsonify({"ok": True, "accepted": 0}), 202
        retry_after = _consume_rate_limit(1)
        if retry_after:
            return jsonify({"ok": False}), 429
        payload = request.get_json(silent=True) or {}
        try:
            persist_analytics_events(
                [event],
                client_id=str(payload.get("client_id") or request.headers.get("X-Analytics-Client") or "")[:100],
                user_id=_user_id(public_session_user_id_key),
                user_agent=request.headers.get("User-Agent", ""),
                secret_key=str(current_app.config["SECRET_KEY"]),
            )
        except Exception as exc:
            current_app.logger.warning("AR analytics event could not be saved: %s", exc)
        return jsonify({"ok": True}), 202

    @app.route(f"{admin_route_prefix}/analytics/report.csv")
    @admin_required
    def admin_analytics_report():
        try:
            days = int(request.args.get("days") or 30)
        except ValueError:
            days = 30
        days = max(7, min(days, 365))
        since = datetime.now(timezone.utc) - timedelta(days=days)
        try:
            events = list_analytics_events_since(since.isoformat(), limit=20000)
        except Exception as exc:
            current_app.logger.warning("Analytics report could not be generated: %s", exc)
            return Response(
                "Analytics report unavailable. Run analytics_events_migration.sql in Supabase and try again.",
                status=503,
                mimetype="text/plain",
            )
        output = io.StringIO(newline="")
        writer = csv.writer(output)
        writer.writerow(
            [
                "Created At",
                "Event",
                "Module",
                "Target",
                "Visitor Hash",
                "User ID",
                "Device",
                "Browser",
                "Operating System",
                "Page",
            ]
        )
        for event in events:
            writer.writerow(
                [
                    _csv_safe(event.get("created_at")),
                    _csv_safe(event.get("event_type")),
                    _csv_safe(event.get("module")),
                    _csv_safe(event.get("target_id")),
                    _csv_safe(event.get("visitor_hash")),
                    _csv_safe(event.get("user_id")),
                    _csv_safe(event.get("device_type")),
                    _csv_safe(event.get("browser_family")),
                    _csv_safe(event.get("os_family")),
                    _csv_safe(event.get("page_path")),
                ]
            )
        filename = f"nhcp-analytics-{days}-days-{datetime.now(timezone.utc).date().isoformat()}.csv"
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
