# Tournament API Endpoints
# v1.2.0-alpha.2

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from typing import List
from app.models.tournament import TournamentStatus

from app.core.database import get_db
from app.core.dependencies import require_user_or_admin, require_viewer_or_above
from app.schemas.tournament import TournamentCreate, TournamentUpdate, TournamentResponse
from app.models.tournament import Tournament, TournamentMode
from app.models.group import Group, GroupParticipant
from app.models.match import GroupMatch, KnockoutMatch
from app.models.participant import TournamentParticipant
from app.services.round_robin import generate_round_robin_rounds, validate_round_robin_participants
from app.services.group_distribution import distribute_participants_random, distribute_participants_seeded, validate_distribution
from app.services.ko_bracket import compute_group_ranking_with_ties, generate_ko_bracket_from_groups, generate_ko_bracket_from_participants
from app.services.qualification import calculate_qualification_plan
from app.services.decision_matches import compute_ranking_with_decision_matches
from app.models.tournament import KOStartRound

router = APIRouter(prefix="/tournaments", tags=["Tournaments"])


@router.get("", response_model=List[TournamentResponse])
async def get_tournaments(
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(require_viewer_or_above),
    db: Session = Depends(get_db)
):
    """Get all tournaments with pagination"""
    tournaments = db.query(Tournament).offset(skip).limit(limit).all()
    return tournaments


@router.get("/templates", response_model=List[TournamentResponse])
async def get_templates(
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(require_viewer_or_above),
    db: Session = Depends(get_db)
):
    """Get all tournament templates"""
    tournaments = db.query(Tournament).filter(Tournament.is_template == True).offset(skip).limit(limit).all()
    return tournaments


