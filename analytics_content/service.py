from __future__ import annotations

import hashlib
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any

from flask import current_app

from supabase_client import SupabaseConfigError, is_supabase_configured

from .repository import insert_analytics_events, list_analytics_events_since


ANALYTICS_EVENT_TYPES = {
    "page_view",
    "virtual_tour_opened",
    "tour_scene_viewed",
    "artifact_viewed",
    "ar_session_started",
    "ar_marker_found",
    "ar_puzzle_solved",
    "heritage_trail_started",
    "heritage_trail_stop_viewed",
    "learning_activity_completed",
    "gallery_item_viewed",
    "resource_viewed",
    "webxr_opened",
}
ANALYTICS_METADATA_KEYS = {
    "score",
    "total",
    "language",
    "source",
    "scene",
    "marker",
    "title",
}
EVENT_LABELS = {
    "page_view": "Page viewed",
    "virtual_tour_opened": "Virtual Tour opened",
    "tour_scene_viewed": "Tour scene viewed",
    "artifact_viewed": "Artifact viewed",
    "ar_session_started": "AR scanner opened",
    "ar_marker_found": "AR marker detected",
    "ar_puzzle_solved": "AR artifact restored",
    "heritage_trail_started": "Heritage Trail started",
    "heritage_trail_stop_viewed": "Heritage Trail stop viewed",
    "learning_activity_completed": "Learning activity completed",
    "gallery_item_viewed": "Gallery item viewed",
    "resource_viewed": "Learning resource viewed",
    "webxr_opened": "3D environment opened",
}
MODULE_LABELS = {
    "landing": "Landing",
    "virtual-tour": "Virtual Tour",
    "heritage-trail": "Heritage Trail",
    "ar-scanner": "AR Scanner",
    "online-gallery": "Online Gallery",
    "edu-resources": "Edu Resources",
    "interactive": "Interactive",
    "site-map": "Site Map",
    "webxr": "3D Environment",
    "community": "Community",
    "public-site": "Public Site",
}


def _safe_text(value: Any, *, limit: int, fallback: str = "") -> str:
    text = " ".join(str(value or "").strip().split())
    return (text[:limit] or fallback) if text else fallback


def _safe_int(value: Any, *, minimum: int = 0, maximum: int = 10000) -> int | None:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return max(minimum, min(parsed, maximum))


def classify_device(user_agent: str) -> tuple[str, str, str]:
    ua = str(user_agent or "")
    lowered = ua.lower()
    if "ipad" in lowered or ("android" in lowered and "mobile" not in lowered):
        device = "tablet"
    elif any(token in lowered for token in ("mobile", "iphone", "ipod", "android")):
        device = "mobile"
    elif ua:
        device = "desktop"
    else:
        device = "other"

    if "edg/" in lowered:
        browser = "Edge"
    elif "opr/" in lowered or "opera" in lowered:
        browser = "Opera"
    elif "firefox/" in lowered or "fxios/" in lowered:
        browser = "Firefox"
    elif "crios/" in lowered or ("chrome/" in lowered and "edg/" not in lowered):
        browser = "Chrome"
    elif "safari/" in lowered and "chrome/" not in lowered and "crios/" not in lowered:
        browser = "Safari"
    else:
        browser = "Other"

    if "windows" in lowered:
        operating_system = "Windows"
    elif "android" in lowered:
        operating_system = "Android"
    elif any(token in lowered for token in ("iphone", "ipad", "ipod")):
        operating_system = "iOS"
    elif "mac os" in lowered or "macintosh" in lowered:
        operating_system = "macOS"
    elif "linux" in lowered:
        operating_system = "Linux"
    else:
        operating_system = "Other"
    return device, browser, operating_system


