# Decision Match Generation Service
# v1.4.1

from typing import List, Dict, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.match import GroupMatch
from app.models.tournament import Tournament, TournamentMode, LeagueScoringSystem
from app.models.group import Group, GroupParticipant


def compute_group_stats(matches: List[Dict], participant_ids: List[int], scoring_system: LeagueScoringSystem, exclude_decision_matches: bool = True) -> Dict[int, Dict]:
    """
    Compute statistics for each participant in a group.
    Returns dict with participant_id -> stats (points/diff, wins, losses, draws, goals_for, goals_against)
    
    Args:
        matches: List of match dicts with 'player1_id', 'player2_id', 'score1', 'score2', optionally 'is_decision_match'
        participant_ids: List of participant IDs in the group
        scoring_system: Scoring system (POINTS or DIFFERENCE)
        exclude_decision_matches: If True, exclude matches with 'is_decision_match' = True from statistics
    """
    stats = {
        pid: {
            'points': 0,
            'diff': 0,
            'wins': 0,
            'losses': 0,
            'draws': 0,
            'goals_for': 0,
            'goals_against': 0,
            'games': 0
        }
        for pid in participant_ids
    }
    
    for match in matches:
        # Skip decision matches if requested
        if exclude_decision_matches and match.get('is_decision_match', False):
            continue
            
        p1_id = match.get('player1_id')
        p2_id = match.get('player2_id')
        score1 = match.get('score1')
        score2 = match.get('score2')
        
        if not all([p1_id, p2_id, score1 is not None, score2 is not None]):
            continue
        
        stats[p1_id]['games'] += 1
        stats[p2_id]['games'] += 1
        stats[p1_id]['goals_for'] += score1
        stats[p1_id]['goals_against'] += score2
        stats[p2_id]['goals_for'] += score2
        stats[p2_id]['goals_against'] += score1
        
        if score1 > score2:
            stats[p1_id]['wins'] += 1
            stats[p2_id]['losses'] += 1
            if scoring_system == LeagueScoringSystem.POINTS:
                stats[p1_id]['points'] += 3
        elif score2 > score1:
            stats[p2_id]['wins'] += 1
            stats[p1_id]['losses'] += 1
            if scoring_system == LeagueScoringSystem.POINTS:
                stats[p2_id]['points'] += 3
        else:
            stats[p1_id]['draws'] += 1
            stats[p2_id]['draws'] += 1
            if scoring_system == LeagueScoringSystem.POINTS:
                stats[p1_id]['points'] += 1
                stats[p2_id]['points'] += 1
        
        # Calculate difference
        stats[p1_id]['diff'] = stats[p1_id]['goals_for'] - stats[p1_id]['goals_against']
        stats[p2_id]['diff'] = stats[p2_id]['goals_for'] - stats[p2_id]['goals_against']
    
    return stats


def find_tied_participants(stats: Dict[int, Dict], scoring_system: LeagueScoringSystem) -> List[List[int]]:
    """
    Find groups of participants with the same standing (points or difference).
    Returns list of lists, where each inner list contains participant IDs with the same standing.
    """
    if scoring_system == LeagueScoringSystem.POINTS:
        # Group by points
        points_groups = {}
        for pid, stat in stats.items():
            points = stat['points']
            if points not in points_groups:
                points_groups[points] = []
            points_groups[points].append(pid)
        
        # Return only groups with more than one participant
        tied_groups = [group for group in points_groups.values() if len(group) > 1]
    else:  # DIFFERENCE
        # Group by difference
        diff_groups = {}
        for pid, stat in stats.items():
            diff = stat['diff']
            if diff not in diff_groups:
                diff_groups[diff] = []
            diff_groups[diff].append(pid)
        
        # Return only groups with more than one participant
        tied_groups = [group for group in diff_groups.values() if len(group) > 1]
    
    return tied_groups


def all_matches_completed(matches: List[Dict], participant_ids: List[int], exclude_decision_matches: bool = True) -> bool:
    """Check if all regular (non-decision) matches in the group are completed (have scores)"""
    # Expected number of matches for round robin: n*(n-1)/2
    expected_matches = len(participant_ids) * (len(participant_ids) - 1) // 2
    
    # Only count non-decision matches
    if exclude_decision_matches:
        regular_matches = [m for m in matches if not m.get('is_decision_match', False)]
    else:
        regular_matches = matches
    completed_matches = sum(1 for m in regular_matches if m.get('score1') is not None and m.get('score2') is not None)
    
    return completed_matches >= expected_matches