@router.get("/{tournament_id}", response_model=TournamentResponse)
async def get_tournament(
    tournament_id: int,
    current_user = Depends(require_viewer_or_above),
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
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Create a new tournament"""
    # Validate required fields based on mode
    if tournament_data.mode == TournamentMode.COMBINED:
        if not tournament_data.ko_structure or not tournament_data.ko_draw_method:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="KO-Struktur und KO-Auslosung sind bei kombiniertem Modus erforderlich"
            )
        if not tournament_data.league_scoring_system:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ligatabelle Wertung ist bei kombiniertem Modus erforderlich"
            )
        if not tournament_data.tie_breaking_rules or len(tournament_data.tie_breaking_rules) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Gleichstandsregeln sind bei kombiniertem Modus erforderlich"
            )
    elif tournament_data.mode == TournamentMode.ROUND_ROBIN:
        if not tournament_data.league_scoring_system:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ligatabelle Wertung ist bei Liga-Modus erforderlich"
            )
        if not tournament_data.tie_breaking_rules or len(tournament_data.tie_breaking_rules) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Gleichstandsregeln sind bei Liga-Modus erforderlich"
            )
    
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
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Update a tournament. Groups and matches are deleted if configuration changes."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    
    # Fields that require deletion of groups/matches if changed
    config_fields = [
        'mode', 'has_group_phase', 'has_ko_phase', 'groups_count', 
        'participants_per_group', 'group_distribution', 'ko_participants',
        'ko_first_round_size', 'ko_structure', 'ko_draw_method',
        'league_scoring_system', 'tie_breaking_rules'
    ]
    
    update_data = tournament_data.model_dump(exclude_unset=True)
    
    # Check if any config fields are being changed
    config_changed = any(field in update_data for field in config_fields)
    
    if config_changed:
        # Delete all related data (groups, matches, etc.)
        db.query(KnockoutMatch).filter(KnockoutMatch.tournament_id == tournament_id).delete()
        db.query(GroupMatch).filter(GroupMatch.tournament_id == tournament_id).delete()
        db.query(GroupParticipant).filter(
            GroupParticipant.group_id.in_(
                db.query(Group.id).filter(Group.tournament_id == tournament_id)
            )
        ).delete()
        db.query(Group).filter(Group.tournament_id == tournament_id).delete()
    
    # Update fields
    for field, value in update_data.items():
        setattr(tournament, field, value)
    
    db.commit()
    db.refresh(tournament)
    return tournament


@router.delete("/{tournament_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tournament(
    tournament_id: int,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Delete a tournament (CASCADE deletes all related data) - DEPRECATED: Use POST /{tournament_id}/delete instead"""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    
    db.delete(tournament)
    db.commit()
    return None


@router.post("/{tournament_id}/delete", status_code=status.HTTP_200_OK)
async def delete_tournament(
    tournament_id: int,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Delete a tournament (CASCADE deletes all related data)"""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    
    # Delete all related data manually (CASCADE in SQLAlchemy doesn't always work as expected)
    # Delete KO matches
    db.query(KnockoutMatch).filter(KnockoutMatch.tournament_id == tournament_id).delete()
    # Delete group matches
    db.query(GroupMatch).filter(GroupMatch.tournament_id == tournament_id).delete()
    # Delete group participants
    db.query(GroupParticipant).filter(
        GroupParticipant.group_id.in_(
            db.query(Group.id).filter(Group.tournament_id == tournament_id)
        )
    ).delete()
    # Delete groups
    db.query(Group).filter(Group.tournament_id == tournament_id).delete()
    # Delete tournament participants
    db.query(TournamentParticipant).filter(TournamentParticipant.tournament_id == tournament_id).delete()
    # Delete tournament
    db.delete(tournament)
    db.commit()
    return {"message": "Tournament deleted successfully"}


@router.post("/{tournament_id}/generate-round-robin", status_code=status.HTTP_201_CREATED)
async def generate_round_robin_matches(
    tournament_id: int,
    current_user = Depends(require_user_or_admin),
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
        
        # Get league variant and multiplier
        variant = tournament.league_variant.value if tournament.league_variant else 'classic'
        multiplier = tournament.league_rounds_multiplier if tournament.league_rounds_multiplier else 1
        
        # Generate rounds
        rounds = generate_round_robin_rounds(participant_ids, multiplier=multiplier, variant=variant)
        
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
    current_user = Depends(require_user_or_admin),
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
        
        # Get league variant and multiplier
        variant = tournament.league_variant.value if tournament.league_variant else 'classic'
        multiplier = tournament.league_rounds_multiplier if tournament.league_rounds_multiplier else 1
        
        # Generate rounds
        rounds = generate_round_robin_rounds(participant_ids, multiplier=multiplier, variant=variant)
        
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


@router.post("/{tournament_id}/generate-ko-bracket", status_code=status.HTTP_201_CREATED)
async def generate_ko_bracket_matches(
    tournament_id: int,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Generate KO bracket from completed group phase (combined mode) or directly from participants (knockout mode)"""
    
    # Check tournament exists
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    
    # Check tournament has KO phase
    if not tournament.has_ko_phase:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dieses Turnier hat keine KO-Phase konfiguriert"
        )
    
    # Check if this is a pure knockout tournament (no groups) or combined tournament (with groups)
    groups = db.query(Group).filter(Group.tournament_id == tournament_id).all()
    
    if tournament.mode == TournamentMode.KNOCKOUT and not groups:
        # Pure knockout mode: generate bracket directly from participants
        tournament_participants = db.query(TournamentParticipant).filter(
            TournamentParticipant.tournament_id == tournament_id
        ).all()
        
        if len(tournament_participants) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mindestens 2 Teilnehmer benötigt für KO-Bracket"
            )
        
        participant_ids = [tp.participant_id for tp in tournament_participants]
        
        # Get draw method (default to full_random for knockout mode)
        draw_method = tournament.ko_draw_method or 'full_random'
        if draw_method not in ('full_random', 'pot_system', 'overall_seeding', 'manual'):
            draw_method = 'full_random'
        
        # For manual mode, don't generate matches automatically - user will set them manually
        if draw_method == 'manual':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bei manueller Auslosung müssen die Paarungen manuell über die Turnier-Verwaltung festgelegt werden. "
                       "Bitte verwenden Sie die Funktion 'Paarungen manuell erstellen' im Turnier-Bereich."
            )
        
        rng_seed = tournament.ko_random_seed
        
        # Generate KO bracket
        try:
            ko_matches = generate_ko_bracket_from_participants(
                participant_ids=participant_ids,
                draw_method=draw_method,
                rng_seed=rng_seed
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
        # Calculate bracket size from first round matches
        first_round_matches = [m for m in ko_matches if m['round'] == 1]
        bracket_size = len(first_round_matches) * 2
        mode = draw_method
        
    else:
        # Combined mode: generate bracket from groups
        if not groups:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Keine Gruppen vorhanden"
            )
        
        # Compute group rankings
        group_rankings = {}
        participant_cache = {}  # To speed up lookup
        
        for group in groups:
            # Get group participants
            group_participants = [gp.participant_id for gp in group.participants]
            participant_cache.update({p: True for p in group_participants})
            
            # Get regular matches (non-decision)
            regular_matches_data = db.query(GroupMatch).filter(
                GroupMatch.tournament_id == tournament_id,
                GroupMatch.group_id == group.id,
                GroupMatch.is_decision_match == False
            ).all()
            
            regular_matches = [
                {
                    'player1_id': m.player1_id,
                    'player2_id': m.player2_id,
                    'score1': m.score1,
                    'score2': m.score2
                }
                for m in regular_matches_data
            ]
            
            # Get decision matches (if any)
            decision_matches_data = db.query(GroupMatch).filter(
                GroupMatch.tournament_id == tournament_id,
                GroupMatch.group_id == group.id,
                GroupMatch.is_decision_match == True
            ).all()
            
            decision_matches = [
                {
                    'player1_id': m.player1_id,
                    'player2_id': m.player2_id,
                    'score1': m.score1,
                    'score2': m.score2
                }
                for m in decision_matches_data
            ]
            
            # Compute ranking with decision matches considered
            from app.models.tournament import LeagueScoringSystem
            scoring_system = tournament.league_scoring_system or LeagueScoringSystem.POINTS
            
            if decision_matches:
                # Use ranking that considers decision matches
                ranking, _ = compute_ranking_with_decision_matches(
                    regular_matches=regular_matches,
                    decision_matches=decision_matches,
                    participant_ids=group_participants,
                    scoring_system=scoring_system
                )
            else:
                # No decision matches, use regular ranking
                ranking = compute_group_ranking_with_ties(regular_matches, group_participants)
            
            group_rankings[group.id] = ranking
        
        # Get first_round_size and qualification_plan from tournament settings
        qualification_plan = None
        first_round_size = 4  # Default fallback
        
        # Use new ko_start_round logic if available
        if tournament.ko_start_round:
            qualification_plan = calculate_qualification_plan(
                groups_count=tournament.groups_count,
                ko_start_round=tournament.ko_start_round
            )
            first_round_size = qualification_plan.get("required_participants", 4)
            # Store fallback qualifiers if calculated
            if qualification_plan.get("fallback_rules"):
                tournament.ko_fallback_qualifiers = qualification_plan.get("fallback_rules")
        else:
            # Legacy: use ko_first_round_size or ko_participants
            if tournament.ko_first_round_size:
                first_round_size = tournament.ko_first_round_size
            elif tournament.ko_participants:
                first_round_size = tournament.ko_participants
        
        if first_round_size not in (4, 8, 16, 32):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ungültige erste KO-Runde: {first_round_size}. Muss 4, 8, 16 oder 32 sein"
            )
        
        # Get KO distribution mode
        ko_distribution = tournament.ko_distribution or 'cross'
        mode = ko_distribution if ko_distribution in ('cross', 'draw') else 'cross'
        
        # For qualification plan with fallback rules, we need to compute stats for proper ranking
        # Compute group stats for qualification service
        from app.services.decision_matches import compute_group_stats
        from app.models.tournament import LeagueScoringSystem
        
        scoring_system = tournament.league_scoring_system or LeagueScoringSystem.POINTS
        group_stats_dict = {}
        
        if qualification_plan and qualification_plan.get("fallback_rules"):
            for group in groups:
                group_participants = [gp.participant_id for gp in group.participants]
                matches_data = db.query(GroupMatch).filter(
                    GroupMatch.tournament_id == tournament_id,
                    GroupMatch.group_id == group.id,
                    GroupMatch.is_decision_match == False
                ).all()
                
                matches = [
                    {
                        'player1_id': m.player1_id,
                        'player2_id': m.player2_id,
                        'score1': m.score1,
                        'score2': m.score2
                    }
                    for m in matches_data
                ]
                
                stats = compute_group_stats(matches, group_participants, scoring_system, exclude_decision_matches=True)
                # Add scoring_system to each stat
                for pid in stats:
                    stats[pid]["scoring_system"] = scoring_system.value
                group_stats_dict[group.id] = stats
            
            # Update qualification plan to use stats for ranking
            # We'll pass group_stats_dict to the qualification service when generating bracket
            # But for now, we'll let the qualification service handle it internally
        else:
            group_stats_dict = None
        
        # Generate KO bracket
        try:
            ko_matches = generate_ko_bracket_from_groups(
                group_rankings=group_rankings,
                first_round_size=first_round_size,
                mode=mode,
                qualification_plan=qualification_plan
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
        bracket_size = first_round_size
        # mode already set above for combined mode
    
    # Delete existing KO matches
    db.query(KnockoutMatch).filter(KnockoutMatch.tournament_id == tournament_id).delete()
    
    # Create KO matches
    for match_data in ko_matches:
        ko_match = KnockoutMatch(
            tournament_id=tournament_id,
            round=match_data['round'],
            match_no=match_data['match_no'],
            player1_id=match_data.get('player1_id'),
            player2_id=match_data.get('player2_id')
        )
        db.add(ko_match)
    
    db.commit()
    
    return {
        "message": "KO-Bracket erfolgreich generiert",
        "matches_created": len(ko_matches),
        "bracket_size": bracket_size,
        "mode": mode
    }


@router.post("/{tournament_id}/duplicate", response_model=TournamentResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_tournament(
    tournament_id: int,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Duplicate a tournament (only configuration, no participants/groups/matches)"""
    original = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not original:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    
    # Create new tournament with copied settings
    new_tournament_data = {
        'name': f"{original.name} (Kopie)",
        'description': original.description,
        'start_date': original.start_date,
        'end_date': original.end_date,
        'mode': original.mode,
        'status': TournamentStatus.PLANNED,
        'has_group_phase': original.has_group_phase,
        'has_ko_phase': original.has_ko_phase,
        'groups_count': original.groups_count,
        'participants_per_group': original.participants_per_group,
        'group_distribution': original.group_distribution,
        'ko_participants': original.ko_participants,
        'ko_first_round_size': original.ko_first_round_size,
        'ko_distribution': original.ko_distribution,
        'ko_structure': original.ko_structure,
        'ko_draw_method': original.ko_draw_method,
        'ko_third_place_match': original.ko_third_place_match,
        'ko_group_winner_advantage': original.ko_group_winner_advantage,
        'ko_block_same_group': original.ko_block_same_group,
        'ko_block_same_position': original.ko_block_same_position,
        'ko_random_seed': original.ko_random_seed,
        'league_scoring_system': original.league_scoring_system,
        'tie_breaking_rules': original.tie_breaking_rules,
        'is_template': False,
        'seeded_participant_ids': None,
        'show_matches': original.show_matches,
        'show_tables': original.show_tables,
    }
    
    new_tournament = Tournament(**new_tournament_data)
    db.add(new_tournament)
    db.commit()
    db.refresh(new_tournament)
    return new_tournament


@router.post("/{tournament_id}/set-template", response_model=TournamentResponse)
async def set_tournament_template(
    tournament_id: int,
    is_template: bool,
    db: Session = Depends(get_db)
):
    """Set or unset tournament as template"""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    
    tournament.is_template = is_template
    db.commit()
    db.refresh(tournament)
    return tournament


@router.post("/{tournament_id}/set-seeded-participants", response_model=TournamentResponse)
async def set_seeded_participants(
    tournament_id: int,
    participant_ids: List[int],
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Set seeded participants for a tournament"""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    
    # Validate that tournament has groups and seeded distribution
    if tournament.group_distribution != 'seeded':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tournament must have seeded distribution to set seeded participants"
        )
    
    # Check if groups already exist
    existing_groups = db.query(Group).filter(Group.tournament_id == tournament_id).count()
    if existing_groups > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Groups already exist. Seeded participants must be set before generating groups"
        )
    
    tournament.seeded_participant_ids = participant_ids
    db.commit()
    db.refresh(tournament)
    return tournament


@router.get("/{tournament_id}/seeded-participants")
async def get_seeded_participants(
    tournament_id: int,
    current_user = Depends(require_viewer_or_above),
    db: Session = Depends(get_db)
):
    """Get seeded participants for a tournament"""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    
    return {
        "tournament_id": tournament_id,
        "seeded_participant_ids": tournament.seeded_participant_ids or []
    }


@router.get("/calculate-qualification-plan")
async def calculate_qualification_plan_endpoint(
    groups_count: int = Query(..., ge=1),
    ko_start_round: KOStartRound = Query(...),
    current_user = Depends(require_viewer_or_above),
    db: Session = Depends(get_db)
):
    """Calculate qualification plan based on groups count and KO start round"""
    try:
        plan = calculate_qualification_plan(
            groups_count=groups_count,
            ko_start_round=ko_start_round
        )
        return plan
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{tournament_id}/qualification-table")
async def get_qualification_table(
    tournament_id: int,
    current_user = Depends(require_viewer_or_above),
    db: Session = Depends(get_db)
):
    """Get qualification table showing which participants qualify and fallback candidates"""
    from app.services.ko_bracket import compute_group_ranking_with_ties
    from app.models.match import GroupMatch
    from app.models.participant import Participant
    from app.services.decision_matches import compute_group_stats, compute_ranking_with_decision_matches
    from app.models.tournament import LeagueScoringSystem
    
    # Check tournament exists
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    
    if not tournament.has_group_phase:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Turnier hat keine Gruppenphase"
        )
    
    # Get groups
    groups = db.query(Group).filter(Group.tournament_id == tournament_id).all()
    if not groups:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Keine Gruppen vorhanden"
        )
    
    scoring_system = tournament.league_scoring_system or LeagueScoringSystem.POINTS
    
    # Get qualification plan
    qualification_plan = None
    if tournament.ko_start_round:
        qualification_plan = calculate_qualification_plan(
            groups_count=tournament.groups_count,
            ko_start_round=tournament.ko_start_round
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Turnier hat keine KO-Start-Runde konfiguriert"
        )
    
    # Get group rankings and stats
    group_rankings = {}
    group_stats = {}
    participants_map = {}
    
    for group in groups:
        group_participants = [gp.participant_id for gp in group.participants]
        
        # Get regular matches (non-decision)
        regular_matches_data = db.query(GroupMatch).filter(
            GroupMatch.tournament_id == tournament_id,
            GroupMatch.group_id == group.id,
            GroupMatch.is_decision_match == False
        ).all()
        
        regular_matches = [
            {
                'player1_id': m.player1_id,
                'player2_id': m.player2_id,
                'score1': m.score1,
                'score2': m.score2
            }
            for m in regular_matches_data
        ]
        
        # Get decision matches (if any)
        decision_matches_data = db.query(GroupMatch).filter(
            GroupMatch.tournament_id == tournament_id,
            GroupMatch.group_id == group.id,
            GroupMatch.is_decision_match == True
        ).all()
        
        decision_matches = [
            {
                'player1_id': m.player1_id,
                'player2_id': m.player2_id,
                'score1': m.score1,
                'score2': m.score2
            }
            for m in decision_matches_data
        ]
        
        # Compute ranking with decision matches considered
        if decision_matches:
            # Use ranking that considers decision matches
            ranking, decision_winners = compute_ranking_with_decision_matches(
                regular_matches=regular_matches,
                decision_matches=decision_matches,
                participant_ids=group_participants,
                scoring_system=scoring_system
            )
        else:
            # No decision matches, use regular ranking
            ranking = compute_group_ranking_with_ties(regular_matches, group_participants)
        
        group_rankings[group.id] = ranking
        
        # Compute stats (only from regular matches, exclude decision matches)
        stats = compute_group_stats(regular_matches, group_participants, scoring_system, exclude_decision_matches=True)
        # Add scoring_system to each stat for ranking
        for pid in stats:
            stats[pid]["scoring_system"] = scoring_system.value
        group_stats[group.id] = stats
        
        # Get participant details
        participants = db.query(Participant).filter(Participant.id.in_(group_participants)).all()
        for p in participants:
            participants_map[p.id] = p
    
    # Get qualified participants
    from app.services.qualification import get_qualified_participants_from_groups
    qualified_participants = get_qualified_participants_from_groups(
        group_rankings=group_rankings,
        qualification_plan=qualification_plan,
        group_stats=group_stats
    )
    
    # Build qualification table
    basis_per_group = qualification_plan["basis_per_group"]
    fallback_rules = qualification_plan.get("fallback_rules", [])
    
    qualification_table = []
    
    # Basis qualifiers (per group)
    for group in sorted(groups, key=lambda g: g.id):
        ranking = group_rankings[group.id]
        group_qualifiers = []
        
        for pos in range(basis_per_group):
            if pos < len(ranking):
                participant_id = ranking[pos]
                participant = participants_map.get(participant_id)
                if participant:
                    stats = group_stats[group.id].get(participant_id, {})
                    group_qualifiers.append({
                        'participant_id': participant_id,
                        'name': f"{participant.first_name} {participant.last_name}",
                        'position': pos + 1,
                        'qualified': participant_id in qualified_participants,
                        'stats': {
                            'points': stats.get('points', 0) if scoring_system == LeagueScoringSystem.POINTS else None,
                            'diff': stats.get('diff', 0),
                            'goals_for': stats.get('goals_for', 0),
                            'goals_against': stats.get('goals_against', 0)
                        }
                    })
        
        qualification_table.append({
            'group_id': group.id,
            'group_name': group.name,
            'basis_qualifiers': group_qualifiers
        })
    
    # Fallback candidates
    fallback_candidates_by_rule = []
    for rule in fallback_rules:
        position = rule["position"]
        count = rule["count"]
        selection = rule.get("selection", "best")
        
        from app.services.qualification import _rank_candidates_at_position
        candidates = _rank_candidates_at_position(
            group_rankings=group_rankings,
            position=position,
            group_stats=group_stats
        )
        
        # Get ALL candidates (not just the qualified ones) to show complete ranking
        candidate_details = []
        for candidate_id in candidates:  # Show all candidates, not just [:count]
            participant = participants_map.get(candidate_id)
            if participant:
                # Find which group this candidate is from
                candidate_group_id = None
                candidate_stats = {}
                for gid, ranking in group_rankings.items():
                    if candidate_id in ranking:
                        candidate_group_id = gid
                        candidate_stats = group_stats[gid].get(candidate_id, {})
                        break
                
                candidate_group = next((g for g in groups if g.id == candidate_group_id), None)
                candidate_details.append({
                    'participant_id': candidate_id,
                    'name': f"{participant.first_name} {participant.last_name}",
                    'group_id': candidate_group_id,
                    'group_name': candidate_group.name if candidate_group else None,
                    'position': position,
                    'qualified': candidate_id in qualified_participants,
                    'stats': {
                        'points': candidate_stats.get('points', 0) if scoring_system == LeagueScoringSystem.POINTS else None,
                        'diff': candidate_stats.get('diff', 0),
                        'goals_for': candidate_stats.get('goals_for', 0),
                        'goals_against': candidate_stats.get('goals_against', 0)
                    }
                })
        
        fallback_candidates_by_rule.append({
            'position': position,
            'count': count,
            'selection': selection,
            'candidates': candidate_details
        })
    
    return {
        'tournament_id': tournament_id,
        'qualification_plan': qualification_plan,
        'basis_per_group': basis_per_group,
        'qualified_count': len(qualified_participants),
        'group_qualifiers': qualification_table,
        'fallback_candidates': fallback_candidates_by_rule,
        'all_qualified_participants': qualified_participants
    }

