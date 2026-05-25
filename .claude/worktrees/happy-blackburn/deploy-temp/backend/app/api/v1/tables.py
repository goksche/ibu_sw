# Tables API - Group Tables and Rankings
# v1.3.3

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.core.database import get_db
from app.models.tournament import Tournament, LeagueScoringSystem
from app.models.group import Group
from app.models.match import GroupMatch, KnockoutMatch
from app.models.participant import TournamentParticipant, Participant
from app.services.ko_bracket import compute_group_ranking_with_ties
from app.services.decision_matches import compute_ranking_with_decision_matches, compute_group_stats

router = APIRouter()


@router.get("/group/{group_id}", status_code=status.HTTP_200_OK)
async def get_group_table(
    group_id: int,
    db: Session = Depends(get_db)
):
    """Get group table ranking"""
    
    # Get group
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Group with ID {group_id} not found"
        )
    
    # Get tournament to check scoring system
    tournament = db.query(Tournament).filter(Tournament.id == group.tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament not found"
        )
    
    scoring_system = tournament.league_scoring_system or LeagueScoringSystem.POINTS
    
    # Get group participants
    group_participants = [gp.participant_id for gp in group.participants]
    
    # Get group matches - separate regular and decision matches
    matches_data = db.query(GroupMatch).filter(
        GroupMatch.tournament_id == group.tournament_id,
        GroupMatch.group_id == group_id
    ).all()
    
    # Separate regular and decision matches
    regular_matches_data = [m for m in matches_data if not m.is_decision_match]
    decision_matches_data = [m for m in matches_data if m.is_decision_match]
    
    # Convert to dict format for ranking service
    regular_matches = [
        {
            'player1_id': m.player1_id,
            'player2_id': m.player2_id,
            'score1': m.score1,
            'score2': m.score2,
            'is_decision_match': False
        }
        for m in regular_matches_data
    ]
    
    decision_matches = [
        {
            'player1_id': m.player1_id,
            'player2_id': m.player2_id,
            'score1': m.score1,
            'score2': m.score2,
            'is_decision_match': True
        }
        for m in decision_matches_data
    ]
    
    # Compute ranking with decision matches (if any exist)
    if decision_matches:
        ranked_participant_ids, decision_winners = compute_ranking_with_decision_matches(
            regular_matches, decision_matches, group_participants, scoring_system
        )
    else:
        ranked_participant_ids = compute_group_ranking_with_ties(regular_matches, group_participants)
        decision_winners = {}
    
    # Get participant details
    participants_map = {
        p.id: p
        for p in db.query(Participant).filter(Participant.id.in_(group_participants)).all()
    }
    
    # Build table
    table = []
    for rank, participant_id in enumerate(ranked_participant_ids, start=1):
        participant = participants_map.get(participant_id)
        if not participant:
            continue
        
        # Calculate stats (exclude decision matches from statistics)
        participant_matches = [m for m in regular_matches_data if m.player1_id == participant_id or m.player2_id == participant_id]
        completed_matches = [m for m in participant_matches if m.score1 is not None and m.score2 is not None]
        games = len(completed_matches)
        
        wins = 0
        losses = 0
        draws = 0
        goals_for = 0
        goals_against = 0
        points = 0
        
        for m in completed_matches:
            if m.player1_id == participant_id:
                goals_for += m.score1
                goals_against += m.score2
                if m.score1 > m.score2:
                    wins += 1
                    if scoring_system == LeagueScoringSystem.POINTS:
                        points += 3
                elif m.score1 < m.score2:
                    losses += 1
                else:
                    draws += 1
                    if scoring_system == LeagueScoringSystem.POINTS:
                        points += 1
            elif m.player2_id == participant_id:
                goals_for += m.score2
                goals_against += m.score1
                if m.score2 > m.score1:
                    wins += 1
                    if scoring_system == LeagueScoringSystem.POINTS:
                        points += 3
                elif m.score2 < m.score1:
                    losses += 1
                else:
                    draws += 1
                    if scoring_system == LeagueScoringSystem.POINTS:
                        points += 1
        
        diff = goals_for - goals_against
        
        # Check if this participant won a decision match
        won_decision_match = decision_winners.get(participant_id, False)
        
        table_entry = {
            'rank': rank,
            'participant_id': participant_id,
            'name': f"{participant.first_name} {participant.last_name}",
            'games': games,
            'wins': wins,
            'draws': draws,
            'losses': losses,
            'goals_for': goals_for,
            'goals_against': goals_against,
            'diff': diff,
            'won_decision_match': won_decision_match  # Flag for frontend to show asterisk
        }
        
        # Add points only if points system is used
        if scoring_system == LeagueScoringSystem.POINTS:
            table_entry['points'] = points
        
        table.append(table_entry)
    
    return {
        'group_id': group_id,
        'group_name': group.name,
        'scoring_system': scoring_system.value if scoring_system else None,
        'table': table
    }


