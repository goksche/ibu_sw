# Participant API Endpoints
# v1.2.0-alpha.2

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.schemas.participant import ParticipantCreate, ParticipantUpdate, ParticipantResponse
from app.models.participant import Participant

router = APIRouter(prefix="/participants", tags=["Participants"])


@router.get("", response_model=List[ParticipantResponse])
async def get_participants(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all participants with pagination"""
    participants = db.query(Participant).offset(skip).limit(limit).all()
    return participants


@router.get("/{participant_id}", response_model=ParticipantResponse)
async def get_participant(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific participant by ID"""
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Participant with ID {participant_id} not found"
        )
    return participant


@router.post("", response_model=ParticipantResponse, status_code=status.HTTP_201_CREATED)
async def create_participant(
    participant_data: ParticipantCreate,
    db: Session = Depends(get_db)
):
    """Create a new participant"""
    participant = Participant(**participant_data.model_dump())
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


@router.put("/{participant_id}", response_model=ParticipantResponse)
async def update_participant(
    participant_id: int,
    participant_data: ParticipantUpdate,
    db: Session = Depends(get_db)
):
    """Update a participant"""
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Participant with ID {participant_id} not found"
        )
    
    # Update only provided fields
    update_data = participant_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(participant, field, value)
    
    db.commit()
    db.refresh(participant)
    return participant


@router.delete("/{participant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_participant(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """Delete a participant"""
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Participant with ID {participant_id} not found"
        )
    
    db.delete(participant)
    db.commit()
    return None

