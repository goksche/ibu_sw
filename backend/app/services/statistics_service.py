"""Service for computing statistics across tournaments, matches, and participants."""
from datetime import date, timedelta
from typing import Optional, List, Tuple
from collections import defaultdict

from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, case, extract

from app.models.tournament import Tournament, TournamentStatus, TournamentMode
from app.models.match import GroupMatch, KnockoutMatch
from app.models.participant import Participant, TournamentParticipant
from app.models.user import User
from app.services.visibility import get_visible_tournaments_query


def _resolve_date_range(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    preset: Optional[str] = None,
) -> Tuple[Optional[date], Optional[date]]:
    """Convert preset to concrete dates, or pass through explicit dates."""
    if preset:
        today = date.today()
        end_date = today
        if preset == "12m":
            start_date = today - timedelta(days=365)
        elif preset == "6m":
            start_date = today - timedelta(days=182)
        elif preset == "3m":
            start_date = today - timedelta(days=91)
        elif preset == "1m":
            start_date = today - timedelta(days=30)
    return start_date, end_date


def _visible_tournament_ids(
    db: Session, user: User,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    preset: Optional[str] = None,
) -> List[int]:
    """Return IDs of tournaments the user may see, optionally filtered by date range."""
    sd, ed = _resolve_date_range(start_date, end_date, preset)
    q = get_visible_tournaments_query(db, user)
    if sd:
        q = q.filter(Tournament.start_date >= sd)
    if ed:
        q = q.filter(Tournament.start_date <= ed)
    return [t.id for t in q.with_entities(Tournament.id).all()]


def get_overview(
    db: Session, user: User,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    preset: Optional[str] = None,
) -> dict:
    sd, ed = _resolve_date_range(start_date, end_date, preset)
    base_q = get_visible_tournaments_query(db, user)
    if sd:
        base_q = base_q.filter(Tournament.start_date >= sd)
    if ed:
        base_q = base_q.filter(Tournament.start_date <= ed)

    tournaments = base_q.all()
    t_ids = [t.id for t in tournaments]

    group_matches = db.query(func.count(GroupMatch.id)).filter(
        GroupMatch.tournament_id.in_(t_ids)
    ).scalar() if t_ids else 0

    ko_matches = db.query(func.count(KnockoutMatch.id)).filter(
        KnockoutMatch.tournament_id.in_(t_ids)
    ).scalar() if t_ids else 0

    participants_count = db.query(func.count(func.distinct(TournamentParticipant.participant_id))).filter(
        TournamentParticipant.tournament_id.in_(t_ids)
    ).scalar() if t_ids else 0

    location_ids = set()
    for t in tournaments:
        if t.location_id:
            location_ids.add(t.location_id)

    status_counts = defaultdict(int)
    mode_counts = defaultdict(int)
    month_counts = defaultdict(int)
    for t in tournaments:
        status_counts[t.status.value if t.status else "planned"] += 1
        mode_counts[t.mode.value if t.mode else "round_robin"] += 1
        if t.start_date:
            key = t.start_date.strftime("%Y-%m")
            month_counts[key] += 1

    matches_by_month: dict[str, int] = defaultdict(int)
    if t_ids:
        gm_rows = (
            db.query(Tournament.start_date, func.count(GroupMatch.id))
            .join(GroupMatch, GroupMatch.tournament_id == Tournament.id)
            .filter(Tournament.id.in_(t_ids))
            .group_by(Tournament.start_date)
            .all()
        )
        for row_date, cnt in gm_rows:
            if row_date:
                matches_by_month[row_date.strftime("%Y-%m")] += cnt

        km_rows = (
            db.query(Tournament.start_date, func.count(KnockoutMatch.id))
            .join(KnockoutMatch, KnockoutMatch.tournament_id == Tournament.id)
            .filter(Tournament.id.in_(t_ids))
            .group_by(Tournament.start_date)
            .all()
        )
        for row_date, cnt in km_rows:
            if row_date:
                matches_by_month[row_date.strftime("%Y-%m")] += cnt

    sorted_months = sorted(month_counts.keys())
    sorted_match_months = sorted(matches_by_month.keys())

    return {
        "tournaments_count": len(tournaments),
        "matches_count": group_matches + ko_matches,
        "participants_count": participants_count,
        "locations_count": len(location_ids),
        "completed_tournaments": status_counts.get("completed", 0),
        "running_tournaments": status_counts.get("running", 0),
        "planned_tournaments": status_counts.get("planned", 0),
        "tournaments_by_mode": [
            {"mode": m, "count": c} for m, c in sorted(mode_counts.items())
        ],
        "tournaments_by_month": [
            {"month": m, "count": month_counts[m]} for m in sorted_months
        ],
        "matches_by_month": [
            {"month": m, "count": matches_by_month[m]} for m in sorted_match_months
        ],
    }


