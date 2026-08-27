from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any
from uuid import uuid4

from werkzeug.utils import secure_filename

from supabase_client import get_supabase_client, is_supabase_configured
from supabase_storage import get_media_bucket_name


MEDIA_UPLOAD_MAX_BYTES = 25 * 1024 * 1024

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
DOCUMENT_EXTENSIONS = {".pdf", ".docx", ".ppt", ".pptx"}

UPLOAD_PURPOSES: dict[str, dict[str, Any]] = {
    "community_highlight_image": {
        "audience": "admin",
        "prefix": "community-highlights",
        "extensions": IMAGE_EXTENSIONS,
    },
    "online_gallery_image": {
        "audience": "admin",
        "prefix": "online-gallery",
        "extensions": IMAGE_EXTENSIONS,
    },
    "online_gallery_model": {
        "audience": "admin",
        "prefix": "online-gallery",
        "extensions": {".glb"},
    },
    "edu_story_cover": {
        "audience": "admin",
        "prefix": "edu-resources",
        "extensions": IMAGE_EXTENSIONS,
    },
    "edu_resource_file": {
        "audience": "admin",
        "prefix": "edu-resources",
        "extensions": DOCUMENT_EXTENSIONS,
    },
    "participation_teacher_file": {
        "audience": "public",
        "prefix": "participation-submissions",
        "extensions": DOCUMENT_EXTENSIONS,
        "owner_scoped": True,
    },
    "participation_story_photo": {
        "audience": "public",
        "prefix": "participation-submissions",
        "extensions": IMAGE_EXTENSIONS,
        "owner_scoped": True,
    },
    "account_avatar": {
        "audience": "public",
        "prefix": "avatars",
        "extensions": IMAGE_EXTENSIONS,
        "owner_scoped": True,
    },
}


def get_upload_purpose(purpose: Any, *, audience: str | None = None) -> dict[str, Any]:
    normalized = str(purpose or "").strip().lower()
    config = UPLOAD_PURPOSES.get(normalized)
    if not config or (audience and config.get("audience") != audience):
        raise ValueError("This upload type is not allowed for the current account.")
    return {**config, "name": normalized}


def _owner_segment(config: dict[str, Any], owner_id: Any) -> str | None:
    if not config.get("owner_scoped"):
        return None
    try:
        normalized_owner_id = int(owner_id)
    except (TypeError, ValueError) as exc:
        raise ValueError("A signed-in account is required for this upload.") from exc
    if normalized_owner_id < 1:
        raise ValueError("A signed-in account is required for this upload.")
    return f"user-{normalized_owner_id}"


def _purpose_root(config: dict[str, Any], owner_id: Any = None) -> str:
    parts = [str(config["prefix"]).strip().strip("/")]
    owner_segment = _owner_segment(config, owner_id)
    if owner_segment:
        parts.append(owner_segment)
    parts.append(str(config["name"]).strip())
    return "/".join(parts)


def _normalized_extension(filename: Any) -> tuple[str, str]:
    safe_name = secure_filename(str(filename or "").strip())
    extension = Path(safe_name).suffix.lower()
    return safe_name, extension


def _safe_stem(filename: str, fallback: str) -> str:
    raw_stem = Path(filename).stem.lower()
    normalized = re.sub(r"[^a-z0-9]+", "-", raw_stem).strip("-")
    return (normalized or fallback)[:80]


def _storage_response_items(response: Any) -> list[Any]:
    if isinstance(response, list):
        return response
    if isinstance(response, dict):
        data = response.get("data")
        return data if isinstance(data, list) else []
    data = getattr(response, "data", None)
    return data if isinstance(data, list) else []


def _object_value(item: Any, key: str) -> Any:
    if isinstance(item, dict):
        return item.get(key)
    return getattr(item, key, None)


def _stored_object_size(object_path: str) -> int:
    folder, filename = object_path.rsplit("/", 1)
    bucket = get_supabase_client().storage.from_(get_media_bucket_name())
    response = bucket.list(folder, {"limit": 100, "search": filename})
    matching_item = next(
        (item for item in _storage_response_items(response) if str(_object_value(item, "name") or "") == filename),
        None,
    )
    if matching_item is None:
        raise ValueError("The uploaded file could not be found in Supabase Storage. Please upload it again.")

    metadata = _object_value(matching_item, "metadata") or {}
    raw_size = metadata.get("size") if isinstance(metadata, dict) else getattr(metadata, "size", None)
    if raw_size in (None, ""):
        raw_size = _object_value(matching_item, "size")
    try:
        size = int(raw_size)
    except (TypeError, ValueError):
        # Older Storage API responses may omit metadata. Downloading is only a
        # compatibility fallback; current Supabase responses include byte size.
        stored_bytes = bucket.download(object_path)
        size = len(bytes(stored_bytes or b""))
    return size


