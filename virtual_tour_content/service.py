from __future__ import annotations

import hashlib
import io
import json
import os
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from supabase_client import get_supabase_client, is_supabase_configured
from virtual_tour_repository import get_revision, get_system_original, list_hotspots, list_public_tours, list_revisions, list_scenes, list_tours


TOUR_STORAGE_PREFIX = "virtual-tours"
PANORAMA_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
IMAGE_EXTENSIONS = PANORAMA_EXTENSIONS
GLB_EXTENSIONS = {".glb"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".ogg", ".m4a"}
MAX_PANORAMA_BYTES = 30 * 1024 * 1024
MAX_MEDIA_BYTES = max(1 * 1024 * 1024, int(os.getenv("VIRTUAL_TOUR_MAX_MEDIA_BYTES", str(25 * 1024 * 1024))))
SIGNED_URL_SECONDS = min(604800, max(300, int(os.getenv("VIRTUAL_TOUR_SIGNED_URL_SECONDS", "7200"))))
ORIGINAL_CAPTURED_ON = "2026-04-16"
DEFAULT_MAP_IMAGE = "/static/images/site-map/aerial-map.jpg"
DEFAULT_MAP_WIDTH = 3074
DEFAULT_MAP_HEIGHT = 2250


def get_virtual_tour_bucket_name() -> str:
    return str(os.getenv("SUPABASE_VIRTUAL_TOUR_BUCKET") or "nhcp-virtual-tours").strip() or "nhcp-virtual-tours"


def slugify(value: Any, fallback: str = "tour") -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", str(value or "").strip().lower()).strip("-")
    return normalized or fallback


def format_captured_on(value: Any) -> str:
    """Return a readable long date without platform-specific strftime flags."""
    try:
        parsed = datetime.strptime(str(value or "").strip(), "%Y-%m-%d").date()
    except ValueError:
        return ""
    return f"{parsed:%B} {parsed.day}, {parsed.year}"


def original_tour_option() -> dict[str, Any]:
    return {
        "id": "original",
        "slug": "original",
        "title_en": "Original Museum Tour",
        "title_tl": "Orihinal na Tour ng Museo",
        "description_en": "The complete original 40-scene museum and cemetery experience.",
        "description_tl": "Ang kumpletong orihinal na karanasan sa museo at libingan.",
        "status": "active",
        "is_system_original": True,
        "scene_count": 40,
    }


def _packaged_original_map() -> dict[str, Any]:
    path = Path(__file__).resolve().parent.parent / "static" / "data" / "tour-minimap.json"
    try:
        source = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return {}
    markers = []
    for scene_id, position in (source.get("scenes") or {}).items():
        if not isinstance(position, dict):
            continue
        markers.append({
            "id": f"scene-{slugify(scene_id, 'scene')}", "kind": "scene",
            "x": position.get("x"), "y": position.get("y"),
            "label": {"en": position.get("label") or scene_id, "tl": ""},
            "sceneId": slugify(scene_id, "scene"),
        })
    for index, landmark in enumerate(source.get("landmarks") or []):
        if not isinstance(landmark, dict):
            continue
        markers.append({
            "id": f"main-{index + 1}", "kind": "main",
            "x": landmark.get("x"), "y": landmark.get("y"),
            "label": {"en": landmark.get("label") or f"Main location {index + 1}", "tl": ""},
            "sceneId": "",
        })
    return {
        "enabled": True, "imagePath": source.get("image") or DEFAULT_MAP_IMAGE,
        "width": source.get("width") or DEFAULT_MAP_WIDTH,
        "height": source.get("height") or DEFAULT_MAP_HEIGHT,
        "zoom": source.get("zoom") or 3.2,
        "hiddenSceneIds": [slugify(value, "scene") for value in source.get("hideOn") or []],
        "markers": markers,
    }


