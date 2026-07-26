import os
from datetime import datetime
from pathlib import Path
from typing import Any, Callable

from werkzeug.utils import secure_filename

from supabase_client import get_supabase_client

DEFAULT_MEDIA_BUCKET = "nhcp-media"
EXHIBITS_STORAGE_PREFIX = "exhibits"
ONLINE_GALLERY_STORAGE_PREFIX = "online-gallery"
EDU_RESOURCES_STORAGE_PREFIX = "edu-resources"
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}


def get_media_bucket_name() -> str:
    return str(os.getenv("SUPABASE_MEDIA_BUCKET") or DEFAULT_MEDIA_BUCKET).strip() or DEFAULT_MEDIA_BUCKET


def is_storage_object_path(value: Any, *, folder_prefix: str | None = None) -> bool:
    raw_value = str(value or "").strip().lstrip("/")
    if not raw_value or raw_value.startswith(("http://", "https://")):
        return False
    if folder_prefix:
        normalized_prefix = str(folder_prefix or "").strip().strip("/")
        return raw_value.startswith(f"{normalized_prefix}/")
    return "/" in raw_value


def _guess_content_type(extension: str) -> str:
    normalized_extension = str(extension or "").strip().lower()
    if normalized_extension in {".jpg", ".jpeg"}:
        return "image/jpeg"
    if normalized_extension == ".png":
        return "image/png"
    if normalized_extension == ".glb":
        return "model/gltf-binary"
    if normalized_extension == ".pdf":
        return "application/pdf"
    if normalized_extension == ".docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if normalized_extension == ".ppt":
        return "application/vnd.ms-powerpoint"
    if normalized_extension == ".pptx":
        return "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    return "application/octet-stream"


def _upload_public_object(file_storage, *, title: str, folder_prefix: str, slugify_text: Callable[[str, str], str], allowed_extensions: set[str], invalid_type_message: str) -> str | None:
    if file_storage is None or not str(getattr(file_storage, "filename", "")).strip():
        return None

    original_name = secure_filename(str(file_storage.filename or "").strip())
    extension = Path(original_name).suffix.lower()
    if extension not in allowed_extensions:
        raise ValueError(invalid_type_message)

    file_bytes = file_storage.read()
    if hasattr(file_storage, "stream"):
        file_storage.stream.seek(0)
    if not file_bytes:
        raise ValueError("Please choose a non-empty file.")

    # Microseconds keep consecutive files in a multi-image upload from
    # resolving to the same storage object path.
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    safe_title = slugify_text(title, fallback="image")
    normalized_prefix = str(folder_prefix or "").strip().strip("/")
    object_path = f"{normalized_prefix}/{safe_title}-{timestamp}{extension}"
    content_type = str(getattr(file_storage, "mimetype", "")).strip() or _guess_content_type(extension)

    client = get_supabase_client()
    client.storage.from_(get_media_bucket_name()).upload(
        path=object_path,
        file=file_bytes,
        file_options={"content-type": content_type, "upsert": "false"},
    )
    return object_path


def upload_public_image(file_storage, *, title: str, folder_prefix: str, slugify_text: Callable[[str, str], str]) -> str | None:
    return _upload_public_object(
        file_storage,
        title=title,
        folder_prefix=folder_prefix,
        slugify_text=slugify_text,
        allowed_extensions=ALLOWED_IMAGE_EXTENSIONS,
        invalid_type_message="Image must be a JPG or PNG file.",
    )


def upload_public_file(file_storage, *, title: str, folder_prefix: str, slugify_text: Callable[[str, str], str], allowed_extensions: set[str], invalid_type_message: str) -> str | None:
    normalized_extensions = {str(extension or "").strip().lower() for extension in set(allowed_extensions or set()) if str(extension or "").strip()}
    if not normalized_extensions:
        raise ValueError("Please choose a valid upload file type.")
    return _upload_public_object(
        file_storage,
        title=title,
        folder_prefix=folder_prefix,
        slugify_text=slugify_text,
        allowed_extensions=normalized_extensions,
        invalid_type_message=invalid_type_message,
    )


def delete_public_image(object_path: Any, *, folder_prefix: str | None = None) -> bool:
    normalized_path = str(object_path or "").strip().lstrip("/")
    if not normalized_path:
        return False
    if folder_prefix and not is_storage_object_path(normalized_path, folder_prefix=folder_prefix):
        return False
    if normalized_path.startswith(("http://", "https://")):
        return False

    client = get_supabase_client()
    client.storage.from_(get_media_bucket_name()).remove([normalized_path])
    return True


def resolve_public_image_url(object_path: Any) -> str | None:
    normalized_path = str(object_path or "").strip().lstrip("/")
    if not normalized_path:
        return None
    if normalized_path.startswith(("http://", "https://")):
        return normalized_path

    client = get_supabase_client()
    response = client.storage.from_(get_media_bucket_name()).get_public_url(normalized_path)

    if isinstance(response, str):
        return response
    if isinstance(response, dict):
        direct_value = response.get("publicURL") or response.get("publicUrl") or response.get("public_url")
        if isinstance(direct_value, str) and direct_value:
            return direct_value
        data = response.get("data")
        if isinstance(data, dict):
            nested_value = data.get("publicURL") or data.get("publicUrl") or data.get("public_url")
            if isinstance(nested_value, str) and nested_value:
                return nested_value
    return None
