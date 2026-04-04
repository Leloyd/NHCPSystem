# Full Source Dump


## requirements.txt

```
Flask>=3.0.0,<4.0.0
PyYAML>=6.0.0,<7.0.0
python-dotenv>=1.0.0,<2.0.0
```


## package.json

```
{
  "name": "marble-webxr-viewer",
  "private": true,
  "type": "module",
  "scripts": {
    "vendor:sync": "node ./scripts/sync_vendor.mjs",
    "postinstall": "npm run vendor:sync"
  },
  "dependencies": {
    "@sparkjsdev/spark": "latest",
    "three": "^0.180.0",
    "three-mesh-bvh": "^0.9.2"
  }
}
```


## .env.example

```
FLASK_ENV=development
LOG_LEVEL=INFO

# Optional: override default ZIP discovery
# MARBLE_ZIP_PATH=church.zip

PLAYER_HEIGHT=1.72
PLAYER_RADIUS=0.35
PLAYER_GRAVITY=22.0
PLAYER_JUMP_STRENGTH=8.3
PLAYER_MOVE_SPEED=4.0
PLAYER_SPRINT_SPEED=6.5

DEFAULT_QUALITY=auto
DEBUG_COLLISION=false
```


## .gitignore

```
# Python
__pycache__/
*.py[cod]
.venv/
venv/
.env

# Flask/runtime
runtime/church_extracted/
runtime/church_extract_state.json

# Node
node_modules/

# IDE / OS
.DS_Store
Thumbs.db
```


## run.py

```
from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=bool(app.config.get("DEBUG", False)),
        use_reloader=False,
    )
```


## app/__init__.py

```
from __future__ import annotations

import logging
import os
from pathlib import Path

from flask import Flask
from dotenv import load_dotenv

from .config import get_config_class
from .routes import main_blueprint
from .services import RuntimeSceneService


def _configure_logging(level_name: str) -> None:
    numeric_level = getattr(logging, level_name.upper(), logging.INFO)
    logging.basicConfig(
        level=numeric_level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )


def create_app() -> Flask:
    load_dotenv()

    config_class = get_config_class()

    project_root = Path(__file__).resolve().parents[1]
    app = Flask(
        __name__,
        static_folder=str(project_root / "static"),
        template_folder=str(project_root / "templates"),
    )
    app.config.from_object(config_class)

    _configure_logging(app.config["LOG_LEVEL"])

    runtime_scene = RuntimeSceneService(app.config)
    runtime_scene.initialize()

    app.extensions["runtime_scene"] = runtime_scene

    app.register_blueprint(main_blueprint)

    app.logger.info(
        "Application initialized | env=%s debug=%s",
        os.getenv("FLASK_ENV", "development"),
        app.debug,
    )

    return app
```


## app/config.py

```
from __future__ import annotations

import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]


def _bool_env(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


class BaseConfig:
    APP_NAME = "Marble WebXR Viewer"
    BASE_DIR = BASE_DIR
    DEBUG = False
    TESTING = False

    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

    MARBLE_ZIP_PATH = os.getenv("MARBLE_ZIP_PATH", "")
    ZIP_CANDIDATES = (
        "church.zip",
        "Church.zip",
    )

    RUNTIME_DIR = BASE_DIR / "runtime"
    EXTRACTED_DIR_NAME = "church_extracted"
    EXTRACT_STATE_FILE = "church_extract_state.json"

    SPARK_FALLBACK_MODULE_URL = "/static/vendor/spark/spark.module.min.js"

    PLAYER_SETTINGS = {
        "height": float(os.getenv("PLAYER_HEIGHT", "1.72")),
        "radius": float(os.getenv("PLAYER_RADIUS", "0.35")),
        "gravity": float(os.getenv("PLAYER_GRAVITY", "22.0")),
        "jump_strength": float(os.getenv("PLAYER_JUMP_STRENGTH", "8.3")),
        "move_speed": float(os.getenv("PLAYER_MOVE_SPEED", "4.0")),
        "sprint_speed": float(os.getenv("PLAYER_SPRINT_SPEED", "6.5")),
    }

    DEFAULT_QUALITY = os.getenv("DEFAULT_QUALITY", "auto")
    DEBUG_COLLISION = _bool_env("DEBUG_COLLISION", False)


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class ProductionConfig(BaseConfig):
    DEBUG = False


def get_config_class() -> type[BaseConfig]:
    env = os.getenv("FLASK_ENV", "development").strip().lower()
    if env in {"prod", "production"}:
        return ProductionConfig
    return DevelopmentConfig
```


## app/routes.py

```
from __future__ import annotations

from pathlib import Path

from flask import Blueprint, Response, current_app, jsonify, render_template, send_from_directory

main_blueprint = Blueprint("main", __name__)


@main_blueprint.route("/")
def index() -> str:
    return render_template("index.html")


@main_blueprint.route("/api/scene")
def scene_metadata() -> Response:
    runtime_service = current_app.extensions["runtime_scene"]
    payload = {
        "app": {
            "name": current_app.config["APP_NAME"],
            "debug": bool(current_app.config["DEBUG"]),
        },
        "player": current_app.config["PLAYER_SETTINGS"],
        "quality": {
            "default": current_app.config["DEFAULT_QUALITY"],
            "options": ["auto", "low", "medium", "high"],
        },
        "debug": {
            "collision": bool(current_app.config["DEBUG_COLLISION"]),
        },
        "scene": runtime_service.scene_description,
    }
    return jsonify(payload)


@main_blueprint.route("/healthz")
def healthz() -> Response:
    runtime_service = current_app.extensions["runtime_scene"]
    payload = runtime_service.get_health_payload()
    status_code = 200 if payload.get("ready") else 503
    return jsonify(payload), status_code


@main_blueprint.route("/runtime/<path:asset_path>")
def runtime_asset(asset_path: str):
    runtime_dir = Path(current_app.config["RUNTIME_DIR"]).resolve()
    candidate_path = (runtime_dir / asset_path).resolve()

    if runtime_dir not in candidate_path.parents and candidate_path != runtime_dir:
        return jsonify({"error": "Invalid runtime asset path"}), 400

    if not candidate_path.exists() or not candidate_path.is_file():
        return jsonify({"error": f"Asset not found: {asset_path}"}), 404

    return send_from_directory(runtime_dir, asset_path)
```


## app/services/__init__.py

```
from .runtime_scene import RuntimeSceneService

__all__ = ["RuntimeSceneService"]
```


## app/services/extractor.py

```
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

    zip_path = _resolve_zip_path(
        base_dir=base_dir,
        configured_path=config.get("MARBLE_ZIP_PATH", ""),
        candidates=tuple(config.get("ZIP_CANDIDATES", ())),
    )

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
```


## app/services/runtime_scene.py

```
from __future__ import annotations

import logging
from typing import Any

from .extractor import ensure_extracted
from .scene_parser import SceneParseError, build_scene_description


LOGGER = logging.getLogger(__name__)


class RuntimeSceneService:
    def __init__(self, config: dict[str, Any]) -> None:
        self._config = config
        self._scene_description: dict[str, Any] | None = None
        self._startup_report: dict[str, Any] = {}
        self._is_ready = False
        self._error: str | None = None

    @property
    def is_ready(self) -> bool:
        return self._is_ready

    @property
    def error(self) -> str | None:
        return self._error

    @property
    def scene_description(self) -> dict[str, Any]:
        if self._scene_description is None:
            raise RuntimeError("Scene runtime was requested before initialization.")
        return self._scene_description

    @property
    def startup_report(self) -> dict[str, Any]:
        return self._startup_report

    def initialize(self) -> None:
        try:
            extraction = ensure_extracted(self._config)
            scene_description, startup_report = build_scene_description(extraction, self._config)

            self._scene_description = scene_description
            self._startup_report = startup_report
            self._is_ready = True
            self._error = None

            self._log_startup_report()
        except FileNotFoundError as exc:
            self._is_ready = False
            self._error = str(exc)
            LOGGER.exception("Critical startup failure: required ZIP is missing.")
            raise
        except SceneParseError as exc:
            self._is_ready = False
            self._error = str(exc)
            LOGGER.exception("Critical startup failure: parsed scene is invalid.")
            raise
        except Exception as exc:  # noqa: BLE001
            self._is_ready = False
            self._error = str(exc)
            LOGGER.exception("Unexpected startup failure while preparing scene runtime.")
            raise

    def get_health_payload(self) -> dict[str, Any]:
        return {
            "ready": self._is_ready,
            "error": self._error,
            "startupReport": self._startup_report,
        }

    def _log_startup_report(self) -> None:
        LOGGER.info("--- Marble scene startup report ---")
        LOGGER.info("ZIP found: %s", self._startup_report.get("zipFound"))
        LOGGER.info("Manifest found: %s", self._startup_report.get("manifestFound"))
        LOGGER.info("Manifest path: %s", self._startup_report.get("manifestPath"))
        LOGGER.info("Primary splat: %s", self._startup_report.get("primarySplat"))
        LOGGER.info("Mesh count: %s", self._startup_report.get("meshCount"))
        LOGGER.info("Collision mode: %s", self._startup_report.get("collisionMode"))
        LOGGER.info(
            "Collision meshes detected: %s",
            ", ".join(self._startup_report.get("collisionMeshes", [])) or "none",
        )
        unresolved = self._startup_report.get("unresolvedTransforms", {})
        LOGGER.info(
            "Unresolved transforms: splats=%d meshes=%d",
            len(unresolved.get("splats", [])),
            len(unresolved.get("meshes", [])),
        )
        LOGGER.info("----------------------------------")
```


## app/services/scene_parser.py