def normalize_map_config(
    tour: dict[str, Any], revision: dict[str, Any] | None, scenes: list[dict[str, Any]], *, admin: bool = False
) -> dict[str, Any]:
    """Return a safe map config whose scene references match this revision."""
    stored = (revision or {}).get("map_config")
    stored = stored if isinstance(stored, dict) else {}
    if not stored and tour.get("is_system_original"):
        stored = _packaged_original_map()
    scene_keys = {str(scene.get("scene_key") or scene.get("id") or "") for scene in scenes}
    markers = []
    used_ids = set()
    for index, marker in enumerate(stored.get("markers") if isinstance(stored.get("markers"), list) else []):
        if not isinstance(marker, dict) or len(markers) >= 160:
            continue
        try:
            x = min(1.0, max(0.0, float(marker.get("x"))))
            y = min(1.0, max(0.0, float(marker.get("y"))))
        except (TypeError, ValueError):
            continue
        kind = "main" if marker.get("kind") == "main" else "scene"
        scene_id = str(marker.get("sceneId") or "")
        if scene_id and scene_id not in scene_keys:
            # Original source identifiers used camelCase before database import.
            scene_id = slugify(scene_id, "scene")
        if scene_id and scene_id not in scene_keys:
            scene_id = ""
        if kind == "scene" and not scene_id:
            continue
        label = marker.get("label") if isinstance(marker.get("label"), dict) else {}
        marker_id = slugify(marker.get("id"), f"map-marker-{index + 1}")[:80]
        while marker_id in used_ids:
            marker_id = f"{marker_id[:70]}-{index + 1}"
        used_ids.add(marker_id)
        markers.append({
            "id": marker_id, "kind": kind, "x": round(x, 5), "y": round(y, 5),
            "label": {"en": str(label.get("en") or "")[:120], "tl": str(label.get("tl") or "")[:120]},
            "sceneId": scene_id,
        })
    hidden = []
    for value in stored.get("hiddenSceneIds") if isinstance(stored.get("hiddenSceneIds"), list) else []:
        key = str(value or "")
        if key not in scene_keys:
            key = slugify(key, "scene")
        if key in scene_keys and key not in hidden:
            hidden.append(key)
    image_path = str(stored.get("imagePath") or DEFAULT_MAP_IMAGE).strip()
    result = {
        "enabled": bool(stored.get("enabled", False)),
        "imagePath": image_path,
        "image": _asset_url(image_path),
        "width": max(1, int(stored.get("width") or DEFAULT_MAP_WIDTH)),
        "height": max(1, int(stored.get("height") or DEFAULT_MAP_HEIGHT)),
        "zoom": min(8.0, max(1.0, float(stored.get("zoom") or 3.2))),
        "hiddenSceneIds": hidden, "markers": markers,
    }
    if admin:
        result["imageUrl"] = result["image"]
    else:
        result.pop("imagePath", None)
    return result


def load_public_tour_options() -> list[dict[str, Any]]:
    original = original_tour_option()
    options = [original]
    if not is_supabase_configured():
        return options
    try:
        for tour in list_public_tours():
            revision_id = tour.get("published_revision_id")
            tour["scene_count"] = len(list_scenes(int(revision_id))) if revision_id else 0
            if tour.get("is_system_original"):
                tour["id"] = "original"
                tour["slug"] = "original"
                options[0] = tour
            else:
                options.append(tour)
    except Exception:
        return options
    return options


def load_admin_tours() -> tuple[list[dict[str, Any]], str | None]:
    tours = [original_tour_option()]
    if not is_supabase_configured():
        return tours, "Supabase is not configured. The Original tour remains available, but custom environments cannot be saved."
    try:
        for tour in list_tours():
            draft_id = tour.get("draft_revision_id")
            published_id = tour.get("published_revision_id")
            revision_id = draft_id or published_id
            revision_scenes = list_scenes(int(revision_id)) if revision_id else []
            revision = get_revision(int(revision_id)) if revision_id else None
            map_config = normalize_map_config(tour, revision, revision_scenes)
            tour["map_enabled"] = bool(map_config.get("enabled"))
            tour["map_marker_count"] = len(map_config.get("markers") or [])
            tour["scene_count"] = len(revision_scenes)
            tour["hotspot_count"] = len(list_hotspots(int(revision_id))) if revision_id else 0
            start_scene = next((scene for scene in revision_scenes if scene.get("is_start_scene")), None)
            tour["start_scene_name"] = str((start_scene or {}).get("name_en") or "").strip()
            tour["start_panorama_url"] = ""
            start_panorama_path = str((start_scene or {}).get("panorama_path") or "").strip()
            if start_panorama_path:
                try:
                    tour["start_panorama_url"] = resolve_admin_asset_urls([start_panorama_path]).get(start_panorama_path, "")
                except Exception:
                    # A missing thumbnail should not prevent administrators from
                    # reaching the environment list and repairing the scene.
                    tour["start_panorama_url"] = ""
            if tour.get("is_system_original"):
                tour["source_id"] = tour["id"]
                tour["id"] = "original"
                tour["slug"] = "original"
                tours[0] = tour
            else:
                tours.append(tour)
        return tours, None
    except Exception as exc:
        return tours, f"Virtual-tour tables are not ready. Run virtual_tour_tables.sql in Supabase. Details: {exc}"


