# Group Distribution Service
# v1.3.2

from typing import List, Tuple
import random


def distribute_participants_random(
    participant_ids: List[int],
    num_groups: int
) -> List[List[int]]:
    """
    Distribute participants randomly across groups.
    
    Args:
        participant_ids: List of participant IDs to distribute
        num_groups: Number of groups to distribute into
        
    Returns:
        List of groups, where each group is a list of participant IDs
    """
    if num_groups < 1:
        raise ValueError("Number of groups must be at least 1")
    
    if not participant_ids:
        return [[] for _ in range(num_groups)]
    
    # Shuffle participants
    shuffled = participant_ids.copy()
    random.shuffle(shuffled)
    
    # Distribute evenly
    groups = [[] for _ in range(num_groups)]
    
    for i, participant_id in enumerate(shuffled):
        group_idx = i % num_groups
        groups[group_idx].append(participant_id)
    
    return groups


def distribute_participants_seeded(
    participant_ids: List[int],
    num_groups: int,
    seeded_indices: List[int] = None
) -> List[List[int]]:
    """
    Distribute participants with seeded assignment.
    Places top participants in different groups first.
    
    Args:
        participant_ids: List of participant IDs (first items are "seeds")
        num_groups: Number of groups to distribute into
        seeded_indices: Indices of seeded participants (default: first num_groups)
        
    Returns:
        List of groups, where each group is a list of participant IDs
    """
    if num_groups < 1:
        raise ValueError("Number of groups must be at least 1")
    
    if not participant_ids:
        return [[] for _ in range(num_groups)]
    
    # Default: first num_groups are seeds
    if seeded_indices is None:
        seeded_indices = list(range(min(num_groups, len(participant_ids))))
    
    # Initialize groups
    groups = [[] for _ in range(num_groups)]
    
    # Place seeds
    remaining = []
    for i, participant_id in enumerate(participant_ids):
        if i in seeded_indices:
            group_idx = seeded_indices.index(i) % num_groups
            groups[group_idx].append(participant_id)
        else:
            remaining.append(participant_id)
    
    # Distribute remaining participants randomly
    if remaining:
        random.shuffle(remaining)
        for i, participant_id in enumerate(remaining):
            group_idx = i % num_groups
            groups[group_idx].append(participant_id)
    
    return groups


def validate_distribution(
    participant_ids: List[int],
    num_groups: int
) -> Tuple[bool, str]:
    """Validate distribution parameters"""
    if len(participant_ids) < num_groups:
        return False, f"Zu wenige Teilnehmer ({len(participant_ids)}) für {num_groups} Gruppen"
    
    if len(set(participant_ids)) != len(participant_ids):
        return False, "Doppelte Teilnehmer gefunden"
    
    return True, None