```
from __future__ import annotations

import hashlib
import json
import logging
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import unquote_plus

import yaml

from .extractor import ExtractionResult


LOGGER = logging.getLogger(__name__)

TEXTURE_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".ktx2",
    ".basis",
    ".tga",
    ".bmp",
}
MANIFEST_HINTS = ("scene", "manifest", "transform", "config")
COLLIDER_HINTS = ("collider", "collision", "physics", "navmesh", "walk")
ENVIRONMENT_HINTS = (
    "room",
    "church",
    "interior",
    "hall",
    "floor",
    "building",
    "environment",
    "shell",
    "level",
)
PROP_HINTS = (
    "pew",
    "chair",
    "desk",
    "table",
    "altar",
    "door",
    "display",
    "rock",
    "sample",
    "case",
)


@dataclass
class PathIndex:
    by_relative: dict[str, Path]
    by_name: dict[str, list[Path]]
    by_normalized: dict[str, list[Path]]


class SceneParseError(RuntimeError):
    pass


def build_scene_description(
    extraction: ExtractionResult,
    config: dict,
) -> tuple[dict[str, Any], dict[str, Any]]:
    extracted_dir = extraction.extracted_dir
    runtime_prefix = f"/runtime/{config['EXTRACTED_DIR_NAME']}"

    scanned = _scan_assets(extracted_dir)

    manifest_path, manifest_data, manifest_issues = _select_manifest(scanned["manifest_candidates"])
    object_metadata = _load_object_metadata(scanned["manifest_candidates"], manifest_path)

    splat_assets, splat_warnings, unresolved_splats = _resolve_assets(
        kind="splat",
        discovered_paths=scanned["splat_files"],
        manifest_data=manifest_data,
        extracted_dir=extracted_dir,
        runtime_prefix=runtime_prefix,
        object_metadata=object_metadata,
    )
    mesh_assets, mesh_warnings, unresolved_meshes = _resolve_assets(
        kind="mesh",
        discovered_paths=scanned["mesh_files"],
        manifest_data=manifest_data,
        extracted_dir=extracted_dir,
        runtime_prefix=runtime_prefix,
        object_metadata=object_metadata,
    )

    texture_assets = [
        _build_texture_asset(path, extracted_dir, runtime_prefix) for path in scanned["texture_files"]
    ]

    if not splat_assets and not mesh_assets:
        raise SceneParseError(
            "No usable assets found in extracted ZIP (expected splats and/or meshes)."
        )

    collision_data = _choose_collision_meshes(mesh_assets)

    warnings: list[str] = []
    warnings.extend(manifest_issues)
    warnings.extend(splat_warnings)
    warnings.extend(mesh_warnings)

    generated_config_relative = _write_generated_scene_config_if_needed(
        extracted_dir=extracted_dir,
        manifest_path=manifest_path,
        splats=splat_assets,
        meshes=mesh_assets,
        warnings=warnings,
        unresolved_splats=unresolved_splats,
        unresolved_meshes=unresolved_meshes,
    )

    generated_config_url = None
    if generated_config_relative:
        generated_config_url = f"{runtime_prefix}/{generated_config_relative}"

    primary_splat = _choose_primary_splat(scanned["splat_files"], extracted_dir)
    primary_splat_rel = primary_splat.relative_to(extracted_dir).as_posix() if primary_splat else None

    manifest_relative = manifest_path.relative_to(extracted_dir).as_posix() if manifest_path else None

    scene_description = {
        "version": 1,
        "generatedAt": datetime.now(UTC).isoformat(),
        "source": {
            "zipPath": str(extraction.zip_path),
            "zipFingerprint": extraction.fingerprint,
            "extractedDir": str(extracted_dir),
            "didExtract": extraction.did_extract,
            "manifestFound": manifest_path is not None,
            "manifestPath": manifest_relative,
            "generatedConfigPath": generated_config_relative,
            "generatedConfigUrl": generated_config_url,
            "sparkModuleUrl": _resolve_spark_module_url(extracted_dir, runtime_prefix, config),
        },
        "assets": {
            "splats": splat_assets,
            "meshes": mesh_assets,
            "textures": texture_assets,
        },
        "collision": collision_data,
        "warnings": warnings,
    }

    startup_report = {
        "zipFound": str(extraction.zip_path),
        "manifestFound": manifest_path is not None,
        "manifestPath": manifest_relative,
        "primarySplat": primary_splat_rel,
        "meshCount": len(mesh_assets),
        "collisionMeshes": collision_data["preferredMeshFiles"],
        "collisionMode": collision_data["mode"],
        "unresolvedTransforms": {
            "splats": unresolved_splats,
            "meshes": unresolved_meshes,
        },
        "inventory": extraction.inventory,
    }

    return scene_description, startup_report


def _scan_assets(extracted_dir: Path) -> dict[str, list[Path]]:
    splat_files: list[Path] = []
    mesh_files: list[Path] = []
    texture_files: list[Path] = []
    manifest_candidates: list[Path] = []

    for path in sorted(extracted_dir.rglob("*")):
        if not path.is_file():
            continue

        suffix = path.suffix.lower()
        if suffix in {".spz", ".ply"}:
            splat_files.append(path)
        elif suffix in {".glb", ".gltf"}:
            mesh_files.append(path)
        elif suffix in TEXTURE_EXTENSIONS:
            texture_files.append(path)
        elif suffix in {".json", ".yaml", ".yml"}:
            manifest_candidates.append(path)

    return {
        "splat_files": splat_files,
        "mesh_files": mesh_files,
        "texture_files": texture_files,
        "manifest_candidates": manifest_candidates,
    }


def _choose_primary_splat(splats: list[Path], extracted_dir: Path) -> Path | None:
    if not splats:
        return None

    spz = [path for path in splats if path.suffix.lower() == ".spz"]
    if spz:
        return max(spz, key=lambda p: p.stat().st_size)

    return max(splats, key=lambda p: p.stat().st_size)


def _resolve_spark_module_url(extracted_dir: Path, runtime_prefix: str, config: dict) -> str:
    preferred_names = ("spark.module.min.js", "spark.module.js")
    for file_path in extracted_dir.rglob("*"):
        if not file_path.is_file():
            continue
        if file_path.name.lower() in preferred_names:
            rel = file_path.relative_to(extracted_dir).as_posix()
            return f"{runtime_prefix}/{rel}"

    return config["SPARK_FALLBACK_MODULE_URL"]


def _select_manifest(candidates: list[Path]) -> tuple[Path | None, Any, list[str]]:
    best_path: Path | None = None
    best_data: Any = None
    best_score = -1
    warnings: list[str] = []

    for path in candidates:
        data, parse_error = _load_structured_file(path)
        if parse_error:
            warnings.append(parse_error)
            continue

        score = _score_manifest_candidate(path, data)
        if score > best_score:
            best_score = score
            best_path = path
            best_data = data

    if best_path is None or best_score < 2:
        warnings.append("No transform manifest detected. Generated fallback config will be used.")
        return None, None, warnings

    return best_path, best_data, warnings


def _score_manifest_candidate(path: Path, data: Any) -> int:
    score = 0
    file_name = path.name.lower()

    if file_name == "scene.json":
        score += 12

    if any(hint in file_name for hint in MANIFEST_HINTS):
        score += 4

    if isinstance(data, dict):
        keys = {str(key).lower() for key in data.keys()}
        if "splats" in keys:
            score += 12
        if "meshes" in keys:
            score += 12
        if "assets" in keys:
            score += 6
        if "nodes" in keys or "objects" in keys:
            score += 4
        if "metadata" in keys:
            score += 2

    return score


def _load_structured_file(path: Path) -> tuple[Any, str | None]:
    try:
        raw = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return None, f"Skipping non-UTF8 structured file: {path.name}"
    except OSError as exc:
        return None, f"Failed reading structured file {path.name}: {exc}"

    try:
        if path.suffix.lower() == ".json":
            return json.loads(raw), None
        return yaml.safe_load(raw), None
    except Exception as exc:
        return None, f"Could not parse {path.name}: {exc}"


def _load_object_metadata(candidates: list[Path], manifest_path: Path | None) -> dict[str, dict[str, Any]]:
    metadata_map: dict[str, dict[str, Any]] = {}

    for path in candidates:
        if manifest_path and path == manifest_path:
            continue
        lower_name = path.name.lower()
        if "metadata" not in lower_name and "interaction" not in lower_name:
            continue

        data, parse_error = _load_structured_file(path)
        if parse_error or not isinstance(data, dict):
            continue

        object_section = data.get("objects") if isinstance(data.get("objects"), (dict, list)) else data

        if isinstance(object_section, dict):
            for key, value in object_section.items():
                if isinstance(value, dict):
                    metadata_map[_normalize_token(str(key))] = value
        elif isinstance(object_section, list):
            for item in object_section:
                if not isinstance(item, dict):
                    continue
                name = item.get("name") or item.get("filename") or item.get("id")
                if name:
                    metadata_map[_normalize_token(str(name))] = item

    return metadata_map


def _resolve_assets(
    kind: str,
    discovered_paths: list[Path],
    manifest_data: Any,
    extracted_dir: Path,
    runtime_prefix: str,
    object_metadata: dict[str, dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[str], list[str]]:
    warnings: list[str] = []
    unresolved: list[str] = []

    path_index = _build_path_index(discovered_paths, extracted_dir)

    assets: list[dict[str, Any]] = []
    used_paths: set[Path] = set()

    manifest_entries = _manifest_entries_for_kind(manifest_data, kind)

    for entry in manifest_entries:
        file_ref = entry.get("file")
        if not file_ref:
            unresolved.append(f"{kind} entry missing filename in manifest")
            continue

        matched_path = _match_file_reference(file_ref, path_index)
        if not matched_path:
            unresolved.append(f"Manifest referenced missing {kind} file: {file_ref}")
            continue

        used_paths.add(matched_path)
        transform = _parse_transform(entry.get("transform"), entry)

        assets.append(
            _build_asset(
                kind=kind,
                file_path=matched_path,
                extracted_dir=extracted_dir,
                runtime_prefix=runtime_prefix,
                transform=transform,
                transform_source="manifest",
                metadata=_lookup_metadata(matched_path, object_metadata) | entry.get("metadata", {}),
            )
        )

    if not manifest_entries:
        warnings.append(f"No {kind} transforms found in manifest. Using generated defaults.")

    for path in discovered_paths:
        if path in used_paths:
            continue

        rel = path.relative_to(extracted_dir).as_posix()
        unresolved.append(f"No manifest transform for {kind} asset: {rel}")
        assets.append(
            _build_asset(
                kind=kind,
                file_path=path,
                extracted_dir=extracted_dir,
                runtime_prefix=runtime_prefix,
                transform=_parse_transform(None, None),
                transform_source="generated",
                metadata=_lookup_metadata(path, object_metadata),
            )
        )

    assets.sort(key=lambda item: item["relativePath"])

    if unresolved:
        warnings.append(
            f"{len(unresolved)} {kind} transform entries unresolved. See generated config for manual edits."
        )

    return assets, warnings, unresolved


def _build_path_index(paths: list[Path], extracted_dir: Path) -> PathIndex:
    by_relative: dict[str, Path] = {}
    by_name: dict[str, list[Path]] = {}
    by_normalized: dict[str, list[Path]] = {}

    for path in paths:
        rel = path.relative_to(extracted_dir).as_posix()
        by_relative[rel.lower()] = path

        lower_name = path.name.lower()
        by_name.setdefault(lower_name, []).append(path)

        normalized = _normalize_token(rel)
        by_normalized.setdefault(normalized, []).append(path)

    return PathIndex(by_relative=by_relative, by_name=by_name, by_normalized=by_normalized)


def _manifest_entries_for_kind(manifest_data: Any, kind: str) -> list[dict[str, Any]]:
    if not isinstance(manifest_data, dict):
        return []

    entries: list[dict[str, Any]] = []

    manifest_key = "splats" if kind == "splat" else "meshes"

    direct_entries = manifest_data.get(manifest_key)
    if isinstance(direct_entries, list):
        for item in direct_entries:
            if not isinstance(item, dict):
                continue
            file_ref = item.get("filename") or item.get("path") or item.get("uri")
            if not file_ref:
                continue
            entries.append(
                {
                    "file": str(file_ref),
                    "transform": item.get("transform") or item,
                    "metadata": _extract_manifest_metadata(item),
                }
            )

    assets_section = manifest_data.get("assets")
    if isinstance(assets_section, list):
        for item in assets_section:
            if not isinstance(item, dict):
                continue
            file_ref = item.get("filename") or item.get("path") or item.get("uri")
            if not file_ref:
                continue
            extension = Path(str(file_ref)).suffix.lower()
            if kind == "splat" and extension not in {".spz", ".ply"}:
                continue
            if kind == "mesh" and extension not in {".glb", ".gltf"}:
                continue
            entries.append(
                {
                    "file": str(file_ref),
                    "transform": item.get("transform") or item,
                    "metadata": _extract_manifest_metadata(item),
                }
            )

    return entries


def _extract_manifest_metadata(entry: dict[str, Any]) -> dict[str, Any]:
    excluded = {
        "filename",
        "path",
        "uri",
        "transform",
        "translation",
        "position",
        "rotation",
        "quaternion",
        "scale",
    }
    metadata: dict[str, Any] = {}
    for key, value in entry.items():
        if key in excluded:
            continue
        metadata[key] = value
    return metadata


def _match_file_reference(file_ref: str, index: PathIndex) -> Path | None:
    normalized_ref = unquote_plus(file_ref).replace("\\", "/").strip().lstrip("./")

    direct = index.by_relative.get(normalized_ref.lower())
    if direct:
        return direct

    base_name = Path(normalized_ref).name.lower()
    by_name = index.by_name.get(base_name)
    if by_name:
        return sorted(by_name)[0]

    token = _normalize_token(normalized_ref)
    by_token = index.by_normalized.get(token)
    if by_token:
        return sorted(by_token)[0]

    for candidate_token, paths in index.by_normalized.items():
        if token and (token in candidate_token or candidate_token in token):
            return sorted(paths)[0]

    return None


def _normalize_token(value: str) -> str:
    cleaned = unquote_plus(value).replace("\\", "/").lower()
    cleaned = Path(cleaned).name
    stem = Path(cleaned).stem
    return re.sub(r"[^a-z0-9]", "", stem)


def _parse_transform(transform: Any, container: Any) -> dict[str, Any]:
    base = transform if isinstance(transform, dict) else {}
    parent_container = container if isinstance(container, dict) else {}

    position = _to_vec3(base.get("translation") or base.get("position"), [0.0, 0.0, 0.0])
    rotation = _to_vec3(base.get("rotation") or base.get("euler"), [0.0, 0.0, 0.0])
    quaternion, has_quaternion = _to_quat(base.get("quaternion"))
    scale = _to_scale(base.get("scale"), [1.0, 1.0, 1.0])

    parent = (
        parent_container.get("parent")
        or parent_container.get("group")
        or parent_container.get("parentGroup")
    )

    return {
        "position": position,
        "rotationEulerDeg": rotation,
        "quaternion": quaternion,
        "hasQuaternion": has_quaternion,
        "scale": scale,
        "parent": parent,
    }


def _to_vec3(value: Any, default: list[float]) -> list[float]:
    if isinstance(value, (list, tuple)) and len(value) >= 3:
        return [float(value[0]), float(value[1]), float(value[2])]
    if isinstance(value, dict):
        if all(axis in value for axis in ("x", "y", "z")):
            return [float(value["x"]), float(value["y"]), float(value["z"])]
    return [float(default[0]), float(default[1]), float(default[2])]


def _to_quat(value: Any) -> tuple[list[float], bool]:
    if isinstance(value, (list, tuple)) and len(value) >= 4:
        return [float(value[0]), float(value[1]), float(value[2]), float(value[3])], True
    if isinstance(value, dict):
        if all(axis in value for axis in ("x", "y", "z", "w")):
            return [
                float(value["x"]),
                float(value["y"]),
                float(value["z"]),
                float(value["w"]),
            ], True
    return [0.0, 0.0, 0.0, 1.0], False


def _to_scale(value: Any, default: list[float]) -> list[float]:
    if isinstance(value, (int, float)):
        s = float(value)
        return [s, s, s]
    if isinstance(value, (list, tuple)) and len(value) >= 3:
        return [float(value[0]), float(value[1]), float(value[2])]
    if isinstance(value, dict):
        if all(axis in value for axis in ("x", "y", "z")):
            return [float(value["x"]), float(value["y"]), float(value["z"])]
    return [float(default[0]), float(default[1]), float(default[2])]


def _build_asset(
    *,
    kind: str,
    file_path: Path,
    extracted_dir: Path,
    runtime_prefix: str,
    transform: dict[str, Any],
    transform_source: str,
    metadata: dict[str, Any],
) -> dict[str, Any]:
    rel = file_path.relative_to(extracted_dir).as_posix()
    asset_id = f"{kind}:{hashlib.sha1(rel.encode('utf-8')).hexdigest()[:12]}"

    display_name = metadata.get("displayName") or metadata.get("name") or Path(rel).stem

    return {
        "id": asset_id,
        "kind": kind,
        "name": display_name,
        "fileName": file_path.name,
        "relativePath": rel,
        "url": f"{runtime_prefix}/{rel}",
        "transform": {
            **transform,
            "source": transform_source,
        },
        "metadata": metadata,
    }


def _build_texture_asset(file_path: Path, extracted_dir: Path, runtime_prefix: str) -> dict[str, Any]:
    rel = file_path.relative_to(extracted_dir).as_posix()
    return {
        "fileName": file_path.name,
        "relativePath": rel,
        "url": f"{runtime_prefix}/{rel}",
    }


def _lookup_metadata(file_path: Path, metadata_map: dict[str, dict[str, Any]]) -> dict[str, Any]:
    key = _normalize_token(file_path.name)
    return dict(metadata_map.get(key, {}))


def _choose_collision_meshes(meshes: list[dict[str, Any]]) -> dict[str, Any]:
    if not meshes:
        return {
            "mode": "fallback_bounds",
            "hasDedicatedCollision": False,
            "preferredMeshIds": [],
            "preferredMeshFiles": [],
        }

    def _matches(mesh: dict[str, Any], hints: tuple[str, ...]) -> bool:
        text = f"{mesh['fileName']} {mesh['name']}".lower()
        return any(hint in text for hint in hints)

    dedicated = [mesh for mesh in meshes if _matches(mesh, COLLIDER_HINTS)]
    if dedicated:
        chosen = dedicated
        mode = "dedicated"
        has_dedicated = True
    else:
        env = [
            mesh
            for mesh in meshes
            if _matches(mesh, ENVIRONMENT_HINTS) and not _matches(mesh, PROP_HINTS)
        ]
        if env:
            chosen = env
            mode = "environment_guess"
        else:
            chosen = meshes
            mode = "all_meshes"
        has_dedicated = False

    chosen_ids = {mesh["id"] for mesh in chosen}
    for mesh in meshes:
        mesh.setdefault("collision", {})
        mesh["collision"]["preferred"] = mesh["id"] in chosen_ids

    return {
        "mode": mode,
        "hasDedicatedCollision": has_dedicated,
        "preferredMeshIds": [mesh["id"] for mesh in chosen],
        "preferredMeshFiles": [mesh["relativePath"] for mesh in chosen],
    }


def _write_generated_scene_config_if_needed(
    *,
    extracted_dir: Path,
    manifest_path: Path | None,
    splats: list[dict[str, Any]],
    meshes: list[dict[str, Any]],
    warnings: list[str],
    unresolved_splats: list[str],
    unresolved_meshes: list[str],
) -> str | None:
    should_write = manifest_path is None or bool(unresolved_splats or unresolved_meshes)
    if not should_write:
        return None

    output_path = extracted_dir / "scene_config.generated.json"

    payload = {
        "generatedAt": datetime.now(UTC).isoformat(),
        "manifestFound": manifest_path is not None,
        "manifestPath": manifest_path.name if manifest_path else None,
        "notes": [
            "This file is generated by the Flask scene parser.",
            "Adjust transforms manually if manifest data was missing or ambiguous.",
        ],
        "warnings": warnings,
        "unresolved": {
            "splats": unresolved_splats,
            "meshes": unresolved_meshes,
        },
        "splats": [
            {
                "relativePath": asset["relativePath"],
                "transform": {
                    "translation": asset["transform"]["position"],
                    "rotation": asset["transform"]["rotationEulerDeg"],
                    "quaternion": asset["transform"]["quaternion"],
                    "scale": asset["transform"]["scale"],
                },
            }
            for asset in splats
        ],
        "meshes": [
            {
                "relativePath": asset["relativePath"],
                "transform": {
                    "translation": asset["transform"]["position"],
                    "rotation": asset["transform"]["rotationEulerDeg"],
                    "quaternion": asset["transform"]["quaternion"],
                    "scale": asset["transform"]["scale"],
                },
                "collisionPreferred": bool(asset.get("collision", {}).get("preferred", False)),
            }
            for asset in meshes
        ],
    }

    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return output_path.relative_to(extracted_dir).as_posix()
```


