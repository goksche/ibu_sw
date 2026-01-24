# Qualification Service
# v1.0.0

from typing import List, Dict, Tuple, Optional
from app.models.tournament import KOStartRound


def get_required_participants(ko_start_round: KOStartRound) -> int:
    """Get required number of participants for a KO start round"""
    mapping = {
        KOStartRound.ROUND_OF_32: 32,
        KOStartRound.ROUND_OF_16: 16,
        KOStartRound.QUARTERFINAL: 8,
        KOStartRound.SEMIFINAL: 4,
        KOStartRound.FINAL: 2,
    }
    return mapping.get(ko_start_round, 16)


def calculate_qualification_plan(
    groups_count: int,
    ko_start_round: KOStartRound
) -> Dict:
    """
    Calculate qualification plan based on number of groups and KO start round.
    
    Returns:
        {
            "required_participants": int,
            "basis_per_group": int,
            "remainder": int,
            "fallback_rules": List[Dict]  # [{"position": 3, "count": 2, "selection": "best"}]
        }
    """
    if groups_count <= 0:
        raise ValueError("groups_count must be > 0")
    
    required = get_required_participants(ko_start_round)
    basis_per_group = required // groups_count
    remainder = required % groups_count
    
    fallback_rules = []
    if remainder > 0:
        fallback_rules = _calculate_fallback_strategy(
            groups_count=groups_count,
            basis_per_group=basis_per_group,
            remainder=remainder
        )
    
    return {
        "required_participants": required,
        "basis_per_group": basis_per_group,
        "remainder": remainder,
        "fallback_rules": fallback_rules
    }


def _calculate_fallback_strategy(
    groups_count: int,
    basis_per_group: int,
    remainder: int
) -> List[Dict]:
    """
    Calculate fallback strategy for remaining participants.
    
    Strategy: Start from position (basis_per_group + 1) and collect the best
    participants at that position across all groups.
    """
    fallback_rules = []
    remaining = remainder
    current_position = basis_per_group + 1
    
    while remaining > 0:
        # Calculate how many we can take from this position
        # We can take up to groups_count participants at this position
        count_to_take = min(remaining, groups_count)
        
        fallback_rules.append({
            "position": current_position,
            "count": count_to_take,
            "selection": "best"  # Always "best" for now
        })
        
        remaining -= count_to_take
        current_position += 1
        
        # Safety check: don't go beyond reasonable position
        if current_position > 10:  # Max position considered
            break
    
    return fallback_rules


def get_qualified_participants_from_groups(
    group_rankings: Dict[int, List[int]],  # group_id -> [sorted participant_ids]
    qualification_plan: Dict,
    group_stats: Optional[Dict[int, Dict[int, Dict]]] = None  # group_id -> participant_id -> stats
) -> List[int]:
    """
    Get qualified participants from groups based on qualification plan.
    
    Args:
        group_rankings: Dict mapping group_id to ranked participant IDs (sorted by rank, best first)
        qualification_plan: Qualification plan from calculate_qualification_plan()
        group_stats: Optional stats dict for ranking candidates at same position
    
    Returns:
        List of qualified participant IDs
    """
    qualified = []
    basis_per_group = qualification_plan["basis_per_group"]
    fallback_rules = qualification_plan.get("fallback_rules", [])
    
    # Step 1: Get basis qualifiers (top N from each group)
    for group_id, ranking in group_rankings.items():
        if len(ranking) >= basis_per_group:
            qualified.extend(ranking[:basis_per_group])
    
    # Step 2: Apply fallback rules
    for rule in fallback_rules:
        position = rule["position"]
        count = rule["count"]
        selection = rule.get("selection", "best")
        
        if selection == "best":
            candidates = _rank_candidates_at_position(
                group_rankings=group_rankings,
                position=position,
                group_stats=group_stats
            )
            # Take top 'count' candidates
            qualified.extend(candidates[:count])
    
    return qualified


def _rank_candidates_at_position(
    group_rankings: Dict[int, List[int]],
    position: int,
    group_stats: Optional[Dict[int, Dict[int, Dict]]] = None
) -> List[int]:
    """
    Rank candidates at a specific position across all groups.
    
    Args:
        group_rankings: Dict mapping group_id to ranked participant IDs
        position: Position to consider (1-based, where 1 is best)
        group_stats: Optional stats for ranking (if None, uses order in ranking)
    
    Returns:
        List of participant IDs sorted by their performance at that position
        (best first)
    """
    candidates = []
    
    # Collect all participants at this position with their stats
    for group_id, ranking in group_rankings.items():
        pos_index = position - 1  # Convert to 0-based index
        if pos_index < len(ranking):
            participant_id = ranking[pos_index]
            candidate_data = {
                "participant_id": participant_id,
                "group_id": group_id
            }
            
            # If we have stats, add them for ranking
            if group_stats and group_id in group_stats and participant_id in group_stats[group_id]:
                stats = group_stats[group_id][participant_id]
                candidate_data["stats"] = stats
                # Create a sort key: prefer higher points/diff, then goals_for
                scoring_system = stats.get("scoring_system", "difference")
                if scoring_system == "points":
                    sort_key = (
                        -stats.get("points", 0),
                        -stats.get("diff", 0),
                        -stats.get("goals_for", 0)
                    )
                else:
                    sort_key = (
                        -stats.get("diff", 0),
                        -stats.get("goals_for", 0)
                    )
                candidate_data["_sort_key"] = sort_key
            else:
                # No stats available, use order from ranking (all candidates are at same position)
                candidate_data["_sort_key"] = (0, 0, 0)
            
            candidates.append(candidate_data)
    
    # Sort by sort key (best first)
    candidates.sort(key=lambda x: x["_sort_key"])
    
    # Return sorted list of participant IDs
    return [c["participant_id"] for c in candidates]
