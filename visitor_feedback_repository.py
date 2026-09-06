from typing import Any

from supabase_client import get_supabase_client


VISITOR_FEEDBACK_TABLE = "visitor_feedback"
VISITOR_FEEDBACK_SELECT_FIELDS = (
    "id, user_id, visit_type, rating, visitor_name, comments, status, reviewed_at, reviewed_by, created_at, updated_at, "
    "sentiment_label, sentiment_confidence, sentiment_scores, sentiment_model, sentiment_provider, sentiment_analyzed_at, "
    "public_display_consent, public_name_preference, rating_status, comment_status, moderation_reason_code, "
    "moderation_note, moderated_at, moderated_by"
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
PUBLICATION_FIELDS = {
    "public_display_consent",
    "public_name_preference",
    "rating_status",
    "comment_status",
    "moderation_reason_code",
    "moderation_note",
    "moderated_at",
    "moderated_by",
}
VISITOR_FEEDBACK_SENTIMENT_SELECT_FIELDS = VISITOR_FEEDBACK_SELECT_FIELDS.rsplit(", public_display_consent", 1)[0]


def _missing_sentiment_columns(exc: Exception) -> bool:
    message = str(exc).lower()
    return "sentiment_" in message and any(token in message for token in ("column", "schema", "cache", "does not exist"))


def _missing_publication_columns(exc: Exception) -> bool:
    message = str(exc).lower()
    return any(field in message for field in PUBLICATION_FIELDS) and any(
        token in message for token in ("column", "schema", "cache", "does not exist")
    )


def _select_with_migration_fallback(query_builder):
    try:
        return query_builder(VISITOR_FEEDBACK_SELECT_FIELDS).execute()
    except Exception as exc:
        if not _missing_publication_columns(exc):
            raise
    try:
        return query_builder(VISITOR_FEEDBACK_SENTIMENT_SELECT_FIELDS).execute()
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


def list_public_visitor_feedback() -> list[dict[str, Any]]:
    """Return eligible ratings to server code; callers still sanitize comments."""
    client = get_supabase_client()
    response = client.table(VISITOR_FEEDBACK_TABLE).select(VISITOR_FEEDBACK_SELECT_FIELDS) \
        .eq("rating_status", "counted") \
        .order("created_at", desc=True).execute()
    return list(response.data or [])


def get_recent_visitor_feedback(user_id: int, visit_type: str, created_after: str) -> dict[str, Any] | None:
    client = get_supabase_client()
    response = client.table(VISITOR_FEEDBACK_TABLE).select("id, created_at") \
        .eq("user_id", int(user_id)).eq("visit_type", visit_type) \
        .gte("created_at", created_after).order("created_at", desc=True).limit(1).execute()
    rows = list(response.data or [])
    return rows[0] if rows else None


def list_visitor_feedback_moderation_log(feedback_id: int) -> list[dict[str, Any]]:
    client = get_supabase_client()
    response = client.table("visitor_feedback_moderation_log").select(
        "id, feedback_id, action, reason_code, note, admin_username, created_at"
    ).eq("feedback_id", int(feedback_id)).order("created_at", desc=True).execute()
    return list(response.data or [])


def create_visitor_feedback_moderation_log(payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    response = client.table("visitor_feedback_moderation_log").insert(payload).execute()
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("Supabase did not return the moderation log row.")
    return rows[0]


def moderate_visitor_feedback(feedback_id: int, action: str, reason_code: str, note: str, admin_username: str) -> None:
    client = get_supabase_client()
    client.rpc(
        "moderate_visitor_feedback",
        {
            "p_feedback_id": int(feedback_id),
            "p_action": action,
            "p_reason_code": reason_code,
            "p_note": note,
            "p_admin": admin_username,
        },
    ).execute()


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
        if _missing_publication_columns(exc):
            raise RuntimeError(
                "Visitor feedback publication migration has not been applied."
            ) from exc
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
