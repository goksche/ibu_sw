# Tables API - Group Tables and Rankings
# v1.3.3

from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Tuple

from app.core.database import get_db
from app.core.dependencies import require_user_or_admin, require_viewer_or_above
from app.models.tournament import Tournament, LeagueScoringSystem
from app.models.group import Group
from app.models.match import GroupMatch, KnockoutMatch
from app.models.participant import TournamentParticipant, Participant
from app.models.group import Group
from app.services.ko_bracket import compute_group_ranking_with_ties
from app.services.decision_matches import compute_ranking_with_decision_matches, compute_group_stats

router = APIRouter()


def _compute_ranking_from_stats_for_table(
    stats: Dict[int, Dict], 
    scoring_system: LeagueScoringSystem, 
    matches: List[Dict]
) -> List[int]:
    """
    Compute ranking from stats considering tie-breaking rules.
    Uses direct encounters for 2 players, mini-table for >=3 players.
    """
    from app.services.ko_bracket import _head_to_head_winner, _mini_table_diff
    
    # Group participants by scoring value
    if scoring_system == LeagueScoringSystem.POINTS:
        # Group by points
        buckets = {}
        for pid, stat in stats.items():
            points = stat.get('points', 0)
            if points not in buckets:
                buckets[points] = []
            buckets[points].append(pid)
        sorted_values = sorted(buckets.keys(), reverse=True)
    else:  # DIFFERENCE
        # Group by difference
        buckets = {}
        for pid, stat in stats.items():
            diff = stat.get('diff', 0)
            if diff not in buckets:
                buckets[diff] = []
            buckets[diff].append(pid)
        sorted_values = sorted(buckets.keys(), reverse=True)
    
    # Build result with tie-breaking
    result = []
    for scoring_value in sorted_values:
        group = buckets[scoring_value]
        
        if len(group) == 1:
            result.append(group[0])
        elif len(group) == 2:
            # Head-to-head
            a, b = group
            winner = _head_to_head_winner(matches, a, b)
            if winner == a:
                result.extend([a, b])
            elif winner == b:
                result.extend([b, a])
            else:
                # Still tied, use secondary criteria
                if scoring_system == LeagueScoringSystem.POINTS:
                    # Compare diff, then goals_for
                    a_diff = stats[a].get('diff', 0)
                    b_diff = stats[b].get('diff', 0)
                    if a_diff != b_diff:
                        result.extend([a, b] if a_diff > b_diff else [b, a])
                    else:
                        a_gf = stats[a].get('goals_for', 0)
                        b_gf = stats[b].get('goals_for', 0)
                        result.extend([a, b] if a_gf >= b_gf else [b, a])
                else:
                    # Compare goals_for
                    a_gf = stats[a].get('goals_for', 0)
                    b_gf = stats[b].get('goals_for', 0)
                    result.extend([a, b] if a_gf >= b_gf else [b, a])
        else:
            # Mini-table for >=3 players
            mini_diff = _mini_table_diff(matches, group)
            # Sort by mini-table diff, then by overall goals_for
            ordered = sorted(
                group, 
                key=lambda pid: (
                    -mini_diff.get(pid, 0), 
                    -stats[pid].get('goals_for', 0),
                    pid  # Final tie-breaker: participant ID
                )
            )
            result.extend(ordered)
    
    return result


