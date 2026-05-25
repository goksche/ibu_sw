from __future__ import annotations

from datetime import datetime
from pathlib import Path


TARGET = Path("/root/ibu_sw/backend/app/api/v1/tournaments.py")


def replace_once(text: str, old: str, new: str) -> str:
    if old in text:
        return text.replace(old, new, 1)
    return text


def main() -> None:
    if not TARGET.exists():
        raise FileNotFoundError(f"Target file not found: {TARGET}")

    text = TARGET.read_text(encoding="utf-8")
    backup = TARGET.with_suffix(TARGET.suffix + f".bak_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
    backup.write_text(text, encoding="utf-8")

    if "import json" not in text:
        text = text.replace("import random\n", "import random\nimport json\n", 1)
    if "import logging" not in text:
        text = text.replace("import json\n", "import json\nimport logging\n", 1)
    if 'logger = logging.getLogger(__name__)' not in text:
        text = text.replace(
            'router = APIRouter(prefix="/tournaments", tags=["Tournaments"])\n',
            'router = APIRouter(prefix="/tournaments", tags=["Tournaments"])\nlogger = logging.getLogger(__name__)\n',
            1,
        )

    text = replace_once(
        text,
        "        return mode, draw_method, False\n\n    # Check if this is a pure knockout tournament (no groups) or combined tournament (with groups)\n",
        """        return mode, draw_method, False

    def _effective_groups_count_local(current_tournament: Tournament, current_groups: Optional[List[Group]] = None) -> int:
        raw_count = getattr(current_tournament, "groups_count", None)
        if isinstance(raw_count, int) and raw_count > 0:
            return raw_count
        if current_groups is not None and len(current_groups) > 0:
            return len(current_groups)
        return 0

    def _normalize_fallback_rules_local(raw_value) -> List[Dict]:
        if not raw_value:
            return []
        if isinstance(raw_value, str):
            try:
                parsed = json.loads(raw_value)
            except Exception:
                return []
            if isinstance(parsed, list):
                return [item for item in parsed if isinstance(item, dict)]
            if isinstance(parsed, dict):
                return [parsed]
            return []
        if isinstance(raw_value, list):
            return [item for item in raw_value if isinstance(item, dict)]
        if isinstance(raw_value, dict):
            return [raw_value]
        return []

    ko_structure_value = _enum_value(getattr(tournament, "ko_structure", None))

    # Check if this is a pure knockout tournament (no groups) or combined tournament (with groups)
""",
    )

    text = replace_once(
        text,
        "                ko_structure=tournament.ko_structure.value if tournament.ko_structure else None\n",
        "                ko_structure=ko_structure_value\n",
    )

    replacements = [
        ("if tournament.ko_structure and tournament.ko_structure.value == 'double_elimination':", "if ko_structure_value == 'double_elimination':"),
        ("elif tournament.ko_structure and tournament.ko_structure.value == 'triple_elimination':", "elif ko_structure_value == 'triple_elimination':"),
        ("elif tournament.ko_structure and tournament.ko_structure.value == 'aggregate_ko':", "elif ko_structure_value == 'aggregate_ko':"),
        ("elif tournament.ko_structure and tournament.ko_structure.value == 'page_playoff':", "elif ko_structure_value == 'page_playoff':"),
        ("if tournament.ko_structure and tournament.ko_structure.value == 'consolation_bracket':", "if ko_structure_value == 'consolation_bracket':"),
        (
            "elif tournament.ko_structure and tournament.ko_structure.value in ('double_elimination', 'triple_elimination', 'aggregate_ko', 'page_playoff'):",
            "elif ko_structure_value in ('double_elimination', 'triple_elimination', 'aggregate_ko', 'page_playoff'):",
        ),
        ("if tournament.ko_structure.value == 'double_elimination':", "if ko_structure_value == 'double_elimination':"),
        ("elif tournament.ko_structure.value == 'triple_elimination':", "elif ko_structure_value == 'triple_elimination':"),
        ("elif tournament.ko_structure.value == 'aggregate_ko':", "elif ko_structure_value == 'aggregate_ko':"),
        ("elif tournament.ko_structure.value == 'page_playoff':", "elif ko_structure_value == 'page_playoff':"),
    ]
    for old, new in replacements:
        text = replace_once(text, old, new)

    text = replace_once(
        text,
        """            qualification_plan = calculate_qualification_plan(
                groups_count=tournament.groups_count,
                ko_start_round=tournament.ko_start_round
            )
""",
        """            groups_count = _effective_groups_count_local(tournament, groups)
            if groups_count <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ungültige Gruppenanzahl für Qualifikationsplan"
                )
            qualification_plan = calculate_qualification_plan(
                groups_count=groups_count,
                ko_start_round=tournament.ko_start_round
            )
""",
    )

    text = replace_once(
        text,
        "            stored_fallback = tournament.ko_fallback_qualifiers or []\n",
        "            stored_fallback = _normalize_fallback_rules_local(tournament.ko_fallback_qualifiers)\n",
    )
    text = replace_once(
        text,
        """                tournament.ko_fallback_qualifiers = qualification_plan.get("fallback_rules")
                stored_fallback = tournament.ko_fallback_qualifiers or []
""",
        """                tournament.ko_fallback_qualifiers = qualification_plan.get("fallback_rules")
                stored_fallback = _normalize_fallback_rules_local(tournament.ko_fallback_qualifiers)
""",
    )

    text = replace_once(
        text,
        """                for pid in stats:
                    stats[pid]["scoring_system"] = scoring_system.value
""",
        """                scoring_system_value = _enum_value(scoring_system)
                for pid in stats:
                    stats[pid]["scoring_system"] = scoring_system_value
""",
    )

    text = replace_once(
        text,
        """        # Generate KO bracket
        try:
            ko_matches = generate_ko_bracket_from_groups(
                group_rankings=group_rankings,
                first_round_size=first_round_size,
                mode=mode,
                qualification_plan=qualification_plan,
                block_same_group=tournament.ko_block_same_group,
                block_same_position=tournament.ko_block_same_position,
                group_stats=group_stats_dict,
                tie_breaking_rules=tournament.tie_breaking_rules,
                draw_method=draw_method,
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
""",
        """        # Generate KO bracket
        try:
            ko_matches = generate_ko_bracket_from_groups(
                group_rankings=group_rankings,
                first_round_size=first_round_size,
                mode=mode,
                qualification_plan=qualification_plan,
                block_same_group=tournament.ko_block_same_group,
                block_same_position=tournament.ko_block_same_position,
                group_stats=group_stats_dict,
                tie_breaking_rules=tournament.tie_breaking_rules,
                draw_method=draw_method,
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except Exception as e:
            logger.exception("Group-based KO generation failed", exc_info=e)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"KO-Generierung fehlgeschlagen (Gruppenmodus): {str(e)}"
            )
""",
    )

    text = replace_once(
        text,
        """    if tournament.ko_structure and tournament.ko_structure.value == 'consolation_bracket':
        draw_method = None
        if tournament.ko_draw_method:
            draw_method = tournament.ko_draw_method.value
""",
        """    if ko_structure_value == 'consolation_bracket':
        draw_method = None
        if tournament.ko_draw_method:
            draw_method = _enum_value(tournament.ko_draw_method)
""",
    )

    # Server-B compatibility: older Tournament model may miss these attributes.
    text = text.replace(
        "tournament.league_points_win or 3",
        "getattr(tournament, 'league_points_win', 3) or 3",
    )
    text = text.replace(
        "tournament.league_points_draw or 1",
        "getattr(tournament, 'league_points_draw', 1) or 1",
    )
    text = text.replace(
        "tournament.league_points_loss or 0",
        "getattr(tournament, 'league_points_loss', 0) or 0",
    )

    TARGET.write_text(text, encoding="utf-8")
    print(f"Patched: {TARGET}")
    print(f"Backup:  {backup}")


if __name__ == "__main__":
    main()