def normalize_analytics_event(raw_event: Any) -> dict[str, Any] | None:
    if not isinstance(raw_event, dict):
        return None
    event_type = _safe_text(raw_event.get("event_type") or raw_event.get("event"), limit=60).lower()
    if event_type not in ANALYTICS_EVENT_TYPES:
        return None
    module = _safe_text(raw_event.get("module"), limit=50, fallback="public-site").lower()
    if module not in MODULE_LABELS:
        module = "public-site"
    target_id = _safe_text(
        raw_event.get("target_id") or raw_event.get("marker") or raw_event.get("model"),
        limit=160,
    )
    page_path = _safe_text(raw_event.get("page_path"), limit=300)
    raw_metadata = raw_event.get("metadata")
    metadata = {}
    if isinstance(raw_metadata, dict):
        for key in ANALYTICS_METADATA_KEYS:
            if key not in raw_metadata:
                continue
            value = raw_metadata[key]
            if key in {"score", "total"}:
                parsed = _safe_int(value)
                if parsed is not None:
                    metadata[key] = parsed
            else:
                metadata[key] = _safe_text(value, limit=160)
    return {
        "event_type": event_type,
        "module": module,
        "target_id": target_id,
        "page_path": page_path,
        "metadata": metadata,
    }


def normalize_ar_event(raw_event: Any) -> dict[str, Any] | None:
    if not isinstance(raw_event, dict):
        return None
    mapping = {
        "session_start": "ar_session_started",
        "marker_found": "ar_marker_found",
        "puzzle_solved": "ar_puzzle_solved",
    }
    event_type = mapping.get(_safe_text(raw_event.get("event"), limit=60).lower())
    if not event_type:
        return None
    marker = _safe_text(raw_event.get("marker") or raw_event.get("model"), limit=160)
    return {
        "event_type": event_type,
        "module": "ar-scanner",
        "target_id": marker,
        "page_path": "/ar-content-detection",
        "metadata": {"marker": marker} if marker else {},
    }


def persist_analytics_events(
    events: list[dict[str, Any]],
    *,
    client_id: str,
    user_id: int | None,
    user_agent: str,
    secret_key: str,
) -> None:
    if not events:
        return
    anonymous_seed = _safe_text(client_id, limit=100, fallback="anonymous")
    visitor_hash = hashlib.sha256(
        f"{secret_key}|{anonymous_seed}".encode("utf-8", errors="ignore")
    ).hexdigest()
    device_type, browser_family, os_family = classify_device(user_agent)
    payloads = []
    for event in events[:20]:
        payloads.append(
            {
                **event,
                "visitor_hash": visitor_hash,
                "user_id": user_id,
                "device_type": device_type,
                "browser_family": browser_family,
                "os_family": os_family,
            }
        )
    insert_analytics_events(payloads)


def _parse_datetime(value: Any) -> datetime | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _percentage(part: int, whole: int) -> int:
    return round((part / whole) * 100) if whole else 0


def _friendly_target(value: Any) -> str:
    text = _safe_text(value, limit=160, fallback="General visit")
    return text.replace("_", " ").replace("-", " ").title()


def _trend(current: int, previous: int) -> dict[str, Any]:
    if previous <= 0:
        return {
            "value": 100 if current > 0 else 0,
            "direction": "up" if current > 0 else "steady",
            "label": "New tracking period" if current > 0 else "No change",
        }
    change = round(((current - previous) / previous) * 100)
    return {
        "value": abs(change),
        "direction": "up" if change > 0 else "down" if change < 0 else "steady",
        "label": f"{abs(change)}% {'higher' if change > 0 else 'lower' if change < 0 else 'change'}",
    }