def _create_mini_table_for_tie_group(
    tied_participant_ids: List[int],
    matches: List[Dict],
    participants_map: Dict[int, Any],
    scoring_system: LeagueScoringSystem
) -> Tuple[List[Dict], bool]:
    """
    Create a mini table showing only direct encounters between tied participants.
    
    Returns:
        List of table entries with stats from direct encounters only
    """
    # Filter matches to only include direct encounters between tied participants
    direct_matches = [
        m for m in matches
        if m.get('player1_id') in tied_participant_ids 
        and m.get('player2_id') in tied_participant_ids
        and m.get('score1') is not None 
        and m.get('score2') is not None
    ]
    
    # Calculate stats from direct encounters only
    mini_stats = {pid: {'games': 0, 'wins': 0, 'draws': 0, 'losses': 0, 'goals_for': 0, 'goals_against': 0, 'points': 0, 'diff': 0} 
                  for pid in tied_participant_ids}
    
    for m in direct_matches:
        p1_id = m['player1_id']
        p2_id = m['player2_id']
        score1 = m['score1']
        score2 = m['score2']
        
        # Update stats for player 1
        mini_stats[p1_id]['games'] += 1
        mini_stats[p1_id]['goals_for'] += score1
        mini_stats[p1_id]['goals_against'] += score2
        
        # Update stats for player 2
        mini_stats[p2_id]['games'] += 1
        mini_stats[p2_id]['goals_for'] += score2
        mini_stats[p2_id]['goals_against'] += score1
        
        if score1 > score2:
            mini_stats[p1_id]['wins'] += 1
            mini_stats[p2_id]['losses'] += 1
            if scoring_system == LeagueScoringSystem.POINTS:
                mini_stats[p1_id]['points'] += 3
        elif score2 > score1:
            mini_stats[p2_id]['wins'] += 1
            mini_stats[p1_id]['losses'] += 1
            if scoring_system == LeagueScoringSystem.POINTS:
                mini_stats[p2_id]['points'] += 3
        else:
            mini_stats[p1_id]['draws'] += 1
            mini_stats[p2_id]['draws'] += 1
            if scoring_system == LeagueScoringSystem.POINTS:
                mini_stats[p1_id]['points'] += 1
                mini_stats[p2_id]['points'] += 1
        
        # Calculate differences
        mini_stats[p1_id]['diff'] = mini_stats[p1_id]['goals_for'] - mini_stats[p1_id]['goals_against']
        mini_stats[p2_id]['diff'] = mini_stats[p2_id]['goals_for'] - mini_stats[p2_id]['goals_against']
    
    # Build mini table entries sorted by tie-breaking criteria
    mini_table_entries = []
    for pid in tied_participant_ids:
        stats = mini_stats[pid]
        participant = participants_map.get(pid)
        if not participant:
            continue
        
        entry = {
            'participant_id': pid,
            'name': f"{participant.first_name} {participant.last_name}",
            'games': stats['games'],
            'wins': stats['wins'],
            'draws': stats['draws'],
            'losses': stats['losses'],
            'goals_for': stats['goals_for'],
            'goals_against': stats['goals_against'],
            'diff': stats['diff']
        }
        
        if scoring_system == LeagueScoringSystem.POINTS:
            entry['points'] = stats['points']
            # Sort key: points desc, diff desc, goals_for desc
            entry['_sort_key'] = (-stats['points'], -stats['diff'], -stats['goals_for'])
        else:
            # Sort key: diff desc, goals_for desc
            entry['_sort_key'] = (-stats['diff'], -stats['goals_for'])
        
        mini_table_entries.append(entry)
    
    # Sort by sort key
    mini_table_entries.sort(key=lambda x: x['_sort_key'])
    
    # Check if all participants are completely identical (same stats in mini table)
    is_completely_tied = False
    if len(mini_table_entries) > 1:
        first_entry = mini_table_entries[0]
        first_sort_key = first_entry['_sort_key']
        # Check if all entries have the same sort key
        is_completely_tied = all(entry['_sort_key'] == first_sort_key for entry in mini_table_entries[1:])
    
    # Remove sort key before returning
    for entry in mini_table_entries:
        del entry['_sort_key']
        entry['is_completely_tied'] = is_completely_tied
    
    return mini_table_entries, is_completely_tied


