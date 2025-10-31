# Tournament API Endpoints
# v1.2.0-alpha.2

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.schemas.tournament import TournamentCreate, TournamentUpdate, TournamentResponse
from app.models.tournament import Tournament
from app.models.group import Group, GroupParticipant
from app.models.match import GroupMatch
from app.models.participant import TournamentParticipant
from app.services.round_robin import generate_round_robin_rounds, validate_round_robin_participants
from app.services.group_distribution import distribute_participants_random, distribute_participants_seeded, validate_distribution

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


@router.post("/{tournament_id}/generate-round-robin", status_code=status.HTTP_201_CREATED)
async def generate_round_robin_matches(
    tournament_id: int,
    db: Session = Depends(get_db)
):
    """Generate Round Robin matches for all groups in a tournament"""
    
    # Check tournament exists
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    
    # Get all groups for tournament
    groups = db.query(Group).filter(Group.tournament_id == tournament_id).all()
    if not groups:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Keine Gruppen vorhanden. Bitte zuerst Gruppen erstellen."
        )
    
    # Delete existing matches
    db.query(GroupMatch).filter(GroupMatch.tournament_id == tournament_id).delete()
    
    # Generate matches for each group
    total_matches = 0
    for group in groups:
        # Get participants in this group
        participant_ids = [gp.participant_id for gp in group.participants]
        
        # Validate
        is_valid, error_msg = validate_round_robin_participants(participant_ids)
        if not is_valid:
            continue  # Skip group if not valid
        
        # Generate rounds
        rounds = generate_round_robin_rounds(participant_ids)
        
        # Create matches
        match_no = 1
        for round_idx, pairs in enumerate(rounds, start=1):
            for player1_id, player2_id in pairs:
                match = GroupMatch(
                    tournament_id=tournament_id,
                    group_id=group.id,
                    round=round_idx,
                    match_no=match_no,
                    player1_id=player1_id,
                    player2_id=player2_id
                )
                db.add(match)
                total_matches += 1
                match_no += 1
    
    db.commit()
    
    return {
        "message": "Round Robin matches generated successfully",
        "groups_processed": len(groups),
        "matches_created": total_matches
    }


@router.post("/{tournament_id}/generate-groups", status_code=status.HTTP_201_CREATED)
async def generate_groups_and_distribute(
    tournament_id: int,
    db: Session = Depends(get_db)
):
    """Generate groups and randomly distribute participants"""
    
    # Check tournament exists
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    
    # Get participants registered for this tournament
    tournament_participants = db.query(TournamentParticipant).filter(
        TournamentParticipant.tournament_id == tournament_id
    ).all()
    
    if not tournament_participants:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Keine Teilnehmer für dieses Turnier registriert. Bitte zuerst Teilnehmer hinzufügen."
        )
    
    participant_ids = [tp.participant_id for tp in tournament_participants]
    num_groups = tournament.groups_count
    
    # Validate
    is_valid, error_msg = validate_distribution(participant_ids, num_groups)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    # Delete existing groups and their matches
    db.query(GroupMatch).filter(GroupMatch.tournament_id == tournament_id).delete()
    db.query(GroupParticipant).filter(
        GroupParticipant.group_id.in_(
            db.query(Group.id).filter(Group.tournament_id == tournament_id)
        )
    ).delete()
    db.query(Group).filter(Group.tournament_id == tournament_id).delete()
    db.commit()
    
    # Distribute participants based on tournament setting
    if tournament.group_distribution == 'seeded':
        distributed = distribute_participants_seeded(participant_ids, num_groups)
    else:
        distributed = distribute_participants_random(participant_ids, num_groups)
    
    # Create groups and assign participants
    groups_created = 0
    participants_assigned = 0
    
    for group_idx, group_participants in enumerate(distributed):
        group_name = f"Gruppe {chr(65 + group_idx)}"  # A, B, C, D...
        
        # Create group
        group = Group(
            tournament_id=tournament_id,
            name=group_name
        )
        db.add(group)
        db.flush()  # Get the group ID
        
        # Assign participants
        for participant_id in group_participants:
            group_participant = GroupParticipant(
                group_id=group.id,
                participant_id=participant_id
            )
            db.add(group_participant)
            participants_assigned += 1
        
        groups_created += 1
    
    db.commit()
    
    return {
        "message": "Gruppen erfolgreich generiert und Teilnehmer verteilt",
        "groups_created": groups_created,
        "participants_assigned": participants_assigned,
        "distribution_method": tournament.group_distribution
    }


@router.post("/{tournament_id}/auto-distribute-groups")
async def auto_distribute_groups(
    tournament_id: int,
    db: Session = Depends(get_db)
):
    """
    Automatically distribute tournament participants into groups.
    Creates groups if they don't exist and generates Round Robin matches.
    """
    # Check tournament exists
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    
    # Get tournament participants
    tournament_participants = db.query(TournamentParticipant).filter(
        TournamentParticipant.tournament_id == tournament_id
    ).all()
    
    if not tournament_participants:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Keine Teilnehmer für dieses Turnier vorhanden. Bitte zuerst Teilnehmer hinzufügen."
        )
    
    participant_ids = [tp.participant_id for tp in tournament_participants]
    
    # Validate distribution
    is_valid, error_msg = validate_distribution(participant_ids, tournament.groups_count)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    # Delete existing groups and their data
    db.query(GroupMatch).filter(GroupMatch.tournament_id == tournament_id).delete()
    db.query(GroupParticipant).filter(
        GroupParticipant.group_id.in_(
            db.query(Group.id).filter(Group.tournament_id == tournament_id)
        )
    ).delete()
    db.query(Group).filter(Group.tournament_id == tournament_id).delete()
    
    # Distribute participants
    if tournament.group_distribution == 'seeded':
        distributed = distribute_participants_seeded(participant_ids, tournament.groups_count)
    else:
        distributed = distribute_participants_random(participant_ids, tournament.groups_count)
    
    # Create groups
    for i, group_participants in enumerate(distributed):
        group_name = f"Gruppe {chr(65 + i)}"  # A, B, C, etc.
        group = Group(tournament_id=tournament_id, name=group_name)
        db.add(group)
        db.flush()  # Get group ID
        
        # Add participants to group
        for participant_id in group_participants:
            gp = GroupParticipant(group_id=group.id, participant_id=participant_id)
            db.add(gp)
    
    db.commit()
    
    # Refresh to get new groups
    groups = db.query(Group).filter(Group.tournament_id == tournament_id).all()
    
    # Generate Round Robin matches
    total_matches = 0
    for group in groups:
        participant_ids = [gp.participant_id for gp in group.participants]
        
        # Validate
        is_valid, error_msg = validate_round_robin_participants(participant_ids)
        if not is_valid:
            continue
        
        # Generate rounds
        rounds = generate_round_robin_rounds(participant_ids)
        
        # Create matches
        match_no = 1
        for round_idx, pairs in enumerate(rounds, start=1):
            for player1_id, player2_id in pairs:
                match = GroupMatch(
                    tournament_id=tournament_id,
                    group_id=group.id,
                    round=round_idx,
                    match_no=match_no,
                    player1_id=player1_id,
                    player2_id=player2_id
                )
                db.add(match)
                total_matches += 1
                match_no += 1
    
    db.commit()
    
    return {
        "message": "Groups created and Round Robin matches generated successfully",
        "groups_created": len(groups),
        "matches_created": total_matches
    }

