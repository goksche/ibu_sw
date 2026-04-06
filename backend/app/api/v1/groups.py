# Groups API - CRUD Operations
# v1.3.0

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import require_user_or_admin, require_viewer_or_above
from app.models import Group, GroupParticipant, Tournament, Participant
from app.models.tournament import TournamentStatus
from app.services.visibility import get_accessible_tournament
from app.schemas.group import (
    GroupCreate, GroupUpdate, GroupResponse, GroupWithParticipants,
    GroupParticipantAdd, GroupParticipantRemove
)

router = APIRouter()


# Helper function to check tournament access
def check_tournament_access(db: Session, tournament_id: int, current_user=None):
    """Check if tournament exists and user has access (visibility check)."""
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


@router.get("/", response_model=List[GroupResponse])
def get_groups(
    tournament_id: int,
    current_user = Depends(require_viewer_or_above),
    db: Session = Depends(get_db)
):
    """Get all groups for a tournament"""
    check_tournament_access(db, tournament_id)
    
    groups = db.query(Group).filter(Group.tournament_id == tournament_id).all()
    return groups


@router.post("/", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    group: GroupCreate,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    """Create a new group for a tournament"""
    check_tournament_editable(db, group.tournament_id)
    
    # Check if group name already exists in tournament
    existing = db.query(Group).filter(
        Group.tournament_id == group.tournament_id,
        Group.name == group.name
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group name already exists in tournament"
        )
    
    db_group = Group(**group.model_dump())
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    
    return db_group


@router.get("/{group_id}", response_model=GroupWithParticipants)
def get_group(
    group_id: int,
    current_user = Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
):
    """Get a specific group with participants"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    check_tournament_access(db, group.tournament_id)
    
    # Get participants
    # Reihenfolge stabil halten: bei seeded-Generierung werden Gesetzte zuerst eingefügt
    # und damit auch zuerst angezeigt.
    participants = (
        db.query(Participant)
        .join(GroupParticipant)
        .filter(GroupParticipant.group_id == group_id)
        .order_by(GroupParticipant.id.asc())
        .all()
    )
    
    return GroupWithParticipants(
        **group.__dict__,
        participants=[{"id": p.id, "first_name": p.first_name, "last_name": p.last_name} for p in participants]
    )


@router.put("/{group_id}", response_model=GroupResponse)
def update_group(
    group_id: int,
    group_update: GroupUpdate,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    """Update a group"""
    db_group = db.query(Group).filter(Group.id == group_id).first()
    if not db_group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    check_tournament_editable(db, db_group.tournament_id)
    
    # Update fields
    update_data = group_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_group, field, value)
    
    db.commit()
    db.refresh(db_group)
    
    return db_group


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: int,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    """Delete a group"""
    db_group = db.query(Group).filter(Group.id == group_id).first()
    if not db_group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    check_tournament_editable(db, db_group.tournament_id)
    
    db.delete(db_group)
    db.commit()
    
    return None


@router.post("/{group_id}/participants", response_model=GroupWithParticipants)
def add_participant_to_group(
    group_id: int,
    participant_add: GroupParticipantAdd,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    """Add a participant to a group"""
    db_group = db.query(Group).filter(Group.id == group_id).first()
    if not db_group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    check_tournament_editable(db, db_group.tournament_id)
    
    # Check if participant exists
    participant = db.query(Participant).filter(Participant.id == participant_add.participant_id).first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant not found"
        )
    
    # Check if participant already in group
    existing = db.query(GroupParticipant).filter(
        GroupParticipant.group_id == group_id,
        GroupParticipant.participant_id == participant_add.participant_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Participant already in group"
        )
    
    # Add participant
    db_participant_group = GroupParticipant(
        group_id=group_id,
        participant_id=participant_add.participant_id
    )
    db.add(db_participant_group)
    db.commit()
    db.refresh(db_group)
    
    # Get updated participants
    participants = (
        db.query(Participant)
        .join(GroupParticipant)
        .filter(GroupParticipant.group_id == group_id)
        .order_by(GroupParticipant.id.asc())
        .all()
    )
    
    return GroupWithParticipants(
        **db_group.__dict__,
        participants=[{"id": p.id, "first_name": p.first_name, "last_name": p.last_name} for p in participants]
    )


@router.delete("/{group_id}/participants/{participant_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_participant_from_group(
    group_id: int,
    participant_id: int,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    """Remove a participant from a group"""
    db_group = db.query(Group).filter(Group.id == group_id).first()
    if not db_group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    check_tournament_editable(db, db_group.tournament_id)
    
    # Remove participant
    db_participant_group = db.query(GroupParticipant).filter(
        GroupParticipant.group_id == group_id,
        GroupParticipant.participant_id == participant_id
    ).first()
    
    if not db_participant_group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant not in group"
        )
    
    db.delete(db_participant_group)
    db.commit()
    
    return None
