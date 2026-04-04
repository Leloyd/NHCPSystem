from __future__ import annotations

import logging
import os
from pathlib import Path

from flask import Flask
from dotenv import load_dotenv

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

    from .config import get_config_class

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
