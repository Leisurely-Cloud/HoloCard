"""Shared project configuration and supported image-layer contract."""
from pathlib import Path
import json

REQUIRED_LAYERS = ("subject", "background", "lineart", "text")
OPTIONAL_LAYERS = ("effects", "back")


def load_config(root):
    path = Path(root) / "card-config.json"
    if not path.is_file():
        raise FileNotFoundError("Write card-config.json from references/config.example.json first")
    config = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(config, dict):
        raise ValueError("card-config.json must contain a JSON object")
    return config


def layer_names(root):
    assets = Path(root) / "assets"
    return list(REQUIRED_LAYERS) + [name for name in OPTIONAL_LAYERS if (assets / f"{name}.png").is_file()]


def web_config(root):
    config = load_config(root)
    config["assets"] = {name: f"./assets/{name}.png" for name in layer_names(root)}
    config["assets"]["model"] = "./assets/card.glb"
    return config