def get_direct_upload_browser_config() -> dict[str, str]:
    if not is_supabase_configured():
        raise RuntimeError("Supabase Storage is not configured on the server.")
    supabase_url = str(os.getenv("SUPABASE_URL") or "").strip()
    publishable_key = str(os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or "").strip()
    if not publishable_key:
        raise RuntimeError("Direct uploads are not configured. Add SUPABASE_PUBLISHABLE_KEY in Vercel.")
    return {"supabaseUrl": supabase_url, "supabaseKey": publishable_key}


def prepare_direct_upload(
    *,
    filename: Any,
    purpose: Any,
    file_size: Any,
    audience: str,
    owner_id: Any = None,
) -> dict[str, Any]:
    config = get_upload_purpose(purpose, audience=audience)
    safe_name, extension = _normalized_extension(filename)
    if not safe_name or extension not in config["extensions"]:
        allowed = ", ".join(sorted(ext.lstrip(".").upper() for ext in config["extensions"]))
        raise ValueError(f"Choose a supported {allowed} file.")
    try:
        size = int(file_size)
    except (TypeError, ValueError) as exc:
        raise ValueError("The upload size is missing or invalid.") from exc
    if size < 1:
        raise ValueError("Choose a non-empty file.")
    if size > MEDIA_UPLOAD_MAX_BYTES:
        raise ValueError("This file exceeds the 25 MB upload limit.")

    root = _purpose_root(config, owner_id)
    stem = _safe_stem(safe_name, config["name"])
    object_path = f"{root}/{stem}-{uuid4().hex}{extension}"
    bucket_name = get_media_bucket_name()
    response = get_supabase_client().storage.from_(bucket_name).create_signed_upload_url(object_path)
    data = response if isinstance(response, dict) else getattr(response, "data", None)
    data = data or {}
    token = data.get("token") or data.get("signedToken") or data.get("signed_token")
    if not token:
        raise RuntimeError("Supabase did not return a signed upload token. Please try again.")
    return {"bucket": bucket_name, "path": object_path, "token": token, "maxBytes": MEDIA_UPLOAD_MAX_BYTES}


def validate_direct_upload_reference(
    object_path: Any,
    purpose: Any,
    *,
    audience: str,
    owner_id: Any = None,
) -> dict[str, Any]:
    config = get_upload_purpose(purpose, audience=audience)
    normalized = str(object_path or "").strip().lstrip("/")
    expected_root = _purpose_root(config, owner_id)
    if not normalized.startswith(f"{expected_root}/") or ".." in normalized.split("/"):
        raise ValueError("The uploaded file reference is outside its protected storage area.")
    extension = Path(normalized).suffix.lower()
    if extension not in config["extensions"]:
        raise ValueError("The uploaded file type does not match this form.")
    size = _stored_object_size(normalized)
    if size < 1 or size > MEDIA_UPLOAD_MAX_BYTES:
        raise ValueError("The uploaded file is empty or exceeds the 25 MB limit.")
    return {"path": normalized, "size": size, "extension": extension}


def discard_direct_uploads(
    uploads: Any,
    *,
    audience: str,
    owner_id: Any = None,
) -> int:
    if not isinstance(uploads, list):
        return 0
    removable: list[str] = []
    for upload in uploads[:24]:
        if not isinstance(upload, dict):
            continue
        try:
            config = get_upload_purpose(upload.get("purpose"), audience=audience)
            path = str(upload.get("path") or "").strip().lstrip("/")
            if path.startswith(f"{_purpose_root(config, owner_id)}/") and ".." not in path.split("/"):
                removable.append(path)
        except ValueError:
            continue
    removable = list(dict.fromkeys(removable))
    if removable:
        get_supabase_client().storage.from_(get_media_bucket_name()).remove(removable)
    return len(removable)
