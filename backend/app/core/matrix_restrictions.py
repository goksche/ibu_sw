"""Turniermodus-Matrix: strikte Validierung (HTTP 422 / Variant A — docs/turniermodus-matrix.md)."""

from __future__ import annotations

from enum import Enum
from typing import Any


def _as_enum_value(val: Any) -> str | None:
    if val is None:
        return None
    if isinstance(val, Enum):
        return val.value
    return str(val)


def validate_tournament_matrix_restrictions_a(
    *,
    mode: Any,
    has_group_phase: bool,
    groups_count: int | None,
    group_distribution: Any,
    league_variant: Any,
    league_rounds_multiplier: int | None,
) -> None:
    """Erhebt ValueError mit deutschsprachiger Meldung bei Verstoß gegen die Matrix-Regeln."""
    mode_s = _as_enum_value(mode) or ""
    lv = _as_enum_value(league_variant)
    gd = (_as_enum_value(group_distribution) or "").lower()

    if mode_s == "combined":
        if lv in ("double", "multiple"):
            raise ValueError(
                "Im kombinierten Modus sind die Liga-Varianten „Doppelte Liga“ und „Mehrfache Liga“ nicht zulässig."
            )
        if league_rounds_multiplier is not None and league_rounds_multiplier != 1:
            raise ValueError(
                "Im kombinierten Modus ist nur league_rounds_multiplier 1 zulässig (oder kein Wert)."
            )

    if has_group_phase:
        gc = groups_count if groups_count is not None else 0
        if gc <= 1 and gd == "seeded":
            raise ValueError(
                "Auslosungsart „Gesetzt“ ist nur bei mehr als einer Gruppe zulässig."
            )