def _compute_participant_match_stats(
    db: Session, participant_id: int, tournament_ids: List[int],
) -> dict:
    """Aggregate group-match stats for a single participant across given tournaments."""
    if not tournament_ids:
        return {"matches_played": 0, "wins": 0, "losses": 0, "draws": 0, "gf": 0, "ga": 0}

    gm_p1 = (
        db.query(GroupMatch)
        .filter(
            GroupMatch.tournament_id.in_(tournament_ids),
            GroupMatch.player1_id == participant_id,
            GroupMatch.score1.isnot(None),
            GroupMatch.score2.isnot(None),
        )
        .all()
    )
    gm_p2 = (
        db.query(GroupMatch)
        .filter(
            GroupMatch.tournament_id.in_(tournament_ids),
            GroupMatch.player2_id == participant_id,
            GroupMatch.score1.isnot(None),
            GroupMatch.score2.isnot(None),
        )
        .all()
    )

    km_p1 = (
        db.query(KnockoutMatch)
        .filter(
            KnockoutMatch.tournament_id.in_(tournament_ids),
            KnockoutMatch.player1_id == participant_id,
            KnockoutMatch.score1.isnot(None),
            KnockoutMatch.score2.isnot(None),
        )
        .all()
    )
    km_p2 = (
        db.query(KnockoutMatch)
        .filter(
            KnockoutMatch.tournament_id.in_(tournament_ids),
            KnockoutMatch.player2_id == participant_id,
            KnockoutMatch.score1.isnot(None),
            KnockoutMatch.score2.isnot(None),
        )
        .all()
    )

    wins = losses = draws = gf = ga = 0
    total = 0

    for m in gm_p1:
        total += 1
        gf += m.score1
        ga += m.score2
        if m.score1 > m.score2:
            wins += 1
        elif m.score1 < m.score2:
            losses += 1
        else:
            draws += 1

    for m in gm_p2:
        total += 1
        gf += m.score2
        ga += m.score1
        if m.score2 > m.score1:
            wins += 1
        elif m.score2 < m.score1:
            losses += 1
        else:
            draws += 1

    for m in km_p1:
        total += 1
        gf += m.score1
        ga += m.score2
        if m.score1 > m.score2:
            wins += 1
        elif m.score1 < m.score2:
            losses += 1
        else:
            draws += 1

    for m in km_p2:
        total += 1
        gf += m.score2
        ga += m.score1
        if m.score2 > m.score1:
            wins += 1
        elif m.score2 < m.score1:
            losses += 1
        else:
            draws += 1

    return {"matches_played": total, "wins": wins, "losses": losses, "draws": draws, "gf": gf, "ga": ga}


def get_participants_ranking(
    db: Session, user: User,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    preset: Optional[str] = None,
    sort_by: str = "wins",
    limit: int = 50,
) -> dict:
    t_ids = _visible_tournament_ids(db, user, start_date, end_date, preset)

    tp_rows = (
        db.query(
            TournamentParticipant.participant_id,
            func.count(TournamentParticipant.tournament_id).label("t_count"),
        )
        .filter(TournamentParticipant.tournament_id.in_(t_ids))
        .group_by(TournamentParticipant.participant_id)
        .all()
    ) if t_ids else []

    results = []
    for pid, t_count in tp_rows:
        p = db.query(Participant).filter(Participant.id == pid).first()
        if not p:
            continue
        stats = _compute_participant_match_stats(db, pid, t_ids)
        mp = stats["matches_played"]
        results.append({
            "id": p.id,
            "first_name": p.first_name,
            "last_name": p.last_name,
            "club": p.club,
            "tournaments_count": t_count,
            "matches_played": mp,
            "wins": stats["wins"],
            "losses": stats["losses"],
            "draws": stats["draws"],
            "goals_for": stats["gf"],
            "goals_against": stats["ga"],
            "goal_difference": stats["gf"] - stats["ga"],
            "win_rate": round(stats["wins"] / mp * 100, 1) if mp > 0 else 0.0,
        })

    sort_key = sort_by if sort_by in ("wins", "matches_played", "goals_for", "win_rate", "tournaments_count") else "wins"
    results.sort(key=lambda x: x[sort_key], reverse=True)
    total = len(results)
    results = results[:limit]

    return {"participants": results, "total": total}