def _is_external_asset(value: str) -> bool:
    return value.startswith(("/", "http://", "https://"))


def _absolute_signed_url(value: Any) -> str:
    url = str(value or "")
    if url.startswith("/"):
        return str(os.getenv("SUPABASE_URL") or "").rstrip("/") + url
    return url


def _signed_asset_urls(paths: list[Any]) -> dict[str, str]:
    normalized = []
    for path in paths:
        value = str(path or "").strip().lstrip("/")
        if value and not _is_external_asset(str(path or "").strip()) and value not in normalized:
            normalized.append(value)
    if not normalized:
        return {}
    bucket = get_supabase_client().storage.from_(get_virtual_tour_bucket_name())
    try:
        response = bucket.create_signed_urls(normalized, SIGNED_URL_SECONDS)
        data = response if isinstance(response, list) else response.get("data") if isinstance(response, dict) else getattr(response, "data", None)
        result = {}
        for index, item in enumerate(data or []):
            if not isinstance(item, dict):
                continue
            path = str(item.get("path") or (normalized[index] if index < len(normalized) else ""))
            url = _absolute_signed_url(item.get("signedURL") or item.get("signedUrl") or item.get("signed_url"))
            if path and url:
                result[path] = url
        if len(result) == len(normalized):
            return result
    except Exception:
        pass
    return {path: _asset_url(path) for path in normalized}


def _asset_url(path: Any, signed_urls: dict[str, str] | None = None) -> str:
    value = str(path or "").strip()
    if not value:
        return ""
    if _is_external_asset(value):
        return value
    normalized = value.lstrip("/")
    if signed_urls and normalized in signed_urls:
        return signed_urls[normalized]
    response = get_supabase_client().storage.from_(get_virtual_tour_bucket_name()).create_signed_url(normalized, SIGNED_URL_SECONDS)
    if isinstance(response, str):
        return _absolute_signed_url(response)
    data = response if isinstance(response, dict) else getattr(response, "data", None)
    data = data or {}
    if isinstance(data.get("data"), dict):
        data = data["data"]
    return _absolute_signed_url(data.get("signedURL") or data.get("signedUrl") or data.get("signed_url"))


def resolve_admin_asset_urls(paths: list[Any]) -> dict[str, str]:
    """Resolve stored draft assets to short-lived URLs for the admin editor."""
    values = list(dict.fromkeys(
        str(path or "").strip()
        for path in paths
        if str(path or "").strip()
    ))
    if not values:
        return {}
    signed_urls = _signed_asset_urls(values)
    return {value: _asset_url(value, signed_urls) for value in values}


def _nested_hotspots(value: Any, signed_urls: dict[str, str]) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    result = []
    for index, detail in enumerate(value[:30]):
        if not isinstance(detail, dict):
            continue
        try:
            x = min(100.0, max(0.0, float(detail.get("x"))))
            y = min(100.0, max(0.0, float(detail.get("y"))))
        except (TypeError, ValueError):
            continue
        title = detail.get("title") if isinstance(detail.get("title"), dict) else {}
        subtitle = detail.get("subtitle") if isinstance(detail.get("subtitle"), dict) else {}
        audio = detail.get("audio") if isinstance(detail.get("audio"), dict) else {}
        image = _asset_url(detail.get("image"), signed_urls)
        if not image:
            continue
        result.append({
            "id": str(detail.get("id") or f"detail-{index + 1}")[:120],
            "x": x,
            "y": y,
            "image": image,
            "title": {"en": str(title.get("en") or "")[:120], "tl": str(title.get("tl") or "")[:120]},
            "subtitle": {"en": str(subtitle.get("en") or "")[:5000], "tl": str(subtitle.get("tl") or "")[:5000]},
            "audio": {"en": _asset_url(audio.get("en"), signed_urls), "tl": _asset_url(audio.get("tl"), signed_urls)},
        })
    return result


