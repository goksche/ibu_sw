from __future__ import annotations

from datetime import datetime
from pathlib import Path


TARGET = Path("/root/ibu_sw/backend/app/api/v1/tournaments.py")


OLD_BLOCK = """        # Generate KO bracket
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
        except Exception as e:
            logger.exception("Group-based KO generation failed", exc_info=e)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"KO-Generierung fehlgeschlagen (Gruppenmodus): {str(e)}"
            )
"""


NEW_BLOCK = """        # Generate KO bracket
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
        except Exception as e:
            # Compatibility fallback for legacy data / constrained cross-mode layouts:
            # if group-based generation cannot build enough first-round pairings,
            # switch to participant-based generation from qualified participants.
            logger.exception("Group-based KO generation failed; trying participant fallback", exc_info=e)
            try:
                from app.services.qualification import get_qualified_participants_from_groups

                if qualification_plan:
                    qualified_participants = get_qualified_participants_from_groups(
                        group_rankings=group_rankings,
                        qualification_plan=qualification_plan,
                        group_stats=group_stats_dict,
                        tie_breaking_rules=tournament.tie_breaking_rules,
                    )
                else:
                    per_group = max(1, first_round_size // max(1, len(group_rankings)))
                    qualified_participants = []
                    for _, ranking in sorted(group_rankings.items()):
                        qualified_participants.extend(ranking[:per_group])

                seen = set()
                qualified_participants = [pid for pid in qualified_participants if not (pid in seen or seen.add(pid))]

                if len(qualified_participants) < 2:
                    raise ValueError("Zu wenige qualifizierte Teilnehmer für KO-Fallback")

                safe_methods = {
                    "full_random", "pot_system", "overall_seeding",
                    "predefined_bracket", "bonus_draw_for_winners", "manual",
                }
                fallback_draw_method = draw_method if draw_method in safe_methods else "full_random"
                if fallback_draw_method == "manual":
                    fallback_draw_method = "full_random"

                ko_matches = generate_ko_bracket_from_participants(
                    participant_ids=qualified_participants,
                    draw_method=fallback_draw_method,
                    rng_seed=tournament.ko_random_seed,
                    ko_structure=ko_structure_value,
                )
                mode = fallback_draw_method
            except Exception as fallback_error:
                logger.exception("KO fallback generation also failed", exc_info=fallback_error)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"KO-Generierung fehlgeschlagen (Gruppenmodus): {str(fallback_error)}"
                )
"""


def main() -> None:
    text = TARGET.read_text(encoding="utf-8")
    backup = TARGET.with_suffix(TARGET.suffix + f".bak_crossfb_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
    backup.write_text(text, encoding="utf-8")

    if OLD_BLOCK not in text:
        raise RuntimeError("Expected KO generation block not found; patch aborted.")

    text = text.replace(OLD_BLOCK, NEW_BLOCK, 1)
    TARGET.write_text(text, encoding="utf-8")
    print(f"Patched: {TARGET}")
    print(f"Backup:  {backup}")


if __name__ == "__main__":
    main()
