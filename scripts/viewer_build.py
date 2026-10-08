"""Assemble and bundle a standalone viewer without copying runtime caches."""
from pathlib import Path
import json
import shutil
import subprocess
import sys
from project_config import OPTIONAL_LAYERS, layer_names, web_config


def assemble_viewer(root, template):
    root = Path(root)
    config = web_config(root)
    names = layer_names(root)
    web = root / "web"
    shutil.copytree(template, web, dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns("node_modules", ".git", "__pycache__"))
    assets = web / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    if not assets.resolve().is_relative_to(web.resolve()):
        raise ValueError("web/assets must stay inside the viewer directory")
    # Only remove managed optional layers that the source no longer supplies.
    # Preserve the exported model, custom files and installed dependencies.
    for name in OPTIONAL_LAYERS:
        if name not in names:
            (assets / f"{name}.png").unlink(missing_ok=True)
    for name in names:
        shutil.copy2(root / "assets" / f"{name}.png", assets / f"{name}.png")
    (web / "card-config.json").write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf8")
    return web


def install_dependencies(web):
    npm = shutil.which("npm.cmd") or shutil.which("npm")
    if not npm:
        raise RuntimeError("Install Node.js/npm, then run npm install --ignore-scripts in web/")
    subprocess.run([npm, "install", "--ignore-scripts", "--no-audit", "--no-fund"], cwd=web, check=True)


def bundle_viewer(web):
    bun = shutil.which("bun")
    if not bun:
        local = Path.home() / ".bun" / "bin" / ("bun.exe" if sys.platform == "win32" else "bun")
        bun = str(local) if local.is_file() else None
    npx = shutil.which("npx.cmd") or shutil.which("npx")
    if bun:
        command = [bun, "build", "./app.js", "--outfile=./app.bundle.js", "--target=browser"]
    elif npx:
        command = [npx, "--yes", "esbuild@0.25.0", "app.js", "--bundle", "--format=esm", "--target=es2020", "--outfile=app.bundle.js"]
    else:
        raise RuntimeError("Install Node.js/npm or Bun to bundle the viewer")
    # A failed build must not be reported as success using a stale template bundle.
    subprocess.run(command, cwd=web, check=True)