## scripts/sync_vendor.mjs

```
import { cp, mkdir, rm, access, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const nodeModules = path.join(projectRoot, 'node_modules');
const vendorRoot = path.join(projectRoot, 'static', 'vendor');

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(target) {
  await mkdir(target, { recursive: true });
}

async function copyRequired(src, dst) {
  if (!(await exists(src))) {
    throw new Error(`Missing required file for vendor sync: ${src}`);
  }
  await ensureDir(path.dirname(dst));
  await copyFile(src, dst);
}

async function copySpark(vendorSparkPath) {
  const candidates = [
    path.join(nodeModules, '@sparkjsdev', 'spark', 'spark.module.min.js'),
    path.join(nodeModules, '@sparkjsdev', 'spark', 'spark.module.js'),
    path.join(nodeModules, '@sparkjsdev', 'spark', 'dist', 'spark.module.min.js'),
    path.join(nodeModules, '@sparkjsdev', 'spark', 'dist', 'spark.module.js'),
    path.join(nodeModules, '@sparkjsdev', 'spark', 'build', 'spark.module.min.js'),
    path.join(nodeModules, '@sparkjsdev', 'spark', 'build', 'spark.module.js'),
  ];

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      await copyRequired(candidate, vendorSparkPath);
      return { copied: true, source: candidate };
    }
  }

  const fallback = [
    'throw new Error("Spark module was not found in node_modules.");',
    'throw new Error("Check @sparkjsdev/spark package contents and update scripts/sync_vendor.mjs.");',
    '',
  ].join('\n');

  await ensureDir(path.dirname(vendorSparkPath));
  await writeFile(vendorSparkPath, fallback, 'utf-8');
  return { copied: false, source: null };
}

async function main() {
  await rm(vendorRoot, { recursive: true, force: true });
  await ensureDir(vendorRoot);

  const threeSrc = path.join(nodeModules, 'three', 'build', 'three.module.js');
  const threeDst = path.join(vendorRoot, 'three', 'three.module.js');
  await copyRequired(threeSrc, threeDst);

  const examplesSrc = path.join(nodeModules, 'three', 'examples', 'jsm');
  const examplesDst = path.join(vendorRoot, 'three', 'examples', 'jsm');
  if (!(await exists(examplesSrc))) {
    throw new Error(`Missing three examples folder: ${examplesSrc}`);
  }
  await ensureDir(path.dirname(examplesDst));
  await cp(examplesSrc, examplesDst, { recursive: true, force: true });

  const bvhSrc = path.join(nodeModules, 'three-mesh-bvh', 'build', 'index.module.js');
  const bvhDst = path.join(vendorRoot, 'three-mesh-bvh', 'index.module.js');
  await copyRequired(bvhSrc, bvhDst);

  const sparkDst = path.join(vendorRoot, 'spark', 'spark.module.min.js');
  const sparkResult = await copySpark(sparkDst);

  console.log('[vendor:sync] copied three =>', threeDst);
  console.log('[vendor:sync] copied three examples =>', examplesDst);
  console.log('[vendor:sync] copied three-mesh-bvh =>', bvhDst);
  if (sparkResult.copied) {
    console.log('[vendor:sync] copied spark =>', sparkResult.source);
  } else {
    console.warn('[vendor:sync] spark module could not be auto-detected; placeholder emitted at', sparkDst);
  }
}

main().catch((error) => {
  console.error('[vendor:sync] failed', error);
  process.exitCode = 1;
});
```


## scripts/build_source_dump.py

```
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "FULL_SOURCE_DUMP.md"

FILES = [
    "requirements.txt",
    "package.json",
    ".env.example",
    ".gitignore",
    "run.py",
    "app/__init__.py",
    "app/config.py",
    "app/routes.py",
    "app/services/__init__.py",
    "app/services/extractor.py",
    "app/services/runtime_scene.py",
    "app/services/scene_parser.py",
    "scripts/sync_vendor.mjs",
    "scripts/build_source_dump.py",
    "templates/index.html",
    "static/css/app.css",
    "static/js/main.js",
    "static/js/app/utils.js",
    "static/js/app/interaction-registry.js",
    "static/js/app/ui-controller.js",
    "static/js/app/player-controller.js",
    "static/js/app/collision-system.js",
    "static/js/app/interaction-system.js",
    "static/js/app/webxr-app.js",
    "runtime/.gitkeep",
    "README.md",
]


parts: list[str] = ["# Full Source Dump\n"]

for rel in FILES:
    path = ROOT / rel
    parts.append(f"\n\n## {rel}\n\n```\n")
    if path.exists():
        parts.append(path.read_text(encoding="utf-8"))
        if not parts[-1].endswith("\n"):
            parts.append("\n")
    else:
        parts.append(f"[missing file: {rel}]\n")
    parts.append("```\n")

