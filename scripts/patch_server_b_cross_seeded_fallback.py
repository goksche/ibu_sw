from __future__ import annotations

from datetime import datetime
from pathlib import Path


TARGET = Path("/root/ibu_sw/backend/app/api/v1/tournaments.py")


INSERT_AFTER = """                if len(qualified_participants) < 2:
                    raise ValueError("Zu wenige qualifizierte Teilnehmer für KO-Fallback")
"""

INSERT_BLOCK = """
                # Keep cross intent for fallback qualifiers:
                # winners should meet weakest qualified entries first (e.g. best 4th places).
                if qualification_plan and draw_method in {"fixed_cross", "same_position_cross"}:
                    try:
                        from app.services.qualification import rank_candidates_with_keys

                        qualified_set = set(qualified_participants)
                        ordered_qualified = []
                        used_ids = set()

                        max_position = int(qualification_plan.get("basis_per_group", 0) or 0)
                        for rule in qualification_plan.get("fallback_rules", []) or []:
                            max_position = max(max_position, int(rule.get("position", 0) or 0))
                        if max_position <= 0:
                            max_position = 1

                        for position in range(1, max_position + 1):
                            ranked_candidates = rank_candidates_with_keys(
                                group_rankings=group_rankings,
                                position=position,
                                group_stats=group_stats_dict,
                                tie_breaking_rules=tournament.tie_breaking_rules,
                            )
                            for candidate in ranked_candidates:
                                participant_id = candidate.get("participant_id")
                                if participant_id in qualified_set and participant_id not in used_ids:
                                    ordered_qualified.append(participant_id)
                                    used_ids.add(participant_id)

                        for participant_id in qualified_participants:
                            if participant_id not in used_ids:
                                ordered_qualified.append(participant_id)

                        qualified_participants = ordered_qualified
                    except Exception as ordering_error:
                        logger.warning(
                            "Seeded ordering for cross fallback failed; using default qualified order",
                            exc_info=ordering_error
                        )
"""


def main() -> None:
    text = TARGET.read_text(encoding="utf-8")
    backup = TARGET.with_suffix(TARGET.suffix + f".bak_crossseed_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
    backup.write_text(text, encoding="utf-8")

    if INSERT_BLOCK.strip() not in text:
        text = text.replace(INSERT_AFTER, INSERT_AFTER + INSERT_BLOCK, 1)

    text = text.replace(
        """                if fallback_draw_method == "manual":
                    fallback_draw_method = "full_random"
""",
        """                if fallback_draw_method == "manual":
                    fallback_draw_method = "full_random"
                if qualification_plan and draw_method in {"fixed_cross", "same_position_cross"}:
                    fallback_draw_method = "overall_seeding"
""",
        1,
    )

    TARGET.write_text(text, encoding="utf-8")
    print(f"Patched: {TARGET}")
    print(f"Backup:  {backup}")


if __name__ == "__main__":
    main()
