from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta

from app.core.database import get_db
from app.core.dependencies import require_user_or_admin, require_viewer_or_above
from app.models.league import League
from app.models.participant import Participant
from app.models.tournament import Tournament, TournamentMode, TournamentStatus
from app.schemas.league import (
    LeagueCreate,
    LeagueUpdate,
    LeagueResponse,
    LeagueParticipantSummary,
    LeagueTournamentSummary,
    LeagueStandingsResponse,
    LeagueStandingEntry,
)
from app.services.league_standings import compute_league_standings

router = APIRouter(prefix="/leagues", tags=["Leagues"])


def _build_league_response(league: League) -> LeagueResponse:
    participants = [
        LeagueParticipantSummary(id=p.id, first_name=p.first_name, last_name=p.last_name)
        for p in league.participants
    ]
    tournaments = [
        LeagueTournamentSummary(
            id=t.id, name=t.name, start_date=t.start_date,
            end_date=t.end_date, status=t.status.value if t.status else None,
        )
        for t in league.tournaments
    ]
    return LeagueResponse(
        id=league.id,
        name=league.name,
        description=league.description,
        scoring_schema=league.scoring_schema,
        mode_presets=league.mode_presets,
        status=league.status,
        league_mode=league.league_mode,
        tournament_mode=league.tournament_mode,
        placement_points=league.placement_points,
        masters_ko_count=league.masters_ko_count,
        auto_tournament_count=league.auto_tournament_count,
        auto_tournament_mode=league.auto_tournament_mode,
        auto_tournament_settings=league.auto_tournament_settings,
        season_type=league.season_type,
        season_year=league.season_year,
        start_date=league.start_date,
        end_date=league.end_date,
        participant_ids=[p.id for p in league.participants],
        tournament_ids=[t.id for t in league.tournaments],
        participants=participants,
        tournaments=tournaments,
        created_at=league.created_at,
        updated_at=league.updated_at,
    )


MODE_MAP = {
    "round_robin": TournamentMode.ROUND_ROBIN,
    "knockout": TournamentMode.KNOCKOUT,
    "combined": TournamentMode.COMBINED,
}


@router.get("", response_model=List[LeagueResponse])
def get_leagues(
    current_user=Depends(require_viewer_or_above),
    db: Session = Depends(get_db)
):
    leagues = db.query(League).all()
    return [_build_league_response(league) for league in leagues]


@router.get("/{league_id}", response_model=LeagueResponse)
def get_league(
    league_id: int,
    current_user=Depends(require_viewer_or_above),
    db: Session = Depends(get_db)
):
    league = db.query(League).filter(League.id == league_id).first()
    if not league:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="League not found")
    return _build_league_response(league)


@router.get("/{league_id}/standings", response_model=LeagueStandingsResponse)
def get_league_standings(
    league_id: int,
    current_user=Depends(require_viewer_or_above),
    db: Session = Depends(get_db)
):
    league = db.query(League).filter(League.id == league_id).first()
    if not league:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="League not found")

    raw_standings = compute_league_standings(db, league)
    entries = [LeagueStandingEntry(**entry) for entry in raw_standings]
    return LeagueStandingsResponse(
        league_id=league.id,
        league_name=league.name,
        entries=entries,
    )


