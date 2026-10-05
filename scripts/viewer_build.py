"""Assemble and bundle a standalone viewer without copying runtime caches."""
from pathlib import Path
import json
import shutil
import subprocess
import sys
from project_config import layer_names, web_config


def assemble_viewer(root, template):
    root = Path(root)
    web = root / "web"
    shutil.copytree(template, web, dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns("node_modules", ".git", "__pycache__"))
    (web / "card-config.json").write_text(json.dumps(web_config(root), ensure_ascii=False, indent=2), encoding="utf8")
    for name in layer_names(root):
        shutil.copy2(root / "assets" / f"{name}.png", web / "assets" / f"{name}.png")
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
