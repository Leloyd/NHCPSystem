from __future__ import annotations

import logging
import re
from pathlib import Path
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

    def get_scene_description(self, zip_override: str | None = None) -> dict[str, Any]:
        normalized_zip = str(zip_override or "").strip()
        if not normalized_zip:
            return self.scene_description

        override_config = self._build_override_config(normalized_zip)
        extraction = ensure_extracted(override_config)
        scene_description, _ = build_scene_description(extraction, override_config)

        return scene_description

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
            LOGGER.exception("Critical startup failure: required WebXR scene source is missing.")
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
        LOGGER.info("Scene source: %s", self._startup_report.get("zipFound"))
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

    def _build_override_config(self, zip_path: str) -> dict[str, Any]:
        override_config = dict(self._config)
        override_config["MARBLE_ZIP_PATH"] = zip_path

        scene_stem = Path(zip_path).stem or "scene"
        safe_scene_stem = re.sub(r"[^a-zA-Z0-9_-]+", "_", scene_stem).strip("_").lower() or "scene"

        override_config["EXTRACTED_DIR_NAME"] = f"{safe_scene_stem}_extracted"
        override_config["EXTRACT_STATE_FILE"] = f"{safe_scene_stem}_extract_state.json"

        return override_config
