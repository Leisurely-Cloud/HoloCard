# HoloCard

[中文](README.md) | **English**

Turn a description or reference image into an interactive 3D holographic card, with a standalone viewer and an editable Blender project. Use it as an Agent Skill or build from the command line.

![DeepSeek-inspired character in blue and silver: relief, rotation and flip rendered from the viewer](https://raw.githubusercontent.com/Leisurely-Cloud/HoloCard/main/assets/holocard-demo.gif?v=deepseek-smooth20)

## Features

- Layered parallax and relief compositions, with artwork extending beyond the card.
- Pearl, silver, gold and original-art finishes with adjustable gloss and depth.
- Image-led palettes, typography, frames and themed backs.
- Mouse and touch rotation, zoom and flip, plus PNG capture and JSON settings import/export.

## Installation

Requires Python 3.9+, Node.js 22+ and npm. Blender 4.5 LTS is recommended; the pipeline can download it automatically, or use an existing executable with `--blender`. Browser verification requires Chrome or Edge.

```bash
git clone https://github.com/Leisurely-Cloud/HoloCard.git holocard
cd holocard
python -m pip install Pillow numpy
```

Alternatively, [download the Skill package](https://github.com/Leisurely-Cloud/HoloCard/releases/latest), extract the `holocard` folder into your host's skill directory, and make [SKILL.md](SKILL.md) accessible. Initial Blender downloads and viewer dependency installation require network access.

## Usage

Give an agent that can run commands and inspect images a reference image and a request:

```text
Use holocard to turn this image into a holographic card.
Match the palette, typography, material and back to the image's style.
Use the title "权威" and edition No.001.
```

The agent analyzes the image and authors the design. The viewer supports manual adjustments.

### Command-line build

Create `../card-project` outside the repository, save the [configuration example](references/config.example.json) as `card-config.json`, and prepare artwork in `assets/`:

| File | Purpose |
| --- | --- |
| `subject.png` | Transparent subject |
| `background.png` | Opaque background |
| `lineart.png` | Dark outlines on white, aligned with the subject |
| `text.png` | Transparent text; optional, generated from configuration when omitted |
| `effects.png`, `back.png` | Optional transparent effects and opaque back artwork |

Use identical image dimensions; 1024 × 1536 is recommended. See [artwork guidance](references/art-direction.md). Run from the repository root:

```bash
python scripts/run_pipeline.py --project ../card-project
node ../card-project/web/server.mjs
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). Outputs include `card.blend`, the `web/` viewer and `renders/` previews.

## Documentation

- [Style matching](references/style-matching.md)
- [Backs and relief](references/backs-and-relief.md)
- [Development and saved settings](references/development.md)
- [Verification](references/verification.md)

## License

Code is distributed under the [MIT License](LICENSE). Images and third-party artwork are subject to their respective licenses.
