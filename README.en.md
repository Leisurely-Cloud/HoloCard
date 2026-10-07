# RuiC Card Skill

[中文](README.md) | **English**

An interactive holographic card toolkit built with Blender and Three.js. It provides an Agent Skill, layered artwork validation, scene construction, viewer bundling and browser verification. Outputs include an editable Blender project and a standalone card viewer.

Maintained by [Leisurely-Cloud](https://github.com/Leisurely-Cloud), based on [HRuiCcc/RuiC-card-skill](https://github.com/HRuiCcc/RuiC-card-skill).

## Features

| Feature | Description |
| --- | --- |
| Layered parallax | Adjusts the relative positions of the subject, background and effects with the viewing angle |
| Relief mode | Uses separate geometry for the subject, effects and typography, supporting artwork that extends beyond the card |
| Holographic materials | Pearl, silver, gold and original-art finishes with adjustable gloss |
| Themed backs | Dedicated back artwork with browser-rendered titles, edition numbers and collection labels |
| Interactive controls | Rotation, zoom, flip, depth adjustments and PNG capture |
| Viewer configuration | Brand names, selected color tokens and responsive layouts |
| Editable outputs | Layer PNGs, card configuration, Blender scene and viewer resources |
| Automated verification | Interaction, resource loading, downloads, narrow layouts and reduced-motion checks |

## Demo

The following example is from the upstream project and demonstrates rotation and layered depth. Appearance depends on the artwork, configuration and rendering environment.

![Upstream layered card demonstration](assets/demo-after.gif)

[Watch the demonstration video](assets/demo-after.mp4)

## Requirements

| Component | Purpose and requirements |
| --- | --- |
| Python | Version 3.9 or later with Pillow; NumPy is used for checkerboard-to-alpha repair |
| Node.js and npm | Viewer dependency installation and bundling; Node.js 22 or later is recommended for browser verification |
| Blender | Version 4.5 LTS is recommended; use an existing executable or let the pipeline download and verify a portable build |
| Chromium browser | Chrome, Edge or Chromium for automated browser verification |
| Fonts | Must cover the characters in the card text; use `font` to specify a font file |
| Agent host (optional) | Skill-based use requires a host that can read skill instructions, execute commands and inspect images |

Artwork can be supplied by the user, obtained from authorized sources or created with the host's image-generation tools. This repository does not provide an image-generation model or service.

Automatic Blender downloads, npm installation and initial bundler acquisition require network access. The Blender downloader handles Windows, macOS and Linux x64; see [ensure_blender.py](scripts/ensure_blender.py) for platform handling.

## Installation

```bash
git clone https://github.com/Leisurely-Cloud/RuiC-card-skill.git ruic-card-skill
cd ruic-card-skill
python -m pip install Pillow numpy
```

To use it as an Agent Skill, place the repository in a skill directory supported by your host and make the root [SKILL.md](SKILL.md) accessible. The skill identifier is `ruic-card-skill`; the installation location follows your host's conventions.

Example request:

```text
Use ruic-card-skill to create an ink-wash koi holographic card.
Use a black-and-gold palette, the title "跃龙门", edition No.001,
and a back illustration that matches the theme.
```

## Command-line usage

Run the following commands from the repository root. Keep the output project outside the repository, for example at `../card-project`.

### 1. Prepare artwork and configuration

```text
card-project/
├── card-config.json
└── assets/
    ├── subject.png
    ├── background.png
    ├── lineart.png
    ├── text.png
    ├── effects.png     # Optional
    └── back.png        # Optional; recommended for a complete themed card
```

Use identical dimensions for all images; 1024 × 1536 is recommended. Subject, text and effects layers require real transparency. Background and back artwork should be opaque. Derive line art from the subject image to keep the outlines aligned.

Create `card-config.json` from the [configuration example](references/config.example.json), then set the title, edition and rendering parameters. If `text.png` is absent, the pipeline generates it from the configuration. See [art direction](references/art-direction.md) for composition and layer requirements.

### 2. Build the project

```bash
python scripts/run_pipeline.py --project ../card-project
```

To use an existing Blender executable:

```bash
python scripts/run_pipeline.py --project ../card-project --blender /path/to/blender
```

| Argument | Description |
| --- | --- |
| `--project` | Project directory containing the artwork and configuration |
| `--blender` | Optional path to a Blender executable |
| `--skip-render` | Skips the Blender preview render while still generating the scene and viewer |
| `--skip-npm` | Skips dependency installation; existing project dependencies are required and bundling still runs |

The pipeline validates artwork, builds the Blender scene, exports geometry, assembles the viewer and bundles JavaScript. A bundling failure stops the build.

### 3. Serve and verify

```bash
node ../card-project/web/server.mjs
```

The default address is [http://127.0.0.1:4173](http://127.0.0.1:4173). Set the `PORT` environment variable to use another port.

Run verification in another terminal:

```bash
node scripts/verify_web.mjs ../card-project
```

The verifier starts its own server and headless browser, then writes reports and screenshots to the project's `verification/` directory. Set `RUIC_BROWSER` or pass `--browser` to select a browser executable. In addition to automated checks, inspect the front, back, tilted views and text readability.

## Configuration

| Field | Purpose |
| --- | --- |
| `title`, `subtitle`, `edition`, `collection` | Card title, subtitle, edition and collection |
| `parameters` | Subject scale, layer depths and gloss |
| `sourceMode: "relief"` | Enables independent geometry layers |
| `layers` | Relief-layer dimensions, offsets, depths and image crops |
| `backDesign` | Primary and secondary colors for browser-rendered back text |
| `ui` | Brand name, English label and supported UI color tokens |
| `font` | Font file used to generate the text layer |

The pipeline resolves viewer asset paths from files present in `assets/`. See [backs and relief](references/backs-and-relief.md) for detailed layer, back and UI configuration.

Configuration is checked before building, with field names or JSON line and column locations in error messages. The title must not be blank; scales and layer dimensions must be positive, depths and offsets must be finite numbers, and foil must be between 0 and 1. Omitted optional fields retain existing defaults, and custom metadata is preserved. Rebuilds remove cancelled back and effects images while keeping the model, custom files and dependency caches.

## Output files

| Path | Contents |
| --- | --- |
| `card.blend` | Editable Blender scene with packed image resources |
| `assets/` | Source artwork layers |
| `web/` | Local server, page, bundled JavaScript and model resources |
| `renders/` | Blender preview images; omitted with `--skip-render` |
| `asset-validation.json` | Artwork validation results |
| `verification.json` | Blender build information |
| `verification/` | Reports and screenshots produced by browser verification |

The browser reconstructs materials in GLSL; glTF carries geometry and material roles. Browser and Blender renders differ, and the browser adds its own back typography. When WebGL is unavailable, the viewer uses a simplified CSS 3D fallback.

## Development and verification

The project is organized by responsibility:

```text
scripts/
├── run_pipeline.py       # Pipeline entry point and orchestration
├── project_config.py     # Configuration and artwork inventory
├── viewer_build.py       # Viewer assembly, installation and bundling
├── build_card.py         # Blender scene construction
├── export_web.py         # Geometry export
├── validate_assets.py    # Artwork validation
└── verify_web.mjs        # Browser integration checks

assets/web-template/
├── app.js                # Viewer lifecycle and interaction
├── shaders.js            # Material shaders
├── back-art.js           # Back artwork and typography
├── relief.js             # Relief-layer placement
├── viewer-ui.js          # Branding and UI configuration
├── style.css             # Base layout
└── ui.css                # Visual styling and responsive layout
```

Run regression checks:

```bash
python scripts/test_pipeline.py
python scripts/test_checkerboard.py
node --test scripts/test_viewer.mjs
```

Rebuild `app.bundle.js` after changing viewer modules. See [development notes](references/development.md) and [verification guidance](references/verification.md) for module boundaries, build instructions and the complete verification workflow.

[GitHub Actions](.github/workflows/checks.yml) runs regression tests, viewer bundling and skill-package audits on pushes and pull requests across Linux, Windows and macOS. Material, geometry or interaction changes still require a Blender build and real-browser verification.

Package the distributable skill:

```bash
python scripts/package_skill.py . --out ../ruic-card-skill.zip
```

The packager includes allowed text files and excludes demonstration media, generated artwork, dependency caches and Blender projects.

## License and attribution

This project is based on [HRuiCcc/RuiC-card-skill](https://github.com/HRuiCcc/RuiC-card-skill). Original copyright notices are retained, and the code is distributed under the [MIT License](LICENSE). Upstream demonstration assets remain in the repository. The software license does not grant rights to generated images, user-supplied references or third-party artwork.
