# Participant API Endpoints
# v1.2.0-alpha.2

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import csv
import io

from app.core.database import get_db
from app.schemas.participant import ParticipantCreate, ParticipantUpdate, ParticipantResponse
from app.models.participant import Participant, TournamentParticipant
from pydantic import BaseModel

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


@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_participants_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Import participants from CSV file"""
    
    # Read file content
    contents = await file.read()
    
    # Parse CSV (Semicolon-separated, try different encodings)
    # First try UTF-8, then Windows-1252 (common for German CSV exports)
    try:
        decoded = contents.decode('utf-8')
    except UnicodeDecodeError:
        try:
            decoded = contents.decode('latin-1')
        except UnicodeDecodeError:
            decoded = contents.decode('utf-8', errors='replace')
    
    csv_reader = csv.DictReader(io.StringIO(decoded), delimiter=';')
    
    imported_count = 0
    skipped_count = 0
    errors = []
    skipped_items = []
    
    for row_idx, row in enumerate(csv_reader, start=2):  # Start at 2 (row 1 is header)
        try:
            # Map CSV columns to our fields
            first_name = row.get('Vorname', '').strip()
            last_name = row.get('Nachname', '').strip()
            email = row.get('E-Mail', '').strip()
            nickname = row.get('Spitzname', '').strip()
            # Try different possible column names for Scolia ID
            scolia_id = (row.get('[Id]', '') or row.get('Id', '') or row.get('Scolia ID', '') or row.get('scolia_id', '')).strip()
            
            # Skip if missing required fields
            if not first_name or not last_name:
                skipped_count += 1
                skipped_items.append({
                    'row': row_idx,
                    'name': f"{first_name} {last_name}".strip() or 'Unbekannt',
                    'reason': 'Fehlende Pflichtfelder (Vorname/Nachname)'
                })
                continue
            
            # Check if participant already exists (by name or scolia_id if provided)
            query = db.query(Participant).filter(
                Participant.first_name == first_name,
                Participant.last_name == last_name
            )
            
            if scolia_id:
                # Also check by Scolia ID
                query_by_id = db.query(Participant).filter(Participant.scolia_id == scolia_id).first()
                if query_by_id:
                    skipped_count += 1
                    skipped_items.append({
                        'row': row_idx,
                        'name': f"{first_name} {last_name}",
                        'scolia_id': scolia_id,
                        'reason': 'Bereits vorhanden (Scolia ID existiert bereits)'
                    })
                    continue
            
            existing = query.first()
            if existing:
                skipped_count += 1
                skipped_items.append({
                    'row': row_idx,
                    'name': f"{first_name} {last_name}",
                    'scolia_id': scolia_id if scolia_id else 'Keine',
                    'reason': 'Bereits vorhanden (Name existiert bereits)'
                })
                continue
            
            # Create participant
            participant = Participant(
                first_name=first_name,
                last_name=last_name,
                email=email if email else None,
                nickname=nickname if nickname else None,
                club=None,  # Not in CSV
                scolia_id=scolia_id if scolia_id else None
            )
            db.add(participant)
            imported_count += 1
            
        except Exception as e:
            errors.append(f"Row {row_idx}: {str(e)}")
    
    # Commit all participants
    db.commit()
    
    return {
        "imported": imported_count,
        "skipped": skipped_count,
        "errors": errors,
        "skipped_items": skipped_items
    }


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


class TournamentParticipantRequest(BaseModel):
    """Request to add participant to tournament"""
    participant_ids: List[int]


@router.post("/tournament/{tournament_id}/add", status_code=status.HTTP_201_CREATED)
async def add_tournament_participants(
    tournament_id: int,
    request: TournamentParticipantRequest,
    db: Session = Depends(get_db)
):
    """Add participants to a tournament"""
    added_count = 0
    skipped_count = 0
    
    for participant_id in request.participant_ids:
        # Check if already exists
        existing = db.query(TournamentParticipant).filter(
            TournamentParticipant.tournament_id == tournament_id,
            TournamentParticipant.participant_id == participant_id
        ).first()
        
        if existing:
            skipped_count += 1
            continue
        
        # Add to tournament
        tp = TournamentParticipant(
            tournament_id=tournament_id,
            participant_id=participant_id
        )
        db.add(tp)
        added_count += 1
    
    db.commit()
    
    return {
        "message": "Participants added to tournament",
        "added": added_count,
        "skipped": skipped_count
    }


@router.post("/tournament/{tournament_id}/add-manual", response_model=ParticipantResponse, status_code=status.HTTP_201_CREATED)
async def add_manual_tournament_participant(
    tournament_id: int,
    participant_data: ParticipantCreate,
    db: Session = Depends(get_db)
):
    """Create a participant and add it to tournament in one step (manual entry, not saved to global participants list separately)"""
    # Create participant
    participant = Participant(**participant_data.model_dump())
    db.add(participant)
    db.flush()  # Get participant ID
    
    # Check if tournament exists
    from app.models.tournament import Tournament
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    
    # Check if already in tournament (shouldn't happen for new participant, but check anyway)
    existing = db.query(TournamentParticipant).filter(
        TournamentParticipant.tournament_id == tournament_id,
        TournamentParticipant.participant_id == participant.id
    ).first()
    
    if not existing:
        # Add to tournament
        tp = TournamentParticipant(
            tournament_id=tournament_id,
            participant_id=participant.id
        )
        db.add(tp)
    
    db.commit()
    db.refresh(participant)
    return participant


@router.get("/tournament/{tournament_id}", response_model=List[ParticipantResponse])
async def get_tournament_participants(
    tournament_id: int,
    db: Session = Depends(get_db)
):
    """Get all participants in a tournament"""
    # Get tournament participant IDs
    tournament_participants = db.query(TournamentParticipant).filter(
        TournamentParticipant.tournament_id == tournament_id
    ).all()
    
    participant_ids = [tp.participant_id for tp in tournament_participants]
    
    # Get participants
    participants = db.query(Participant).filter(
        Participant.id.in_(participant_ids)
    ).all()
    
    return participants


@router.delete("/tournament/{tournament_id}/{participant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_tournament_participant(
    tournament_id: int,
    participant_id: int,
    db: Session = Depends(get_db)
):
    """Remove a participant from a tournament"""
    tp = db.query(TournamentParticipant).filter(
        TournamentParticipant.tournament_id == tournament_id,
        TournamentParticipant.participant_id == participant_id
    ).first()
    
    if not tp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant not found in tournament"
        )
    
    db.delete(tp)
    db.commit()
    return None