OUT.write_text("".join(parts), encoding="utf-8")
print(f"WROTE {OUT}")
```


## templates/index.html

```
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Marble WebXR Viewer</title>
    <link rel="stylesheet" href="{{ url_for('static', filename='css/app.css') }}" />
    <script type="importmap">
      {
        "imports": {
          "three": "/static/vendor/three/three.module.js",
          "three/addons/": "/static/vendor/three/examples/jsm/",
          "three-mesh-bvh": "/static/vendor/three-mesh-bvh/index.module.js"
        }
      }
    </script>
  </head>
  <body>
    <div id="app-root" class="app-root"></div>

    <div id="loading-overlay" class="loading-overlay">
      <div class="loading-card">
        <h1>Loading Marble Scene</h1>
        <p id="loading-text">Initializing...</p>
        <div class="progress-track">
          <div id="loading-progress" class="progress-fill"></div>
        </div>
      </div>
    </div>

    <div id="error-banner" class="error-banner hidden"></div>

    <aside class="hud-panel">
      <div class="hud-block">
        <h2>Controls</h2>
        <button id="pointer-lock-button" class="btn">Click to capture mouse look</button>
        <p class="hint">WASD move · Space jump · Shift sprint · Click objects to interact.</p>
      </div>

      <div class="hud-block">
        <h2>XR</h2>
        <div id="xr-button-container"></div>
        <p id="xr-status" class="hint">Checking XR support...</p>
      </div>

      <div class="hud-block">
        <h2>Quality</h2>
        <label>
          Preset
          <select id="quality-select">
            <option value="auto">auto</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </label>
        <label class="toggle-row">
          <input id="debug-collision-toggle" type="checkbox" />
          <span>Collision debug view</span>
        </label>
      </div>
    </aside>

    <aside id="interaction-panel" class="interaction-panel hidden">
      <h2 id="interaction-name">Object</h2>
      <pre id="interaction-meta"></pre>
    </aside>

    <section id="mobile-controls" class="mobile-controls hidden">
      <div class="sticks-row">
        <div id="left-stick-zone" class="stick-zone">
          <div id="left-stick-thumb" class="stick-thumb"></div>
        </div>

        <div id="right-stick-zone" class="stick-zone">
          <div id="right-stick-thumb" class="stick-thumb"></div>
        </div>
      </div>

      <div class="mobile-buttons">
        <button id="mobile-jump-button" class="btn">Jump</button>
        <button id="mobile-sprint-button" class="btn">Sprint</button>
      </div>
    </section>

    <script type="module" src="{{ url_for('static', filename='js/main.js') }}"></script>
  </body>
