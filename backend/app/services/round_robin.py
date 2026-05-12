# Round Robin Generation Service
# v1.3.2

from typing import List, Tuple, Optional
import random


def _generate_classic_rounds(participant_ids: List[int]) -> List[List[Tuple[int, int]]]:
    """
    Generate classic round robin rounds for a list of participants.
    
    Algorithm: Standard Round Robin tournament pairing
    - For odd numbers, adds a "bye" participant (None)
    - Rotates participants each round
    
    Returns a list of rounds, where each round is a list of (player1_id, player2_id) tuples.
    """
    if not participant_ids or len(participant_ids) < 2:
        return []
    
    ids = participant_ids.copy()
    
    # Add dummy participant if odd number
    has_bye = len(ids) % 2 == 1
    if has_bye:
        ids.append(None)
    
    n = len(ids)
    half = n // 2
    rounds = []
    
    # Generate n-1 rounds (or n rounds if we have a bye)
    num_rounds = n - 1 if not has_bye else n - 1
    
    for round_num in range(num_rounds):
        left = ids[:half]
        right = list(reversed(ids[half:]))
        pairs = []
        
        for a, b in zip(left, right):
            # Skip if either is None (bye)
            if a is None or b is None:
                continue
            pairs.append((a, b))
        
        if pairs:  # Only add round if it has at least one pair
            rounds.append(pairs)
        
        # Rotate: keep first, move last to second, shift others
        if n > 2:  # Only rotate if we have more than 2 elements
            ids = [ids[0]] + [ids[-1]] + ids[1:-1]
    
    return rounds


def generate_round_robin_rounds(
    participant_ids: List[int],
    multiplier: int = 1,
    variant: str = 'classic'
) -> List[List[Tuple[int, int]]]:
    """
    Generate round robin rounds for a list of participants with support for variants.
    
    Args:
        participant_ids: List of participant IDs
        multiplier: Number of times to repeat the rounds (for 'multiple' variant)
        variant: League variant ('classic', 'double', 'multiple')
    
    Returns:
        List of rounds, where each round is a list of (player1_id, player2_id) tuples.
    """
    # Generate base rounds (classic round robin)
    base_rounds = _generate_classic_rounds(participant_ids)
    
    if not base_rounds:
        return []
    
    # Apply variant logic
    if variant == 'double':
        # Double: return base rounds twice
        return base_rounds + base_rounds.copy()
    elif variant == 'multiple' and multiplier > 1:
        # Multiple: repeat base rounds multiplier times
        return base_rounds * multiplier
    
    # Classic: return base rounds once (multiplier=1)
    return base_rounds


def validate_round_robin_participants(participant_ids: List[int]) -> Tuple[bool, Optional[str]]:
    """Validate that we have enough participants for round robin"""
    if len(participant_ids) < 2:
        return False, "Mindestens 2 Teilnehmer erforderlich für Round Robin"
    
    # Check for duplicates
    if len(participant_ids) != len(set(participant_ids)):
        return False, "Doppelte Teilnehmer gefunden"
    
    return True, None


def generate_swiss_like_rounds(
    participant_ids: List[int],
    rounds_count: int,
    rng_seed: int | None = None,
) -> List[List[Tuple[int, int]]]:
    """
    Precompute swiss-like pairings without live score feedback.
    This is a pragmatic approximation for planning mode previews.
    """
    if len(participant_ids) < 2 or rounds_count <= 0:
        return []

    ids = participant_ids.copy()
    rng = random.Random(rng_seed)
    rng.shuffle(ids)
    rounds: List[List[Tuple[int, int]]] = []
    seen_pairs: set[Tuple[int, int]] = set()

    for round_idx in range(rounds_count):
        if round_idx > 0:
            ids = ids[1:] + ids[:1]

        remaining = ids.copy()
        round_pairs: List[Tuple[int, int]] = []
        while len(remaining) >= 2:
            p1 = remaining.pop(0)
            candidate_idx = None
            for idx, p2 in enumerate(remaining):
                key = tuple(sorted((p1, p2)))
                if key not in seen_pairs:
                    candidate_idx = idx
                    break
            if candidate_idx is None:
                candidate_idx = 0
            p2 = remaining.pop(candidate_idx)
            key = tuple(sorted((p1, p2)))
            seen_pairs.add(key)
            round_pairs.append((p1, p2))

        if round_pairs:
            rounds.append(round_pairs)

    return rounds
