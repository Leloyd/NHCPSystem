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

try:
    import yaml
except ModuleNotFoundError:  # pragma: no cover - environment-dependent optional dependency
    yaml = None

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
    runtime_url_prefix = str(config.get("RUNTIME_URL_PREFIX", "/runtime")).rstrip("/")
    runtime_prefix = f"{runtime_url_prefix}/{config['EXTRACTED_DIR_NAME']}"

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
        if yaml is None:
            return None, f"Skipping YAML file {path.name}: PyYAML is not installed."
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