def compute_ranking_with_decision_matches(
    regular_matches: List[Dict],
    decision_matches: List[Dict],
    participant_ids: List[int],
    scoring_system: LeagueScoringSystem
) -> Tuple[List[int], Dict[int, bool]]:
    """
    Compute group ranking considering decision matches.
    
    Args:
        regular_matches: List of regular (non-decision) match dicts
        decision_matches: List of decision match dicts
        participant_ids: List of participant IDs in the group
        scoring_system: Scoring system (POINTS or DIFFERENCE)
    
    Returns:
        Tuple of (ranked_participant_ids, decision_winners) where:
        - ranked_participant_ids: List of participant IDs in ranking order
        - decision_winners: Dict mapping participant_id -> True if they won a decision match
    """
    from app.services.ko_bracket import compute_group_ranking_with_ties
    
    # Compute stats from regular matches only (exclude decision matches)
    stats = compute_group_stats(regular_matches, participant_ids, scoring_system, exclude_decision_matches=True)
    
    # Get initial ranking from regular matches
    ranked_participants = compute_group_ranking_with_ties(regular_matches, participant_ids)
    
    # Process decision matches to adjust ranking
    decision_winners: Dict[int, bool] = {}
    decision_results: Dict[Tuple[int, int], int] = {}  # (pid1, pid2) -> winner_id
    
    for dm in decision_matches:
        p1_id = dm.get('player1_id')
        p2_id = dm.get('player2_id')
        score1 = dm.get('score1')
        score2 = dm.get('score2')
        
        if not all([p1_id, p2_id, score1 is not None, score2 is not None]):
            continue
        
        # Determine winner
        if score1 > score2:
            winner_id = p1_id
            loser_id = p2_id
        elif score2 > score1:
            winner_id = p2_id
            loser_id = p1_id
        else:
            continue  # Draw in decision match (shouldn't happen, but skip if so)
        
        decision_winners[winner_id] = True
        decision_results[(min(p1_id, p2_id), max(p1_id, p2_id))] = winner_id
    
    # Adjust ranking based on decision matches
    # For each decision match, the winner should be ranked higher than the loser
    adjusted_ranking = list(ranked_participants)
    
    for (p1_id, p2_id), winner_id in decision_results.items():
        try:
            idx1 = adjusted_ranking.index(p1_id)
            idx2 = adjusted_ranking.index(p2_id)
            
            # If loser is ranked higher than winner, swap them
            if winner_id == p1_id and idx2 < idx1:
                adjusted_ranking[idx1], adjusted_ranking[idx2] = adjusted_ranking[idx2], adjusted_ranking[idx1]
            elif winner_id == p2_id and idx1 < idx2:
                adjusted_ranking[idx1], adjusted_ranking[idx2] = adjusted_ranking[idx2], adjusted_ranking[idx1]
        except ValueError:
            continue  # Participant not in ranking (shouldn't happen)
    
    return adjusted_ranking, decision_winners


