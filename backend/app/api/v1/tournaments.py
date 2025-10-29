# Tournament API Endpoints
# v1.2.0-alpha.2

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.schemas.tournament import TournamentCreate, TournamentUpdate, TournamentResponse
from app.models.tournament import Tournament

router = APIRouter(prefix="/tournaments", tags=["Tournaments"])


@router.get("", response_model=List[TournamentResponse])
async def get_tournaments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all tournaments with pagination"""
    tournaments = db.query(Tournament).offset(skip).limit(limit).all()
    return tournaments


@router.get("/{tournament_id}", response_model=TournamentResponse)
async def get_tournament(
    tournament_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific tournament by ID"""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    return tournament


@router.post("", response_model=TournamentResponse, status_code=status.HTTP_201_CREATED)
async def create_tournament(
    tournament_data: TournamentCreate,
    db: Session = Depends(get_db)
):
    """Create a new tournament"""
    # Create tournament
    tournament = Tournament(**tournament_data.model_dump())
    db.add(tournament)
    db.commit()
    db.refresh(tournament)
    return tournament


@router.put("/{tournament_id}", response_model=TournamentResponse)
async def update_tournament(
    tournament_id: int,
    tournament_data: TournamentUpdate,
    db: Session = Depends(get_db)
):
    """Update a tournament"""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    
    # Update only provided fields
    update_data = tournament_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tournament, field, value)
    
    db.commit()
    db.refresh(tournament)
    return tournament


@router.delete("/{tournament_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tournament(
    tournament_id: int,
    db: Session = Depends(get_db)
):
    """Delete a tournament (CASCADE deletes all related data)"""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    
    db.delete(tournament)
    db.commit()
    return None

