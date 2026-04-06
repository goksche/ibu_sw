# Matches API - CRUD Operations
# v1.3.0

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import require_user_or_admin, require_viewer_or_above
from app.models import GroupMatch, KnockoutMatch, Tournament, Group, Participant, User
from app.models.tournament import TournamentStatus
from app.services.visibility import get_accessible_tournament
from app.schemas.match import (
    GroupMatchCreate, GroupMatchUpdate, GroupMatchResponse,
    KnockoutMatchCreate, KnockoutMatchUpdate, KnockoutMatchResponse
)
from app.services.ko_propagation import save_ko_result_and_propagate, ensure_bronze_from_semis, can_enter_ko_result

router = APIRouter()


# Helper function to check tournament access
def check_tournament_access(db: Session, tournament_id: int, current_user=None):
    """Check if user has access to tournament (with visibility check)."""
    if current_user:
        return get_accessible_tournament(db, tournament_id, current_user)
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tournament not found"
        )
    return tournament


def check_tournament_editable(db: Session, tournament_id: int, current_user=None):
    """Check tournament exists, is accessible and not completed."""
    tournament = check_tournament_access(db, tournament_id, current_user)
    if tournament.status == TournamentStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Turnier ist abgeschlossen; Änderungen sind nicht mehr möglich"
        )
    return tournament


# Group Matches
@router.get("/groups", response_model=List[GroupMatchResponse])
def get_group_matches(
    tournament_id: int,
    group_id: int = None,
    current_user = Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
):
    """Get all group matches for a tournament (optionally filtered by group)"""
    check_tournament_access(db, tournament_id)
    
    query = db.query(GroupMatch).filter(GroupMatch.tournament_id == tournament_id)
    if group_id:
        query = query.filter(GroupMatch.group_id == group_id)
    
    matches = query.all()
    return matches


