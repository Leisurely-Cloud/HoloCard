"""Assemble and bundle a standalone viewer without copying runtime caches."""
from pathlib import Path
import json
import shutil
import subprocess
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


def require_build_tools(install=True):
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Install Node.js 22+ and make node available on PATH before building")
    npm = (shutil.which("npm.cmd") or shutil.which("npm")) if install else None
    if install and not npm:
        raise RuntimeError("Install npm with Node.js, or use --skip-npm with already installed viewer dependencies")
    return node, npm


def install_dependencies(web):
    web = Path(web)
    if not (web / "package-lock.json").is_file():
        raise RuntimeError("Viewer package-lock.json is missing; restore it from assets/web-template before installing")
    _, npm = require_build_tools()
    subprocess.run([npm, "ci", "--include=dev", "--include=optional", "--ignore-scripts",
                    "--no-audit", "--no-fund"], cwd=web, check=True)


def bundle_viewer(web):
    web = Path(web)
    node, _ = require_build_tools(install=False)
    if not (web / "node_modules" / "esbuild" / "package.json").is_file():
        raise RuntimeError("Local esbuild is missing; rerun the pipeline without --skip-npm, or run "
                           "npm ci --include=dev --include=optional --ignore-scripts in " + str(web))
    command = [node, "build.mjs"]
    # A failed build must not be reported as success using a stale template bundle.
    subprocess.run(command, cwd=web, check=True)
