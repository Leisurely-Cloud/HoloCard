# Development boundaries

The existing `scripts/run_pipeline.py --project ...` entry point and JSON configuration remain supported.

- `project_config.py`: required/optional image names, configuration loading and browser asset paths. Extend this contract when introducing a new layer.
- `viewer_build.py`: template copying, dependency installation and bundling. Template caches are excluded and a failed bundle stops the build instead of quietly shipping stale JavaScript.
- `run_pipeline.py`: coordinates validation, Blender build/export and viewer assembly. Keep scene construction in build_card.py and geometry export in export_web.py.
- `assets/web-template/app.js`: viewer lifecycle and interaction wiring. Material source is in shaders.js, back artwork/labels in back-art.js, independent plane placement in relief.js, branding in viewer-ui.js. All modules still ship as one app.bundle.js.
- `loading.js`: terminal loading/error state and accessible progress UI. `gestures.js`: single-pointer rotation and two-pointer pinch tracking. `render-loop.js`: invalidation, visibility and render cadence; static reduced-motion frames sleep until invalidated.
- `style.css`: base layout and fallback renderer. `ui.css`: visual treatment and responsive controls.

Run `python scripts/test_pipeline.py` and `node --test scripts/test_viewer.mjs scripts/test_experience.mjs` for regression checks. Build a fresh project with prepared assets, then run `node scripts/verify_web.mjs <project>` for real WebGL, flip, download, depth controls and mobile verification. Inspect captured front/back and tilt frames. Rebuild the template bundle using bundle.sh (or the pipeline's bundled output) after module changes.

Keep generated card projects, images, dependency caches and credentials outside the skill. Use package_skill.py to audit a shareable ZIP.

## Configuration contract

`load_config` validates before typography generation or Blender startup. `title` is a nonblank string; other metadata is optional and must be strings when supplied. Optional sections must be JSON objects. Missing optional fields retain the existing renderer defaults; extra metadata and extension fields are preserved.

Supported scales and layer dimensions must be positive finite numbers. Depths and offsets must be finite numbers; signed depths and offsets remain supported without restricting them to the viewer's slider range. `parameters.foil` is between 0 and 1. Offsets and `artworkFit` have two components; artwork fit components are positive. Layer crops use nonnegative `[left, top, right, bottom]` pixel coordinates with a positive area. `sourceMode` accepts `composite`, `reference` or `relief`; `appearance.finish` accepts `pearl`, `silver`, `gold` or `original`. Errors identify the field, or the line and column for malformed JSON. Colors are checked as strings; their CSS validity and contrast still need visual inspection.

Viewer assembly refreshes the supported source images and removes `web/assets/back.png` or `effects.png` when the corresponding source image is absent. It preserves `card.glb`, custom files and dependency caches. Do not delete the entire output directory to rebuild a viewer.

## Continuous integration

The [regression workflow](../.github/workflows/checks.yml) runs on pushes and pull requests, and can be started manually. It checks Python 3.9 on Linux and Python 3.13 on Linux, Windows and macOS, with Node.js 22. It runs pipeline, checkerboard-transparency and viewer tests, installs the locked viewer dependencies, rebuilds the JavaScript bundle and audits a text-only skill ZIP.

These checks do not run Blender or a rendered browser session. Changes to geometry, shaders or viewer interaction still require a fresh project build, `verify_web.mjs` and visual review as described above.
