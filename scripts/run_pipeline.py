"""Build a user-owned Blender/Three.js project from prepared layered artwork."""
from pathlib import Path
import argparse
import subprocess
from ensure_blender import ensure_blender
from validate_assets import validate
from generate_typography import create
from project_config import load_config
from viewer_build import assemble_viewer, install_dependencies, bundle_viewer


def build_scene(root, blender, scripts, skip_render=False):
    command = [str(blender), "--background", "--factory-startup", "--python", str(scripts / "build_card.py"), "--", str(root)]
    if skip_render:
        command.append("--skip-render")
    subprocess.run(command, check=True)
    if not (root / "card.blend").is_file():
        raise RuntimeError("Blender did not save card.blend; inspect its log")


def export_model(root, blender, scripts):
    subprocess.run([str(blender), "--background", "--python", str(scripts / "export_web.py"), "--", str(root)], check=True)
    if not (root / "web" / "assets" / "card.glb").is_file():
        raise RuntimeError("GLB export failed")


def run_pipeline(project, blender_path=None, skip_render=False, skip_npm=False):
    root = Path(project).resolve()
    scripts = Path(__file__).resolve().parent
    load_config(root)
    if not (root / "assets" / "text.png").is_file():
        create(root)
    validate(root)
    blender = ensure_blender(root, blender_path)
    build_scene(root, blender, scripts, skip_render)
    export_model(root, blender, scripts)
    web = assemble_viewer(root, scripts.parent / "assets" / "web-template")
    if not skip_npm:
        install_dependencies(web)
    bundle_viewer(web)
    return root


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", required=True)
    parser.add_argument("--blender")
    parser.add_argument("--skip-render", action="store_true")
    parser.add_argument("--skip-npm", action="store_true")
    args = parser.parse_args()
    try:
        root = run_pipeline(args.project, args.blender, args.skip_render, args.skip_npm)
    except (ValueError, FileNotFoundError) as error:
        parser.error(str(error))
    print("Completed:", root / "card.blend")
    print("Preview: node", root / "web" / "server.mjs")
    print("Open http://127.0.0.1:4173 after starting the server")


if __name__ == "__main__":
    main()
