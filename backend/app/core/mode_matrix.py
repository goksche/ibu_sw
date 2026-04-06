from __future__ import annotations

from typing import Any, Dict, Literal, Optional, TypedDict


ModeVariant = Literal[
    "L1",
    "L2",
    "L3",
    "L4",
    "K1",
    "K2",
    "K3",
    "K4",
    "K5",
    "K6",
    "C1",
    "C2",
    "C3",
    "C4",
    "C5",
]

PairingVariant = Literal["P1", "P2", "P3", "P4", "P5", "P6", "P7"]


class ModeVariantSpec(TypedDict):
    mode: str
    has_group_phase: bool
    has_ko_phase: bool
    ko_structure: Optional[str]
    league_variant: Optional[str]
    swiss_like: bool


MODE_VARIANT_SPECS: Dict[ModeVariant, ModeVariantSpec] = {
    "L1": {"mode": "round_robin", "has_group_phase": True, "has_ko_phase": False, "ko_structure": None, "league_variant": "classic", "swiss_like": False},
    "L2": {"mode": "round_robin", "has_group_phase": True, "has_ko_phase": False, "ko_structure": None, "league_variant": "double", "swiss_like": False},
    "L3": {"mode": "round_robin", "has_group_phase": True, "has_ko_phase": False, "ko_structure": None, "league_variant": "classic", "swiss_like": False},
    "L4": {"mode": "round_robin", "has_group_phase": True, "has_ko_phase": False, "ko_structure": None, "league_variant": "multiple", "swiss_like": True},
    "K1": {"mode": "knockout", "has_group_phase": False, "has_ko_phase": True, "ko_structure": "single_elimination", "league_variant": None, "swiss_like": False},
    "K2": {"mode": "knockout", "has_group_phase": False, "has_ko_phase": True, "ko_structure": "double_elimination", "league_variant": None, "swiss_like": False},
    "K3": {"mode": "knockout", "has_group_phase": False, "has_ko_phase": True, "ko_structure": "triple_elimination", "league_variant": None, "swiss_like": False},
    "K4": {"mode": "knockout", "has_group_phase": False, "has_ko_phase": True, "ko_structure": "page_playoff", "league_variant": None, "swiss_like": False},
    "K5": {"mode": "knockout", "has_group_phase": False, "has_ko_phase": True, "ko_structure": "single_elimination_with_third", "league_variant": None, "swiss_like": False},
    "K6": {"mode": "knockout", "has_group_phase": False, "has_ko_phase": True, "ko_structure": "consolation_bracket", "league_variant": None, "swiss_like": False},
    "C1": {"mode": "combined", "has_group_phase": True, "has_ko_phase": True, "ko_structure": "single_elimination", "league_variant": "classic", "swiss_like": False},
    "C2": {"mode": "combined", "has_group_phase": True, "has_ko_phase": True, "ko_structure": "single_elimination", "league_variant": "multiple", "swiss_like": True},
    "C3": {"mode": "combined", "has_group_phase": True, "has_ko_phase": True, "ko_structure": "page_playoff", "league_variant": "classic", "swiss_like": False},
    "C4": {"mode": "combined", "has_group_phase": True, "has_ko_phase": True, "ko_structure": "double_elimination", "league_variant": "classic", "swiss_like": False},
    "C5": {"mode": "combined", "has_group_phase": True, "has_ko_phase": True, "ko_structure": "group_then_single_ko", "league_variant": "classic", "swiss_like": False},
}


PAIRING_TO_DRAW_METHOD: Dict[PairingVariant, str] = {
    "P1": "full_random",
    "P2": "overall_seeding",
    "P3": "fixed_cross",
    "P4": "full_random",
    "P5": "pot_system",
    "P6": "manual",
    "P7": "random_each_round",
}

DRAW_METHOD_TO_PAIRING: Dict[str, PairingVariant] = {
    "full_random": "P1",
    "overall_seeding": "P2",
    "fixed_cross": "P3",
    "same_position_cross": "P3",
    "pot_system": "P5",
    "manual": "P6",
    "predefined_bracket": "P2",
    "bonus_draw_for_winners": "P2",
    "random_each_round": "P7",
}

LEGACY_MODE_ALIASES: Dict[str, ModeVariant] = {
    "round_robin": "L1",
    "knockout": "K1",
    "combined": "C1",
}


def infer_mode_variant(payload: Dict[str, Any]) -> ModeVariant:
    mode = payload.get("mode")
    structure = payload.get("ko_structure")
    league_variant = payload.get("league_variant")
    has_ko = bool(payload.get("has_ko_phase"))
    groups_count = payload.get("groups_count") or 0

    if mode == "round_robin":
        if league_variant == "multiple":
            return "L4"
        return "L1"

    if mode == "knockout":
        if structure == "double_elimination":
            return "K2"
        if structure == "triple_elimination":
            return "K3"
        if structure == "page_playoff":
            return "K4"
        if structure == "single_elimination_with_third":
            return "K5"
        if structure == "consolation_bracket":
            return "K6"
        return "K1"

    if mode == "combined" or has_ko:
        if structure == "double_elimination":
            return "C4"
        if structure == "page_playoff":
            return "C3"
        if structure == "group_then_single_ko":
            return "C5"
        if league_variant == "multiple":
            return "C2"
        return "C1"

    return "L1"