@router.get("/group/{group_id}", status_code=status.HTTP_200_OK)
async def get_group_table(
    group_id: int,
    current_user = Depends(require_viewer_or_above),
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
    
    # Calculate all stats first (needed for ranking and tie group detection)
    all_stats = compute_group_stats(regular_matches, group_participants, scoring_system, exclude_decision_matches=True)
    
    # Compute ranking with decision matches (if any exist)
    if decision_matches:
        ranked_participant_ids, decision_winners = compute_ranking_with_decision_matches(
            regular_matches, decision_matches, group_participants, scoring_system
        )
    else:
        # Use ranking based on scoring system
        ranked_participant_ids = _compute_ranking_from_stats_for_table(all_stats, scoring_system, regular_matches)
        decision_winners = {}
    
    # Get participant details
    participants_map = {
        p.id: p
        for p in db.query(Participant).filter(Participant.id.in_(group_participants)).all()
    }
    
    # Enrich all_stats with scoring_value (needed for tie group detection)
    for participant_id in group_participants:
        stats = all_stats[participant_id]
        if scoring_system == LeagueScoringSystem.POINTS:
            stats['scoring_value'] = stats.get('points', 0)
        else:
            stats['scoring_value'] = stats.get('diff', 0)
    
    # Find tie groups (participants with same scoring value)
    tie_groups = {}
    for participant_id in group_participants:
        scoring_value = all_stats[participant_id]['scoring_value']
        if scoring_value not in tie_groups:
            tie_groups[scoring_value] = []
        tie_groups[scoring_value].append(participant_id)
    
    # Build table with tie break information
    table = []
    tie_break_mini_tables = []  # List of mini tables for ties with >2 participants
    
    for rank, participant_id in enumerate(ranked_participant_ids, start=1):
        participant = participants_map.get(participant_id)
        if not participant:
            continue
        
        stats = all_stats[participant_id]
        
        # Check if this participant won a decision match
        won_decision_match = decision_winners.get(participant_id, False)
        
        # Check if this participant is in a tie group with >2 participants
        scoring_value = stats['scoring_value']
        tie_group = tie_groups.get(scoring_value, [])
        is_in_tie_group = len(tie_group) > 2 and participant_id in tie_group
        
        table_entry = {
            'rank': rank,
            'participant_id': participant_id,
            'name': f"{participant.first_name} {participant.last_name}",
            'games': stats['games'],
            'wins': stats['wins'],
            'draws': stats['draws'],
            'losses': stats['losses'],
            'goals_for': stats['goals_for'],
            'goals_against': stats['goals_against'],
            'diff': stats['diff'],
            'won_decision_match': won_decision_match,
            'is_in_tie_group': is_in_tie_group,
            'tie_group_size': len(tie_group) if is_in_tie_group else None
        }
        
        # Add points only if points system is used
        if scoring_system == LeagueScoringSystem.POINTS:
            table_entry['points'] = stats['points']
        
        table.append(table_entry)
    
    # Generate mini tables for tie groups with >2 participants
    for scoring_value, tied_participants in tie_groups.items():
        if len(tied_participants) > 2:
            # Create mini table with only direct encounters between tied participants
            mini_table, is_completely_tied = _create_mini_table_for_tie_group(
                tied_participants, regular_matches, participants_map, scoring_system
            )
            if mini_table:
                tie_break_mini_tables.append({
                    'scoring_value': scoring_value,
                    'participant_ids': tied_participants,
                    'mini_table': mini_table,
                    'is_completely_tied': is_completely_tied
                })
    
    return {
        'group_id': group_id,
        'group_name': group.name,
        'scoring_system': scoring_system.value if scoring_system else None,
        'table': table,
        'tie_break_mini_tables': tie_break_mini_tables
    }


@router.post("/group/{group_id}/tie-break/playoff", status_code=status.HTTP_201_CREATED)
async def generate_tie_break_playoff(
    group_id: int,
    current_user = Depends(require_user_or_admin),
    participant_ids: List[int] = Body(...),
    db: Session = Depends(get_db)
):
    """Generate playoff matches (round robin) for tied participants"""
    from app.models.group import Group
    from app.models.match import GroupMatch
    from app.services.round_robin import generate_round_robin_rounds
    
    # Get group
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Group with ID {group_id} not found"
        )
    
    # Validate participants belong to group
    group_participant_ids = [gp.participant_id for gp in group.participants]
    if not all(pid in group_participant_ids for pid in participant_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not all participants belong to this group"
        )
    
    # Get existing matches to determine next round
    existing_matches = db.query(GroupMatch).filter(
        GroupMatch.tournament_id == group.tournament_id,
        GroupMatch.group_id == group_id
    ).all()
    
    max_round = max((m.round for m in existing_matches), default=0)
    next_round = max_round + 1
    
    # Generate round robin rounds
    rounds = generate_round_robin_rounds(participant_ids, multiplier=1, variant='classic')
    
    if not rounds:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not generate playoff rounds"
        )
    
    # Create matches
    created_matches = []
    match_no = 1
    
    for round_matches in rounds:
        for player1_id, player2_id in round_matches:
            match = GroupMatch(
                tournament_id=group.tournament_id,
                group_id=group_id,
                round=next_round,
                match_no=match_no,
                player1_id=player1_id,
                player2_id=player2_id,
                is_decision_match=True  # Mark as decision match
            )
            db.add(match)
            created_matches.append(match)
            match_no += 1
        next_round += 1
    
    db.commit()
    
    # Refresh matches to get IDs
    for match in created_matches:
        db.refresh(match)
    
    return {
        'group_id': group_id,
        'participant_ids': participant_ids,
        'matches_created': len(created_matches),
        'matches': [
            {
                'id': m.id,
                'round': m.round,
                'match_no': m.match_no,
                'player1_id': m.player1_id,
                'player2_id': m.player2_id
            }
            for m in created_matches
        ]
    }


