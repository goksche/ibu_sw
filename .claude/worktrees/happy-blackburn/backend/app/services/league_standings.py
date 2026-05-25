"""
League standings service - computes live standings from tournament results.

For each tournament in a league, determines participant placements and maps
them to the league's placement_points schema.
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.league import League
from app.models.tournament import Tournament
from app.models.match import KnockoutMatch, GroupMatch
from app.models.group import Group, GroupParticipant


def _get_ko_final_placement(db: Session, tournament_id: int) -> Dict[int, int]:
    """
    Derive participant placements from KO bracket results.
    Returns {participant_id: placement} (1=winner, 2=runner-up, etc.)
    """
    matches = (
        db.query(KnockoutMatch)
        .filter(KnockoutMatch.tournament_id == tournament_id, KnockoutMatch.round > 0)
        .order_by(KnockoutMatch.round.desc(), KnockoutMatch.match_no)
        .all()
    )
    if not matches:
        return {}

    max_round = max(m.round for m in matches)
    placements: Dict[int, int] = {}
    current_place = 1

    for rnd in range(max_round, 0, -1):
        round_matches = [m for m in matches if m.round == rnd]
        winners = []
        losers = []
        for m in round_matches:
            if m.score1 is None or m.score2 is None:
                continue
            if m.score1 > m.score2:
                winners.append(m.player1_id)
                losers.append(m.player2_id)
            elif m.score2 > m.score1:
                winners.append(m.player2_id)
                losers.append(m.player1_id)

        if rnd == max_round:
            for pid in winners:
                if pid and pid not in placements:
                    placements[pid] = current_place
            current_place += len(winners)
            for pid in losers:
                if pid and pid not in placements:
                    placements[pid] = current_place
            current_place += len(losers)
        else:
            for pid in losers:
                if pid and pid not in placements:
                    placements[pid] = current_place
            current_place += len(losers)

    return placements


def _get_group_placement(db: Session, tournament_id: int) -> Dict[int, int]:
    """
    Derive participant placements from group phase (for pure group tournaments).
    Uses group_participants ordering and match results to create a simple ranking.
    """
    groups = db.query(Group).filter(Group.tournament_id == tournament_id).all()
    if not groups:
        return {}

    all_stats: List[Dict[str, Any]] = []

    for group in groups:
        gps = (
            db.query(GroupParticipant)
            .filter(GroupParticipant.group_id == group.id)
            .all()
        )
        participant_ids = [gp.participant_id for gp in gps]

        matches = (
            db.query(GroupMatch)
            .filter(
                GroupMatch.tournament_id == tournament_id,
                GroupMatch.group_id == group.id,
                GroupMatch.score1.isnot(None),
                GroupMatch.score2.isnot(None),
            )
            .all()
        )

        stats: Dict[int, Dict] = {}
        for pid in participant_ids:
            stats[pid] = {"points": 0, "diff": 0, "wins": 0, "played": 0}

        for m in matches:
            if m.player1_id in stats:
                stats[m.player1_id]["played"] += 1
                stats[m.player1_id]["diff"] += (m.score1 or 0) - (m.score2 or 0)
            if m.player2_id in stats:
                stats[m.player2_id]["played"] += 1
                stats[m.player2_id]["diff"] += (m.score2 or 0) - (m.score1 or 0)

            if m.score1 > m.score2:
                if m.player1_id in stats:
                    stats[m.player1_id]["points"] += 3
                    stats[m.player1_id]["wins"] += 1
            elif m.score2 > m.score1:
                if m.player2_id in stats:
                    stats[m.player2_id]["points"] += 3
                    stats[m.player2_id]["wins"] += 1
            else:
                if m.player1_id in stats:
                    stats[m.player1_id]["points"] += 1
                if m.player2_id in stats:
                    stats[m.player2_id]["points"] += 1

        for pid, s in stats.items():
            all_stats.append({"participant_id": pid, **s})

    all_stats.sort(key=lambda x: (-x["points"], -x["diff"], -x["wins"]))
    return {s["participant_id"]: i + 1 for i, s in enumerate(all_stats)}


def get_tournament_placements(db: Session, tournament: Tournament) -> Dict[int, int]:
    """
    Get final placements for a tournament. Prefers KO results if available,
    falls back to group rankings.
    """
    if tournament.has_ko_phase:
        placements = _get_ko_final_placement(db, tournament.id)
        if placements:
            return placements

    if tournament.has_group_phase:
        return _get_group_placement(db, tournament.id)

    return {}


def _resolve_points_for_placement(placement_points: Dict[str, Any], place: int) -> int:
    """
    Resolve championship points for a given placement using the structured schema.

    Schema format:
    {
      "top": [{"rank": 1, "points": 30}, {"rank": 2, "points": 24}, ...],
      "ko_rounds": [
        {"label": "Viertelfinale", "from_rank": 5, "to_rank": 8, "points": 8},
        {"label": "Achtelfinale", "from_rank": 9, "to_rank": 16, "points": 4}
      ],
      "participation_points": 2
    }

    Also supports legacy flat format: {"1": 25, "2": 18, ...}
    """
    if not placement_points:
        return 0

    # New structured format
    if "top" in placement_points:
        for entry in placement_points.get("top", []):
            if entry.get("rank") == place:
                return entry.get("points", 0)

        for ko_round in placement_points.get("ko_rounds", []):
            from_rank = ko_round.get("from_rank", 0)
            to_rank = ko_round.get("to_rank", 0)
            if from_rank <= place <= to_rank:
                return ko_round.get("points", 0)

        return placement_points.get("participation_points", 0)

    # Legacy flat format: {"1": 25, "2": 18, ...}
    return placement_points.get(str(place), 0)


def compute_league_standings(
    db: Session, league: League
) -> List[Dict[str, Any]]:
    """
    Compute the full league standings across all linked tournaments.
    Returns a list of standing entries sorted by total points descending.
    """
    placement_points = league.placement_points or {}

    participant_totals: Dict[int, Dict[str, Any]] = {}

    for participant in league.participants:
        participant_totals[participant.id] = {
            "participant_id": participant.id,
            "first_name": participant.first_name,
            "last_name": participant.last_name,
            "tournaments_played": 0,
            "total_points": 0,
            "placements": [],
            "place_counts": {},
        }

    for tournament in league.tournaments:
        placements = get_tournament_placements(db, tournament)

        for pid, entry in participant_totals.items():
            place = placements.get(pid)
            points = 0
            if place is not None:
                points = _resolve_points_for_placement(placement_points, place)
                entry["tournaments_played"] += 1
                entry["place_counts"][place] = entry["place_counts"].get(place, 0) + 1

            entry["placements"].append({
                "tournament_id": tournament.id,
                "tournament_name": tournament.name,
                "placement": place,
                "points": points,
            })
            entry["total_points"] += points

    # Tiebreaker: total points, then more 1st places, then 2nd, etc.
    standings = sorted(
        participant_totals.values(),
        key=lambda x: (
            -x["total_points"],
            *[-x["place_counts"].get(i, 0) for i in range(1, 20)],
        ),
    )

    for i, entry in enumerate(standings):
        entry["rank"] = i + 1
        del entry["place_counts"]

    return standings
