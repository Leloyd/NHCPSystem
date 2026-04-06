from pathlib import Path

from flask import Flask, jsonify, redirect, render_template, request, send_from_directory, url_for

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover - optional in some environments
    load_dotenv = None

app = Flask(__name__)
WEBXR_BASE_DIR = (Path(__file__).resolve().parent / "webxr_runtime").resolve()


def _build_webxr_config():
    if load_dotenv is not None:
        load_dotenv(dotenv_path=WEBXR_BASE_DIR / ".env", override=False)

    from webxr_runtime.app.config import get_config_class

    config_class = get_config_class()
    config = {}

    for name in dir(config_class):
        if name.isupper():
            config[name] = getattr(config_class, name)

    return config


def _initialize_webxr_runtime():
    try:
        from webxr_runtime.app.services import RuntimeSceneService

        config = _build_webxr_config()
        runtime_scene = RuntimeSceneService(config)
        runtime_scene.initialize()

        app.logger.info("WebXR runtime initialized from %s", config.get("BASE_DIR"))
        return config, runtime_scene, None
    except Exception as exc:  # noqa: BLE001
        app.logger.exception("WebXR runtime initialization failed.")
        return {}, None, str(exc)


def _resolve_safe_path(root_dir, relative_path):
    root_resolved = Path(root_dir).resolve()
    candidate = (root_resolved / relative_path).resolve()

    if root_resolved not in candidate.parents and candidate != root_resolved:
        return None

    return candidate


def _get_webxr_config_value(name, fallback):
    if isinstance(WEBXR_CONFIG, dict):
        value = WEBXR_CONFIG.get(name)
        if value not in (None, ""):
            return value
    return fallback


def _ensure_webxr_runtime_initialized():
    global WEBXR_CONFIG
    global WEBXR_RUNTIME_SCENE
    global WEBXR_INIT_ERROR

    if WEBXR_RUNTIME_SCENE is not None:
        return True

    WEBXR_CONFIG, WEBXR_RUNTIME_SCENE, WEBXR_INIT_ERROR = _initialize_webxr_runtime()
    return WEBXR_RUNTIME_SCENE is not None


WEBXR_CONFIG, WEBXR_RUNTIME_SCENE, WEBXR_INIT_ERROR = _initialize_webxr_runtime()


@app.route("/")
def index():
    return render_template("Landing.html")


@app.route("/digital-exhibits")
def digital_exhibits():
    return render_template("DigitalExhibits.html")


@app.route("/online-gallery")
def online_gallery():
    return render_template("OnlineGallery.html")


@app.route("/virtual-tour")
def virtual_tour():
    return render_template("VirtualTour.html")


@app.route("/ar-content-detection")
def ar_content_detection():
    return render_template("ARContentDetection.html", analytics_endpoint=url_for("ar_analytics"))


@app.route("/ar-launch/<artifact_key>")
def ar_launch(artifact_key):
    return redirect(url_for("ar_content_detection"))


@app.post("/api/ar/analytics")
def ar_analytics():
    payload = request.get_json(silent=True) or {}
    event = str(payload.get("event", "unknown"))[:120]
    marker = str(payload.get("marker", ""))[:120]
    model = str(payload.get("model", ""))[:120]

    app.logger.info(
        "ar_analytics event=%s marker=%s model=%s ua=%s",
        event,
        marker,
        model,
        request.headers.get("User-Agent", ""),
    )

    return jsonify({"ok": True})


@app.route("/accessibility")
def accessibility():
    return render_template("Accessibility.html")


@app.route("/interactive")
def interactive():
    return render_template("Interactive.html")


@app.route("/site-map")
def site_map():
    return render_template("SiteMap.html")


@app.route("/3d-environment")
def three_d_environment():
    return render_template("WebXR.html", webxr_init_error=WEBXR_INIT_ERROR)


@app.route("/api/webxr/scene")
def webxr_scene_metadata():
    if WEBXR_RUNTIME_SCENE is None and not _ensure_webxr_runtime_initialized():
        return jsonify({"error": "WebXR runtime is unavailable.", "details": WEBXR_INIT_ERROR}), 503

    zip_override = (request.args.get("zip") or "").strip() or None

    try:
        scene_description = WEBXR_RUNTIME_SCENE.get_scene_description(zip_override=zip_override)
    except Exception as exc:  # noqa: BLE001
        app.logger.exception("Failed to produce WebXR scene metadata.")
        return jsonify({"error": str(exc)}), 500

    payload = {
        "app": {
            "name": WEBXR_CONFIG.get("APP_NAME", "Marble WebXR Viewer"),
            "debug": bool(WEBXR_CONFIG.get("DEBUG", False)),
        },
        "player": WEBXR_CONFIG.get("PLAYER_SETTINGS", {}),
        "quality": {
            "default": WEBXR_CONFIG.get("DEFAULT_QUALITY", "auto"),
            "options": ["auto", "low", "medium", "high"],
        },
        "debug": {
            "collision": bool(WEBXR_CONFIG.get("DEBUG_COLLISION", False)),
        },
        "scene": scene_description,
    }
    return jsonify(payload)


@app.route("/api/webxr/healthz")
def webxr_healthz():
    if WEBXR_RUNTIME_SCENE is None and not _ensure_webxr_runtime_initialized():
        return jsonify({"ready": False, "error": WEBXR_INIT_ERROR, "startupReport": {}}), 503

    payload = WEBXR_RUNTIME_SCENE.get_health_payload()
    status_code = 200 if payload.get("ready") else 503
    return jsonify(payload), status_code


@app.route("/webxr/runtime/<path:asset_path>")
def webxr_runtime_asset(asset_path):
    runtime_dir = Path(_get_webxr_config_value("RUNTIME_DIR", WEBXR_BASE_DIR / "runtime")).resolve()
    candidate_path = _resolve_safe_path(runtime_dir, asset_path)

    if candidate_path is None:
        return jsonify({"error": "Invalid runtime asset path"}), 400

    if not candidate_path.exists() or not candidate_path.is_file():
        return jsonify({"error": f"Asset not found: {asset_path}"}), 404

    return send_from_directory(str(runtime_dir), asset_path)


@app.route("/webxr/static/<path:asset_path>")
def webxr_static_asset(asset_path):
    static_dir = (Path(_get_webxr_config_value("BASE_DIR", WEBXR_BASE_DIR)) / "static").resolve()
    candidate_path = _resolve_safe_path(static_dir, asset_path)

    if candidate_path is None:
        return jsonify({"error": "Invalid static asset path"}), 400

    if not candidate_path.exists() or not candidate_path.is_file():
        return jsonify({"error": f"Static asset not found: {asset_path}"}), 404

    return send_from_directory(str(static_dir), asset_path)


@app.route("/webxr/images/<path:image_path>")
def webxr_image_asset(image_path):
    images_dir = (Path(_get_webxr_config_value("BASE_DIR", WEBXR_BASE_DIR)) / "images").resolve()
    candidate_path = _resolve_safe_path(images_dir, image_path)

    if candidate_path is None:
        return jsonify({"error": "Invalid image asset path"}), 400

    if not candidate_path.exists() or not candidate_path.is_file():
        return jsonify({"error": f"Image asset not found: {image_path}"}), 404

    return send_from_directory(str(images_dir), image_path)


@app.route("/participation")
def participation():
    return render_template("Participation.html")


@app.route("/news")
def news():
    return render_template("News.html")


@app.route("/support")
def support():
    return render_template("Support.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