def build_revision_config(tour: dict[str, Any], revision_id: int) -> dict[str, Any]:
    try:
        revision = get_revision(revision_id)
    except Exception:
        # Keep config construction resilient for packaged/local assets and
        # installations that are in the middle of applying the map migration.
        revision = None
    scenes = list_scenes(revision_id)
    hotspots = list_hotspots(revision_id)
    asset_paths: list[Any] = [scene.get("panorama_path") for scene in scenes]
    for hotspot in hotspots:
        asset_paths.extend(hotspot.get(field) for field in ("image_path", "glb_path", "audio_en_path", "audio_tl_path"))
        for detail in hotspot.get("nested_hotspots") if isinstance(hotspot.get("nested_hotspots"), list) else []:
            if not isinstance(detail, dict):
                continue
            asset_paths.append(detail.get("image"))
            audio = detail.get("audio") if isinstance(detail.get("audio"), dict) else {}
            asset_paths.extend((audio.get("en"), audio.get("tl")))
    signed_urls = _signed_asset_urls(asset_paths)
    scenes_by_id = {int(scene["id"]): scene for scene in scenes}
    hotspot_groups: dict[int, list[dict[str, Any]]] = {int(scene["id"]): [] for scene in scenes}

    for hotspot in hotspots:
        if not hotspot.get("is_enabled", True):
            continue
        payload = {
            "id": str(hotspot["id"]),
            "type": hotspot["hotspot_type"],
            "name": {"en": hotspot.get("name_en") or "", "tl": hotspot.get("name_tl") or ""},
            "pitch": float(hotspot.get("pitch") or 0),
            "yaw": float(hotspot.get("yaw") or 0),
        }
        if hotspot["hotspot_type"] == "navigation":
            target = scenes_by_id.get(int(hotspot.get("target_scene_id") or 0))
            if not target:
                continue
            payload.update({
                "targetScene": target["scene_key"],
                "targetPitch": _optional_float(hotspot.get("target_pitch")),
                "targetYaw": _optional_float(hotspot.get("target_yaw")),
                "targetHfov": _optional_float(hotspot.get("target_hfov")),
            })
        else:
            payload["content"] = {
                "image": _asset_url(hotspot.get("image_path"), signed_urls),
                "glb": _asset_url(hotspot.get("glb_path"), signed_urls),
                "subtitle": {"en": hotspot.get("subtitle_en") or "", "tl": hotspot.get("subtitle_tl") or ""},
                "audio": {"en": _asset_url(hotspot.get("audio_en_path"), signed_urls), "tl": _asset_url(hotspot.get("audio_tl_path"), signed_urls)},
                "nested": _nested_hotspots(hotspot.get("nested_hotspots"), signed_urls),
            }
        hotspot_groups.setdefault(int(hotspot["scene_id"]), []).append(payload)

    public_scenes = []
    for scene in scenes:
        public_scenes.append({
            "id": scene["scene_key"],
            "name": {"en": scene.get("name_en") or "", "tl": scene.get("name_tl") or ""},
            "capturedOn": str(scene.get("captured_on") or ""),
            "panorama": _asset_url(scene.get("panorama_path"), signed_urls),
            "pitch": float(scene.get("initial_pitch") or 0),
            "yaw": float(scene.get("initial_yaw") or 0),
            "hfov": float(scene.get("initial_hfov") or 100),
            "isStart": bool(scene.get("is_start_scene")),
            "hotspots": hotspot_groups.get(int(scene["id"]), []),
        })

    start_scene = next((scene["scene_key"] for scene in scenes if scene.get("is_start_scene")), None)
    if not start_scene and scenes:
        start_scene = scenes[0]["scene_key"]
    return {
        "schemaVersion": 1,
        "tour": {
            "id": tour["id"], "slug": tour["slug"],
            "title": {"en": tour.get("title_en") or "", "tl": tour.get("title_tl") or ""},
            "description": {"en": tour.get("description_en") or "", "tl": tour.get("description_tl") or ""},
        },
        "startScene": start_scene,
        "scenes": public_scenes,
        "map": normalize_map_config(tour, revision, scenes),
    }


def _optional_float(value: Any) -> float | None:
    return float(value) if value not in (None, "") else None


