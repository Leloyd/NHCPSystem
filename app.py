from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("Landing.html")


@app.route("/digital-exhibits")
def digital_exhibits():
    return render_template("DigitalExhibits.html")


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


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
