from typing import Any

from supabase_client import get_supabase_client


VISITOR_FEEDBACK_TABLE = "visitor_feedback"
VISITOR_FEEDBACK_SELECT_FIELDS = (
    "id, user_id, visit_type, rating, visitor_name, comments, status, reviewed_at, reviewed_by, created_at, updated_at, "
    "sentiment_label, sentiment_confidence, sentiment_scores, sentiment_model, sentiment_provider, sentiment_analyzed_at"
)
VISITOR_FEEDBACK_LEGACY_SELECT_FIELDS = (
    "id, user_id, visit_type, rating, visitor_name, comments, status, reviewed_at, reviewed_by, created_at, updated_at"
)
SENTIMENT_FIELDS = {
    "sentiment_label",
    "sentiment_confidence",
    "sentiment_scores",
    "sentiment_model",
    "sentiment_provider",
    "sentiment_analyzed_at",
}


def _missing_sentiment_columns(exc: Exception) -> bool:
    message = str(exc).lower()
    return "sentiment_" in message and any(token in message for token in ("column", "schema", "cache", "does not exist"))


def _select_with_migration_fallback(query_builder):
    try:
        return query_builder(VISITOR_FEEDBACK_SELECT_FIELDS).execute()
    except Exception as exc:
        if not _missing_sentiment_columns(exc):
            raise
        return query_builder(VISITOR_FEEDBACK_LEGACY_SELECT_FIELDS).execute()


def list_all_visitor_feedback() -> list[dict[str, Any]]:
    client = get_supabase_client()
    response = _select_with_migration_fallback(
        lambda fields: client.table(VISITOR_FEEDBACK_TABLE).select(fields).order("created_at", desc=True)
    )
    return list(response.data or [])


def list_visitor_feedback_for_user(user_id: int) -> list[dict[str, Any]]:
    client = get_supabase_client()
    response = _select_with_migration_fallback(
        lambda fields: client.table(VISITOR_FEEDBACK_TABLE)
        .select(fields)
        .eq("user_id", int(user_id))
        .order("created_at", desc=True)
    )
    return list(response.data or [])


def get_visitor_feedback_by_id(feedback_id: int) -> dict[str, Any] | None:
    client = get_supabase_client()
    response = _select_with_migration_fallback(
        lambda fields: client.table(VISITOR_FEEDBACK_TABLE)
        .select(fields)
        .eq("id", int(feedback_id))
        .limit(1)
    )
    rows = list(response.data or [])
    if not rows:
        return None
    return rows[0]


def create_visitor_feedback(payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    try:
        response = client.table(VISITOR_FEEDBACK_TABLE).insert(payload).execute()
    except Exception as exc:
        if not _missing_sentiment_columns(exc):
            raise
        legacy_payload = {key: value for key, value in payload.items() if key not in SENTIMENT_FIELDS}
        response = client.table(VISITOR_FEEDBACK_TABLE).insert(legacy_payload).execute()
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("Supabase did not return the created visitor feedback row.")
    return rows[0]


def update_visitor_feedback(feedback_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    response = client.table(VISITOR_FEEDBACK_TABLE).update(payload).eq("id", int(feedback_id)).execute()
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("Supabase did not return the updated visitor feedback row.")
    return rows[0]