@router.post("/groups", response_model=GroupMatchResponse, status_code=status.HTTP_201_CREATED)
def create_group_match(
    match: GroupMatchCreate,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    """Create a new group match"""
    check_tournament_editable(db, match.tournament_id)
    
    # Check if group exists
    group = db.query(Group).filter(Group.id == match.group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check if match already exists
    existing = db.query(GroupMatch).filter(
        GroupMatch.tournament_id == match.tournament_id,
        GroupMatch.group_id == match.group_id,
        GroupMatch.round == match.round,
        GroupMatch.match_no == match.match_no
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Match already exists"
        )
    
    db_match = GroupMatch(**match.model_dump())
    db.add(db_match)
    db.commit()
    db.refresh(db_match)
    
    return db_match


@router.get("/groups/{match_id}", response_model=GroupMatchResponse)
def get_group_match(
    match_id: int,
    current_user = Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
):
    """Get a specific group match"""
    match = db.query(GroupMatch).filter(GroupMatch.id == match_id).first()
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    check_tournament_access(db, match.tournament_id)
    
    return match


@router.put("/groups/{match_id}", response_model=GroupMatchResponse)
def update_group_match(
    match_id: int,
    match_update: GroupMatchUpdate,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    """Update a group match"""
    db_match = db.query(GroupMatch).filter(GroupMatch.id == match_id).first()
    if not db_match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    check_tournament_editable(db, db_match.tournament_id)
    
    # Update fields ??? Gruppenspiele: Ergebnisse jederzeit eintragen und anpassen erlauben
    update_data = match_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_match, field, value)
    
    db.commit()
    db.refresh(db_match)
    
    # Check if decision matches need to be generated (if all matches in group are completed)
    from app.services.decision_matches import generate_decision_matches_for_group
    if db_match.group_id:
        generate_decision_matches_for_group(db, db_match.tournament_id, db_match.group_id)
    
    return db_match


@router.delete("/groups/{match_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group_match(
    match_id: int,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    """Delete a group match"""
    db_match = db.query(GroupMatch).filter(GroupMatch.id == match_id).first()
    if not db_match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    check_tournament_access(db, db_match.tournament_id)
    
    db.delete(db_match)
    db.commit()
    
    return None


# Knockout Matches
@router.get("/knockout", response_model=List[KnockoutMatchResponse])
def get_knockout_matches(
    tournament_id: int,
    current_user = Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
):
    """Get all knockout matches for a tournament"""
    check_tournament_access(db, tournament_id)
    
    matches = db.query(KnockoutMatch).filter(KnockoutMatch.tournament_id == tournament_id).all()
    return matches


@router.post("/knockout", response_model=KnockoutMatchResponse, status_code=status.HTTP_201_CREATED)
def create_knockout_match(
    match: KnockoutMatchCreate,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    """Create a new knockout match"""
    check_tournament_editable(db, match.tournament_id)
    
    # Check if match already exists
    existing = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == match.tournament_id,
        KnockoutMatch.round == match.round,
        KnockoutMatch.match_no == match.match_no
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Match already exists"
        )
    
    db_match = KnockoutMatch(**match.model_dump())
    db.add(db_match)
    db.commit()
    db.refresh(db_match)
    
    return db_match


@router.get("/knockout/{match_id}", response_model=KnockoutMatchResponse)
def get_knockout_match(
    match_id: int,
    current_user = Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
):
    """Get a specific knockout match"""
    match = db.query(KnockoutMatch).filter(KnockoutMatch.id == match_id).first()
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    check_tournament_access(db, match.tournament_id)
    
    return match


@router.put("/knockout/{match_id}", response_model=KnockoutMatchResponse)
def update_knockout_match(
    match_id: int,
    match_update: KnockoutMatchUpdate,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    """Update a knockout match"""
    db_match = db.query(KnockoutMatch).filter(KnockoutMatch.id == match_id).first()
    if not db_match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    check_tournament_editable(db, db_match.tournament_id)
    
    # Update fields
    update_data = match_update.model_dump(exclude_unset=True)
    if "score1" in update_data or "score2" in update_data:
        setting_result = (
            update_data.get("score1") is not None or update_data.get("score2") is not None
        )
        if setting_result:
            if not can_enter_ko_result(db, db_match):
                if db_match.player1_id is None and db_match.player2_id is None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Keine Paarung ??? bitte zuerst diese Runde auslosen (Button Runde auslosen)."
                    )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ergebnis kann erst eingetragen werden, wenn die Vorrunde abgeschlossen ist."
                )
    for field, value in update_data.items():
        setattr(db_match, field, value)
    
    # Bye-Matches: Wenn ein Gegner leer ist, automatisch 3:0 setzen und merken,
    # damit der Gewinner in die nächste Runde übernommen wird (vor dem Commit).
    if db_match.player1_id is None and db_match.player2_id is not None:
        if db_match.score1 is None or db_match.score2 is None:
            db_match.score1 = 0
            db_match.score2 = 3
            update_data['score1'] = 0
            update_data['score2'] = 3
    elif db_match.player2_id is None and db_match.player1_id is not None:
        if db_match.score1 is None or db_match.score2 is None:
            db_match.score1 = 3
            db_match.score2 = 0
            update_data['score1'] = 3
            update_data['score2'] = 0
    
    db.commit()
    db.refresh(db_match)
    
    # Propagation auslösen wenn Scores gesetzt (inkl. Bye) oder geändert
    if 'score1' in update_data or 'score2' in update_data:
        save_ko_result_and_propagate(db, match_id, db_match.score1, db_match.score2)
        # Try to ensure bronze match
        ensure_bronze_from_semis(db, db_match.tournament_id)
        db.refresh(db_match)
    
    return db_match


@router.delete("/knockout/{match_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_knockout_match(
    match_id: int,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    """Delete a knockout match"""
    db_match = db.query(KnockoutMatch).filter(KnockoutMatch.id == match_id).first()
    if not db_match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    check_tournament_editable(db, db_match.tournament_id)
    
    db.delete(db_match)
    db.commit()
    
    return None

