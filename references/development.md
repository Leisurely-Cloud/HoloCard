# Development boundaries

The existing `scripts/run_pipeline.py --project ...` entry point and JSON configuration remain supported.

- `project_config.py`: required/optional image names, configuration loading and browser asset paths. Extend this contract when introducing a new layer.
- `viewer_build.py`: template copying, dependency installation and bundling. Template caches are excluded and a failed bundle stops the build instead of quietly shipping stale JavaScript.
- `run_pipeline.py`: coordinates validation, Blender build/export and viewer assembly. Keep scene construction in build_card.py and geometry export in export_web.py.
- `assets/web-template/app.js`: viewer lifecycle and interaction wiring. Material source is in shaders.js, back artwork/labels in back-art.js, independent plane placement in relief.js, branding in viewer-ui.js. All modules still ship as one app.bundle.js.
- `loading.js`: terminal loading/error state and accessible progress UI. `gestures.js`: single-pointer rotation and two-pointer pinch tracking. `render-loop.js`: invalidation, visibility and render cadence; static reduced-motion frames sleep until invalidated.
- `style.css`: base layout and fallback renderer. `ui.css`: visual treatment and responsive controls.
- `view-settings.js`: presentation presets, validation, portable JSON export/import and original-settings restoration, shared by WebGL and CSS renderers.

Run `python scripts/test_pipeline.py` and `node --test scripts/test_viewer.mjs scripts/test_experience.mjs scripts/test_settings.mjs` for regression checks. Build a fresh project with prepared assets, then run `node scripts/verify_web.mjs <project>` for real WebGL, flip, download, depth controls and mobile verification. Inspect captured front/back and tilt frames. Rebuild the template bundle using bundle.sh (or the pipeline's bundled output) after module changes.

Keep generated card projects, images, dependency caches and credentials outside the skill. Use package_skill.py to audit a shareable ZIP.

## Configuration contract

`load_config` validates before typography generation or Blender startup. `title` is a nonblank string; other metadata is optional and must be strings when supplied. Optional sections must be JSON objects. Missing optional fields retain the existing renderer defaults; extra metadata and extension fields are preserved.

Supported scales and layer dimensions must be positive finite numbers. Depths and offsets must be finite numbers; signed depths and offsets remain supported without restricting them to the viewer's slider range. `parameters.foil` is between 0 and 1. Offsets and `artworkFit` have two components; artwork fit components are positive. Layer crops use nonnegative `[left, top, right, bottom]` pixel coordinates with a positive area. `sourceMode` accepts `composite`, `reference` or `relief`; `appearance.finish` accepts `pearl`, `silver`, `gold` or `original`. Errors identify the field, or the line and column for malformed JSON. Colors are checked as strings; their CSS validity and contrast still need visual inspection.

Viewer assembly refreshes the supported source images and removes `web/assets/back.png` or `effects.png` when the corresponding source image is absent. It preserves `card.glb`, custom files and dependency caches. Do not delete the entire output directory to rebuild a viewer.

## Continuous integration

The [regression workflow](../.github/workflows/checks.yml) runs on pushes and pull requests, and can be started manually. It checks Python 3.9 on Linux and Python 3.13 on Linux, Windows and macOS, with Node.js 22. It runs pipeline, checkerboard-transparency and viewer tests, installs the locked viewer dependencies, rebuilds the JavaScript bundle and audits a text-only skill ZIP.

These checks do not run Blender or a rendered browser session. Changes to geometry, shaders or viewer interaction still require a fresh project build, `verify_web.mjs` and visual review as described above.

## Presentation settings

“主题与景深” offers 黑金水墨, 蓝银深海 and 蜡笔彩色. They change finish, gloss, subject scale, supported layer depths, stage background and interface palette. They retain the loaded image layers and model; a new illustration or geometry mode requires the asset/build workflow. The CSS fallback approximates depth and material effects.

Export downloads `card-config.json` containing actual control values merged into the original project configuration, preserving metadata, artwork paths, layer definitions and extension fields. Changes are session-local until exported. Import accepts a JSON file up to 1 MB and applies only known fields in `parameters`, `appearance.finish`, `appearance.background` and `ui.palette`; it ignores title, artwork paths, geometry mode and extension fields. Validation completes before any settings are applied. Invalid files leave the current presentation intact. Colors must be concrete hex, RGB, HSL or named colors supported by the browser and renderer. Existing signed depths and precise positive scales are retained even outside ordinary slider ranges. Restore defaults returns to the configuration fetched at page load, including palette, and resets the pose to the front.

To persist a look in a built viewer, replace `web/card-config.json` with its exported file and reload. For pipeline regeneration, merge the exported `parameters`, `appearance` and `ui.palette` into the project's root `card-config.json` first; otherwise a rebuild uses the original root settings. The viewer cannot write files directly to the source project.

Run `node --test scripts/test_settings.mjs` for configuration validation and round-trip invariants. `node scripts/verify_web.mjs <project> --only settings` verifies actual WebGL controls and downloaded JSON. The complete browser pass additionally checks file import, presets and reset in CSS fallback.
