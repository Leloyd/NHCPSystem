import os
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent
LEGACY_STATIC_UPLOADS_ROOT = (PROJECT_ROOT / "static" / "uploads").resolve()


def get_public_uploads_root() -> Path:
    configured_root = str(os.getenv("PUBLIC_UPLOADS_ROOT") or "").strip()
    if configured_root:
        configured_path = Path(configured_root).expanduser()
        if not configured_path.is_absolute():
            configured_path = (PROJECT_ROOT / configured_path).resolve()
        return configured_path.resolve()

    if os.name != "nt":
        tmp_root = Path("/tmp")
        if tmp_root.exists() and os.access(tmp_root, os.W_OK):
            return (tmp_root / "nhcp_public_uploads").resolve()

    return (PROJECT_ROOT / "instance" / "public_uploads").resolve()


def get_public_upload_dir(folder_name: str) -> Path:
    return (get_public_uploads_root() / folder_name).resolve()


def get_legacy_public_upload_dir(folder_name: str) -> Path:
    return (LEGACY_STATIC_UPLOADS_ROOT / folder_name).resolve()


def resolve_existing_public_upload_path(folder_name: str, image_filename: object) -> Path | None:
    safe_filename = Path(str(image_filename or "")).name.strip()
    if not safe_filename:
        return None

    runtime_candidate = (get_public_upload_dir(folder_name) / safe_filename).resolve()
    runtime_root = get_public_upload_dir(folder_name)
    if (runtime_root in runtime_candidate.parents or runtime_candidate == runtime_root) and runtime_candidate.exists() and runtime_candidate.is_file():
        return runtime_candidate

    legacy_candidate = (get_legacy_public_upload_dir(folder_name) / safe_filename).resolve()
    legacy_root = get_legacy_public_upload_dir(folder_name)
    if (legacy_root in legacy_candidate.parents or legacy_candidate == legacy_root) and legacy_candidate.exists() and legacy_candidate.is_file():
        return legacy_candidate

    return None