def build_public_tour_config(slug: str) -> dict[str, Any] | None:
    if not slug or not is_supabase_configured():
        return None
    from virtual_tour_repository import get_tour_by_slug
    try:
        tour = get_system_original() if slug == "original" else get_tour_by_slug(slug, public_only=True)
        if tour and slug == "original" and tour.get("status") != "active":
            tour = None
        revision_id = int(tour.get("published_revision_id") or 0) if tour else 0
        if not tour or not revision_id:
            return None
        config = build_revision_config(tour, revision_id)
        return config if config.get("startScene") and config.get("scenes") else None
    except Exception:
        return None


def prepare_upload(*, filename: str, asset_kind: str, tour_id: int, file_size: Any) -> dict[str, Any]:
    allowed_by_kind = {
        "panorama": PANORAMA_EXTENSIONS, "image": IMAGE_EXTENSIONS,
        "glb": GLB_EXTENSIONS, "audio": AUDIO_EXTENSIONS,
    }
    allowed = allowed_by_kind.get(asset_kind)
    extension = Path(str(filename or "")).suffix.lower()
    if not allowed or extension not in allowed:
        raise ValueError(f"Unsupported {asset_kind or 'asset'} file type.")
    try:
        size = int(file_size)
    except (TypeError, ValueError) as exc:
        raise ValueError("The upload size is missing or invalid.") from exc
    maximum = MAX_PANORAMA_BYTES if asset_kind == "panorama" else MAX_MEDIA_BYTES
    if size < 1 or size > maximum:
        raise ValueError(f"The {asset_kind} file exceeds the {maximum // (1024 * 1024)} MB limit.")
    safe_stem = slugify(Path(filename).stem, asset_kind)
    object_path = f"{TOUR_STORAGE_PREFIX}/{int(tour_id)}/{asset_kind}/{safe_stem}-{uuid4().hex[:12]}{extension}"
    bucket = get_virtual_tour_bucket_name()
    response = get_supabase_client().storage.from_(bucket).create_signed_upload_url(object_path)
    data = response if isinstance(response, dict) else getattr(response, "data", None)
    data = data or {}
    token = data.get("token") or data.get("signedToken") or data.get("signed_token")
    if not token:
        raise RuntimeError("Supabase did not return a signed upload token.")
    return {"bucket": bucket, "path": object_path, "token": token}


def list_tour_asset_paths(tour_id: int) -> list[str]:
    referenced = set()
    for revision in list_revisions(tour_id):
        revision_id = int(revision["id"])
        map_config = revision.get("map_config") if isinstance(revision.get("map_config"), dict) else {}
        referenced.add(str(map_config.get("imagePath") or "").lstrip("/"))
        for scene in list_scenes(revision_id):
            referenced.add(str(scene.get("panorama_path") or "").lstrip("/"))
        for hotspot in list_hotspots(revision_id):
            for field in ("image_path", "glb_path", "audio_en_path", "audio_tl_path"):
                referenced.add(str(hotspot.get(field) or "").lstrip("/"))
            for detail in hotspot.get("nested_hotspots") if isinstance(hotspot.get("nested_hotspots"), list) else []:
                if not isinstance(detail, dict):
                    continue
                referenced.add(str(detail.get("image") or "").lstrip("/"))
                audio = detail.get("audio") if isinstance(detail.get("audio"), dict) else {}
                referenced.update(str(audio.get(language) or "").lstrip("/") for language in ("en", "tl"))
    expected_prefix = f"{TOUR_STORAGE_PREFIX}/{int(tour_id)}/"
    return sorted(path for path in referenced if path.startswith(expected_prefix))


def discard_uploaded_assets(paths: Any, *, tour_id: int) -> int:
    """Remove rejected objects unless a tour revision already references them."""
    expected_prefix = f"{TOUR_STORAGE_PREFIX}/{int(tour_id)}/"
    safe_paths = []
    for value in paths if isinstance(paths, list) else []:
        normalized = str(value or "").strip().lstrip("/")
        if normalized.startswith(expected_prefix) and normalized not in safe_paths:
            safe_paths.append(normalized)
        if len(safe_paths) >= 12:
            break
    if not safe_paths:
        return 0
    referenced = set(list_tour_asset_paths(tour_id))
    removable = [path for path in safe_paths if path not in referenced]
    if removable:
        get_supabase_client().storage.from_(get_virtual_tour_bucket_name()).remove(removable)
    return len(removable)


