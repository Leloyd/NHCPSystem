from __future__ import annotations

import hashlib
import io
import json
import os
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from uuid import uuid4

from supabase_client import get_supabase_client, is_supabase_configured
from virtual_tour_content.service import get_virtual_tour_bucket_name
from site_map_repository import get_revision, get_site_map, list_revisions


PROJECT_ROOT = Path(__file__).resolve().parent.parent
STORAGE_PREFIX = "site-map"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".ogg", ".m4a"}
MAX_MAP_BYTES = max(5 * 1024 * 1024, int(os.getenv("SITE_MAP_MAX_MAP_BYTES", str(30 * 1024 * 1024))))
MAX_MEDIA_BYTES = max(1 * 1024 * 1024, int(os.getenv("SITE_MAP_MAX_MEDIA_BYTES", str(25 * 1024 * 1024))))
SIGNED_URL_SECONDS = min(604800, max(300, int(os.getenv("SITE_MAP_SIGNED_URL_SECONDS", "7200"))))

TOUR_SCENE_BY_STOP = {
    "front-gate": "frontGate", "flag-pole": "leftFlag", "middle-ground": "middleGInside",
    "left-side-inside": "leftCornerInsideFrontGate", "right-side-inside": "rightCornerInsideFrontGate",
    "left-tombs": "leftTombs", "right-tombs": "rightFrontTombs", "church-front": "frontChurch",
    "church": "insidechurch", "underground-crypts": "underground1",
}

PANORAMA_COORDINATES = {
    "rightfrontgate": (-79.21, 21.77), "insidefrontgate": (-61.59, -16.54),
    "insidefrontgate1": (-53.53, -3.70), "leftfrontchurch": (-27.16, 8.76),
    "rightfrontchurch": (-27.39, 16.57), "rightfronttombs": (-26.40, 20.40),
    "rightfronttombs2": (-31.86, 38.71), "rightcornermiddleg": (-46.37, 50.82),
    "rightmiddlecornermiddleg": (-54.59, 45.10), "rightcornerinsidefrontgate": (-67.40, 27.23),
    "leftfrontgate": (-57.66, -37.91), "leftcornerinsidefrontgate": (-51.56, -37.02),
    "middlegmuseum": (-44.85, -47.73), "frontmuseum": (-41.44, -49.23),
    "museumlandmark": (-35.64, -47.54), "leftmiddleinsidefrontgate": (-43.07, -33.32),
    "leftmiddleg": (-38.34, -31.58), "leftmiddlemiddleg": (-34.09, -28.80),
    "leftendtombs": (-27.39, -13.33), "lefttombs": (-25.33, 3.78),
    "leftfirsttombs": (-25.61, 7.54),
}

TAGALOG_TITLES = {
    "front-gate": "Harapang Tarangkahan", "flag-pole": "Poste ng Watawat", "parking": "Paradahan",
    "resource-center-office": "Sentrong Sanggunian", "middle-ground": "Gitnang Bahagi",
    "left-side-inside": "Kaliwa", "right-side-inside": "Kanan", "left-tombs": "Mga Puntod sa Kaliwa",
    "right-tombs": "Mga Puntod sa Kanan", "church-front": "Harap ng Kapilya", "church": "Kapilya",
    "underground-crypts": "Mga Libingan sa Ilalim ng Lupa", "museum-landmark": "Museo",
}


def slugify(value: Any, fallback: str = "hotspot") -> str:
    result = re.sub(r"[^a-z0-9]+", "-", str(value or "").strip().lower()).strip("-")
    return result or fallback


def _normalized_key(value: Any) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value or "").lower())


def _read_json(relative_path: str) -> dict[str, Any]:
    try:
        return json.loads((PROJECT_ROOT / relative_path).read_text(encoding="utf-8"))
    except (OSError, TypeError, ValueError):
        return {}