def build_analytics_dashboard(
    events: list[dict[str, Any]] | None,
    *,
    days: int = 30,
    now: datetime | None = None,
) -> dict[str, Any]:
    now_utc = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    period_days = max(7, min(int(days), 365))
    period_start = now_utc - timedelta(days=period_days)
    previous_start = period_start - timedelta(days=period_days)
    parsed_events = []
    for event in list(events or []):
        created_at = _parse_datetime(event.get("created_at"))
        if created_at is None:
            continue
        parsed_events.append({**event, "_created_at": created_at})
    current = [event for event in parsed_events if period_start <= event["_created_at"] <= now_utc]
    previous = [event for event in parsed_events if previous_start <= event["_created_at"] < period_start]

    visitor_hashes = {str(event.get("visitor_hash") or "") for event in current if event.get("visitor_hash")}
    previous_visitors = {str(event.get("visitor_hash") or "") for event in previous if event.get("visitor_hash")}
    signed_in_users = {str(event.get("user_id")) for event in current if event.get("user_id") is not None}
    current_types = Counter(str(event.get("event_type") or "") for event in current)
    previous_types = Counter(str(event.get("event_type") or "") for event in previous)

    daily_rows = []
    daily_counts = Counter(event["_created_at"].date().isoformat() for event in current)
    daily_visitors: dict[str, set[str]] = {}
    for event in current:
        key = event["_created_at"].date().isoformat()
        daily_visitors.setdefault(key, set()).add(str(event.get("visitor_hash") or ""))
    maximum_daily = max(daily_counts.values(), default=0)
    for offset in range(period_days - 1, -1, -1):
        day = (now_utc - timedelta(days=offset)).date()
        key = day.isoformat()
        count = daily_counts[key]
        daily_rows.append(
            {
                "date": key,
                "label": day.strftime("%b %d"),
                "short_label": day.strftime("%d"),
                "events": count,
                "visitors": len({value for value in daily_visitors.get(key, set()) if value}),
                "height": max(3, round((count / maximum_daily) * 100)) if maximum_daily else 3,
            }
        )

    artifact_events = [
        event
        for event in current
        if event.get("event_type") in {"artifact_viewed", "gallery_item_viewed", "ar_marker_found"}
        and event.get("target_id")
    ]
    artifact_counts = Counter(str(event.get("target_id")) for event in artifact_events)
    artifact_labels = {}
    for event in artifact_events:
        target = str(event.get("target_id"))
        metadata = event.get("metadata") if isinstance(event.get("metadata"), dict) else {}
        artifact_labels.setdefault(target, _safe_text(metadata.get("title"), limit=160) or _friendly_target(target))
    top_artifact_max = max(artifact_counts.values(), default=0)
    top_artifacts = [
        {
            "target_id": target,
            "label": artifact_labels.get(target, _friendly_target(target)),
            "views": count,
            "percentage": _percentage(count, len(artifact_events)),
            "bar_width": round((count / top_artifact_max) * 100) if top_artifact_max else 0,
        }
        for target, count in artifact_counts.most_common(6)
    ]

    scene_events = [
        event for event in current if event.get("event_type") == "tour_scene_viewed" and event.get("target_id")
    ]
    scene_counts = Counter(str(event.get("target_id")) for event in scene_events)
    tour_sessions = current_types["virtual_tour_opened"]
    tour_visitors = {
        str(event.get("visitor_hash"))
        for event in current
        if event.get("module") == "virtual-tour" and event.get("visitor_hash")
    }
    top_scenes = [
        {"label": _friendly_target(target), "views": count}
        for target, count in scene_counts.most_common(5)
    ]

    device_counts = Counter(str(event.get("device_type") or "other") for event in current)
    device_total = sum(device_counts.values())
    device_labels = {"desktop": "Desktop", "mobile": "Mobile", "tablet": "Tablet", "other": "Other"}
    devices = [
        {
            "key": key,
            "label": device_labels[key],
            "count": device_counts[key],
            "percentage": _percentage(device_counts[key], device_total),
        }
        for key in ("desktop", "mobile", "tablet", "other")
    ]
    device_colors = {
        "desktop": "#173f30",
        "mobile": "#c9a84c",
        "tablet": "#4d806a",
        "other": "#bcc5bf",
    }
    device_chart_segments = []
    device_range_start = 0.0
    for index, row in enumerate(devices):
        device_range_end = (
            100.0
            if index == len(devices) - 1
            else device_range_start + ((row["count"] / device_total) * 100 if device_total else 0)
        )
        device_chart_segments.append(
            f"{device_colors[row['key']]} {device_range_start:.2f}% {device_range_end:.2f}%"
        )
        device_range_start = device_range_end
    device_chart = (
        f"conic-gradient({', '.join(device_chart_segments)})"
        if device_total
        else "conic-gradient(#e5e9e6 0 100%)"
    )

    browser_counts = Counter(str(event.get("browser_family") or "Other") for event in current)
    browsers = [
        {"label": label, "count": count, "percentage": _percentage(count, len(current))}
        for label, count in browser_counts.most_common(5)
    ]

    learning_events = [event for event in current if event.get("event_type") == "learning_activity_completed"]
    learning_scores = []
    learning_targets = Counter()
    for event in learning_events:
        learning_targets[str(event.get("target_id") or "activity")] += 1
        metadata = event.get("metadata") if isinstance(event.get("metadata"), dict) else {}
        score = _safe_int(metadata.get("score"))
        total = _safe_int(metadata.get("total"), minimum=1)
        if score is not None and total:
            learning_scores.append(min(100, round((score / total) * 100)))
    learning_results = [
        {"label": _friendly_target(target), "completions": count}
        for target, count in learning_targets.most_common(5)
    ]

    module_counts = Counter(str(event.get("module") or "public-site") for event in current)
    module_total = sum(module_counts.values())
    module_rows = [
        {
            "key": module,
            "label": MODULE_LABELS.get(module, _friendly_target(module)),
            "events": count,
            "percentage": _percentage(count, module_total),
        }
        for module, count in module_counts.most_common(7)
    ]

    recent_activity = []
    for event in current[:12]:
        user_label = f"User #{event.get('user_id')}" if event.get("user_id") is not None else "Anonymous visitor"
        recent_activity.append(
            {
                "event_label": EVENT_LABELS.get(str(event.get("event_type")), _friendly_target(event.get("event_type"))),
                "module_label": MODULE_LABELS.get(str(event.get("module")), _friendly_target(event.get("module"))),
                "target_label": (
                    _safe_text(
                        (event.get("metadata") or {}).get("title")
                        if isinstance(event.get("metadata"), dict)
                        else "",
                        limit=160,
                    )
                    or (_friendly_target(event.get("target_id")) if event.get("target_id") else "")
                ),
                "user_label": user_label,
                "device_label": device_labels.get(str(event.get("device_type")), "Other"),
                "date_label": event["_created_at"].strftime("%b %d, %Y · %I:%M %p"),
            }
        )

    return {
        "available": True,
        "error": None,
        "period_days": period_days,
        "period_label": f"Last {period_days} days",
        "total_events": len(current),
        "unique_visitors": len(visitor_hashes),
        "signed_in_users": len(signed_in_users),
        "page_views": current_types["page_view"],
        "artifact_views": len(artifact_events),
        "distinct_artifacts": len(artifact_counts),
        "tour_sessions": tour_sessions,
        "learning_completions": len(learning_events),
        "visitor_trend": _trend(len(visitor_hashes), len(previous_visitors)),
        "page_view_trend": _trend(current_types["page_view"], previous_types["page_view"]),
        "artifact_trend": _trend(
            len(artifact_events),
            sum(
                1
                for event in previous
                if event.get("event_type") in {"artifact_viewed", "gallery_item_viewed", "ar_marker_found"}
            ),
        ),
        "learning_trend": _trend(
            len(learning_events),
            previous_types["learning_activity_completed"],
        ),
        "daily_activity": daily_rows,
        "top_artifacts": top_artifacts,
        "devices": devices,
        "device_chart": device_chart,
        "browsers": browsers,
        "module_rows": module_rows,
        "recent_activity": recent_activity,
        "virtual_tour": {
            "sessions": tour_sessions,
            "visitors": len(tour_visitors),
            "scene_views": len(scene_events),
            "unique_scenes": len(scene_counts),
            "average_scenes": round(len(scene_events) / tour_sessions, 1) if tour_sessions else 0,
            "top_scenes": top_scenes,
        },
        "learning": {
            "completions": len(learning_events),
            "average_score": round(sum(learning_scores) / len(learning_scores)) if learning_scores else None,
            "results": learning_results,
        },
    }


def empty_analytics_dashboard(error: str) -> dict[str, Any]:
    dashboard = build_analytics_dashboard([], days=30)
    dashboard["available"] = False
    dashboard["error"] = error
    return dashboard


def load_admin_analytics_dashboard(*, days: int = 30) -> dict[str, Any]:
    if not is_supabase_configured():
        return empty_analytics_dashboard("Supabase is not configured, so visitor tracking is unavailable.")
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=max(14, min(int(days), 365) * 2))
    try:
        events = list_analytics_events_since(since.isoformat(), limit=20000)
        return build_analytics_dashboard(events, days=days, now=now)
    except SupabaseConfigError:
        return empty_analytics_dashboard("Supabase is not configured, so visitor tracking is unavailable.")
    except Exception as exc:
        current_app.logger.warning("Analytics events could not be loaded: %s", exc)
        return empty_analytics_dashboard(
            "Analytics tracking is not configured yet. Run database_sql/analytics_events_migration.sql in Supabase."
        )
