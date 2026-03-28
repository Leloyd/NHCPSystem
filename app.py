from flask import Flask, jsonify, redirect, render_template, request, url_for

app = Flask(__name__)


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
