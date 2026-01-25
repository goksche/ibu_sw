from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import require_user_or_admin, require_viewer_or_above
from app.models.league import League
from app.models.participant import Participant
from app.models.tournament import Tournament
from app.schemas.league import (
    LeagueCreate,
    LeagueUpdate,
    LeagueResponse,
    LeagueParticipantSummary,
    LeagueTournamentSummary,
)

router = APIRouter(prefix="/leagues", tags=["Leagues"])


def _build_league_response(league: League) -> LeagueResponse:
    participants = [
        LeagueParticipantSummary(id=p.id, first_name=p.first_name, last_name=p.last_name)
        for p in league.participants
    ]
    tournaments = [
        LeagueTournamentSummary(id=t.id, name=t.name, start_date=t.start_date, end_date=t.end_date)
        for t in league.tournaments
    ]
    return LeagueResponse(
        id=league.id,
        name=league.name,
        description=league.description,
        scoring_schema=league.scoring_schema,
        mode_presets=league.mode_presets,
        participant_ids=[p.id for p in league.participants],
        tournament_ids=[t.id for t in league.tournaments],
        participants=participants,
        tournaments=tournaments,
        created_at=league.created_at,
        updated_at=league.updated_at,
    )


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
