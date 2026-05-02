from __future__ import annotations

import os
import tempfile
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]


def _bool_env(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _runtime_dir() -> Path:
    configured = (os.getenv("WEBXR_RUNTIME_DIR") or "").strip()
    if configured:
        return Path(configured).expanduser().resolve()
    return Path(tempfile.gettempdir()).resolve() / "nhcp_webxr_runtime"


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

    RUNTIME_DIR = _runtime_dir()
    RUNTIME_URL_PREFIX = "/webxr/runtime"
    EXTRACTED_DIR_NAME = "church_extracted"
    EXTRACT_STATE_FILE = "church_extract_state.json"

    SPARK_FALLBACK_MODULE_URL = "/webxr/static/vendor/spark/spark.module.min.js"

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
