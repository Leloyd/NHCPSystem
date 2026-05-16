from typing import Any

from supabase_client import get_supabase_client


PARTICIPATION_SUBMISSIONS_TABLE = "community_participation_submissions"
PARTICIPATION_SUBMISSIONS_SELECT_FIELDS = (
    "id, user_id, submission_type, title, resource_category, story_category, submitter_name, submitter_email, grade_level, subject_topic, description, story_content, resource_file_filename, photo_filename, is_private, status, verification_code_hash, verification_sent_at, verification_expires_at, verified_at, reviewed_at, reviewed_by, created_at, updated_at"
)


def list_all_participation_submissions() -> list[dict[str, Any]]:
    client = get_supabase_client()
    response = (
        client.table(PARTICIPATION_SUBMISSIONS_TABLE)
        .select(PARTICIPATION_SUBMISSIONS_SELECT_FIELDS)
        .order("created_at", desc=True)
        .execute()
    )
    return list(response.data or [])


def list_participation_submissions_for_user(user_id: int) -> list[dict[str, Any]]:
    client = get_supabase_client()
    response = (
        client.table(PARTICIPATION_SUBMISSIONS_TABLE)
        .select(PARTICIPATION_SUBMISSIONS_SELECT_FIELDS)
        .eq("user_id", int(user_id))
        .order("created_at", desc=True)
        .execute()
    )
    return list(response.data or [])


def list_active_participation_submissions() -> list[dict[str, Any]]:
    client = get_supabase_client()
    response = (
        client.table(PARTICIPATION_SUBMISSIONS_TABLE)
        .select(PARTICIPATION_SUBMISSIONS_SELECT_FIELDS)
        .eq("status", "active")
        .order("created_at", desc=True)
        .execute()
    )
    return list(response.data or [])


def get_participation_submission_by_id(submission_id: int) -> dict[str, Any] | None:
    client = get_supabase_client()
    response = (
        client.table(PARTICIPATION_SUBMISSIONS_TABLE)
        .select(PARTICIPATION_SUBMISSIONS_SELECT_FIELDS)
        .eq("id", int(submission_id))
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    if not rows:
        return None
    return rows[0]


def find_recent_participation_submission_by_email(email: str, *, since_iso: str) -> dict[str, Any] | None:
    client = get_supabase_client()
    response = (
        client.table(PARTICIPATION_SUBMISSIONS_TABLE)
        .select(PARTICIPATION_SUBMISSIONS_SELECT_FIELDS)
        .eq("submitter_email", str(email or "").strip().lower())
        .gte("verification_sent_at", since_iso)
        .order("verification_sent_at", desc=True)
        .limit(1)
        .execute()
    )
    rows = list(response.data or [])
    if not rows:
        return None
    return rows[0]


def create_participation_submission(payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    response = client.table(PARTICIPATION_SUBMISSIONS_TABLE).insert(payload).execute()
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("Supabase did not return the created participation submission row.")
    return rows[0]


def update_participation_submission(submission_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    response = client.table(PARTICIPATION_SUBMISSIONS_TABLE).update(payload).eq("id", int(submission_id)).execute()
    rows = list(response.data or [])
    if not rows:
        raise RuntimeError("Supabase did not return the updated participation submission row.")
    return rows[0]


def delete_participation_submission(submission_id: int) -> None:
    client = get_supabase_client()
    client.table(PARTICIPATION_SUBMISSIONS_TABLE).delete().eq("id", int(submission_id)).execute()