@router.get("/tournament/{tournament_id}", status_code=status.HTTP_200_OK)
async def get_tournament_standings(
    tournament_id: int,
    db: Session = Depends(get_db)
):
    """Get overall tournament standings (only for KO phase completed tournaments)"""
    
    # Check tournament exists
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    
    standings = []
    
    # Get KO phase results
    if tournament.has_ko_phase:
        # Get all KO matches
        ko_matches = db.query(KnockoutMatch).filter(
            KnockoutMatch.tournament_id == tournament_id
        ).order_by(KnockoutMatch.round.desc(), KnockoutMatch.match_no.asc()).all()
        
        if not ko_matches:
            return {
                'tournament_id': tournament_id,
                'standings': [],
                'status': 'no_ko_matches'
            }
        
        # Find final match (highest round != 99)
        final_matches = [m for m in ko_matches if m.round != 99]
        if not final_matches:
            return {
                'tournament_id': tournament_id,
                'standings': [],
                'status': 'no_final'
            }
        
        max_round = max(m.round for m in final_matches)
        final_match = next((m for m in final_matches if m.round == max_round), None)
        
        if not final_match or final_match.score1 is None or final_match.score2 is None:
            return {
                'tournament_id': tournament_id,
                'standings': [],
                'status': 'final_not_played'
            }
        
        # Get champion and runner-up
        if final_match.score1 > final_match.score2:
            champion_id = final_match.player1_id
            runnerup_id = final_match.player2_id
        else:
            champion_id = final_match.player2_id
            runnerup_id = final_match.player1_id
        
        standings.append({'rank': 1, 'participant_id': champion_id})
        standings.append({'rank': 2, 'participant_id': runnerup_id})
        
        # Get bronze match
        bronze_match = next((m for m in ko_matches if m.round == 99), None)
        if bronze_match and bronze_match.score1 is not None and bronze_match.score2 is not None:
            if bronze_match.score1 > bronze_match.score2:
                bronze_winner_id = bronze_match.player1_id
                bronze_loser_id = bronze_match.player2_id
            else:
                bronze_winner_id = bronze_match.player2_id
                bronze_loser_id = bronze_match.player1_id
            
            standings.append({'rank': 3, 'participant_id': bronze_winner_id})
            standings.append({'rank': 4, 'participant_id': bronze_loser_id})
    
    # Get participant details
    participant_ids = [s['participant_id'] for s in standings if s.get('participant_id')]
    participants_map = {
        p.id: p
        for p in db.query(Participant).filter(Participant.id.in_(participant_ids)).all()
    }
    
    # Enrich with names
    for standing in standings:
        participant = participants_map.get(standing['participant_id'])
        if participant:
            standing['name'] = f"{participant.first_name} {participant.last_name}"
    
    return {
        'tournament_id': tournament_id,
        'standings': standings
    }