</html>
```


## static/css/app.css

```
:root {
  --bg: #050608;
  --bg-panel: rgba(15, 19, 27, 0.86);
  --text: #edf2ff;
  --muted: #9db2cf;
  --accent: #24d6a5;
  --accent-2: #37a0ff;
  --danger: #ff5f6f;
  --border: rgba(255, 255, 255, 0.16);
  --radius: 12px;
  --shadow: 0 10px 32px rgba(0, 0, 0, 0.4);
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: "Segoe UI", system-ui, sans-serif;
  color: var(--text);
  background:
    radial-gradient(circle at 20% 20%, rgba(29, 82, 118, 0.4), transparent 38%),
    radial-gradient(circle at 80% 30%, rgba(34, 118, 70, 0.36), transparent 42%),
    linear-gradient(155deg, #050608 10%, #0f1726 55%, #1a202b 100%);
}

.app-root {
  width: 100%;
  height: 100%;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}

.hidden {
  display: none !important;
}

.loading-overlay {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  z-index: 100;
  transition: opacity 220ms ease;
}

.loading-overlay.hidden {
  opacity: 0;
  pointer-events: none;
}

.loading-card {
  width: min(90vw, 420px);
  padding: 20px;
  border-radius: var(--radius);
  background: var(--bg-panel);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.loading-card h1 {
  margin: 0 0 6px;
  font-size: 1.15rem;
}

.loading-card p {
  margin: 0 0 14px;
  color: var(--muted);
}

.progress-track {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
  transition: width 180ms ease;
}

.error-banner {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  max-width: min(92vw, 760px);
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(134, 18, 36, 0.9);
  border: 1px solid rgba(255, 180, 193, 0.5);
  color: #fff;
  z-index: 90;
}

.hud-panel {
  position: fixed;
  top: 12px;
  left: 12px;
  width: min(320px, calc(100vw - 24px));
  display: grid;
  gap: 10px;
  z-index: 25;
}

.hud-block {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 10px;
}

.hud-block h2 {
  margin: 0 0 6px;
  font-size: 0.95rem;
}

.hint {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 0.83rem;
  line-height: 1.25;
}

.btn {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid rgba(37, 174, 255, 0.45);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(20, 55, 93, 0.85), rgba(17, 33, 51, 0.95));
  color: var(--text);
  cursor: pointer;
}

.btn:hover {
  filter: brightness(1.06);
}

label {
  display: grid;
  gap: 6px;
  font-size: 0.85rem;
  margin-top: 6px;
}

select {
  width: 100%;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: rgba(6, 9, 14, 0.88);
  color: var(--text);
  padding: 6px 8px;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.interaction-panel {
  position: fixed;
  right: 12px;
  top: 12px;
  width: min(360px, calc(100vw - 24px));
  max-height: min(50vh, 380px);
  overflow: auto;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 10px;
  z-index: 25;
}

.interaction-panel h2 {
  margin: 0 0 8px;
  font-size: 0.95rem;
}

.interaction-panel pre {
  margin: 0;
  padding: 8px;
  border-radius: 8px;
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.1);
  white-space: pre-wrap;
  word-break: break-word;
}

.mobile-controls {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 14px;
  z-index: 45;
  display: grid;
  gap: 10px;
}

.sticks-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stick-zone {
  width: 114px;
  height: 114px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(12, 16, 22, 0.4);
  position: relative;
  touch-action: none;
}

.stick-thumb {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  margin-left: -18px;
  margin-top: -18px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: rgba(51, 174, 240, 0.44);
  pointer-events: none;
}

.mobile-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.mobile-buttons .btn {
  width: auto;
  min-width: 100px;
}

@media (max-width: 900px) {
  .hud-panel {
    width: min(280px, calc(100vw - 20px));
  }

  .interaction-panel {
    top: auto;
    bottom: 140px;
    right: 10px;
  }
}
```


## static/js/main.js

```
import { WebXRApp } from './app/webxr-app.js';

function getRefs() {
  return {
    root: document.getElementById('app-root'),
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingProgress: document.getElementById('loading-progress'),
    loadingText: document.getElementById('loading-text'),
    errorBanner: document.getElementById('error-banner'),
    xrButtonContainer: document.getElementById('xr-button-container'),
    xrStatus: document.getElementById('xr-status'),
    pointerLockButton: document.getElementById('pointer-lock-button'),
    qualitySelect: document.getElementById('quality-select'),
    debugCollisionToggle: document.getElementById('debug-collision-toggle'),
    interactionPanel: document.getElementById('interaction-panel'),
    interactionName: document.getElementById('interaction-name'),
    interactionMeta: document.getElementById('interaction-meta'),
    mobileControls: document.getElementById('mobile-controls'),
    leftStickZone: document.getElementById('left-stick-zone'),
    leftStickThumb: document.getElementById('left-stick-thumb'),
    rightStickZone: document.getElementById('right-stick-zone'),
    rightStickThumb: document.getElementById('right-stick-thumb'),
    mobileJumpButton: document.getElementById('mobile-jump-button'),
    mobileSprintButton: document.getElementById('mobile-sprint-button'),
  };
}

async function bootstrap() {
  const refs = getRefs();
  const app = new WebXRApp({
    container: refs.root,
    refs,
  });

  await app.init();
}

bootstrap().catch((error) => {
  console.error('Boot error:', error);
});
```


## static/js/app/utils.js

```
import * as THREE from 'three';

export function applyAssetTransform(target, transform = {}) {
  const position = transform.position ?? [0, 0, 0];
  const scale = transform.scale ?? [1, 1, 1];

  target.position.set(position[0] ?? 0, position[1] ?? 0, position[2] ?? 0);
  target.scale.set(scale[0] ?? 1, scale[1] ?? 1, scale[2] ?? 1);

  if (transform.hasQuaternion && Array.isArray(transform.quaternion)) {
    target.quaternion.set(
      transform.quaternion[0] ?? 0,
      transform.quaternion[1] ?? 0,
      transform.quaternion[2] ?? 0,
      transform.quaternion[3] ?? 1,
    );
    return;
  }

  const rotationDeg = transform.rotationEulerDeg ?? [0, 0, 0];
  target.rotation.set(
    THREE.MathUtils.degToRad(rotationDeg[0] ?? 0),
    THREE.MathUtils.degToRad(rotationDeg[1] ?? 0),
    THREE.MathUtils.degToRad(rotationDeg[2] ?? 0),
  );
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function isMobileLikeDevice() {
  return window.matchMedia('(pointer: coarse)').matches || /android|iphone|ipad|mobile/i.test(navigator.userAgent);
}

export function normalize2D(x, y) {
  const len = Math.hypot(x, y);
  if (len <= 1e-6) {
    return { x: 0, y: 0 };
  }
  if (len <= 1) {
    return { x, y };
  }
  return { x: x / len, y: y / len };
}
```


## static/js/app/interaction-registry.js

```
export class InteractionRegistry {
  constructor() {
    this.handlers = new Map();
  }

  register(objectName, handler) {
    if (!objectName || typeof handler !== 'function') {
      return;
    }
    this.handlers.set(objectName.toLowerCase(), handler);
  }

  trigger(context) {
    const name = String(context?.name ?? '').toLowerCase();
    const direct = this.handlers.get(name);
    if (direct) {
      direct(context);
      return;
    }

    for (const [key, handler] of this.handlers.entries()) {
      if (name.includes(key)) {
        handler(context);
        return;
      }
    }

    console.log('[interaction] object clicked:', context?.name ?? '(unnamed)', context);
  }
}
```


## static/js/app/ui-controller.js

```
export class UiController {
  constructor(refs) {
    this.refs = refs;
    this.onPointerLockRequested = null;
    this.onQualityChanged = null;
    this.onDebugCollisionChanged = null;
  }

  bindHandlers({ onPointerLockRequested, onQualityChanged, onDebugCollisionChanged }) {
    this.onPointerLockRequested = onPointerLockRequested;
    this.onQualityChanged = onQualityChanged;
    this.onDebugCollisionChanged = onDebugCollisionChanged;

    this.refs.pointerLockButton?.addEventListener('click', () => {
      this.onPointerLockRequested?.();
    });

    this.refs.qualitySelect?.addEventListener('change', (event) => {
      const value = event.target.value;
      this.onQualityChanged?.(value);
    });

    this.refs.debugCollisionToggle?.addEventListener('change', (event) => {
      this.onDebugCollisionChanged?.(Boolean(event.target.checked));
    });
  }

  setLoadingProgress(progress, label) {
    const clamped = Math.max(0, Math.min(progress, 1));
    if (this.refs.loadingProgress) {
      this.refs.loadingProgress.style.width = `${Math.round(clamped * 100)}%`;
    }
    if (this.refs.loadingText && label) {
      this.refs.loadingText.textContent = label;
    }
  }

  completeLoading(message = 'Scene loaded.') {
    this.setLoadingProgress(1, message);
    window.setTimeout(() => {
      this.refs.loadingOverlay?.classList.add('hidden');
    }, 300);
  }

  showError(message) {
    if (!this.refs.errorBanner) {
      return;
    }
    this.refs.errorBanner.textContent = message;
    this.refs.errorBanner.classList.remove('hidden');
  }

  clearError() {
    this.refs.errorBanner?.classList.add('hidden');
  }

  setXrStatus(message) {
    if (this.refs.xrStatus) {
      this.refs.xrStatus.textContent = message;
    }
  }

  setPointerLockState(locked) {
    if (!this.refs.pointerLockButton) {
      return;
    }
    this.refs.pointerLockButton.textContent = locked
      ? 'Mouse captured (Esc to release)'
      : 'Click to capture mouse look';
  }

  setQuality(value) {
    if (this.refs.qualitySelect) {
      this.refs.qualitySelect.value = value;
    }
  }

  setDebugCollision(value) {
    if (this.refs.debugCollisionToggle) {
      this.refs.debugCollisionToggle.checked = value;
    }
  }

  setMobileControlsVisible(visible) {
    if (!this.refs.mobileControls) {
      return;
    }
    this.refs.mobileControls.classList.toggle('hidden', !visible);
  }

  showInteraction(context) {
    if (!this.refs.interactionPanel || !this.refs.interactionName || !this.refs.interactionMeta) {
      return;
    }

    this.refs.interactionName.textContent = context?.name ?? 'Unnamed object';
    const metadata = context?.metadata && Object.keys(context.metadata).length > 0
      ? JSON.stringify(context.metadata, null, 2)
      : '{\n  "info": "No metadata"\n}';

    this.refs.interactionMeta.textContent = metadata;
    this.refs.interactionPanel.classList.remove('hidden');
  }

  hideInteraction() {
    this.refs.interactionPanel?.classList.add('hidden');
  }
}
```


## static/js/app/player-controller.js

```
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

import { clamp, normalize2D } from './utils.js';

const UP = new THREE.Vector3(0, 1, 0);
const FORWARD = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const DESIRED_MOVE = new THREE.Vector3();

const KEY_MAP = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

export class PlayerController {
  constructor({ camera, rig, renderer, uiController, playerConfig, mobileRefs, mobileMode }) {
    this.camera = camera;
    this.rig = rig;
    this.renderer = renderer;
    this.uiController = uiController;
    this.mobileMode = Boolean(mobileMode);

    this.settings = {
      height: Number(playerConfig.height ?? 1.72),
      radius: Number(playerConfig.radius ?? 0.35),
      gravity: Number(playerConfig.gravity ?? 22.0),
      jumpStrength: Number(playerConfig.jump_strength ?? 8.3),
      moveSpeed: Number(playerConfig.move_speed ?? 4.0),
      sprintSpeed: Number(playerConfig.sprint_speed ?? 6.5),
    };

    this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
    this.velocity = new THREE.Vector3();

    this.input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jumpQueued: false,
    };

    this.isGrounded = false;

    this.mobileInput = {
      move: { x: 0, y: 0 },
      look: { x: 0, y: 0 },
      sprint: false,
      jumpQueued: false,
    };

    this.xrInput = {
      x: 0,
      z: 0,
    };

    this.mobilePad = this._createMobilePadState(mobileRefs);

    this._bindDesktopInput();
    this._bindPointerLock();
    this._bindMobileInput();

    this.camera.rotation.order = 'YXZ';
    this.camera.position.set(0, this.settings.height, 0);
  }

  _createMobilePadState(mobileRefs = {}) {
    return {
      left: {
        zone: mobileRefs.leftStickZone ?? null,
        thumb: mobileRefs.leftStickThumb ?? null,
        active: false,
        pointerId: null,
        centerX: 0,
        centerY: 0,
        radius: 1,
      },
      right: {
        zone: mobileRefs.rightStickZone ?? null,
        thumb: mobileRefs.rightStickThumb ?? null,
        active: false,
        pointerId: null,
        centerX: 0,
        centerY: 0,
        radius: 1,
      },
      jumpButton: mobileRefs.mobileJumpButton ?? null,
      sprintButton: mobileRefs.mobileSprintButton ?? null,
    };
  }

  _bindDesktopInput() {
    window.addEventListener('keydown', (event) => {
      const mapped = KEY_MAP[event.code];
      if (mapped) {
        this.input[mapped] = true;
      }

      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        this.input.sprint = true;
      }

      if (event.code === 'Space') {
        this.input.jumpQueued = true;
      }
    });

    window.addEventListener('keyup', (event) => {
      const mapped = KEY_MAP[event.code];
      if (mapped) {
        this.input[mapped] = false;
      }

      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        this.input.sprint = false;
      }
    });
  }

  _bindPointerLock() {
    this.controls.addEventListener('lock', () => {
      this.uiController?.setPointerLockState(true);
    });

    this.controls.addEventListener('unlock', () => {
      this.uiController?.setPointerLockState(false);
    });

    this.uiController?.setPointerLockState(false);
  }

  _bindMobileInput() {
    const bindPad = (padKey, targetVector) => {
      const pad = this.mobilePad[padKey];
      if (!pad.zone) {
        return;
      }

      const onPointerDown = (event) => {
        if (!this.mobileMode || pad.active) {
          return;
        }

        pad.active = true;
        pad.pointerId = event.pointerId;

        const rect = pad.zone.getBoundingClientRect();
        pad.centerX = rect.left + rect.width / 2;
        pad.centerY = rect.top + rect.height / 2;
        pad.radius = Math.max(20, Math.min(rect.width, rect.height) * 0.45);

        pad.zone.setPointerCapture(event.pointerId);
        this._updatePadVector(pad, targetVector, event.clientX, event.clientY);
      };

      const onPointerMove = (event) => {
        if (!pad.active || event.pointerId !== pad.pointerId) {
          return;
        }
        this._updatePadVector(pad, targetVector, event.clientX, event.clientY);
      };

      const onPointerUp = (event) => {
        if (!pad.active || event.pointerId !== pad.pointerId) {
          return;
        }
        pad.active = false;
        pad.pointerId = null;
        targetVector.x = 0;
        targetVector.y = 0;
        this._moveThumb(pad.thumb, 0, 0);
      };

      pad.zone.addEventListener('pointerdown', onPointerDown);
      pad.zone.addEventListener('pointermove', onPointerMove);
      pad.zone.addEventListener('pointerup', onPointerUp);
      pad.zone.addEventListener('pointercancel', onPointerUp);
    };

    bindPad('left', this.mobileInput.move);
    bindPad('right', this.mobileInput.look);

    const jumpButton = this.mobilePad.jumpButton;
    if (jumpButton) {
      jumpButton.addEventListener('pointerdown', () => {
        if (!this.mobileMode) {
          return;
        }
        this.mobileInput.jumpQueued = true;
      });
    }

    const sprintButton = this.mobilePad.sprintButton;
    if (sprintButton) {
      sprintButton.addEventListener('pointerdown', () => {
        if (!this.mobileMode) {
          return;
        }
        this.mobileInput.sprint = true;
      });
      const clearSprint = () => {
        this.mobileInput.sprint = false;
      };
      sprintButton.addEventListener('pointerup', clearSprint);
      sprintButton.addEventListener('pointercancel', clearSprint);
      sprintButton.addEventListener('pointerleave', clearSprint);
    }
  }

  _updatePadVector(pad, target, x, y) {
    const dx = x - pad.centerX;
    const dy = y - pad.centerY;
    const normalized = normalize2D(dx / pad.radius, dy / pad.radius);

    target.x = normalized.x;
    target.y = normalized.y;

    this._moveThumb(
      pad.thumb,
      normalized.x * pad.radius,
      normalized.y * pad.radius,
    );
  }

  _moveThumb(thumb, x, y) {
    if (!thumb) {
      return;
    }
    thumb.style.transform = `translate(${x}px, ${y}px)`;
  }

  setMobileMode(enabled) {
    this.mobileMode = Boolean(enabled);
    if (!this.mobileMode) {
      this.mobileInput.move.x = 0;
      this.mobileInput.move.y = 0;
      this.mobileInput.look.x = 0;
      this.mobileInput.look.y = 0;
      this.mobileInput.sprint = false;
      this.mobileInput.jumpQueued = false;
    }
  }

  requestPointerLock() {
    if (!this.mobileMode) {
      this.controls.lock();
    }
  }

  setFeetPosition(position) {
    this.rig.position.copy(position);
  }

  _readXrMoveAxes() {
    this.xrInput.x = 0;
    this.xrInput.z = 0;

    if (!this.renderer.xr.isPresenting) {
      return;
    }

    const session = this.renderer.xr.getSession();
    if (!session) {
      return;
    }

    for (const source of session.inputSources) {
      const gamepad = source.gamepad;
      if (!gamepad || gamepad.axes.length === 0) {
        continue;
      }

      const axes = gamepad.axes;
      let x = 0;
      let y = 0;

      if (axes.length >= 4) {
        x = axes[2];
        y = axes[3];
      } else if (axes.length >= 2) {
        x = axes[0];
        y = axes[1];
      }

      if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
        this.xrInput.x = x;
        this.xrInput.z = y;
        return;
      }
    }
  }

  update(deltaSeconds, collisionSystem) {
    this._readXrMoveAxes();

    if (!this.renderer.xr.isPresenting) {
      this.camera.position.x = 0;
      this.camera.position.z = 0;
      this.camera.position.y = this.settings.height;
    }

    if (this.mobileMode) {
      this._applyMobileLook(deltaSeconds);
    }

    const moveInput = this._collectMoveInput();
    const speed = this._isSprinting() ? this.settings.sprintSpeed : this.settings.moveSpeed;

    this._computeMoveDirection(moveInput.x, moveInput.z);
    if (DESIRED_MOVE.lengthSq() > 0) {
      DESIRED_MOVE.normalize().multiplyScalar(speed);
      this.velocity.x = DESIRED_MOVE.x;
      this.velocity.z = DESIRED_MOVE.z;
    } else {
      const damping = Math.exp(-12.0 * deltaSeconds);
      this.velocity.x *= damping;
      this.velocity.z *= damping;
    }

    if ((this.input.jumpQueued || this.mobileInput.jumpQueued) && this.isGrounded) {
      this.velocity.y = this.settings.jumpStrength;
      this.isGrounded = false;
    }
    this.input.jumpQueued = false;
    this.mobileInput.jumpQueued = false;

    this.velocity.y -= this.settings.gravity * deltaSeconds;

    this.rig.position.addScaledVector(this.velocity, deltaSeconds);

    const collisionResult = collisionSystem.resolveCapsule({
      feetPosition: this.rig.position,
      capsuleHeight: this.settings.height,
      capsuleRadius: this.settings.radius,
      velocity: this.velocity,
      deltaSeconds,
    });

    this.rig.position.copy(collisionResult.position);
    this.isGrounded = collisionResult.grounded;

    if (this.isGrounded && this.velocity.y < 0) {
      this.velocity.y = 0;
    }
  }

  _applyMobileLook(deltaSeconds) {
    const lookX = this.mobileInput.look.x;
    const lookY = this.mobileInput.look.y;
    if (Math.abs(lookX) < 0.001 && Math.abs(lookY) < 0.001) {
      return;
    }

    const sensitivity = 2.0;
    this.camera.rotation.y -= lookX * sensitivity * deltaSeconds;
    this.camera.rotation.x = clamp(
      this.camera.rotation.x - lookY * sensitivity * deltaSeconds,
      -Math.PI * 0.495,
      Math.PI * 0.495,
    );
  }

  _collectMoveInput() {
    let x = 0;
    let z = 0;

    if (this.input.forward) z += 1;
    if (this.input.backward) z -= 1;
    if (this.input.left) x -= 1;
    if (this.input.right) x += 1;

    if (this.mobileMode) {
      x += this.mobileInput.move.x;
      z += -this.mobileInput.move.y;
    }

    if (this.renderer.xr.isPresenting) {
      x += this.xrInput.x;
      z += -this.xrInput.z;
    }

    const normalized = normalize2D(x, z);
    return { x: normalized.x, z: normalized.y };
  }

  _computeMoveDirection(moveX, moveZ) {
    FORWARD.set(0, 0, -1).applyQuaternion(this.camera.getWorldQuaternion(new THREE.Quaternion()));
    FORWARD.y = 0;
    if (FORWARD.lengthSq() < 1e-6) {
      FORWARD.set(0, 0, -1);
    }
    FORWARD.normalize();

    RIGHT.crossVectors(FORWARD, UP).normalize().negate();

    DESIRED_MOVE.set(0, 0, 0);
    DESIRED_MOVE.addScaledVector(RIGHT, moveX);
    DESIRED_MOVE.addScaledVector(FORWARD, moveZ);
  }

  _isSprinting() {
    return this.input.sprint || this.mobileInput.sprint;
  }
}
```


## static/js/app/collision-system.js

```
import * as THREE from 'three';
import {
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree,
} from 'three-mesh-bvh';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const UP = new THREE.Vector3(0, 1, 0);

