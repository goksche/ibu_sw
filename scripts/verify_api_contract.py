#!/usr/bin/env python3
"""Prüft API-Contract: Backend-Enums vs. Frontend tournamentApiContract.ts (v1.8.3)."""

from __future__ import annotations

import ast
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODEL_PY = ROOT / "backend" / "app" / "models" / "tournament.py"
CONTRACT_TS = ROOT / "frontend" / "src" / "domain" / "tournamentApiContract.ts"


def _enum_values(class_name: str) -> set[str]:
    tree = ast.parse(MODEL_PY.read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.ClassDef) and node.name == class_name:
            values: set[str] = set()
            for item in node.body:
                if isinstance(item, ast.Assign):
                    for target in item.targets:
                        if isinstance(target, ast.Name):
                            val = item.value
                            if isinstance(val, ast.Constant) and isinstance(val.value, str):
                                values.add(val.value)
            return values
    raise RuntimeError(f"Enum {class_name} nicht in {MODEL_PY}")


def _extract_ts_const(name: str) -> set[str]:
    text = CONTRACT_TS.read_text(encoding="utf-8")
    pattern = rf"export const {name} = \[(.*?)\] as const"
    match = re.search(pattern, text, re.DOTALL)
    if not match:
        raise RuntimeError(f"Konstante {name} nicht in {CONTRACT_TS}")
    block = match.group(1)
    return {m.group(1) for m in re.finditer(r"'([^']+)'", block)}


def main() -> int:
    checks = [
        ("KO_STRUCTURES", _enum_values("KOStructure"), _extract_ts_const("KO_STRUCTURES")),
        ("KO_DRAW_METHODS", _enum_values("KODrawMethod"), _extract_ts_const("KO_DRAW_METHODS")),
        ("GROUP_DISTRIBUTIONS", {"random", "seeded", "manual"}, _extract_ts_const("GROUP_DISTRIBUTIONS")),
        ("SPIELFELD_ASSIGNMENT_MODES", {"random", "group_fixed", "group_random"}, _extract_ts_const("SPIELFELD_ASSIGNMENT_MODES")),
        ("LEAGUE_VARIANTS_API", _enum_values("LeagueVariant"), _extract_ts_const("LEAGUE_VARIANTS_API")),
    ]

    failed = False
    print("=== verify_api_contract (v1.8.3) ===")
    for label, backend_vals, frontend_vals in checks:
        missing_in_fe = backend_vals - frontend_vals
        extra_in_fe = frontend_vals - backend_vals
        if missing_in_fe or extra_in_fe:
            failed = True
            print(f"FAIL {label}")
            if missing_in_fe:
                print(f"  fehlt im Frontend: {sorted(missing_in_fe)}")
            if extra_in_fe:
                print(f"  nur im Frontend: {sorted(extra_in_fe)}")
        else:
            print(f"OK   {label} ({len(backend_vals)} Werte)")

    if failed:
        print("\nverify_api_contract: FAIL")
        return 1
    print("\nverify_api_contract: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