def get_participant_detail(
    db: Session, user: User, participant_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    preset: Optional[str] = None,
) -> Optional[dict]:
    p = db.query(Participant).filter(Participant.id == participant_id).first()
    if not p:
        return None

    t_ids = _visible_tournament_ids(db, user, start_date, end_date, preset)

    my_t_ids = [
        tp.tournament_id
        for tp in db.query(TournamentParticipant)
        .filter(
            TournamentParticipant.participant_id == participant_id,
            TournamentParticipant.tournament_id.in_(t_ids),
        )
        .all()
    ] if t_ids else []

    overall = _compute_participant_match_stats(db, participant_id, my_t_ids)

    history = []
    for tid in my_t_ids:
        t = db.query(Tournament).filter(Tournament.id == tid).first()
        if not t:
            continue
        ts = _compute_participant_match_stats(db, participant_id, [tid])
        history.append({
            "tournament_id": t.id,
            "tournament_name": t.name,
            "start_date": t.start_date,
            "matches_played": ts["matches_played"],
            "wins": ts["wins"],
            "losses": ts["losses"],
            "draws": ts["draws"],
            "goals_for": ts["gf"],
            "goals_against": ts["ga"],
        })
    history.sort(key=lambda x: x["start_date"], reverse=True)

    mp = overall["matches_played"]
    return {
        "id": p.id,
        "first_name": p.first_name,
        "last_name": p.last_name,
        "club": p.club,
        "tournaments_count": len(my_t_ids),
        "matches_played": mp,
        "wins": overall["wins"],
        "losses": overall["losses"],
        "draws": overall["draws"],
        "goals_for": overall["gf"],
        "goals_against": overall["ga"],
        "goal_difference": overall["gf"] - overall["ga"],
        "win_rate": round(overall["wins"] / mp * 100, 1) if mp > 0 else 0.0,
        "tournament_history": history,
    }


def get_tournament_stats(
    db: Session, user: User,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    preset: Optional[str] = None,
) -> dict:
    sd, ed = _resolve_date_range(start_date, end_date, preset)
    base_q = get_visible_tournaments_query(db, user)
    if sd:
        base_q = base_q.filter(Tournament.start_date >= sd)
    if ed:
        base_q = base_q.filter(Tournament.start_date <= ed)

    tournaments = base_q.order_by(Tournament.start_date.desc()).all()
    results = []
    for t in tournaments:
        p_count = db.query(func.count(TournamentParticipant.id)).filter(
            TournamentParticipant.tournament_id == t.id
        ).scalar()

        gm_total = db.query(func.count(GroupMatch.id)).filter(
            GroupMatch.tournament_id == t.id
        ).scalar()
        gm_completed = db.query(func.count(GroupMatch.id)).filter(
            GroupMatch.tournament_id == t.id,
            GroupMatch.score1.isnot(None),
            GroupMatch.score2.isnot(None),
        ).scalar()

        km_total = db.query(func.count(KnockoutMatch.id)).filter(
            KnockoutMatch.tournament_id == t.id
        ).scalar()
        km_completed = db.query(func.count(KnockoutMatch.id)).filter(
            KnockoutMatch.tournament_id == t.id,
            KnockoutMatch.score1.isnot(None),
            KnockoutMatch.score2.isnot(None),
        ).scalar()

        loc_name = None
        if t.location and hasattr(t.location, "name"):
            loc_name = t.location.name

        results.append({
            "id": t.id,
            "name": t.name,
            "start_date": t.start_date,
            "end_date": t.end_date,
            "mode": t.mode.value if t.mode else "round_robin",
            "status": t.status.value if t.status else "planned",
            "participants_count": p_count,
            "group_matches_count": gm_total,
            "ko_matches_count": km_total,
            "total_matches": gm_total + km_total,
            "completed_matches": gm_completed + km_completed,
            "location_name": loc_name,
        })

    return {"tournaments": results, "total": len(results)}
