from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "FULL_SOURCE_DUMP.md"

FILES = [
    "requirements.txt",
    "package.json",
    ".env.example",
    ".gitignore",
    "run.py",
    "app/__init__.py",
    "app/config.py",
    "app/routes.py",
    "app/services/__init__.py",
    "app/services/extractor.py",
    "app/services/runtime_scene.py",
    "app/services/scene_parser.py",
    "scripts/sync_vendor.mjs",
    "scripts/build_source_dump.py",
    "templates/index.html",
    "static/css/app.css",
    "static/js/main.js",
    "static/js/app/utils.js",
    "static/js/app/interaction-registry.js",
    "static/js/app/ui-controller.js",
    "static/js/app/player-controller.js",
    "static/js/app/collision-system.js",
    "static/js/app/interaction-system.js",
    "static/js/app/webxr-app.js",
    "runtime/.gitkeep",
    "README.md",
]


parts: list[str] = ["# Full Source Dump\n"]

for rel in FILES:
    path = ROOT / rel
    parts.append(f"\n\n## {rel}\n\n```\n")
    if path.exists():
        parts.append(path.read_text(encoding="utf-8"))
        if not parts[-1].endswith("\n"):
            parts.append("\n")
    else:
        parts.append(f"[missing file: {rel}]\n")
    parts.append("```\n")

OUT.write_text("".join(parts), encoding="utf-8")
print(f"WROTE {OUT}")
