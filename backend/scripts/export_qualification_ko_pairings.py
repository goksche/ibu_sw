"""
Export: Qualifikation + KO-Paarungen mit Gruppenrang.

- JSON: u. a. ``ko_text_report`` / ``ko_matches_compact`` im Stil
  „Spiel 1: C1 Name vs E6 Name (2:1)“ (Gruppenbuchstabe + Platz, alle Runden).

Lauf auf dem Server im Backend-Container:
  docker exec ibu_backend_prod python /app/scripts/export_qualification_ko_pairings.py 44
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Wenn das Skript per absolutem Pfad gestartet wird, liegt sys.path[0] auf .../scripts — Paket app wäre sonst nicht gefunden
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from app.api.v1.tournaments import get_qualification_table
from app.core.database import SessionLocal
from app.models.group import Group
from app.models.match import GroupMatch, KnockoutMatch
from app.models.participant import Participant
from app.models.tournament import LeagueScoringSystem, Tournament
from app.models.user import User, UserRole
from app.services.decision_matches import (
    compute_group_ranking_with_rules,
    compute_ranking_with_decision_matches,
)
from app.services.ko_propagation import BRONZE_ROUND


def _compute_group_rankings(db, tournament: Tournament, groups: List[Group]) -> Dict[int, List[int]]:
    """Gleiche Logik wie get_qualification_table (Gruppenränge)."""
    scoring_system = tournament.league_scoring_system or LeagueScoringSystem.POINTS
    group_rankings: Dict[int, List[int]] = {}

    for group in groups:
        group_participants = [gp.participant_id for gp in group.participants]

        regular_matches_data = (
            db.query(GroupMatch)
            .filter(
                GroupMatch.tournament_id == tournament.id,
                GroupMatch.group_id == group.id,
                GroupMatch.is_decision_match == False,
            )
            .all()
        )

        regular_matches = [
            {
                "player1_id": m.player1_id,
                "player2_id": m.player2_id,
                "score1": m.score1,
                "score2": m.score2,
            }
            for m in regular_matches_data
        ]

        decision_matches_data = (
            db.query(GroupMatch)
            .filter(
                GroupMatch.tournament_id == tournament.id,
                GroupMatch.group_id == group.id,
                GroupMatch.is_decision_match == True,
            )
            .all()
        )

        decision_matches = [
            {
                "player1_id": m.player1_id,
                "player2_id": m.player2_id,
                "score1": m.score1,
                "score2": m.score2,
            }
            for m in decision_matches_data
        ]

        if decision_matches:
            ranking, _ = compute_ranking_with_decision_matches(
                regular_matches=regular_matches,
                decision_matches=decision_matches,
                participant_ids=group_participants,
                scoring_system=scoring_system,
                tie_breaking_rules=tournament.tie_breaking_rules,
                points_for_win=tournament.league_points_win or 3,
                points_for_draw=tournament.league_points_draw or 1,
                points_for_loss=tournament.league_points_loss or 0,
            )
        else:
            ranking = compute_group_ranking_with_rules(
                regular_matches,
                group_participants,
                scoring_system,
                tournament.tie_breaking_rules,
                points_for_win=tournament.league_points_win or 3,
                points_for_draw=tournament.league_points_draw or 1,
                points_for_loss=tournament.league_points_loss or 0,
            )

        group_rankings[group.id] = ranking

    return group_rankings


def _group_letter(group: Group) -> str:
    """Aus z. B. 'Gruppe A' → 'A'; Fallback: erstes Buchstaben-Segment."""
    name = (group.name or "").strip()
    lower = name.lower()
    if lower.startswith("gruppe "):
        tail = name[7:].strip()
        if tail:
            return tail[0].upper()
    for ch in name:
        if ch.isalpha():
            return ch.upper()
    return "?"


def _participant_rank_code(
    groups_by_id: Dict[int, Group],
    group_rankings: Dict[int, List[int]],
    participant_id: Optional[int],
) -> Optional[str]:
    """Kompakt: 'C1', 'E6' (Gruppenbuchstabe + Listenplatz)."""
    if participant_id is None:
        return None
    for gid, ranking in group_rankings.items():
        if participant_id in ranking:
            pos = ranking.index(participant_id) + 1
            g = groups_by_id.get(gid)
            letter = _group_letter(g) if g else "?"
            return f"{letter}{pos}"
    return None


def _participant_label(
    groups_by_id: Dict[int, Group],
    group_rankings: Dict[int, List[int]],
    participant_id: Optional[int],
) -> Optional[str]:
    if participant_id is None:
        return None
    for gid, ranking in group_rankings.items():
        if participant_id in ranking:
            pos = ranking.index(participant_id) + 1
            g = groups_by_id.get(gid)
            gname = g.name if g else f"Gruppe {gid}"
            return f"{gname} · Platz {pos}"
    return f"Teilnehmer-ID {participant_id}"


def _participant_display_name(participants_map: Dict[int, Participant], participant_id: Optional[int]) -> str:
    if participant_id is None:
        return "—"
    p = participants_map.get(participant_id)
    if not p:
        return f"ID {participant_id}"
    return f"{p.first_name} {p.last_name}".strip() or f"ID {participant_id}"


def _format_score_line(score1: Optional[int], score2: Optional[int]) -> str:
    if score1 is None and score2 is None:
        return "(offen)"
    if score1 is None or score2 is None:
        return "(offen)"
    return f"({score1}:{score2})"


def _side_code_name(
    code: Optional[str],
    name: str,
) -> str:
    """Eine Seite: 'C1 Lukas Indergand' oder nur Name ohne Code."""
    if code:
        return f"{code} {name}".strip()
    return name


def _build_ko_text_report(
    ko_matches: List[KnockoutMatch],
    groups_by_id: Dict[int, Group],
    group_rankings: Dict[int, List[int]],
    participants_map: Dict[int, Participant],
) -> str:
    """Bericht wie in der Referenz: ### Runde n, dann * Spiel k: C1 Name vs E6 Name (2:1)."""
    lines: List[str] = []
    by_round: Dict[int, List[KnockoutMatch]] = {}
    for m in ko_matches:
        by_round.setdefault(m.round, []).append(m)
    for rnd in sorted(by_round.keys()):
        if rnd == BRONZE_ROUND:
            lines.append("### Spiel um Platz 3")
        else:
            lines.append(f"### Runde {rnd}")
        lines.append("")
        matches = sorted(by_round[rnd], key=lambda x: x.match_no)
        for m in matches:
            c1 = _participant_rank_code(groups_by_id, group_rankings, m.player1_id)
            c2 = _participant_rank_code(groups_by_id, group_rankings, m.player2_id)
            n1 = _participant_display_name(participants_map, m.player1_id)
            n2 = _participant_display_name(participants_map, m.player2_id)
            left = _side_code_name(c1, n1)
            right = _side_code_name(c2, n2)
            score = _format_score_line(m.score1, m.score2)
            lines.append(f"* Spiel {m.match_no}: {left} vs {right} {score}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


async def export_tournament(tournament_id: int) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.role == UserRole.POWER_ADMIN).first()
        if not user:
            user = db.query(User).first()
        if not user:
            raise RuntimeError("Kein Benutzer in der Datenbank")

        qual: Dict[str, Any] = await get_qualification_table(
            tournament_id, current_user=user, db=db
        )

        tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
        groups = db.query(Group).filter(Group.tournament_id == tournament_id).all()
        groups_by_id = {g.id: g for g in groups}

        group_rankings = _compute_group_rankings(db, tournament, groups)

        # Vollständige Rangfolge pro Gruppe (IDs + Namen)
        rank_ids = {pid for r in group_rankings.values() for pid in r}
        if rank_ids:
            participants_map = {
                p.id: p
                for p in db.query(Participant).filter(Participant.id.in_(rank_ids)).all()
            }
        else:
            participants_map = {}

        # Alle KO-Spieler für Namen (auch ohne Gruppenrang, z. B. nach KO-Ziehung)
        ko_pids = (
            db.query(KnockoutMatch.player1_id, KnockoutMatch.player2_id)
            .filter(KnockoutMatch.tournament_id == tournament_id)
            .all()
        )
        extra_ids = {a for row in ko_pids for a in row if a is not None}
        missing = extra_ids - set(participants_map.keys())
        if missing:
            for p in db.query(Participant).filter(Participant.id.in_(missing)).all():
                participants_map[p.id] = p

        ko_all = (
            db.query(KnockoutMatch)
            .filter(
                KnockoutMatch.tournament_id == tournament_id,
                KnockoutMatch.round >= 1,
            )
            .order_by(KnockoutMatch.round, KnockoutMatch.match_no)
            .all()
        )

        pairings_r1: List[Dict[str, Any]] = []
        for m in ko_all:
            if m.round != 1:
                continue
            pairings_r1.append(
                {
                    "match_no": m.match_no,
                    "ko_match_id": m.id,
                    "player1_id": m.player1_id,
                    "player2_id": m.player2_id,
                    "player1_code": _participant_rank_code(groups_by_id, group_rankings, m.player1_id),
                    "player2_code": _participant_rank_code(groups_by_id, group_rankings, m.player2_id),
                    "player1_label": _participant_label(groups_by_id, group_rankings, m.player1_id),
                    "player2_label": _participant_label(groups_by_id, group_rankings, m.player2_id),
                    "score1": m.score1,
                    "score2": m.score2,
                }
            )

        ko_compact: List[Dict[str, Any]] = []
        for m in ko_all:
            c1 = _participant_rank_code(groups_by_id, group_rankings, m.player1_id)
            c2 = _participant_rank_code(groups_by_id, group_rankings, m.player2_id)
            n1 = _participant_display_name(participants_map, m.player1_id)
            n2 = _participant_display_name(participants_map, m.player2_id)
            left = _side_code_name(c1, n1)
            right = _side_code_name(c2, n2)
            ko_compact.append(
                {
                    "round": m.round,
                    "match_no": m.match_no,
                    "ko_match_id": m.id,
                    "player1_id": m.player1_id,
                    "player2_id": m.player2_id,
                    "player1_code": c1,
                    "player2_code": c2,
                    "player1_name": n1,
                    "player2_name": n2,
                    "line": f"Spiel {m.match_no}: {left} vs {right} {_format_score_line(m.score1, m.score2)}",
                    "score1": m.score1,
                    "score2": m.score2,
                }
            )

        ko_text = _build_ko_text_report(ko_all, groups_by_id, group_rankings, participants_map)

        ranking_by_group: List[Dict[str, Any]] = []
        for g in sorted(groups, key=lambda x: x.id):
            ranking = group_rankings.get(g.id, [])
            rows = []
            for idx, pid in enumerate(ranking):
                p = participants_map.get(pid)
                name = f"{p.first_name} {p.last_name}".strip() if p else str(pid)
                rows.append(
                    {
                        "platz": idx + 1,
                        "participant_id": pid,
                        "name": name,
                    }
                )
            ranking_by_group.append({"group_id": g.id, "group_name": g.name, "ranking": rows})

        return {
            "tournament_id": tournament_id,
            "qualification_api": qual,
            "group_rankings_ordered": ranking_by_group,
            "ko_round_1_pairings_with_group_rank": pairings_r1,
            "ko_matches_compact": ko_compact,
            "ko_text_report": ko_text,
        }
    finally:
        db.close()


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    flags = {a for a in sys.argv[1:] if a.startswith("-")}
    tid = int(args[0]) if args else 44
    out = asyncio.run(export_tournament(tid))
    if "-t" in flags or "--text" in flags or "--md" in flags:
        print(out.get("ko_text_report", ""), end="")
        return
    print(json.dumps(out, ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    main()