def normalize_mode_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(payload)
    selected_variant = normalized.get("mode_variant")
    legacy_selected = selected_variant if isinstance(selected_variant, str) else None
    if legacy_selected in {"L2", "L3"}:
        # L2/L3 are deprecated; keep behavior via settings, but normalize stored variant to L1.
        normalized["mode_variant"] = "L1"
        # L2 = double round robin -> multiplier 2 (if not explicitly provided).
        if legacy_selected == "L2" and not normalized.get("league_rounds_multiplier"):
            normalized["league_rounds_multiplier"] = 2
        # Keep league_variant stable; round repetition is now controlled via multiplier.
        normalized["league_variant"] = "classic"
        spec = MODE_VARIANT_SPECS["L1"]
    elif isinstance(selected_variant, str) and selected_variant in MODE_VARIANT_SPECS:
        spec = MODE_VARIANT_SPECS[selected_variant]
    else:
        inferred = infer_mode_variant(normalized)
        spec = MODE_VARIANT_SPECS[inferred]
        normalized["mode_variant"] = inferred

    normalized["mode"] = spec["mode"]
    normalized["has_group_phase"] = spec["has_group_phase"]
    normalized["has_ko_phase"] = spec["has_ko_phase"]
    if spec["ko_structure"]:
        normalized["ko_structure"] = spec["ko_structure"]
    if spec["league_variant"]:
        normalized["league_variant"] = spec["league_variant"]
    elif normalized.get("mode") == "knockout":
        # DB-Spalte ist NOT NULL; fuer KO-Modi neutral auf "classic" halten.
        normalized["league_variant"] = normalized.get("league_variant") or "classic"

    pairing = normalized.get("ko_pairing_mode")
    if isinstance(pairing, str) and pairing in PAIRING_TO_DRAW_METHOD:
        normalized["ko_draw_method"] = PAIRING_TO_DRAW_METHOD[pairing]
        if pairing == "P4":
            normalized["ko_block_same_group"] = True
        if pairing == "P6":
            normalized["ko_distribution"] = "predefined_slots"
        if pairing == "P7":
            # Legacy mirror for read-compatibility only.
            normalized["ko_distribution"] = "random_each_round"
    elif normalized.get("ko_draw_method"):
        normalized["ko_pairing_mode"] = DRAW_METHOD_TO_PAIRING.get(str(normalized["ko_draw_method"]), "P1")
    elif spec["has_ko_phase"]:
        normalized["ko_pairing_mode"] = "P1"
        normalized["ko_draw_method"] = PAIRING_TO_DRAW_METHOD["P1"]

    # Fixed pairing logic should not force random draw modes.
    if normalized.get("ko_draw_method") in {"fixed_cross", "same_position_cross", "predefined_bracket"}:
        normalized["ko_distribution"] = "cross"
    if normalized.get("ko_draw_method") == "manual":
        normalized["ko_distribution"] = "predefined_slots"
    if normalized.get("ko_draw_method") == "random_each_round":
        normalized["ko_distribution"] = "random_each_round"

    # Field sanitizing: only keep KO-specific flags if KO is active.
    if not normalized.get("has_ko_phase"):
        normalized["ko_structure"] = None
        normalized["ko_draw_method"] = None
        normalized["ko_pairing_mode"] = None
        normalized["ko_distribution"] = None
        normalized["ko_block_same_group"] = False
        normalized["ko_block_same_position"] = False
        normalized["ko_random_seed"] = None
        normalized["ko_start_round"] = None
        normalized["ko_fallback_qualifiers"] = None
        normalized["ko_participants"] = 0

    # Field sanitizing: only keep group-specific values if group phase is active.
    if not normalized.get("has_group_phase"):
        normalized["groups_count"] = 0
        normalized["participants_per_group"] = None
        normalized["group_distribution"] = "random"
        normalized["seeded_participant_ids"] = []
        normalized["league_scoring_system"] = None
        normalized["tie_breaking_rules"] = []

    return normalized


def validate_mode_payload(payload: Dict[str, Any]) -> None:
    mode = payload.get("mode")
    has_group_phase = bool(payload.get("has_group_phase"))
    draw_method = payload.get("ko_draw_method")
    structure = payload.get("ko_structure")
    pairing_mode = payload.get("ko_pairing_mode")

    if mode == "knockout" and not has_group_phase and draw_method in {"fixed_cross", "same_position_cross"}:
        raise ValueError("Kreuzpaarungen (P3) sind ohne Gruppenphase nicht gueltig. Bitte Seeding, Zufall oder manuell verwenden.")
    if mode == "knockout" and not has_group_phase and pairing_mode in {"P3", "P4"}:
        raise ValueError("P3/P4 setzen eine Gruppenphase voraus und sind im reinen KO-Modus nicht gueltig.")

    if structure == "page_playoff" and mode not in {"knockout", "combined"}:
        raise ValueError("Page-Playoff ist nur in KO- oder Kombi-Modi gueltig.")