@router.post("/group/{group_id}/tie-break/random", status_code=status.HTTP_200_OK)
async def resolve_tie_break_random(
    group_id: int,
    participant_ids: List[int] = Body(...),
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Randomly select a winner from tied participants"""
    import random
    
    # Get group
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Group with ID {group_id} not found"
        )
    
    # Validate participants belong to group
    group_participant_ids = [gp.participant_id for gp in group.participants]
    if not all(pid in group_participant_ids for pid in participant_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not all participants belong to this group"
        )
    
    if not participant_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No participants provided"
        )
    
    # Randomly select winner
    winner_id = random.choice(participant_ids)
    
    # Update ranking by creating decision matches that record the random selection
    # We'll use a special approach: create a decision match for each pair with the winner winning
    existing_matches = db.query(GroupMatch).filter(
        GroupMatch.tournament_id == group.tournament_id,
        GroupMatch.group_id == group_id
    ).all()
    
    max_round = max((m.round for m in existing_matches), default=0)
    next_round = max_round + 1
    
    # Create decision matches where winner beats all others
    created_matches = []
    match_no = 1
    
    for participant_id in participant_ids:
        if participant_id != winner_id:
            match = GroupMatch(
                tournament_id=group.tournament_id,
                group_id=group_id,
                round=next_round,
                match_no=match_no,
                player1_id=winner_id,
                player2_id=participant_id,
                score1=1,
                score2=0,
                is_decision_match=True
            )
            db.add(match)
            created_matches.append(match)
            match_no += 1
    
    db.commit()
    
    return {
        'group_id': group_id,
        'participant_ids': participant_ids,
        'winner_id': winner_id,
        'selection_method': 'random'
    }


@router.post("/group/{group_id}/tie-break/manual", status_code=status.HTTP_200_OK)
async def resolve_tie_break_manual(
    group_id: int,
    participant_ids: List[int] = Body(...),
    winner_id: int = Body(...),
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Manually select a winner from tied participants"""
    # Get group
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Group with ID {group_id} not found"
        )
    
    # Validate participants belong to group
    group_participant_ids = [gp.participant_id for gp in group.participants]
    if not all(pid in group_participant_ids for pid in participant_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not all participants belong to this group"
        )
    
    if winner_id not in participant_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Winner must be one of the tied participants"
        )
    
    # Update ranking by creating decision matches
    existing_matches = db.query(GroupMatch).filter(
        GroupMatch.tournament_id == group.tournament_id,
        GroupMatch.group_id == group_id
    ).all()
    
    max_round = max((m.round for m in existing_matches), default=0)
    next_round = max_round + 1
    
    # Create decision matches where winner beats all others
    created_matches = []
    match_no = 1
    
    for participant_id in participant_ids:
        if participant_id != winner_id:
            match = GroupMatch(
                tournament_id=group.tournament_id,
                group_id=group_id,
                round=next_round,
                match_no=match_no,
                player1_id=winner_id,
                player2_id=participant_id,
                score1=1,
                score2=0,
                is_decision_match=True
            )
            db.add(match)
            created_matches.append(match)
            match_no += 1
    
    db.commit()
    
    return {
        'group_id': group_id,
        'participant_ids': participant_ids,
        'winner_id': winner_id,
        'selection_method': 'manual'
    }


@router.get("/tournament/{tournament_id}", status_code=status.HTTP_200_OK)
async def get_tournament_standings(
    tournament_id: int,
    current_user = Depends(require_viewer_or_above),
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

