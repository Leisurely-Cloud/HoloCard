# Development boundaries

The existing `scripts/run_pipeline.py --project ...` entry point and JSON configuration remain supported.

- `project_config.py`: required/optional image names, configuration loading and browser asset paths. Extend this contract when introducing a new layer.
- `viewer_build.py`: template copying, dependency installation and bundling. Template caches are excluded and a failed bundle stops the build instead of quietly shipping stale JavaScript.
- `run_pipeline.py`: coordinates validation, Blender build/export and viewer assembly. Keep scene construction in build_card.py and geometry export in export_web.py.
- `assets/web-template/app.js`: viewer lifecycle and interaction wiring. Material source is in shaders.js, back artwork/labels in back-art.js, independent plane placement in relief.js, branding in viewer-ui.js. All modules still ship as one app.bundle.js.
- `style.css`: base layout and fallback renderer. `ui.css`: visual treatment and responsive controls.

Run `python scripts/test_pipeline.py` and `node --test scripts/test_viewer.mjs` for regression checks. Build a fresh project with prepared assets, then run `node scripts/verify_web.mjs <project>` for real WebGL, flip, download, depth controls and mobile verification. Inspect captured front/back and tilt frames. Rebuild the template bundle using bundle.sh (or the pipeline's bundled output) after module changes.

Keep generated card projects, images, dependency caches and credentials outside the skill. Use package_skill.py to audit a shareable ZIP.
