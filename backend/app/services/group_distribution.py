# Group Distribution Service
# v1.3.2

from typing import List, Tuple
import random


def _balanced_target_sizes(n: int, num_groups: int) -> List[int]:
    """
    Gruppengrößen, die sich maximal um 1 unterscheiden; bei Rest (n % num_groups)
    werden die Extra-Plätze zufällig den Gruppen zugewiesen.
    """
    if num_groups < 1:
        raise ValueError("Number of groups must be at least 1")
    if n < 0:
        raise ValueError("n must be non-negative")
    base = n // num_groups
    extra = n % num_groups
    sizes = [base] * num_groups
    for idx in random.sample(range(num_groups), extra):
        sizes[idx] += 1
    return sizes


def _assign_to_capacity(participant_ids: List[int], capacities: List[int]) -> List[List[int]]:
    """Verteilt Teilnehmer zufällig auf Gruppen gemäß exakter Kapazitäten pro Gruppe."""
    num_groups = len(capacities)
    shuffled = participant_ids.copy()
    random.shuffle(shuffled)
    slot_list: List[int] = []
    for g, c in enumerate(capacities):
        slot_list.extend([g] * c)
    random.shuffle(slot_list)
    groups: List[List[int]] = [[] for _ in range(num_groups)]
    for pid, g in zip(shuffled, slot_list):
        groups[g].append(pid)
    return groups


def distribute_participants_random(
    participant_ids: List[int],
    num_groups: int
) -> List[List[int]]:
    """
    Distribute participants randomly across groups.
    Gruppen sind so gleich groß wie möglich (max. Differenz 1); der Rest wird
    zufällig auf Gruppen verteilt.
    """
    if num_groups < 1:
        raise ValueError("Number of groups must be at least 1")

    if not participant_ids:
        return [[] for _ in range(num_groups)]

    n = len(participant_ids)
    sizes = _balanced_target_sizes(n, num_groups)
    return _assign_to_capacity(participant_ids, sizes)


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

    # Normalize provided indices: keep order, valid range, unique
    seen = set()
    normalized_seeded_indices: List[int] = []
    for idx in seeded_indices:
        if 0 <= idx < len(participant_ids) and idx not in seen:
            normalized_seeded_indices.append(idx)
            seen.add(idx)
    seeded_indices = normalized_seeded_indices

    if len(seeded_indices) > num_groups:
        raise ValueError(
            f"Zu viele gesetzte Spieler ({len(seeded_indices)}) für {num_groups} Gruppen. "
            f"Maximal {num_groups} gesetzte Spieler erlaubt."
        )

    n = len(participant_ids)
    target_sizes = _balanced_target_sizes(n, num_groups)

    groups = [[] for _ in range(num_groups)]
    seeded_set = set(seeded_indices)

    # Place seeds: one seed per group (in seed order)
    for group_idx, participant_idx in enumerate(seeded_indices):
        groups[group_idx].append(participant_ids[participant_idx])

    for g in range(num_groups):
        if len(groups[g]) > target_sizes[g]:
            raise ValueError(
                f"Gruppe {g + 1} hat nach Setzung mehr Spieler als vorgesehen "
                f"({len(groups[g])} > {target_sizes[g]})."
            )

    remaining = [
        participant_id
        for i, participant_id in enumerate(participant_ids)
        if i not in seeded_set
    ]
    capacities = [target_sizes[g] - len(groups[g]) for g in range(num_groups)]
    if sum(capacities) != len(remaining):
        raise ValueError("Interne Verteilungsinkonsistenz (Restplätze vs. Teilnehmer).")

    if remaining:
        extra = _assign_to_capacity(remaining, capacities)
        for g in range(num_groups):
            groups[g].extend(extra[g])

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