@router.post("", response_model=LeagueResponse, status_code=status.HTTP_201_CREATED)
def create_league(
    payload: LeagueCreate,
    current_user=Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    league = League(
        name=payload.name,
        description=payload.description,
        scoring_schema=payload.scoring_schema,
        mode_presets=payload.mode_presets,
        status=payload.status or "geplant",
        league_mode=payload.league_mode or "liga",
        tournament_mode=payload.tournament_mode or "combined",
        placement_points=payload.placement_points,
        masters_ko_count=payload.masters_ko_count,
        auto_tournament_count=payload.auto_tournament_count,
        auto_tournament_mode=payload.auto_tournament_mode,
        auto_tournament_settings=payload.auto_tournament_settings,
        season_type=payload.season_type,
        season_year=payload.season_year,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )

    if payload.participant_ids:
        participants = db.query(Participant).filter(Participant.id.in_(payload.participant_ids)).all()
        if len(participants) != len(set(payload.participant_ids)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ungültige Teilnehmer-Auswahl")
        league.participants = participants

    if payload.tournament_ids:
        tournaments = db.query(Tournament).filter(Tournament.id.in_(payload.tournament_ids)).all()
        if len(tournaments) != len(set(payload.tournament_ids)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ungültige Turnier-Auswahl")
        league.tournaments = tournaments

    db.add(league)
    db.commit()
    db.refresh(league)
    return _build_league_response(league)


@router.put("/{league_id}", response_model=LeagueResponse)
def update_league(
    league_id: int,
    payload: LeagueUpdate,
    current_user=Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    league = db.query(League).filter(League.id == league_id).first()
    if not league:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="League not found")

    update_data = payload.model_dump(exclude_unset=True)
    participant_ids = update_data.pop("participant_ids", None)
    tournament_ids = update_data.pop("tournament_ids", None)

    for field, value in update_data.items():
        setattr(league, field, value)

    if participant_ids is not None:
        participants = db.query(Participant).filter(Participant.id.in_(participant_ids)).all()
        if len(participants) != len(set(participant_ids)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ungültige Teilnehmer-Auswahl")
        league.participants = participants

    if tournament_ids is not None:
        tournaments = db.query(Tournament).filter(Tournament.id.in_(tournament_ids)).all()
        if len(tournaments) != len(set(tournament_ids)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ungültige Turnier-Auswahl")
        league.tournaments = tournaments

    db.commit()
    db.refresh(league)
    return _build_league_response(league)


@router.post("/{league_id}/generate-tournaments", response_model=LeagueResponse)
def generate_league_tournaments(
    league_id: int,
    current_user=Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Auto-generate N tournaments for this league with full tournament settings."""
    league = db.query(League).filter(League.id == league_id).first()
    if not league:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="League not found")

    count = league.auto_tournament_count or 0
    if count <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Anzahl der zu generierenden Turniere muss > 0 sein",
        )

    mode_str = league.auto_tournament_mode or league.tournament_mode or "combined"
    mode = MODE_MAP.get(mode_str, TournamentMode.COMBINED)
    settings = league.auto_tournament_settings or {}

    has_group = mode in (TournamentMode.ROUND_ROBIN, TournamentMode.COMBINED)
    has_ko = mode in (TournamentMode.KNOCKOUT, TournamentMode.COMBINED)

    tournament_names = settings.get("tournament_names", [])

    base_date = date.today()
    created_tournaments = []

    for i in range(count):
        name = (
            tournament_names[i]
            if i < len(tournament_names) and tournament_names[i]
            else f"{league.name} – Turnier {len(league.tournaments) + i + 1}"
        )

        tournament = Tournament(
            name=name,
            description=f"Auto-generiert für Meisterschaft: {league.name}",
            start_date=base_date + timedelta(weeks=i),
            mode=mode,
            status=TournamentStatus.PLANNED,
            has_group_phase=has_group,
            has_ko_phase=has_ko,
            groups_count=settings.get("groups_count", 4) if has_group else 0,
            group_distribution=settings.get("group_distribution", "random") if has_group else "random",
            league_scoring_system=settings.get("league_scoring_system") if has_group else None,
            tie_breaking_rules=settings.get("tie_breaking_rules") if has_group else None,
            league_variant=settings.get("league_variant", "classic") if has_group else None,
            league_rounds_multiplier=settings.get("league_rounds_multiplier", 1) if has_group else None,
            ko_start_round=settings.get("ko_start_round") if has_ko else None,
            ko_structure=settings.get("ko_structure") if has_ko else None,
            ko_draw_method=settings.get("ko_draw_method") if has_ko else None,
            ko_distribution=settings.get("ko_distribution") if has_ko else None,
            ko_block_same_group=settings.get("ko_block_same_group", True) if has_ko and has_group else True,
            ko_block_same_position=settings.get("ko_block_same_position", False) if has_ko and has_group else False,
            ko_third_place_match=settings.get("ko_third_place_match", False) if has_ko else False,
            ko_random_seed=settings.get("ko_random_seed") if has_ko else None,
            location_id=settings.get("location_id"),
            spielfeld_assignment_mode=settings.get("spielfeld_assignment_mode", "random") if has_group else None,
            show_matches=True,
            show_tables=True,
            creator_id=current_user.id if hasattr(current_user, "id") else None,
        )
        db.add(tournament)
        db.flush()

        if league.participants:
            from app.models.participant import TournamentParticipant
            for p in league.participants:
                tp = TournamentParticipant(
                    tournament_id=tournament.id,
                    participant_id=p.id,
                )
                db.add(tp)

        created_tournaments.append(tournament)

    for t in created_tournaments:
        league.tournaments.append(t)

    db.commit()
    db.refresh(league)
    return _build_league_response(league)


@router.post("/{league_id}/generate-masters-ko", response_model=LeagueResponse)
def generate_masters_ko(
    league_id: int,
    current_user=Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Generate a final KO tournament from the top N participants of the league standings."""
    league = db.query(League).filter(League.id == league_id).first()
    if not league:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="League not found")

    if league.league_mode != "masters":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nur im Masters-Modus verfügbar",
        )

    ko_count = league.masters_ko_count or 8
    standings = compute_league_standings(db, league)
    qualified = [s for s in standings if s["tournaments_played"] > 0][:ko_count]

    if len(qualified) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Zu wenig qualifizierte Teilnehmer ({len(qualified)}). Mindestens 2 benötigt.",
        )

    ko_tournament = Tournament(
        name=f"{league.name} – Masters Finale",
        description=f"Finales KO-Turnier der Meisterschaft: {league.name}",
        start_date=date.today(),
        mode=TournamentMode.KNOCKOUT,
        status=TournamentStatus.PLANNED,
        has_group_phase=False,
        has_ko_phase=True,
        groups_count=0,
        show_matches=True,
        show_tables=False,
        creator_id=current_user.id if hasattr(current_user, "id") else None,
    )
    db.add(ko_tournament)
    db.flush()

    from app.models.participant import TournamentParticipant
    for entry in qualified:
        tp = TournamentParticipant(
            tournament_id=ko_tournament.id,
            participant_id=entry["participant_id"],
        )
        db.add(tp)

    league.tournaments.append(ko_tournament)
    db.commit()
    db.refresh(league)
    return _build_league_response(league)


@router.delete("/{league_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_league(
    league_id: int,
    current_user=Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    league = db.query(League).filter(League.id == league_id).first()
    if not league:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="League not found")
    db.delete(league)
    db.commit()
    return None