def _original_aerial_position(raw: dict[str, Any], image_meta: dict[str, Any], width: int, height: int) -> tuple[float, float]:
    coordinate_width = float(image_meta.get("coordinateWidth") or width)
    coordinate_height = float(image_meta.get("coordinateHeight") or height)
    reference_width = float(image_meta.get("referenceWidth") or coordinate_width)
    reference_height = float(image_meta.get("referenceHeight") or coordinate_height)
    x = float(raw.get("x") or 0) * (reference_width / coordinate_width) - float(image_meta.get("cropOffsetX") or 0)
    y = float(raw.get("y") or 0) * (reference_height / coordinate_height) - float(image_meta.get("cropOffsetY") or 0)
    # Legacy Site Map hotspot Y values are Leaflet latitudes measured upward
    # from the image bottom. The editor stores normal image-top coordinates.
    return min(1.0, max(0.0, x / width)), min(1.0, max(0.0, 1.0 - (y / height)))


def packaged_original_config() -> dict[str, Any]:
    hotspot_source = _read_json("static/data/site-map-hotspots.json")
    minimap = _read_json("static/data/tour-minimap.json")
    image_meta = hotspot_source.get("image") if isinstance(hotspot_source.get("image"), dict) else {}
    width = int(minimap.get("width") or 3074)
    height = int(minimap.get("height") or 2250)
    scenes = minimap.get("scenes") if isinstance(minimap.get("scenes"), dict) else {}
    claimed_scenes: set[str] = set()
    hotspots: list[dict[str, Any]] = []

    for index, raw in enumerate(hotspot_source.get("hotspots") or []):
        if not isinstance(raw, dict) or not raw.get("id"):
            continue
        hotspot_id = str(raw["id"])
        x, y = _original_aerial_position(raw, image_meta, width, height)
        scene_id = TOUR_SCENE_BY_STOP.get(hotspot_id, "")
        scene = scenes.get(scene_id) or scenes.get(next((key for key in scenes if _normalized_key(key) == _normalized_key(scene_id)), ""))
        if isinstance(scene, dict):
            x, y = float(scene.get("x") or x), float(scene.get("y") or y)
            claimed_scenes.add(next((key for key in scenes if _normalized_key(key) == _normalized_key(scene_id)), scene_id))
        panorama = raw.get("panorama") if isinstance(raw.get("panorama"), dict) else {}
        captured = PANORAMA_COORDINATES.get(_normalized_key(hotspot_id)) or PANORAMA_COORDINATES.get(_normalized_key(scene_id))
        media = next((item for item in raw.get("media") or [] if isinstance(item, dict) and item.get("src")), {})
        audio = raw.get("audioByLanguage") if isinstance(raw.get("audioByLanguage"), dict) else {}
        translations = raw.get("translations") if isinstance(raw.get("translations"), dict) else {}
        tl = translations.get("tl") if isinstance(translations.get("tl"), dict) else {}
        hotspots.append({
            "id": hotspot_id, "enabled": True, "sortOrder": index,
            "title": {"en": str(raw.get("title") or hotspot_id), "tl": TAGALOG_TITLES.get(hotspot_id, "")},
            "category": str(raw.get("category") or "General"),
            "description": {"en": str(raw.get("description") or ""), "tl": str(tl.get("description") or "")},
            "markerStyle": "main" if hotspot_id == "church" else "dot",
            "showAerial": True, "aerial": {"x": x, "y": y},
            "show360": bool(captured or panorama),
            "panorama": {"pitch": (captured or (panorama.get("pitch"), panorama.get("yaw")))[0], "yaw": (captured or (panorama.get("pitch"), panorama.get("yaw")))[1]} if (captured or panorama) else {"pitch": 0, "yaw": 0},
            "linkedViews": True,
            "imagePath": str(media.get("src") or ""), "imageAlt": str(media.get("alt") or ""),
            "audio": {"en": str(audio.get("en") or raw.get("audio") or ""), "tl": str(audio.get("tl") or "")},
            "virtualTourScene": scene_id,
            "action": {
                "label": {"en": str(raw.get("learnMoreLabel") or raw.get("arModelLabel") or ""), "tl": ""},
                "url": str(raw.get("learnMore") or raw.get("arModel") or ""),
            },
        })

    landmarks = minimap.get("landmarks") if isinstance(minimap.get("landmarks"), list) else []
    museum = next((item for item in landmarks if str(item.get("label") or "").lower() == "museum"), None)
    chapel = next((item for item in landmarks if str(item.get("label") or "").lower() == "chapel"), None)
    church = next((item for item in hotspots if item["id"] == "church"), None)
    if church and chapel:
        church["aerial"] = {"x": float(chapel["x"]), "y": float(chapel["y"])}
    if museum:
        hotspots.append({
            "id": "museum-landmark", "enabled": True, "sortOrder": len(hotspots),
            "title": {"en": "Museum", "tl": "Museo"}, "category": "Landmark", "markerStyle": "main",
            "description": {
                "en": "The museum preserves and interprets the history of the Nagcarlan Underground Cemetery. Its exhibits help visitors understand the site’s architecture, burial traditions, cultural importance, and role in Philippine history.",
                "tl": "Pinangangalagaan at ipinapaliwanag ng museo ang kasaysayan ng Libingan sa Ilalim ng Lupa ng Nagcarlan. Tinutulungan ng mga eksibit nito ang mga bisita na maunawaan ang arkitektura, mga tradisyon sa paglilibing, kahalagahang pangkultura, at papel ng pook sa kasaysayan ng Pilipinas.",
            },
            "showAerial": True, "aerial": {"x": float(museum["x"]), "y": float(museum["y"])},
            "show360": True, "panorama": {"pitch": -35.64, "yaw": -47.54}, "linkedViews": True,
            "imagePath": "/static/SiteMap/Museum/InsideMuseum.png",
            "imageAlt": "Interior of the museum at the Nagcarlan Underground Cemetery",
            "audio": {"en": "", "tl": ""}, "virtualTourScene": "insidemuseum",
            "action": {"label": {"en": "Online Gallery", "tl": "Online Gallery"}, "url": "/online-gallery"},
        })

    for scene_id, position in scenes.items():
        if scene_id in claimed_scenes or not isinstance(position, dict):
            continue
        captured = PANORAMA_COORDINATES.get(_normalized_key(scene_id))
        label = str(position.get("label") or scene_id)
        hotspots.append({
            "id": f"virtual-tour-{slugify(scene_id, 'scene')}", "enabled": True, "sortOrder": len(hotspots),
            "title": {"en": label, "tl": ""}, "category": "Virtual Tour Stop", "markerStyle": "dot",
            "description": {"en": f"This point marks the “{label}” location in the Virtual Tour.", "tl": f"Tinutukoy ng puntong ito ang lokasyong “{label}” sa Virtual Tour."},
            "showAerial": True, "aerial": {"x": float(position.get("x") or 0), "y": float(position.get("y") or 0)},
            "show360": bool(captured), "panorama": {"pitch": captured[0], "yaw": captured[1]} if captured else {"pitch": 0, "yaw": 0},
            "linkedViews": True, "imagePath": "", "imageAlt": "", "audio": {"en": "", "tl": ""},
            "virtualTourScene": scene_id, "action": {"label": {"en": "", "tl": ""}, "url": ""},
        })

    return {
        "schemaVersion": 2,
        "coordinateSystem": "image-top-left",
        "aerialMap": {"path": str(minimap.get("image") or "/static/images/site-map/aerial-map.jpg"), "width": width, "height": height},
        "panoramaMap": {"path": "/static/images/site-map/360aerial_view.jpg", "width": 4096, "height": 2048, "initialPitch": 0, "initialYaw": 0, "initialHfov": 110},
        "introAudio": {"en": "/static/images/site-map/SiteMapIntroEng.mp3", "tl": "/static/images/site-map/SiteMapIntroTag.mp3"},
        "settings": {"defaultView": "aerial", "hotspotsVisible": True},
        "hotspots": hotspots,
    }