export class CollisionSystem {
  constructor({ scene, debugEnabled = false }) {
    this.scene = scene;
    this.debugEnabled = Boolean(debugEnabled);

    this.colliders = [];
    this.fallbackBounds = new THREE.Box3(
      new THREE.Vector3(-8, 0, -8),
      new THREE.Vector3(8, 4, 8),
    );

    this.debugGroup = new THREE.Group();
    this.debugGroup.name = 'collision-debug';
    this.scene.add(this.debugGroup);

    this.debugColliderGroup = new THREE.Group();
    this.debugContactGroup = new THREE.Group();
    this.debugGroup.add(this.debugColliderGroup, this.debugContactGroup);

    this.capsuleLine = this._makeCapsuleLine();
    this.debugGroup.add(this.capsuleLine);

    this.worldBoundsHelper = new THREE.Box3Helper(this.fallbackBounds.clone(), 0x39ffb2);
    this.debugGroup.add(this.worldBoundsHelper);

    this.setDebugEnabled(this.debugEnabled);

    this._tempInverse = new THREE.Matrix4();
    this._tempSegment = new THREE.Line3(new THREE.Vector3(), new THREE.Vector3());
    this._tempBox = new THREE.Box3();

    this._tempStartWorld = new THREE.Vector3();
    this._tempEndWorld = new THREE.Vector3();
    this._tempOriginalFeet = new THREE.Vector3();
    this._tempCorrectedFeet = new THREE.Vector3();
    this._tempDelta = new THREE.Vector3();

    this._triPoint = new THREE.Vector3();
    this._capsulePoint = new THREE.Vector3();
    this._pushDirection = new THREE.Vector3();

    this._result = {
      position: new THREE.Vector3(),
      grounded: false,
      collisions: 0,
    };
  }

  setDebugEnabled(enabled) {
    this.debugEnabled = Boolean(enabled);
    this.debugGroup.visible = this.debugEnabled;
  }

  setFallbackBounds(box) {
    if (box && box.isBox3 && !box.isEmpty()) {
      this.fallbackBounds.copy(box);
      this.worldBoundsHelper.box.copy(this.fallbackBounds);
    }
  }

  /**
   * Build collider meshes from GLB mesh entries. Tries a merged static collider first,
   * and falls back to separate colliders if merge is not possible.
   */
  buildFromMeshes(meshEntries = []) {
    this._clearColliders();

    const transformedGeometries = [];
    const worldBounds = new THREE.Box3();

    for (const entry of meshEntries) {
      const root = entry?.root;
      if (!root) {
        continue;
      }

      root.updateMatrixWorld(true);
      root.traverse((child) => {
        if (!child.isMesh || !child.geometry?.attributes?.position) {
          return;
        }

        const cloned = child.geometry.clone();
        cloned.applyMatrix4(child.matrixWorld);
        cloned.computeBoundingBox();

        if (cloned.boundingBox) {
          worldBounds.union(cloned.boundingBox);
        }

        transformedGeometries.push(cloned);
      });
    }

    let merged = null;
    if (transformedGeometries.length === 1) {
      merged = transformedGeometries[0];
    } else if (transformedGeometries.length > 1) {
      merged = mergeGeometries(transformedGeometries, false);
    }

    if (merged) {
      this._addColliderGeometry(merged);
    } else {
      for (const geometry of transformedGeometries) {
        this._addColliderGeometry(geometry);
      }
    }

    if (!worldBounds.isEmpty()) {
      worldBounds.expandByScalar(0.5);
      if (worldBounds.max.y <= worldBounds.min.y + 0.01) {
        worldBounds.max.y = worldBounds.min.y + 4.0;
      }
      this.setFallbackBounds(worldBounds);
    }

    this._rebuildDebugMeshes();

    return {
      colliderCount: this.colliders.length,
      merged: Boolean(merged),
    };
  }

  resolveCapsule({ feetPosition, capsuleHeight, capsuleRadius, velocity, deltaSeconds }) {
    const radius = Math.max(0.05, Number(capsuleRadius));
    const topOffset = Math.max(radius + 0.05, Number(capsuleHeight) - radius);

    this._tempOriginalFeet.copy(feetPosition);
    this._tempStartWorld.copy(feetPosition).addScaledVector(UP, radius);
    this._tempEndWorld.copy(feetPosition).addScaledVector(UP, topOffset);

    let collisions = 0;
    this._clearContactDebug();

    for (const collider of this.colliders) {
      if (!collider.geometry.boundsTree) {
        continue;
      }

      this._tempInverse.copy(collider.matrixWorld).invert();

      this._tempSegment.start.copy(this._tempStartWorld).applyMatrix4(this._tempInverse);
      this._tempSegment.end.copy(this._tempEndWorld).applyMatrix4(this._tempInverse);

      this._tempBox.makeEmpty();
      this._tempBox.expandByPoint(this._tempSegment.start);
      this._tempBox.expandByPoint(this._tempSegment.end);
      this._tempBox.min.addScalar(-radius);
      this._tempBox.max.addScalar(radius);

      const segment = this._tempSegment;

      collider.geometry.boundsTree.shapecast({
        intersectsBounds: (box) => box.intersectsBox(this._tempBox),
        intersectsTriangle: (tri) => {
          const distance = tri.closestPointToSegment(
            segment,
            this._triPoint,
            this._capsulePoint,
          );

          if (distance >= radius) {
            return;
          }

          collisions += 1;

          const depth = radius - distance;
          this._pushDirection.subVectors(this._capsulePoint, this._triPoint);

          if (this._pushDirection.lengthSq() <= 1e-10) {
            tri.getNormal(this._pushDirection);
          } else {
            this._pushDirection.normalize();
          }

          segment.start.addScaledVector(this._pushDirection, depth);
          segment.end.addScaledVector(this._pushDirection, depth);

          if (this.debugEnabled) {
            const point = this._capsulePoint.clone().applyMatrix4(collider.matrixWorld);
            const normal = this._pushDirection.clone().transformDirection(collider.matrixWorld);
            this._addContactDebug(point, normal);
          }
        },
      });

      this._tempStartWorld.copy(segment.start).applyMatrix4(collider.matrixWorld);
      this._tempEndWorld.copy(segment.end).applyMatrix4(collider.matrixWorld);
    }

    this._tempCorrectedFeet.copy(this._tempStartWorld).addScaledVector(UP, -radius);

    const minX = this.fallbackBounds.min.x + radius;
    const maxX = this.fallbackBounds.max.x - radius;
    const minZ = this.fallbackBounds.min.z + radius;
    const maxZ = this.fallbackBounds.max.z - radius;

    if (Number.isFinite(minX) && Number.isFinite(maxX)) {
      this._tempCorrectedFeet.x = THREE.MathUtils.clamp(this._tempCorrectedFeet.x, minX, maxX);
    }
    if (Number.isFinite(minZ) && Number.isFinite(maxZ)) {
      this._tempCorrectedFeet.z = THREE.MathUtils.clamp(this._tempCorrectedFeet.z, minZ, maxZ);
    }

    const floorY = this.fallbackBounds.min.y;
    if (Number.isFinite(floorY) && this._tempCorrectedFeet.y < floorY) {
      this._tempCorrectedFeet.y = floorY;
    }

    this._tempDelta.subVectors(this._tempCorrectedFeet, this._tempOriginalFeet);

    const groundedFromPush =
      this._tempDelta.y > Math.max(0, Math.abs(Number(velocity.y) * Number(deltaSeconds)) * 0.2);
    const groundedFromFloor =
      Number.isFinite(floorY) &&
      Math.abs(this._tempCorrectedFeet.y - floorY) <= 1e-4 &&
      Number(velocity.y) <= 0;

    const grounded = groundedFromPush || groundedFromFloor;

    this._result.position.copy(this._tempCorrectedFeet);
    this._result.grounded = grounded;
    this._result.collisions = collisions;

    if (this.debugEnabled) {
      this._updateCapsuleDebug(this._tempCorrectedFeet, radius, topOffset);
      this.worldBoundsHelper.box.copy(this.fallbackBounds);
    }

    return this._result;
  }

  _addColliderGeometry(geometry) {
    if (!geometry?.attributes?.position) {
      return;
    }

    geometry.computeBoundingBox();
    geometry.computeVertexNormals();
    geometry.boundsTree = geometry.boundsTree ?? null;
    if (!geometry.boundsTree) {
      geometry.computeBoundsTree();
    }

    const collider = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    collider.matrixAutoUpdate = false;
    collider.updateMatrix();
    collider.updateMatrixWorld(true);

    this.colliders.push(collider);
  }

  _clearColliders() {
    for (const collider of this.colliders) {
      if (collider.geometry?.disposeBoundsTree) {
        collider.geometry.disposeBoundsTree();
      }
      collider.geometry?.dispose();
      collider.material?.dispose?.();
    }
    this.colliders = [];
  }

  _rebuildDebugMeshes() {
    while (this.debugColliderGroup.children.length > 0) {
      const child = this.debugColliderGroup.children.pop();
      if (child.geometry) {
        child.geometry.dispose?.();
      }
      child.material?.dispose?.();
    }

    for (const collider of this.colliders) {
      const wire = new THREE.Mesh(
        collider.geometry.clone(),
        new THREE.MeshBasicMaterial({
          color: 0x2cf7b2,
          wireframe: true,
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
        }),
      );
      this.debugColliderGroup.add(wire);
    }
  }

