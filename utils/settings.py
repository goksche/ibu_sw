# utils/settings.py
# v0.9.2 – Einfache App-Settings (nur Stdlib)

from __future__ import annotations
import json
import os
from typing import Any, Dict

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
SETTINGS_PATH = os.path.join(DATA_DIR, "settings.json")

DEFAULTS: Dict[str, Any] = {
    "export_dir": os.path.join(PROJECT_ROOT, "exports"),
}

def _ensure_dirs() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)

def load_settings() -> Dict[str, Any]:
    _ensure_dirs()
    if not os.path.exists(SETTINGS_PATH):
        return DEFAULTS.copy()
    try:
        with open(SETTINGS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return DEFAULTS.copy()
        # Defaults ergänzen, falls Keys fehlen
        out = DEFAULTS.copy()
        out.update(data)
        return out
    except Exception:
        return DEFAULTS.copy()

def save_settings(cfg: Dict[str, Any]) -> None:
    _ensure_dirs()
    out = DEFAULTS.copy()
    out.update(cfg or {})
    with open(SETTINGS_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

def get_value(key: str, default: Any = None) -> Any:
    return load_settings().get(key, default)

def set_value(key: str, value: Any) -> None:
    cfg = load_settings()
    cfg[key] = value
    save_settings(cfg)

# Export-Verzeichnis -----------------------------------------------------

def get_export_dir() -> str:
    p = str(get_value("export_dir", DEFAULTS["export_dir"]))
    # absolute Pfade sicherstellen
    if not os.path.isabs(p):
        p = os.path.abspath(os.path.join(PROJECT_ROOT, p))
    os.makedirs(p, exist_ok=True)
    return p

def set_export_dir(path: str) -> str:
    if not path:
        return get_export_dir()
    # Normalisieren
    path = os.path.abspath(path)
    os.makedirs(path, exist_ok=True)
    set_value("export_dir", path)
    return path

def reset_export_dir_to_default() -> str:
    return set_export_dir(DEFAULTS["export_dir"])