def _number(value: Any, minimum: float, maximum: float, label: str, default: float = 0.0) -> float:
    try:
        result = float(default if value in (None, "") else value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{label} must be a number.") from exc
    if result < minimum or result > maximum:
        raise ValueError(f"{label} must be between {minimum:g} and {maximum:g}.")
    return round(result, 5)


def _image_dimension(value: Any, label: str, default: int) -> int:
    try:
        result = int(value or default)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{label} must be a positive whole number.") from exc
    if result < 1:
        raise ValueError(f"{label} must be a positive whole number.")
    return result


def upgrade_coordinate_system(config: dict[str, Any]) -> tuple[dict[str, Any], bool]:
    """Upgrade early drafts to one consistent image-top-left coordinate system."""
    if not isinstance(config, dict):
        return config, False
    try:
        schema_version = int(config.get("schemaVersion") or 1)
    except (TypeError, ValueError):
        schema_version = 1
    already_top_left = config.get("coordinateSystem") == "image-top-left"
    if already_top_left and schema_version >= 2:
        return config, False
    repaired = json.loads(json.dumps(config))
    tour_derived_ids = {
        "front-gate", "flag-pole", "middle-ground", "left-side-inside", "right-side-inside",
        "left-tombs", "right-tombs", "church-front", "church", "museum-landmark",
    }
    legacy_leaflet_ids = {"parking", "resource-center-office", "underground-crypts"}
    for hotspot in repaired.get("hotspots") if isinstance(repaired.get("hotspots"), list) else []:
        if not isinstance(hotspot, dict):
            continue
        hotspot_id = str(hotspot.get("id") or "")
        should_flip_tour_position = not already_top_left and (
            hotspot_id in tour_derived_ids or hotspot_id.startswith("virtual-tour-")
        )
        if not should_flip_tour_position and hotspot_id not in legacy_leaflet_ids:
            continue
        aerial = hotspot.get("aerial") if isinstance(hotspot.get("aerial"), dict) else None
        if aerial is None:
            continue
        try:
            aerial["y"] = round(1.0 - float(aerial.get("y")), 5)
        except (TypeError, ValueError):
            continue
    repaired["coordinateSystem"] = "image-top-left"
    repaired["schemaVersion"] = 2
    return repaired, True


def _text(value: Any, label: str, maximum: int, minimum: int = 0) -> str:
    result = str(value or "").strip()
    if len(result) < minimum:
        raise ValueError(f"{label} must be at least {minimum} characters.")
    if len(result) > maximum:
        raise ValueError(f"{label} cannot exceed {maximum} characters.")
    return result


def _safe_link(value: Any) -> str:
    result = str(value or "").strip()
    if not result:
        return ""
    parsed = urlparse(result)
    if result.startswith("/") or (parsed.scheme in {"http", "https"} and parsed.netloc):
        return result[:1000]
    raise ValueError("Hotspot links must be an internal path or a complete http/https URL.")


def _asset_path(value: Any, *, site_map_id: int, kind: str, validated: set[tuple[str, str]]) -> str:
    path = str(value or "").strip()
    if not path:
        return ""
    if path.startswith(("/static/", "/images/", "/audio/", "/360VirtualTour/")):
        return path
    normalized = path.lstrip("/")
    if not normalized.startswith(f"{STORAGE_PREFIX}/{int(site_map_id)}/"):
        raise ValueError("A Site Map asset is outside its protected storage folder.")
    key = (normalized, kind)
    if key not in validated:
        validate_stored_asset(normalized, kind, site_map_id=site_map_id)
        validated.add(key)
    return normalized


def validate_config(raw: Any, *, site_map_id: int) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValueError("The Site Map configuration is invalid.")
    validated: set[tuple[str, str]] = set()
    aerial = raw.get("aerialMap") if isinstance(raw.get("aerialMap"), dict) else {}
    panorama = raw.get("panoramaMap") if isinstance(raw.get("panoramaMap"), dict) else {}
    intro = raw.get("introAudio") if isinstance(raw.get("introAudio"), dict) else {}
    settings = raw.get("settings") if isinstance(raw.get("settings"), dict) else {}
    aerial_path = _asset_path(aerial.get("path"), site_map_id=site_map_id, kind="image", validated=validated)
    panorama_path = _asset_path(panorama.get("path"), site_map_id=site_map_id, kind="panorama", validated=validated)
    if not aerial_path or not panorama_path:
        raise ValueError("Both an aerial map and a 360° panorama are required.")
    hotspots = []
    used_ids = set()
    for index, item in enumerate(raw.get("hotspots") if isinstance(raw.get("hotspots"), list) else []):
        if not isinstance(item, dict) or len(hotspots) >= 200:
            continue
        title = item.get("title") if isinstance(item.get("title"), dict) else {}
        description = item.get("description") if isinstance(item.get("description"), dict) else {}
        audio = item.get("audio") if isinstance(item.get("audio"), dict) else {}
        action = item.get("action") if isinstance(item.get("action"), dict) else {}
        action_label = action.get("label") if isinstance(action.get("label"), dict) else {}
        hotspot_id = slugify(item.get("id") or title.get("en"), f"hotspot-{index + 1}")[:100]
        if hotspot_id in used_ids:
            raise ValueError(f"Hotspot ID “{hotspot_id}” is duplicated.")
        used_ids.add(hotspot_id)
        show_aerial, show_360 = bool(item.get("showAerial")), bool(item.get("show360"))
        if not show_aerial and not show_360:
            raise ValueError(f"Hotspot “{title.get('en') or hotspot_id}” must appear in at least one view.")
        aerial_position = item.get("aerial") if isinstance(item.get("aerial"), dict) else {}
        panorama_position = item.get("panorama") if isinstance(item.get("panorama"), dict) else {}
        hotspots.append({
            "id": hotspot_id, "enabled": bool(item.get("enabled", True)), "sortOrder": index,
            "title": {"en": _text(title.get("en"), "English hotspot title", 120, 2), "tl": _text(title.get("tl"), "Tagalog hotspot title", 120)},
            "category": _text(item.get("category") or "General", "Category", 80, 2),
            "description": {"en": _text(description.get("en"), "English description", 5000), "tl": _text(description.get("tl"), "Tagalog description", 5000)},
            "markerStyle": "main" if item.get("markerStyle") == "main" else "dot",
            "showAerial": show_aerial,
            "aerial": {"x": _number(aerial_position.get("x"), 0, 1, "Aerial X"), "y": _number(aerial_position.get("y"), 0, 1, "Aerial Y")},
            "show360": show_360,
            "panorama": {"pitch": _number(panorama_position.get("pitch"), -90, 90, "360 pitch"), "yaw": _number(panorama_position.get("yaw"), -180, 180, "360 yaw")},
            "linkedViews": bool(item.get("linkedViews", True)),
            "imagePath": _asset_path(item.get("imagePath"), site_map_id=site_map_id, kind="image", validated=validated),
            "imageAlt": _text(item.get("imageAlt"), "Image alternative text", 250),
            "audio": {
                "en": _asset_path(audio.get("en"), site_map_id=site_map_id, kind="audio", validated=validated),
                "tl": _asset_path(audio.get("tl"), site_map_id=site_map_id, kind="audio", validated=validated),
            },
            "virtualTourScene": _text(item.get("virtualTourScene"), "Virtual Tour scene", 120),
            "action": {"label": {"en": _text(action_label.get("en"), "English button label", 80), "tl": _text(action_label.get("tl"), "Tagalog button label", 80)}, "url": _safe_link(action.get("url"))},
        })
    if not hotspots:
        raise ValueError("Add at least one Site Map hotspot before saving.")
    return {
        "schemaVersion": 2,
        "coordinateSystem": "image-top-left",
        "aerialMap": {"path": aerial_path, "width": _image_dimension(aerial.get("width"), "Aerial width", 3074), "height": _image_dimension(aerial.get("height"), "Aerial height", 2250)},
        "panoramaMap": {"path": panorama_path, "width": int(_number(panorama.get("width"), 1024, 12000, "Panorama width", 4096)), "height": int(_number(panorama.get("height"), 512, 6000, "Panorama height", 2048)), "initialPitch": _number(panorama.get("initialPitch"), -90, 90, "Initial pitch"), "initialYaw": _number(panorama.get("initialYaw"), -180, 180, "Initial yaw"), "initialHfov": _number(panorama.get("initialHfov"), 30, 150, "Initial field of view", 110)},
        "introAudio": {"en": _asset_path(intro.get("en"), site_map_id=site_map_id, kind="audio", validated=validated), "tl": _asset_path(intro.get("tl"), site_map_id=site_map_id, kind="audio", validated=validated)},
        "settings": {"defaultView": "360" if settings.get("defaultView") == "360" else "aerial", "hotspotsVisible": bool(settings.get("hotspotsVisible", True))},
        "hotspots": hotspots,
    }


def prepare_upload(*, filename: Any, kind: str, site_map_id: int, file_size: Any) -> dict[str, Any]:
    allowed = AUDIO_EXTENSIONS if kind == "audio" else IMAGE_EXTENSIONS if kind in {"image", "aerial", "panorama"} else set()
    extension = Path(str(filename or "")).suffix.lower()
    if not allowed or extension not in allowed:
        raise ValueError(f"Unsupported {kind or 'asset'} file type.")
    try:
        size = int(file_size)
    except (TypeError, ValueError) as exc:
        raise ValueError("The upload size is invalid.") from exc
    maximum = MAX_MAP_BYTES if kind in {"aerial", "panorama"} else MAX_MEDIA_BYTES
    if size < 1 or size > maximum:
        raise ValueError(f"The selected file exceeds the {maximum // (1024 * 1024)} MB limit.")
    folder = "maps" if kind in {"aerial", "panorama"} else kind
    path = f"{STORAGE_PREFIX}/{int(site_map_id)}/{folder}/{slugify(Path(str(filename)).stem, kind)}-{uuid4().hex[:12]}{extension}"
    response = get_supabase_client().storage.from_(get_virtual_tour_bucket_name()).create_signed_upload_url(path)
    data = response if isinstance(response, dict) else getattr(response, "data", None) or {}
    token = data.get("token") or data.get("signedToken") or data.get("signed_token")
    if not token:
        raise RuntimeError("Supabase did not return a signed upload token.")
    return {"bucket": get_virtual_tour_bucket_name(), "path": path, "token": token}


def validate_stored_asset(path: Any, kind: str, *, site_map_id: int) -> dict[str, Any]:
    normalized = str(path or "").strip().lstrip("/")
    if not normalized.startswith(f"{STORAGE_PREFIX}/{int(site_map_id)}/"):
        raise ValueError("The uploaded asset is outside the Site Map storage folder.")
    raw = get_supabase_client().storage.from_(get_virtual_tour_bucket_name()).download(normalized)
    data = bytes(raw or b"")
    maximum = MAX_MAP_BYTES if kind in {"panorama", "image"} else MAX_MEDIA_BYTES
    if not data or len(data) > maximum:
        raise ValueError("The uploaded file is empty or too large.")
    if kind in {"image", "panorama"}:
        try:
            from PIL import Image, UnidentifiedImageError
            with Image.open(io.BytesIO(data)) as image:
                image.verify()
            with Image.open(io.BytesIO(data)) as image:
                width, height = image.size
        except (ImportError, UnidentifiedImageError, OSError) as exc:
            raise ValueError("The uploaded file is not a decodable image.") from exc
        if kind == "panorama" and (width < 1024 or height < 512 or abs((width / height) - 2.0) > 0.02):
            raise ValueError("The 360° map must be an equirectangular 2:1 image of at least 1024 × 512 pixels.")
        return {"width": width, "height": height, "size": len(data)}
    if kind == "audio" and not (data[:3] == b"ID3" or data[:2] in {b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"} or data[:4] in {b"RIFF", b"OggS"} or data[4:8] == b"ftyp"):
        raise ValueError("The uploaded narration is not a recognized MP3, WAV, OGG, or M4A file.")
    return {"size": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def _all_referenced_paths(site_map_id: int) -> set[str]:
    result: set[str] = set()
    for revision in list_revisions(site_map_id):
        config = revision.get("config") if isinstance(revision.get("config"), dict) else {}
        for section in ("aerialMap", "panoramaMap"):
            result.add(str((config.get(section) or {}).get("path") or "").lstrip("/"))
        result.update(str(value or "").lstrip("/") for value in (config.get("introAudio") or {}).values())
        for hotspot in config.get("hotspots") or []:
            result.add(str(hotspot.get("imagePath") or "").lstrip("/"))
            result.update(str(value or "").lstrip("/") for value in (hotspot.get("audio") or {}).values())
    return {path for path in result if path.startswith(f"{STORAGE_PREFIX}/{int(site_map_id)}/")}


def list_asset_paths(site_map_id: int) -> list[str]:
    return sorted(_all_referenced_paths(site_map_id))


def discard_uploads(values: Any, *, site_map_id: int) -> int:
    prefix = f"{STORAGE_PREFIX}/{int(site_map_id)}/"
    candidates = []
    for value in values if isinstance(values, list) else []:
        path = str(value or "").strip().lstrip("/")
        if path.startswith(prefix) and path not in candidates:
            candidates.append(path)
        if len(candidates) >= 20:
            break
    removable = [path for path in candidates if path not in _all_referenced_paths(site_map_id)]
    if removable:
        get_supabase_client().storage.from_(get_virtual_tour_bucket_name()).remove(removable)
    return len(removable)


def _signed_asset_urls(paths: list[Any]) -> dict[str, str]:
    normalized = list(dict.fromkeys(str(path or "").strip().lstrip("/") for path in paths if str(path or "").strip() and not str(path).startswith("/")))
    if not normalized:
        return {}
    result: dict[str, str] = {}
    bucket = get_supabase_client().storage.from_(get_virtual_tour_bucket_name())
    try:
        response = bucket.create_signed_urls(normalized, SIGNED_URL_SECONDS)
        rows = response if isinstance(response, list) else (response.get("data") if isinstance(response, dict) else getattr(response, "data", None)) or []
        for index, item in enumerate(rows):
            if not isinstance(item, dict):
                continue
            path = str(item.get("path") or normalized[index])
            url = str(item.get("signedURL") or item.get("signedUrl") or item.get("signed_url") or "")
            if url.startswith("/"):
                url = str(os.getenv("SUPABASE_URL") or "").rstrip("/") + url
            if url:
                result[path] = url
    except Exception:
        pass
    for path in normalized:
        if path in result:
            continue
        response = bucket.create_signed_url(path, SIGNED_URL_SECONDS)
        data = response if isinstance(response, dict) else getattr(response, "data", None) or {}
        url = str(data.get("signedURL") or data.get("signedUrl") or data.get("signed_url") or "")
        if url.startswith("/"):
            url = str(os.getenv("SUPABASE_URL") or "").rstrip("/") + url
        result[path] = url
    return result


def config_with_urls(config: dict[str, Any]) -> dict[str, Any]:
    result = json.loads(json.dumps(config))
    paths: list[str] = []
    for section in ("aerialMap", "panoramaMap"):
        paths.append(str((result.get(section) or {}).get("path") or ""))
    paths.extend(str(value or "") for value in (result.get("introAudio") or {}).values())
    for hotspot in result.get("hotspots") or []:
        paths.append(str(hotspot.get("imagePath") or ""))
        paths.extend(str(value or "") for value in (hotspot.get("audio") or {}).values())
    signed = _signed_asset_urls(paths) if is_supabase_configured() else {}

    def url(path: Any) -> str:
        value = str(path or "").strip()
        return value if value.startswith("/") or value.startswith(("http://", "https://")) else signed.get(value.lstrip("/"), "")

    result["aerialMap"]["url"] = url(result["aerialMap"].get("path"))
    result["panoramaMap"]["url"] = url(result["panoramaMap"].get("path"))
    result["introAudio"]["enUrl"] = url(result["introAudio"].get("en"))
    result["introAudio"]["tlUrl"] = url(result["introAudio"].get("tl"))
    for hotspot in result.get("hotspots") or []:
        hotspot["imageUrl"] = url(hotspot.get("imagePath"))
        hotspot["audio"]["enUrl"] = url(hotspot["audio"].get("en"))
        hotspot["audio"]["tlUrl"] = url(hotspot["audio"].get("tl"))
    return result


def build_public_site_map_config() -> dict[str, Any] | None:
    if not is_supabase_configured():
        return None
    try:
        site_map = get_site_map()
        revision_id = int((site_map or {}).get("published_revision_id") or 0)
        revision = get_revision(revision_id) if revision_id else None
        config = revision.get("config") if revision and isinstance(revision.get("config"), dict) else None
        if not config:
            return None
        config, _ = upgrade_coordinate_system(config)
        result = config_with_urls(config)
        result["source"] = "database"
        result["revisionId"] = revision_id
        return result
    except Exception:
        return None