  _makeCapsuleLine() {
    const points = [new THREE.Vector3(), new THREE.Vector3(0, 1, 0)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xffbb33 });
    return new THREE.Line(geometry, material);
  }

  _updateCapsuleDebug(feetPosition, radius, topOffset) {
    const start = new THREE.Vector3().copy(feetPosition).addScaledVector(UP, radius);
    const end = new THREE.Vector3().copy(feetPosition).addScaledVector(UP, topOffset);
    this.capsuleLine.geometry.setFromPoints([start, end]);
  }

  _clearContactDebug() {
    while (this.debugContactGroup.children.length > 0) {
      const child = this.debugContactGroup.children.pop();
      child.geometry?.dispose?.();
      child.material?.dispose?.();
    }
  }

  _addContactDebug(point, normal) {
    if (!this.debugEnabled) {
      return;
    }

    if (this.debugContactGroup.children.length >= 12) {
      return;
    }

    const end = point.clone().addScaledVector(normal, 0.35);
    const geometry = new THREE.BufferGeometry().setFromPoints([point, end]);
    const material = new THREE.LineBasicMaterial({ color: 0xff4a4a });
    const line = new THREE.Line(geometry, material);
    this.debugContactGroup.add(line);
  }
}
```


## static/js/app/interaction-system.js

```
import * as THREE from 'three';

export class InteractionSystem {
  constructor({
    camera,
    renderer,
    domElement,
    uiController,
    registry,
    getPickables,
    pointerLockControls,
  }) {
    this.camera = camera;
    this.renderer = renderer;
    this.domElement = domElement;
    this.uiController = uiController;
    this.registry = registry;
    this.getPickables = getPickables;
    this.pointerLockControls = pointerLockControls;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.firstHitOnly = true;

    this.pointer = new THREE.Vector2();
    this.selected = null;

    this._boundClick = this._onClick.bind(this);
    this._boundTouchEnd = this._onTouchEnd.bind(this);

    this.domElement.addEventListener('click', this._boundClick);
    this.domElement.addEventListener('touchend', this._boundTouchEnd, { passive: true });
  }

  dispose() {
    this.domElement.removeEventListener('click', this._boundClick);
    this.domElement.removeEventListener('touchend', this._boundTouchEnd);
    this._clearHighlight();
  }

  _onClick(event) {
    this._pickFromEvent(event);
  }

  _onTouchEnd(event) {
    const touch = event.changedTouches?.[0];
    if (!touch) {
      this._pickAtCenter();
      return;
    }

    this._pickNormalized(
      (touch.clientX / window.innerWidth) * 2 - 1,
      -(touch.clientY / window.innerHeight) * 2 + 1,
    );
  }

  _pickFromEvent(event) {
    const locked = Boolean(this.pointerLockControls?.isLocked);
    if (locked) {
      this._pickAtCenter();
      return;
    }

    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -(event.clientY / window.innerHeight) * 2 + 1;
    this._pickNormalized(x, y);
  }

  _pickAtCenter() {
    this._pickNormalized(0, 0);
  }

  _pickNormalized(x, y) {
    this.pointer.set(x, y);

    const pickables = this.getPickables?.() ?? [];
    if (pickables.length === 0) {
      return;
    }

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(pickables, false);

    if (hits.length === 0) {
      this.uiController?.hideInteraction();
      this._clearHighlight();
      return;
    }

    const hit = hits[0];
    const mesh = hit.object;

    this._highlight(mesh);

    const interactionData = mesh.userData.interaction ?? {};
    const context = {
      name:
        interactionData.name ||
        mesh.name ||
        mesh.parent?.name ||
        'Unnamed object',
      metadata: interactionData.metadata ?? {},
      object: mesh,
      point: hit.point.clone(),
      distance: hit.distance,
      assetId: interactionData.assetId ?? null,
    };

    this.uiController?.showInteraction(context);
    this.registry?.trigger(context);
  }

  _highlight(mesh) {
    this._clearHighlight();

    if (!mesh?.material) {
      return;
    }

    const originalMaterial = mesh.material;
    const clonedMaterial = Array.isArray(originalMaterial)
      ? originalMaterial.map((mat) => this._cloneHighlighted(mat))
      : this._cloneHighlighted(originalMaterial);

    mesh.material = clonedMaterial;

    this.selected = {
      mesh,
      originalMaterial,
      highlightedMaterial: clonedMaterial,
    };
  }

  _cloneHighlighted(material) {
    const cloned = material.clone();

    if ('emissive' in cloned && cloned.emissive?.isColor) {
      cloned.emissive = new THREE.Color(0x1dd3ff);
      cloned.emissiveIntensity = Math.max(0.45, cloned.emissiveIntensity ?? 0);
      return cloned;
    }

    if ('color' in cloned && cloned.color?.isColor) {
      cloned.color = cloned.color.clone();
      cloned.color.offsetHSL(0, 0, 0.16);
    }

    return cloned;
  }

  _clearHighlight() {
    if (!this.selected) {
      return;
    }

    const { mesh, originalMaterial, highlightedMaterial } = this.selected;
    mesh.material = originalMaterial;

    if (Array.isArray(highlightedMaterial)) {
      highlightedMaterial.forEach((material) => material.dispose?.());
    } else {
      highlightedMaterial.dispose?.();
    }

    this.selected = null;
  }
}
```


## static/js/app/webxr-app.js

```
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

import { CollisionSystem } from './collision-system.js';
import { InteractionRegistry } from './interaction-registry.js';
import { InteractionSystem } from './interaction-system.js';
import { PlayerController } from './player-controller.js';
import { UiController } from './ui-controller.js';
import { applyAssetTransform, isMobileLikeDevice } from './utils.js';

const DEFAULT_BG = 0x0f1114;
const QUALITY_PRESETS = {
  auto: {
    pixelRatio: () => Math.min(window.devicePixelRatio || 1, isMobileLikeDevice() ? 1.2 : 1.6),
    splatLodScale: 1.0,
  },
  low: {
    pixelRatio: () => 0.9,
    splatLodScale: 1.35,
  },
  medium: {
    pixelRatio: () => Math.min(window.devicePixelRatio || 1, 1.25),
    splatLodScale: 1.0,
  },
  high: {
    pixelRatio: () => Math.min(window.devicePixelRatio || 1, 2.0),
    splatLodScale: 0.75,
  },
};

export class WebXRApp {
  constructor({ container, refs }) {
    this.container = container;
    this.refs = refs;

    this.metadata = null;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(DEFAULT_BG);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 3000);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.xr.enabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.clock = new THREE.Clock();

    this.playerRig = new THREE.Group();
    this.playerRig.name = 'player-rig';
    this.playerRig.add(this.camera);
    this.scene.add(this.playerRig);

    this.loadingManager = new THREE.LoadingManager();
    this.gltfLoader = new GLTFLoader(this.loadingManager);

    this.meshEntries = [];
    this.splatEntries = [];
    this.pickableMeshes = [];

    this.sparkRenderer = null;
    this.SplatMeshCtor = null;

    this.interactionRegistry = new InteractionRegistry();

    this.uiController = new UiController(this.refs);
    this.mobileMode = isMobileLikeDevice();

    this.playerController = null;
    this.collisionSystem = null;
    this.interactionSystem = null;