def generate_decision_matches_for_group(
    db: Session,
    tournament_id: int,
    group_id: int
) -> List[GroupMatch]:
    """
    Generate decision matches for a group if all matches are completed and there are ties.
    Returns list of newly created GroupMatch objects.
    """
    # Get tournament
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        return []
    
    # Check if decision matches are enabled (tie_breaking_rules includes 'decision_match')
    if not tournament.tie_breaking_rules or 'decision_match' not in tournament.tie_breaking_rules:
        return []
    
    # Get group
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        return []
    
    # Get participants
    group_participants = db.query(GroupParticipant).filter(GroupParticipant.group_id == group_id).all()
    participant_ids = [gp.participant_id for gp in group_participants]
    
    if len(participant_ids) < 2:
        return []
    
    # Check if decision matches already exist for this group
    existing_decision_matches = db.query(GroupMatch).filter(
        GroupMatch.tournament_id == tournament_id,
        GroupMatch.group_id == group_id,
        GroupMatch.is_decision_match == True
    ).count()
    
    if existing_decision_matches > 0:
        return []  # Decision matches already generated
    
    # Get all matches for this group (excluding decision matches for stats calculation)
    matches_data = db.query(GroupMatch).filter(
        GroupMatch.tournament_id == tournament_id,
        GroupMatch.group_id == group_id,
        GroupMatch.is_decision_match == False
    ).all()
    
    # Convert to dict format
    matches = [
        {
            'player1_id': m.player1_id,
            'player2_id': m.player2_id,
            'score1': m.score1,
            'score2': m.score2,
            'is_decision_match': False
        }
        for m in matches_data
    ]
    
    # Check if all regular matches are completed
    if not all_matches_completed(matches, participant_ids, exclude_decision_matches=True):
        return []
    
    # Compute stats (excluding decision matches)
    scoring_system = tournament.league_scoring_system or LeagueScoringSystem.POINTS
    stats = compute_group_stats(matches, participant_ids, scoring_system, exclude_decision_matches=True)
    
    # Calculate ranking to determine which ties need decision matches
    # For combined mode, only ties at qualification positions need decision matches
    # For league mode, all ties need decision matches
    
    # First, compute a ranking based on stats (without decision matches)
    ranked_participants = _compute_ranking_from_stats(stats, scoring_system, matches)
    
    # Determine qualification positions (if combined mode)
    qualifiers_per_group = 0
    if tournament.mode == TournamentMode.COMBINED and tournament.groups_count:
        # Use new ko_start_round logic if available
        if tournament.ko_start_round:
            from app.services.qualification import calculate_qualification_plan
            qualification_plan = calculate_qualification_plan(
                groups_count=tournament.groups_count,
                ko_start_round=tournament.ko_start_round
            )
            qualifiers_per_group = qualification_plan.get("basis_per_group", 0)
            # Add fallback positions
            fallback_rules = qualification_plan.get("fallback_rules", [])
            for rule in fallback_rules:
                qualifiers_per_group = max(qualifiers_per_group, rule.get("position", 0))
        # Legacy: use ko_participants if ko_start_round not set
        elif tournament.ko_participants and tournament.groups_count:
            qualifiers_per_group = tournament.ko_participants // tournament.groups_count
    
    # Find tied participants that need decision matches
    tied_pairs_needing_decisions = []
    
    if tournament.mode == TournamentMode.COMBINED and qualifiers_per_group > 0:
        # Only check ties at qualification positions (positions 1 to qualifiers_per_group)
        for rank in range(1, qualifiers_per_group + 1):
            if rank <= len(ranked_participants):
                # Find all participants with the same stats at this rank position
                rank_participant_id = ranked_participants[rank - 1]
                rank_stats = stats[rank_participant_id]
                
                # Find all participants with the same stats
                tied_at_rank = [
                    pid for pid in participant_ids
                    if _stats_equal(stats[pid], rank_stats, scoring_system)
                ]
                
                if len(tied_at_rank) == 2:
                    # Two participants tied - need decision match
                    tied_pairs_needing_decisions.append(tied_at_rank)
                elif len(tied_at_rank) > 2:
                    # Multiple participants tied - only the last qualifier position matters
                    # If this is the last qualifier position, we need to decide between the last two
                    if rank == qualifiers_per_group:
                        # Sort by some criteria to get the last two (e.g., by ID)
                        sorted_tied = sorted(tied_at_rank)
                        tied_pairs_needing_decisions.append([sorted_tied[-2], sorted_tied[-1]])
    else:
        # League mode: all ties need decision matches
        tied_groups = find_tied_participants(stats, scoring_system)
        for tied_group in tied_groups:
            if len(tied_group) == 2:
                tied_pairs_needing_decisions.append(tied_group)
            elif len(tied_group) > 2:
                # For more than 2, we need to determine which pairs to match
                # For simplicity, match the last two by sorted order
                sorted_tied = sorted(tied_group)
                tied_pairs_needing_decisions.append([sorted_tied[-2], sorted_tied[-1]])
    
    if not tied_pairs_needing_decisions:
        return []  # No ties found that need decision matches
    
    # Determine decision round (use max round + 1, or 1 if no matches)
    if matches_data:
        max_round = max(m.round for m in matches_data)
        decision_round = max_round + 1
    else:
        decision_round = 1
    
    # Generate decision matches (only for pairs)
    new_matches = []
    
    for tied_pair in tied_pairs_needing_decisions:
        if len(tied_pair) == 2:
            match = GroupMatch(
                tournament_id=tournament_id,
                group_id=group_id,
                round=decision_round,
                match_no=len(new_matches) + 1,
                player1_id=tied_pair[0],
                player2_id=tied_pair[1],
                is_decision_match=True
            )
            db.add(match)
            new_matches.append(match)
    
    if new_matches:
        db.commit()
        # Refresh all matches to get IDs
        for match in new_matches:
            db.refresh(match)
    
    return new_matches


def _compute_ranking_from_stats(stats: Dict[int, Dict], scoring_system: LeagueScoringSystem, matches: List[Dict]) -> List[int]:
    """Compute ranking from stats (simple version, used for determining qualification positions)"""
    # Sort participants by stats
    if scoring_system == LeagueScoringSystem.POINTS:
        sorted_participants = sorted(
            stats.keys(),
            key=lambda pid: (-stats[pid]['points'], -stats[pid]['diff'], -stats[pid]['goals_for'])
        )
    else:  # DIFFERENCE
        sorted_participants = sorted(
            stats.keys(),
            key=lambda pid: (-stats[pid]['diff'], -stats[pid]['goals_for'])
        )
    return sorted_participants


def _stats_equal(stat1: Dict, stat2: Dict, scoring_system: LeagueScoringSystem) -> bool:
    """Check if two stats are equal based on scoring system"""
    if scoring_system == LeagueScoringSystem.POINTS:
        return stat1['points'] == stat2['points']
    else:  # DIFFERENCE
        return stat1['diff'] == stat2['diff']
