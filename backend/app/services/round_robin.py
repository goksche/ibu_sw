# Round Robin Generation Service
# v1.3.2

from typing import List, Tuple, Optional


def generate_round_robin_rounds(participant_ids: List[int]) -> List[List[Tuple[int, int]]]:
    """
    Generate round robin rounds for a list of participants.
    
    Algorithm: Standard Round Robin tournament pairing
    - For odd numbers, adds a "bye" participant (None)
    - Rotates participants each round
    """
    ids = participant_ids.copy()
    
    # Add dummy participant if odd number
    if len(ids) % 2 == 1:
        ids.append(None)
    
    n = len(ids)
    half = n // 2
    rounds = []
    
    for _ in range(n - 1):
        left = ids[:half]
        right = list(reversed(ids[half:]))
        pairs = []
        
        for a, b in zip(left, right):
            # Skip if either is None (bye)
            if a is None or b is None:
                continue
            pairs.append((a, b))
        
        rounds.append(pairs)
        
        # Rotate: keep first, move last to second, shift others
        ids = [ids[0]] + [ids[-1]] + ids[1:-1]
    
    return rounds


def validate_round_robin_participants(participant_ids: List[int]) -> Tuple[bool, Optional[str]]:
    """Validate that we have enough participants for round robin"""
    if len(participant_ids) < 2:
        return False, "Mindestens 2 Teilnehmer erforderlich für Round Robin"
    
    # Check for duplicates
    if len(participant_ids) != len(set(participant_ids)):
        return False, "Doppelte Teilnehmer gefunden"
    
    return True, None