    this.boundResize = this.onResize.bind(this);
  }

  async init() {
    try {
      this.container.appendChild(this.renderer.domElement);

      this._setupUi();
      this._setupLights();
      this._setupXrUi();
      this._registerInteractions();

      this.uiController.setLoadingProgress(0.05, 'Fetching scene metadata...');
      this.metadata = await this._fetchMetadata();

      this.uiController.clearError();
      this.uiController.setDebugCollision(Boolean(this.metadata.debug?.collision));

      const quality = this.metadata.quality?.default ?? 'auto';
      this.uiController.setQuality(quality);
      this.applyQuality(quality);

      await this._loadSparkRuntime();
      await this._loadSceneAssets();
      this._setupGameplaySystems();

      this.uiController.completeLoading('Scene ready.');

      window.addEventListener('resize', this.boundResize);
      this.onResize();

      this.renderer.setAnimationLoop(this._animate.bind(this));
    } catch (error) {
      console.error('[startup] failed', error);
      this.uiController.showError(`Startup failed: ${error?.message ?? error}`);
      this.uiController.setLoadingProgress(1, 'Failed to start scene. Check console.');
      throw error;
    }
  }

  _setupUi() {
    this.uiController.bindHandlers({
      onPointerLockRequested: () => this.playerController?.requestPointerLock(),
      onQualityChanged: (quality) => this.applyQuality(quality),
      onDebugCollisionChanged: (enabled) => this.collisionSystem?.setDebugEnabled(enabled),
    });

    this.uiController.setMobileControlsVisible(this.mobileMode);
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.72);
    const key = new THREE.DirectionalLight(0xffffff, 0.45);
    key.position.set(5, 8, 5);
    this.scene.add(hemi, key);
  }

  _setupXrUi() {
    const button = VRButton.createButton(this.renderer, {
      optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
    });
    this.refs.xrButtonContainer?.appendChild(button);

    if (!navigator.xr) {
      this.uiController.setXrStatus('WebXR not available in this browser.');
      return;
    }

    navigator.xr
      .isSessionSupported('immersive-vr')
      .then((supported) => {
        this.uiController.setXrStatus(supported ? 'WebXR supported.' : 'WebXR unsupported on this device.');
      })
      .catch(() => {
        this.uiController.setXrStatus('WebXR capability check failed.');
      });

    this.renderer.xr.addEventListener('sessionstart', () => {
      this.uiController.setXrStatus('XR session started.');
    });
    this.renderer.xr.addEventListener('sessionend', () => {
      this.uiController.setXrStatus('XR session ended.');
    });
  }

  _registerInteractions() {
    this.interactionRegistry.register('door', (context) => {
      console.log('[interaction] door selected', context);
    });

    this.interactionRegistry.register('altar', (context) => {
      console.log('[interaction] altar selected', context);
    });
  }

  async _fetchMetadata() {
    const response = await fetch('/api/scene', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Could not load /api/scene (${response.status})`);
    }
    return response.json();
  }

  async _loadSparkRuntime() {
    const sparkUrl = this.metadata.scene?.source?.sparkModuleUrl;
    if (!sparkUrl) {
      console.warn('[spark] no module URL in metadata; splats may fail to load');
      return;
    }

    this.uiController.setLoadingProgress(0.1, 'Loading Spark runtime...');

    try {
      const spark = await import(sparkUrl);
      this.SplatMeshCtor = spark.SplatMesh;

      if (spark.SparkRenderer) {
        this.sparkRenderer = new spark.SparkRenderer({
          renderer: this.renderer,
          maxStdDev: Math.sqrt(5),
        });
        this.sparkRenderer.name = 'spark-renderer';
        this.scene.add(this.sparkRenderer);
      }
    } catch (error) {
      console.warn('[spark] failed to load Spark module', error);
      this.uiController.showError(
        'Spark module failed to load. GLB meshes will still render, but splats may be missing.',
      );
    }
  }

  async _loadSceneAssets() {
    const splatAssets = this.metadata.scene?.assets?.splats ?? [];
    const meshAssets = this.metadata.scene?.assets?.meshes ?? [];

    const total = splatAssets.length + meshAssets.length;
    let done = 0;

    const updateProgress = (label) => {
      const ratio = total > 0 ? done / total : 1;
      const from = 0.15;
      const to = 0.92;
      this.uiController.setLoadingProgress(from + (to - from) * ratio, label);
    };

    updateProgress('Loading scene assets...');

    for (const splat of splatAssets) {
      await this._loadSingleSplat(splat);
      done += 1;
      updateProgress(`Loaded splat ${done}/${total}`);
    }

    for (const mesh of meshAssets) {
      await this._loadSingleMesh(mesh);
      done += 1;
      updateProgress(`Loaded mesh ${done}/${total}`);
    }

    if (this.meshEntries.length === 0 && this.splatEntries.length === 0) {
      throw new Error('No renderable assets were loaded from metadata.');
    }
  }

  async _loadSingleSplat(asset) {
    if (!this.SplatMeshCtor) {
      console.warn('[splat] Spark not available; skipping', asset.relativePath);
      return;
    }

    try {
      const splatObject = new this.SplatMeshCtor({
        url: asset.url,
        lod: true,
      });
      splatObject.name = asset.name || asset.fileName;
      applyAssetTransform(splatObject, asset.transform);
      this.scene.add(splatObject);

      this.splatEntries.push({
        asset,
        object: splatObject,
      });
    } catch (error) {
      console.warn(`[splat] failed to load ${asset.relativePath}`, error);
    }
  }

  async _loadSingleMesh(asset) {
    try {
      const gltf = await this.gltfLoader.loadAsync(asset.url);
      const root = gltf.scene;
      root.name = asset.name || asset.fileName;

      applyAssetTransform(root, asset.transform);
      root.updateMatrixWorld(true);

      root.traverse((child) => {
        if (!child.isMesh) {
          return;
        }

        child.castShadow = false;
        child.receiveShadow = true;
        child.frustumCulled = true;

        child.userData.interaction = {
          assetId: asset.id,
          name: child.name || root.name || asset.fileName,
          metadata: {
            fileName: asset.fileName,
            relativePath: asset.relativePath,
            ...asset.metadata,
          },
        };

        this.pickableMeshes.push(child);
      });

      this.scene.add(root);
      this.meshEntries.push({
        asset,
        root,
      });
    } catch (error) {
      console.warn(`[mesh] failed to load ${asset.relativePath}`, error);
    }
  }

  _setupGameplaySystems() {
    this.collisionSystem = new CollisionSystem({
      scene: this.scene,
      debugEnabled: Boolean(this.metadata.debug?.collision),
    });

    const preferredCollisionIds = new Set(this.metadata.scene?.collision?.preferredMeshIds ?? []);
    const collisionEntries = this.meshEntries.filter((entry) => preferredCollisionIds.has(entry.asset.id));

    const chosenEntries = collisionEntries.length > 0 ? collisionEntries : this.meshEntries;
    const collisionSummary = this.collisionSystem.buildFromMeshes(chosenEntries);

    if (collisionSummary.colliderCount === 0) {
      const fallbackBounds = this._computeWorldBounds();
      this.collisionSystem.setFallbackBounds(fallbackBounds);
    } else {
      const worldBounds = this._computeWorldBounds();
      this.collisionSystem.setFallbackBounds(worldBounds);
    }

    this.playerController = new PlayerController({
      camera: this.camera,
      rig: this.playerRig,
      renderer: this.renderer,
      uiController: this.uiController,
      playerConfig: this.metadata.player,
      mobileMode: this.mobileMode,
      mobileRefs: {
        leftStickZone: this.refs.leftStickZone,
        leftStickThumb: this.refs.leftStickThumb,
        rightStickZone: this.refs.rightStickZone,
        rightStickThumb: this.refs.rightStickThumb,
        mobileJumpButton: this.refs.mobileJumpButton,
        mobileSprintButton: this.refs.mobileSprintButton,
      },
    });

    this.playerController.setMobileMode(this.mobileMode);

    const spawnPoint = this._computeSpawnPoint();
    this.playerController.setFeetPosition(spawnPoint);

    this.interactionSystem = new InteractionSystem({
      camera: this.camera,
      renderer: this.renderer,
      domElement: this.renderer.domElement,
      uiController: this.uiController,
      registry: this.interactionRegistry,
      getPickables: () => this.pickableMeshes,
      pointerLockControls: this.playerController.controls,
    });
  }

  _computeWorldBounds() {
    const bounds = new THREE.Box3();
    for (const { root } of this.meshEntries) {
      bounds.expandByObject(root, true);
    }

    if (bounds.isEmpty()) {
      bounds.set(new THREE.Vector3(-8, 0, -8), new THREE.Vector3(8, 5, 8));
    }

    if (!Number.isFinite(bounds.min.y)) {
      bounds.min.y = 0;
    }

    return bounds;
  }

  _computeSpawnPoint() {
    const bounds = this._computeWorldBounds();
    const center = bounds.getCenter(new THREE.Vector3());
    const groundY = Number.isFinite(bounds.min.y) ? bounds.min.y : 0;

    const spawn = new THREE.Vector3(center.x, groundY, center.z);

    if (this.splatEntries.length > 0) {
      const firstSplat = this.splatEntries[0];
      const pos = firstSplat.asset?.transform?.position;
      if (Array.isArray(pos) && pos.length >= 3) {
        spawn.x = pos[0];
        spawn.z = pos[2];
      }
    }

    return spawn;
  }

  applyQuality(value) {
    const preset = QUALITY_PRESETS[value] ?? QUALITY_PRESETS.auto;
    this.renderer.setPixelRatio(preset.pixelRatio());

    if (this.sparkRenderer && 'lodSplatScale' in this.sparkRenderer) {
      this.sparkRenderer.lodSplatScale = preset.splatLodScale;
    }

    this.uiController.setQuality(value in QUALITY_PRESETS ? value : 'auto');
    this.onResize();
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  _animate() {
    const dt = Math.min(0.05, this.clock.getDelta());

    if (this.playerController && this.collisionSystem) {
      this.playerController.update(dt, this.collisionSystem);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
```


## runtime/.gitkeep

```
# Runtime extraction directory placeholder.
```


## README.md

```
# Marble ZIP WebXR Viewer (Flask + Three.js)

This project is a **local development WebXR viewer** for Marble Studio exports.
It loads `church.zip`, extracts it on startup, parses splats + meshes + transforms, and serves a first-person + WebXR scene with collision and interaction.

## What this app does

- Runs a Flask backend using an app-factory structure.
- Validates and extracts a Marble ZIP (`church.zip` / `Church.zip`) into `runtime/church_extracted/`.
- Scans extracted files recursively for:
  - splats (`.spz`, `.ply`)
  - meshes (`.glb`, `.gltf`)
  - textures
  - manifest/config/transform metadata (`.json`, `.yaml`, `.yml`)
- Preserves transforms from a manifest when available.
- Generates `scene_config.generated.json` when transforms are missing or partially unresolved.
- Serves a Three.js frontend with:
  - Spark splat rendering
  - GLTF mesh loading
  - desktop controls (WASD, jump, sprint, pointer lock)
  - mobile dual-stick style controls
  - WebXR support via `VRButton`
  - BVH-accelerated GLB collision
  - click/tap interaction and object highlighting
  - quality presets (`auto`, `low`, `medium`, `high`)

## Why SPZ is visual-only here

SPZ/PLY splats are optimized for high-quality rendering, not stable real-time physics colliders.
This implementation treats splats as **visual geometry** and uses GLB meshes for collision.

- **No per-frame SPZ collision** is used for locomotion.
- Optional splat picking can be added separately for hotspots, but movement collision should stay on meshes.

## Why GLB is used for collision

GLB meshes provide triangle topology that works well with BVH acceleration (`three-mesh-bvh`), allowing:

- capsule-vs-triangle collision
- fast broad-phase + narrow-phase queries
- reliable grounded state and wall blocking

## Official references used

- Spark loading splats: https://sparkjs.dev/docs/loading-splats/
- Three.js `GLTFLoader`: https://threejs.org/docs/pages/GLTFLoader.html
- Three.js `VRButton`: https://threejs.org/docs/pages/VRButton.html
- Three.js `PointerLockControls`: https://threejs.org/docs/pages/PointerLockControls.html
- three-mesh-bvh usage: https://github.com/gkjohnson/three-mesh-bvh
- Flask app factory pattern: https://flask.palletsprojects.com/en/stable/patterns/appfactories/
- Python `zipfile`: https://docs.python.org/3/library/zipfile.html

## ZIP interpretation for the provided church export

For the current `church.zip`, startup parsing detected:

- manifest: `scene.json`
- splats: `9`
- meshes: `11`
- primary splat preference: largest `.spz`
- collision selection mode: `environment_guess` (no explicit collider-named mesh found)

Because `scene.json` is present and matched files correctly, transforms are preserved from the manifest.

## Project structure

```text
WEBXR/
├─ app/
│  ├─ __init__.py
│  ├─ config.py
│  ├─ routes.py
│  └─ services/
│     ├─ extractor.py
│     ├─ runtime_scene.py
│     └─ scene_parser.py
├─ static/
│  ├─ css/app.css
│  ├─ js/main.js
│  ├─ js/app/
│  │  ├─ webxr-app.js
│  │  ├─ player-controller.js
│  │  ├─ collision-system.js
│  │  ├─ interaction-system.js
│  │  ├─ interaction-registry.js
│  │  ├─ ui-controller.js
│  │  └─ utils.js
│  └─ vendor/ (generated by npm postinstall)
├─ templates/index.html
├─ runtime/
│  ├─ .gitkeep
│  ├─ church_extract_state.json (generated)
│  └─ church_extracted/ (generated)
├─ scripts/sync_vendor.mjs
├─ church.zip
├─ package.json
├─ requirements.txt
├─ .env.example
├─ .gitignore
├─ run.py
└─ README.md
```

## Install

### 1) Python dependencies

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

### 2) Frontend dependencies

```powershell
npm install
```

`npm install` runs `postinstall`, which copies local browser modules into `static/vendor/`.

### 3) Optional environment overrides

```powershell
copy .env.example .env
```

## Run

```powershell
python run.py
```

Open:

- `http://127.0.0.1:5000/`
- health: `http://127.0.0.1:5000/healthz`
- scene metadata: `http://127.0.0.1:5000/api/scene`

## How ZIP extraction works

On startup:

1. ZIP is resolved from:
   - `MARBLE_ZIP_PATH` (if set), else
   - `church.zip`, else
   - `Church.zip`
2. SHA-256 fingerprint is computed.
3. If fingerprint changed (or no extracted folder exists), ZIP is extracted to:
   - `runtime/church_extracted/`
4. Extraction state is written to:
   - `runtime/church_extract_state.json`
5. Parser normalizes the scene description for frontend consumption.

## Replacing with another Marble export

1. Replace `church.zip` with your new ZIP (or set `MARBLE_ZIP_PATH`).
2. Restart the app.
3. The app automatically re-extracts when ZIP fingerprint changes.

## Movement tuning

Adjust in `.env`:

- `PLAYER_HEIGHT`
- `PLAYER_RADIUS`
- `PLAYER_GRAVITY`
- `PLAYER_JUMP_STRENGTH`
- `PLAYER_MOVE_SPEED`
- `PLAYER_SPRINT_SPEED`

## Collision tuning

- Enable collision debug from UI toggle (`Collision debug view`) or set `DEBUG_COLLISION=true`.
- To force dedicated collision selection, include mesh names with keywords such as:
  - `collider`, `collision`, `physics`, `navmesh`, `walk`
- If no dedicated collider is found, parser falls back to environment/all meshes and runtime bounds fallback.

## Debugging missing transforms

If manifest is missing or partially unresolved:

- parser warns in logs and `/api/scene`
- generated fallback file appears at:
  - `runtime/church_extracted/scene_config.generated.json`

Use that file to manually refine transforms.

## Adding metadata for clickable objects

Add a JSON/YAML file in the ZIP (or extracted folder) with `metadata`/`interaction` in the filename, for example `object_metadata.json`:

```json
{
  "objects": {
    "doorglb": {
      "label": "Main Door",
      "description": "Restored wooden entry door"
    },
    "altarglb": {
      "label": "Altar",
      "description": "Central altar model"
    }
  }
}
```

The interaction panel will include these metadata fields when picking matching objects.

## Limitations

- SPZ collision is intentionally not used per-frame for movement.
- XR locomotion is intentionally simple (comfort-first analog movement).
- This uses Flask development server for local development; use a proper WSGI/ASGI deployment setup for production.
```