def validate_stored_asset(
    path: str,
    kind: str,
    *,
    tour_id: int,
    claimed_width: int | None = None,
    claimed_height: int | None = None,
) -> dict[str, Any]:
    normalized = str(path or "").strip().lstrip("/")
    if not normalized.startswith(f"{TOUR_STORAGE_PREFIX}/{int(tour_id)}/"):
        raise ValueError("The uploaded asset path is outside the virtual-tour storage area.")
    raw = get_supabase_client().storage.from_(get_virtual_tour_bucket_name()).download(normalized)
    data = bytes(raw or b"")
    max_bytes = MAX_PANORAMA_BYTES if kind == "panorama" else MAX_MEDIA_BYTES
    if not data or len(data) > max_bytes:
        raise ValueError(f"The {kind} file is empty or exceeds the {max_bytes // (1024 * 1024)} MB limit.")

    if kind in {"panorama", "image"}:
        try:
            from PIL import Image, UnidentifiedImageError
            with Image.open(io.BytesIO(data)) as image:
                image.verify()
            with Image.open(io.BytesIO(data)) as image:
                width, height = image.size
                image_format = str(image.format or "").upper()
        except (ImportError, UnidentifiedImageError, OSError) as exc:
            raise ValueError("The uploaded file is not a decodable image.") from exc
        if kind == "panorama":
            if width < 2048 or height < 1024:
                raise ValueError("A panorama must be at least 2048 × 1024 pixels.")
            if width > 4096 or height > 2048:
                raise ValueError("For reliable mobile WebGL support, a panorama cannot exceed 4096 × 2048 pixels.")
            if abs((width / height) - 2.0) > 0.02:
                raise ValueError("A full 360° equirectangular panorama must have a 2:1 aspect ratio.")
            if (claimed_width and int(claimed_width) != width) or (claimed_height and int(claimed_height) != height):
                raise ValueError("The image dimensions do not match the browser validation result.")
        mime = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}.get(image_format)
        if not mime:
            raise ValueError("Only JPEG, PNG, and WebP images are supported.")
        return {"width": width, "height": height, "mime": mime, "size": len(data), "sha256": hashlib.sha256(data).hexdigest()}
    if kind == "glb" and (
        len(data) < 12 or data[:4] != b"glTF" or int.from_bytes(data[4:8], "little") != 2
        or int.from_bytes(data[8:12], "little") != len(data)
    ):
        raise ValueError("The uploaded 3D object is not a valid GLB 2.0 file.")
    if kind == "audio" and not (data[:3] == b"ID3" or data[:2] in {b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"} or data[:4] in {b"RIFF", b"OggS"} or data[4:8] == b"ftyp"):
        raise ValueError("The uploaded narration is not a recognized MP3, WAV, OGG, or M4A file.")
    return {"size": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def generate_narration(text: str, *, language: str, tour_id: int, hotspot_id: int) -> tuple[str, str, str]:
    api_key = str(os.getenv("ELEVENLABS_API_KEY") or "").strip()
    voice_id = str(os.getenv("ELEVENLABS_VOICE_ID") or "").strip()
    model_id = str(os.getenv("ELEVENLABS_MODEL_ID") or "eleven_multilingual_v2").strip()
    if not api_key or not voice_id:
        raise ValueError("ElevenLabs is not configured. Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID.")
    script = str(text or "").strip()
    if len(script) < 2 or len(script) > 5000:
        raise ValueError("Narration text must contain between 2 and 5,000 characters.")
    payload = json.dumps({"text": script, "model_id": model_id}).encode("utf-8")
    request = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128",
        data=payload, method="POST",
        headers={"Content-Type": "application/json", "xi-api-key": api_key},
    )
    try:
        with urllib.request.urlopen(request, timeout=55) as response:
            audio = response.read(MAX_MEDIA_BYTES + 1)
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as exc:
        raise RuntimeError(f"ElevenLabs could not generate narration: {exc}") from exc
    if not audio or len(audio) > MAX_MEDIA_BYTES:
        raise RuntimeError("ElevenLabs returned an empty or oversized audio file.")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    path = f"{TOUR_STORAGE_PREFIX}/{int(tour_id)}/audio/tts-{int(hotspot_id)}-{language}-{stamp}-{uuid4().hex[:6]}.mp3"
    get_supabase_client().storage.from_(get_virtual_tour_bucket_name()).upload(
        path=path, file=audio, file_options={"content-type": "audio/mpeg", "upsert": "false"},
    )
    return path, voice_id, model_id
