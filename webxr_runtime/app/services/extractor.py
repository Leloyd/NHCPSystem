from __future__ import annotations

import hashlib
import json
import logging
import shutil
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from zipfile import ZipFile


LOGGER = logging.getLogger(__name__)


class ZipExtractionError(RuntimeError):
    pass


@dataclass(frozen=True)
class ExtractionResult:
    zip_path: Path
    extracted_dir: Path
    did_extract: bool
    fingerprint: str
    inventory: dict[str, int]
    extracted_at: str


def _has_extracted_files(extracted_dir: Path) -> bool:
    if not extracted_dir.exists() or not extracted_dir.is_dir():
        return False

    for file_path in extracted_dir.rglob("*"):
        if file_path.is_file():
            return True

    return False


def _resolve_zip_path(base_dir: Path, configured_path: str, candidates: tuple[str, ...]) -> Path:
    if configured_path:
        configured = Path(configured_path)
        if not configured.is_absolute():
            configured = base_dir / configured
        if configured.exists() and configured.is_file():
            return configured
        raise FileNotFoundError(
            f"Configured MARBLE_ZIP_PATH does not exist: {configured}"
        )

    checked: list[Path] = []
    for name in candidates:
        candidate = base_dir / name
        checked.append(candidate)
        if candidate.exists() and candidate.is_file():
            return candidate

    checked_str = "\n - ".join(str(path) for path in checked)
    raise FileNotFoundError(
        "Marble ZIP not found. Checked:\n"
        f" - {checked_str}\n"
        "Set MARBLE_ZIP_PATH in your environment to override."
    )


def _compute_sha256(file_path: Path) -> str:
    hasher = hashlib.sha256()
    with file_path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def _load_extract_state(state_path: Path) -> dict:
    if not state_path.exists():
        return {}

    try:
        return json.loads(state_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        LOGGER.warning("Extract state file is invalid JSON. Re-extracting.")
        return {}


def _save_extract_state(state_path: Path, payload: dict) -> None:
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _safe_extract_zip(zip_path: Path, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    destination_resolved = destination.resolve()

    with ZipFile(zip_path, mode="r") as archive:
        for member in archive.infolist():
            target_path = (destination / member.filename).resolve()
            if destination_resolved not in target_path.parents and target_path != destination_resolved:
                raise ZipExtractionError(
                    f"Unsafe ZIP member path detected: {member.filename}"
                )

        archive.extractall(destination)


def _collect_inventory(extracted_dir: Path) -> dict[str, int]:
    inventory = {
        "files_total": 0,
        "spz": 0,
        "ply": 0,
        "glb": 0,
        "gltf": 0,
        "textures": 0,
        "manifests": 0,
    }

    texture_exts = {".png", ".jpg", ".jpeg", ".webp", ".ktx2", ".basis", ".tga", ".bmp"}
    manifest_exts = {".json", ".yaml", ".yml"}

    for file_path in extracted_dir.rglob("*"):
        if not file_path.is_file():
            continue

        inventory["files_total"] += 1
        suffix = file_path.suffix.lower()
        if suffix == ".spz":
            inventory["spz"] += 1
        elif suffix == ".ply":
            inventory["ply"] += 1
        elif suffix == ".glb":
            inventory["glb"] += 1
        elif suffix == ".gltf":
            inventory["gltf"] += 1
        elif suffix in texture_exts:
            inventory["textures"] += 1
        elif suffix in manifest_exts:
            inventory["manifests"] += 1

    return inventory


def ensure_extracted(config: dict) -> ExtractionResult:
    base_dir = Path(config["BASE_DIR"])
    runtime_dir = Path(config["RUNTIME_DIR"])
    extracted_dir = runtime_dir / config["EXTRACTED_DIR_NAME"]
    state_file = runtime_dir / config["EXTRACT_STATE_FILE"]

    try:
        zip_path = _resolve_zip_path(
            base_dir=base_dir,
            configured_path=config.get("MARBLE_ZIP_PATH", ""),
            candidates=tuple(config.get("ZIP_CANDIDATES", ())),
        )
    except FileNotFoundError:
        if _has_extracted_files(extracted_dir):
            LOGGER.info("ZIP not found. Reusing committed runtime folder: %s", extracted_dir)
            inventory = _collect_inventory(extracted_dir)

            return ExtractionResult(
                zip_path=extracted_dir,
                extracted_dir=extracted_dir,
                did_extract=False,
                fingerprint="preextracted",
                inventory=inventory,
                extracted_at="",
            )

        raise

    LOGGER.info("ZIP found: %s", zip_path)

    fingerprint = _compute_sha256(zip_path)
    state = _load_extract_state(state_file)
    previous_fingerprint = state.get("fingerprint")

    should_extract = not extracted_dir.exists() or previous_fingerprint != fingerprint

    if should_extract:
        if extracted_dir.exists():
            shutil.rmtree(extracted_dir, ignore_errors=True)

        LOGGER.info("Extracting ZIP to runtime folder: %s", extracted_dir)
        _safe_extract_zip(zip_path, extracted_dir)
        extracted_at = datetime.now(UTC).isoformat()
        _save_extract_state(
            state_file,
            {
                "zip_path": str(zip_path),
                "fingerprint": fingerprint,
                "extracted_dir": str(extracted_dir),
                "extracted_at": extracted_at,
            },
        )
    else:
        extracted_at = state.get("extracted_at", "")
        LOGGER.info("ZIP unchanged. Reusing extracted runtime folder.")

    inventory = _collect_inventory(extracted_dir)
    LOGGER.info(
        "Extracted file inventory: total=%d spz=%d ply=%d glb=%d gltf=%d textures=%d manifests=%d",
        inventory["files_total"],
        inventory["spz"],
        inventory["ply"],
        inventory["glb"],
        inventory["gltf"],
        inventory["textures"],
        inventory["manifests"],
    )

    return ExtractionResult(
        zip_path=zip_path,
        extracted_dir=extracted_dir,
        did_extract=should_extract,
        fingerprint=fingerprint,
        inventory=inventory,
        extracted_at=extracted_at,
    )
