from __future__ import annotations

from pathlib import Path

from flask import Blueprint, Response, current_app, jsonify, render_template, request, send_from_directory

main_blueprint = Blueprint("main", __name__)


@main_blueprint.route("/")
def index() -> str:
    return render_template("index.html")


@main_blueprint.route("/api/scene")
def scene_metadata() -> Response:
    runtime_service = current_app.extensions["runtime_scene"]
    zip_override = (request.args.get("zip") or "").strip() or None
    scene_description = runtime_service.get_scene_description(zip_override=zip_override)

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
        "scene": scene_description,
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
