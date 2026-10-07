"""Shared project configuration and supported image-layer contract."""
from pathlib import Path
import json
import math

REQUIRED_LAYERS = ("subject", "background", "lineart", "text")
OPTIONAL_LAYERS = ("effects", "back")


def _object(value, field):
    if not isinstance(value, dict):
        raise ValueError(f"{field}: expected a JSON object")
    return value


def _string(value, field):
    if not isinstance(value, str):
        raise ValueError(f"{field}: expected a string")


def _number(value, field, positive=False):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field}: expected a finite number")
    try:
        finite = math.isfinite(value)
    except OverflowError:
        finite = False
    if not finite:
        raise ValueError(f"{field}: expected a finite number")
    if positive and value <= 0:
        raise ValueError(f"{field}: must be greater than zero")


def _vector(value, field, length=2, positive=False):
    if not isinstance(value, list) or len(value) != length:
        raise ValueError(f"{field}: expected an array of {length} numbers")
    for index, item in enumerate(value):
        _number(item, f"{field}[{index}]", positive)


def validate_config(config):
    """Check supported fields without filling defaults or discarding extensions."""
    _object(config, "card-config.json")
    title = config.get("title")
    _string(title, "title")
    if not title.strip():
        raise ValueError("title: must not be blank")
    for key in ("subtitle", "technique", "tagline", "edition", "collection", "description", "font"):
        if key in config:
            _string(config[key], key)
    if "sourceMode" in config and config["sourceMode"] not in ("composite", "reference", "relief"):
        raise ValueError("sourceMode: expected composite, reference or relief")

    for section in ("parameters", "safeArea", "layers", "assets", "appearance", "backDesign", "ui"):
        if section in config:
            _object(config[section], section)
    parameters = config.get("parameters", {})
    for key in ("subjectScale", "effectsScale", "subjectDepth", "effectsDepth", "backgroundDepth", "foil"):
        if key in parameters:
            _number(parameters[key], f"parameters.{key}", positive=key.endswith("Scale"))
    if "foil" in parameters and not 0 <= parameters["foil"] <= 1:
        raise ValueError("parameters.foil: must be between 0 and 1")

    safe_area = config.get("safeArea", {})
    if "scale" in safe_area:
        _number(safe_area["scale"], "safeArea.scale", positive=True)
    if "offset" in safe_area:
        _vector(safe_area["offset"], "safeArea.offset")
    if "artworkFit" in config:
        _vector(config["artworkFit"], "artworkFit", positive=True)

    for name, layer in config.get("layers", {}).items():
        field = f"layers.{name}"
        _object(layer, field)
        for key in ("width", "height", "depth"):
            if key in layer:
                _number(layer[key], f"{field}.{key}", positive=key != "depth")
        if "offset" in layer:
            _vector(layer["offset"], f"{field}.offset")
        if "crop" in layer:
            crop = layer["crop"]
            _vector(crop, f"{field}.crop", length=4)
            if min(crop) < 0 or crop[2] <= crop[0] or crop[3] <= crop[1]:
                raise ValueError(f"{field}.crop: expected nonnegative [left, top, right, bottom] with positive area")

    for key, value in config.get("assets", {}).items():
        _string(value, f"assets.{key}")
    appearance = config.get("appearance", {})
    if "background" in appearance:
        _string(appearance["background"], "appearance.background")
    if "finish" in appearance and appearance["finish"] not in ("pearl", "silver", "gold", "original"):
        raise ValueError("appearance.finish: expected pearl, silver, gold or original")
    for key in ("primary", "secondary"):
        if key in config.get("backDesign", {}):
            _string(config["backDesign"][key], f"backDesign.{key}")
    ui = config.get("ui", {})
    for key in ("brandName", "brandEnglish"):
        if key in ui:
            _string(ui[key], f"ui.{key}")
    if "palette" in ui:
        for key, value in _object(ui["palette"], "ui.palette").items():
            _string(value, f"ui.palette.{key}")
    return config


def load_config(root):
    path = Path(root) / "card-config.json"
    if not path.is_file():
        raise FileNotFoundError("Write card-config.json from references/config.example.json first")
    try:
        config = json.loads(path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as error:
        raise ValueError(f"{path}: invalid JSON at line {error.lineno}, column {error.colno}: {error.msg}") from error
    return validate_config(config)


def layer_names(root):
    assets = Path(root) / "assets"
    return list(REQUIRED_LAYERS) + [name for name in OPTIONAL_LAYERS if (assets / f"{name}.png").is_file()]


def web_config(root):
    config = load_config(root)
    config["assets"] = {name: f"./assets/{name}.png" for name in layer_names(root)}
    config["assets"]["model"] = "./assets/card.glb"
    return config
