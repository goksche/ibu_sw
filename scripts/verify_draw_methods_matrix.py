#!/usr/bin/env python3
"""Prüft KO-Auslosungsarten gegen Matrix + Backend/Frontend-Konsistenz (v1.8.4)."""

from __future__ import annotations

import ast
import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
MODEL_PY = BACKEND / "app" / "models" / "tournament.py"
MODE_MATRIX_PY = BACKEND / "app" / "core" / "mode_matrix.py"
TOURNAMENTS_PY = BACKEND / "app" / "api" / "v1" / "tournaments.py"
CONTRACT_TS = ROOT / "frontend" / "src" / "domain" / "tournamentApiContract.ts"

# docs/turniermodus-matrix.md + DRAW_METHODS_TEST_MATRIX_SERVER_B.md
COMBINED_ONLY = frozenset({"fixed_cross", "same_position_cross", "bonus_draw_for_winners"})
K_AND_C = frozenset(
    {
        "overall_seeding",
        "pot_system",
        "full_random",
        "predefined_bracket",
        "manual",
        "random_each_round",
    }
)


def _enum_values(class_name: str) -> set[str]:
    tree = ast.parse(MODEL_PY.read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.ClassDef) and node.name == class_name:
            values: set[str] = set()
            for item in node.body:
                if isinstance(item, ast.Assign):
                    val = item.value
                    if isinstance(val, ast.Constant) and isinstance(val.value, str):
                        values.add(val.value)
            return values
    raise RuntimeError(f"Enum {class_name} nicht in {MODEL_PY}")


def _load_mode_matrix():
    spec = importlib.util.spec_from_file_location("mode_matrix", MODE_MATRIX_PY)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(mod)
    return mod


def _extract_pure_ko_supported() -> set[str]:
    text = TOURNAMENTS_PY.read_text(encoding="utf-8")
    start = text.find("pure_ko_supported_methods = {")
    if start < 0:
        raise RuntimeError("pure_ko_supported_methods nicht in tournaments.py")
    end = text.find("}", start) + 1
    block = text[start:end]
    return {line.strip().strip("',") for line in block.splitlines() if "'" in line}


def _extract_ts_ko_draw_methods() -> set[str]:
    import re

    text = CONTRACT_TS.read_text(encoding="utf-8")
    match = re.search(r"export const KO_DRAW_METHODS = \[(.*?)\] as const", text, re.DOTALL)
    if not match:
        raise RuntimeError("KO_DRAW_METHODS fehlt in tournamentApiContract.ts")
    return {m.group(1) for m in re.finditer(r"'([^']+)'", match.group(1))}


def main() -> int:
    failed = False
    print("=== verify_draw_methods_matrix (v1.8.4) ===")

    backend_methods = _enum_values("KODrawMethod")
    fe_methods = _extract_ts_ko_draw_methods()
    if backend_methods != fe_methods:
        failed = True
        print("FAIL KO_DRAW_METHODS Backend vs Frontend")
        print(f"  nur Backend: {sorted(backend_methods - fe_methods)}")
        print(f"  nur Frontend: {sorted(fe_methods - backend_methods)}")
    else:
        print(f"OK   KO_DRAW_METHODS ({len(backend_methods)} Werte)")

    mm = _load_mode_matrix()
    pairing_map: dict = mm.DRAW_METHOD_TO_PAIRING
    missing_pairing = backend_methods - set(pairing_map)
    if missing_pairing:
        failed = True
        print(f"FAIL DRAW_METHOD_TO_PAIRING fehlt für: {sorted(missing_pairing)}")
    else:
        print("OK   DRAW_METHOD_TO_PAIRING vollständig")

    pure_ko = _extract_pure_ko_supported()
    illegal_pure = COMBINED_ONLY & pure_ko
    if illegal_pure:
        failed = True
        print(f"FAIL Kreuz/Bonus in pure_ko_supported_methods: {sorted(illegal_pure)}")
    else:
        print("OK   pure KO schließt Kreuzpaarungen aus")

    expected_pure = K_AND_C
    if pure_ko != expected_pure:
        failed = True
        print("FAIL pure_ko_supported_methods Abweichung")
        print(f"  erwartet: {sorted(expected_pure)}")
        print(f"  ist:      {sorted(pure_ko)}")
    else:
        print("OK   pure_ko_supported_methods = K-und-C-Methoden")

    for method in backend_methods:
        payload = {
            "mode": "knockout",
            "has_group_phase": False,
            "has_ko_phase": True,
            "ko_draw_method": method,
            "ko_structure": "single_elimination",
        }
        normalized = mm.normalize_mode_payload(dict(payload))
        if method == "random_each_round":
            if normalized.get("ko_distribution") != "random_each_round":
                failed = True
                print(f"FAIL normalize: {method} → ko_distribution nicht random_each_round")
        elif method in {"fixed_cross", "same_position_cross", "predefined_bracket"}:
            if normalized.get("ko_distribution") != "cross":
                failed = True
                print(f"FAIL normalize: {method} → ko_distribution nicht cross")
        elif method == "manual":
            if normalized.get("ko_distribution") != "predefined_slots":
                failed = True
                print(f"FAIL normalize: {method} → ko_distribution nicht predefined_slots")

    if not failed:
        print("OK   normalize_mode_payload Legacy-Spiegel (Stichprobe)")

    try:
        mm.validate_mode_payload(
            {
                "mode": "knockout",
                "has_group_phase": False,
                "ko_draw_method": "fixed_cross",
            }
        )
        failed = True
        print("FAIL validate_mode_payload: fixed_cross ohne Gruppe sollte scheitern")
    except ValueError:
        print("OK   validate_mode_payload blockiert Kreuz ohne Gruppenphase")

    if failed:
        print("\nverify_draw_methods_matrix: FAIL")
        return 1
    print("\nverify_draw_methods_matrix: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
