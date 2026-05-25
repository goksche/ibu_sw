"""Statistics API endpoints – read-only, visibility-filtered."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date

from app.core.database import get_db
from app.core.dependencies import require_viewer_or_above
from app.models.user import User
from app.schemas.statistics import (
    OverviewResponse,
    ParticipantsRankingResponse,
    ParticipantDetailResponse,
    TournamentStatsResponse,
)
from app.services.statistics_service import (
    get_overview,
    get_participants_ranking,
    get_participant_detail,
    get_tournament_stats,
)

router = APIRouter(prefix="/statistics", tags=["Statistics"])


@router.get("/overview", response_model=OverviewResponse)
def statistics_overview(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    preset: Optional[str] = Query(None, regex="^(12m|6m|3m|1m)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer_or_above),
):
    return get_overview(db, current_user, start_date, end_date, preset)


@router.get("/participants", response_model=ParticipantsRankingResponse)
def statistics_participants(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    preset: Optional[str] = Query(None, regex="^(12m|6m|3m|1m)$"),
    sort_by: str = Query("wins", regex="^(wins|matches_played|goals_for|win_rate|tournaments_count)$"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer_or_above),
):
    return get_participants_ranking(db, current_user, start_date, end_date, preset, sort_by, limit)


@router.get("/participants/{participant_id}", response_model=ParticipantDetailResponse)
def statistics_participant_detail(
    participant_id: int,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    preset: Optional[str] = Query(None, regex="^(12m|6m|3m|1m)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer_or_above),
):
    result = get_participant_detail(db, current_user, participant_id, start_date, end_date, preset)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teilnehmer nicht gefunden")
    return result


@router.get("/tournaments", response_model=TournamentStatsResponse)
def statistics_tournaments(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    preset: Optional[str] = Query(None, regex="^(12m|6m|3m|1m)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer_or_above),
):
    return get_tournament_stats(db, current_user, start_date, end_date, preset)
