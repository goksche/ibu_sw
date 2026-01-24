# KO Bracket Generation Service
# v1.3.2

from typing import List, Tuple, Dict, Optional
import math
import random


def _log2_int(x: int) -> int:
    """Calculate log2 and round to integer"""
    return int(round(math.log2(x))) if x > 0 else 0


def _next_round_slot_for(match_no: int) -> Tuple[int, int]:
    """Determine target match and slot for winner"""
    target = (match_no + 1) // 2
    slot = 1 if (match_no % 2 == 1) else 2
    return target, slot


def compute_group_ranking_with_ties(
    matches: List[Dict],
    participant_ids: List[int]
) -> List[int]:
    """
    Compute group ranking based on goal difference (Diff).
    
    Tie-breaking:
    - 2 players: Head-to-head decides
    - >=3 players: Mini-table (diff only from direct encounters)
    - Still tied: Alphabetical ordering
    """
    
    # Initialize stats for each participant
    stats = {
        pid: {
            'games': 0,
            'wins': 0,
            'losses': 0,
            'goals_for': 0,
            'goals_against': 0,
            'diff': 0,
        }
        for pid in participant_ids
    }
    
    # Process matches
    for match in matches:
        p1_id = match.get('player1_id')
        p2_id = match.get('player2_id')
        score1 = match.get('score1')
        score2 = match.get('score2')
        
        if not all([p1_id, p2_id, score1 is not None, score2 is not None]):
            continue
        
        if score1 == score2:
            continue  # Tie doesn't affect goal difference
        
        # Update stats
        stats[p1_id]['games'] += 1
        stats[p2_id]['games'] += 1
        stats[p1_id]['goals_for'] += score1
        stats[p1_id]['goals_against'] += score2
        stats[p2_id]['goals_for'] += score2
        stats[p2_id]['goals_against'] += score1
        
        if score1 > score2:
            stats[p1_id]['wins'] += 1
            stats[p2_id]['losses'] += 1
        else:
            stats[p2_id]['wins'] += 1
            stats[p1_id]['losses'] += 1
    
    # Calculate differences
    for pid in stats:
        stats[pid]['diff'] = stats[pid]['goals_for'] - stats[pid]['goals_against']
    
    # Group by difference
    buckets = {}
    for pid, stat in stats.items():
        diff = stat['diff']
        if diff not in buckets:
            buckets[diff] = []
        buckets[diff].append(pid)
    
    # Sort by difference (descending)
    sorted_diffs = sorted(buckets.keys(), reverse=True)
    
    # Build result
    result = []
    for diff in sorted_diffs:
        group = buckets[diff]
        
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
                # Still tied, use alphabetical (sort by ID)
                result.extend(sorted(group))
        else:
            # Mini-table
            mini_diff = _mini_table_diff(matches, group)
            ordered = sorted(group, key=lambda pid: (-mini_diff.get(pid, 0), pid))
            result.extend(ordered)
    
    return result


def _head_to_head_winner(matches: List[Dict], pid1: int, pid2: int) -> Optional[int]:
    """Find head-to-head winner between two participants"""
    for match in matches:
        p1 = match.get('player1_id')
        p2 = match.get('player2_id')
        s1 = match.get('score1')
        s2 = match.get('score2')
        
        if p1 is None or p2 is None or s1 is None or s2 is None:
            continue
        
        if (p1 == pid1 and p2 == pid2) or (p1 == pid2 and p2 == pid1):
            if s1 == s2:
                return None  # Tie
            if p1 == pid1:
                return pid1 if s1 > s2 else pid2
            else:
                return pid1 if s1 < s2 else pid2
    
    return None  # No direct match found


def _mini_table_diff(matches: List[Dict], participant_ids: List[int]) -> Dict[int, int]:
    """Calculate goal difference from direct encounters only"""
    if not participant_ids:
        return {}
    
    mini_stats = {pid: {'goals_for': 0, 'goals_against': 0} for pid in participant_ids}
    
    for match in matches:
        p1 = match.get('player1_id')
        p2 = match.get('player2_id')
        s1 = match.get('score1')
        s2 = match.get('score2')
        
        if p1 in mini_stats and p2 in mini_stats and s1 is not None and s2 is not None:
            mini_stats[p1]['goals_for'] += s1
            mini_stats[p1]['goals_against'] += s2
            mini_stats[p2]['goals_for'] += s2
            mini_stats[p2]['goals_against'] += s1
    
    return {
        pid: stat['goals_for'] - stat['goals_against']
        for pid, stat in mini_stats.items()
    }


def generate_ko_bracket_from_groups(
    group_rankings: Dict[int, List[int]],  # group_id -> [sorted participant_ids]
    first_round_size: int,
    mode: str,
    rng_seed: Optional[int] = None,
    qualification_plan: Optional[Dict] = None  # Optional qualification plan for advanced qualification
) -> List[Dict]:
    """
    Generate KO bracket matches from group rankings.
    
    Args:
        group_rankings: Dict mapping group_id to ranked participant IDs
        first_round_size: Number of participants in first KO round (4, 8, or 16)
        mode: 'cross' or 'draw'
        rng_seed: Optional random seed for draw mode
        qualification_plan: Optional qualification plan (if provided, uses fallback rules)
        
    Returns:
        List of match dictionaries
    """
    if first_round_size not in (4, 8, 16, 32):
        raise ValueError(f"Invalid first_round_size: {first_round_size}. Must be 4, 8, 16, or 32")
    
    # Get groups in order
    group_list = sorted(group_rankings.keys())
    gcount = len(group_list)
    
    if mode == 'cross':
        return _generate_cross_mode(group_list, group_rankings, first_round_size, gcount, qualification_plan)
    else:  # draw
        return _generate_draw_mode(group_list, group_rankings, first_round_size, gcount, rng_seed, qualification_plan)


def _generate_cross_mode(
    group_list: List[int],
    group_rankings: Dict[int, List[int]],
    first_round_size: int,
    gcount: int,
    qualification_plan: Optional[Dict] = None
) -> List[Dict]:
    """Generate cross mode bracket"""
    matches = []
    match_no = 1
    
    # If qualification plan is provided and has fallback rules, we need to use qualified participants
    # Otherwise, use direct group rankings
    if qualification_plan and qualification_plan.get("fallback_rules"):
        # Use qualified participants from qualification service
        from app.services.qualification import get_qualified_participants_from_groups
        
        # Need to pass group_stats for proper ranking of fallback candidates
        # We need to compute stats for ranking fallback candidates
        # For now, we'll use stats=None, which means candidates will be ranked by their position order
        # In a future improvement, we could compute and pass stats here
        qualified_participants = get_qualified_participants_from_groups(
            group_rankings=group_rankings,
            qualification_plan=qualification_plan,
            group_stats=None  # Stats not available here, will use ranking order from group_rankings
        )
        
        if len(qualified_participants) != first_round_size:
            raise ValueError(
                f"Qualifikation ergab {len(qualified_participants)} Teilnehmer, aber {first_round_size} erforderlich. "
                f"Bitte überprüfen Sie die Qualifikationsregeln."
            )
        
        # For cross mode with qualified participants, we need to assign them to groups
        # Create a reverse mapping: participant_id -> original group_id
        participant_to_group = {}
        for gid, ranking in group_rankings.items():
            for participant_id in ranking:
                participant_to_group[participant_id] = gid
        
        # Group qualified participants by their original group
        qualified_by_group = {}
        for pid in qualified_participants:
            gid = participant_to_group.get(pid)
            if gid:
                if gid not in qualified_by_group:
                    qualified_by_group[gid] = []
                qualified_by_group[gid].append(pid)
        
        # Store original rankings for reference
        original_rankings = group_rankings.copy()
        
        # For cross mode with qualified participants, we need to restructure
        # to match the expected pairing pattern while using only qualified participants
        # Build effective_rankings: each group gets its qualified participants in ranking order
        effective_rankings = {}
        for gid in group_list:
            if gid in qualified_by_group:
                # Use qualified participants in their original ranking order
                original_ranking = original_rankings[gid]
                qualified_for_group = qualified_by_group[gid]
                # Sort qualified participants by their position in original ranking
                effective_rankings[gid] = [pid for pid in original_ranking if pid in qualified_for_group]
            else:
                effective_rankings[gid] = []
        
        # Now we need to handle the special case where some groups might have
        # more qualifiers due to fallback rules. For cross mode, we'll use
        # the first N positions from each group where N = basis_per_group + any fallback additions
        # But keep the original structure for pairing logic
        group_rankings = effective_rankings
    
    # Validate we have enough participants per group
    if qualification_plan:
        min_needed = qualification_plan.get("basis_per_group", 0)
        # Check fallback positions too
        fallback_rules = qualification_plan.get("fallback_rules", [])
        for rule in fallback_rules:
            min_needed = max(min_needed, rule.get("position", 0))
    else:
        min_needed = first_round_size // gcount
    
    for gid in group_list:
        if len(group_rankings.get(gid, [])) < min_needed:
            raise ValueError(f"Not enough ranked participants in group {gid}: need {min_needed}, have {len(group_rankings.get(gid, []))}")
    
    if gcount == 2 and first_round_size == 4:
        # A1-B2, B1-A2
        group_a, group_b = group_list
        A = group_rankings[group_a]
        B = group_rankings[group_b]
        matches.append({'round': 1, 'match_no': 1, 'player1_id': A[0], 'player2_id': B[1]})
        matches.append({'round': 1, 'match_no': 2, 'player1_id': B[0], 'player2_id': A[1]})
        match_no = 3
    
    elif gcount == 2 and first_round_size == 8:
        # A1-B4, A2-B3, A3-B2, A4-B1
        group_a, group_b = group_list
        A = group_rankings[group_a]
        B = group_rankings[group_b]
        matches.append({'round': 1, 'match_no': 1, 'player1_id': A[0], 'player2_id': B[3]})
        matches.append({'round': 1, 'match_no': 2, 'player1_id': A[1], 'player2_id': B[2]})
        matches.append({'round': 1, 'match_no': 3, 'player1_id': A[2], 'player2_id': B[1]})
        matches.append({'round': 1, 'match_no': 4, 'player1_id': A[3], 'player2_id': B[0]})
        match_no = 5
    
    elif gcount == 4 and first_round_size == 4:
        # A1-D1, B1-C1
        group_a, group_b, group_c, group_d = group_list
        A, B, C, D = group_rankings[group_a], group_rankings[group_b], group_rankings[group_c], group_rankings[group_d]
        matches.append({'round': 1, 'match_no': 1, 'player1_id': A[0], 'player2_id': D[0]})
        matches.append({'round': 1, 'match_no': 2, 'player1_id': B[0], 'player2_id': C[0]})
        match_no = 3
    
    elif gcount == 4 and first_round_size == 8:
        # A1-D2, B1-C2, C1-B2, D1-A2
        group_a, group_b, group_c, group_d = group_list
        A, B, C, D = group_rankings[group_a], group_rankings[group_b], group_rankings[group_c], group_rankings[group_d]
        matches.append({'round': 1, 'match_no': 1, 'player1_id': A[0], 'player2_id': D[1]})
        matches.append({'round': 1, 'match_no': 2, 'player1_id': B[0], 'player2_id': C[1]})
        matches.append({'round': 1, 'match_no': 3, 'player1_id': C[0], 'player2_id': B[1]})
        matches.append({'round': 1, 'match_no': 4, 'player1_id': D[0], 'player2_id': A[1]})
        match_no = 5
    
    elif gcount == 4 and first_round_size == 16:
        # A1-D4, B1-C4, A2-D3, B2-C3, A3-D2, B3-C2, A4-D1, B4-C1
        group_a, group_b, group_c, group_d = group_list
        A, B, C, D = group_rankings[group_a], group_rankings[group_b], group_rankings[group_c], group_rankings[group_d]
        matches.append({'round': 1, 'match_no': 1, 'player1_id': A[0], 'player2_id': D[3]})
        matches.append({'round': 1, 'match_no': 2, 'player1_id': B[0], 'player2_id': C[3]})
        matches.append({'round': 1, 'match_no': 3, 'player1_id': A[1], 'player2_id': D[2]})
        matches.append({'round': 1, 'match_no': 4, 'player1_id': B[1], 'player2_id': C[2]})
        matches.append({'round': 1, 'match_no': 5, 'player1_id': A[2], 'player2_id': D[1]})
        matches.append({'round': 1, 'match_no': 6, 'player1_id': B[2], 'player2_id': C[1]})
        matches.append({'round': 1, 'match_no': 7, 'player1_id': A[3], 'player2_id': D[0]})
        matches.append({'round': 1, 'match_no': 8, 'player1_id': B[3], 'player2_id': C[0]})
        match_no = 9
    
    elif gcount == 8 and first_round_size == 8:
        # (A-H, B-G, C-F, D-E) jeweils 1. vs 1.
        pairs = [(group_list[0], group_list[7]), (group_list[1], group_list[6]), 
                 (group_list[2], group_list[5]), (group_list[3], group_list[4])]
        for g1, g2 in pairs:
            L1 = group_rankings[g1]
            L2 = group_rankings[g2]
            matches.append({'round': 1, 'match_no': match_no, 'player1_id': L1[0], 'player2_id': L2[0]})
            match_no += 1
    
    elif gcount == 8 and first_round_size == 16:
        # je Paar 1. vs 2. (gespiegelt)
        pairs = [(group_list[0], group_list[7]), (group_list[1], group_list[6]), 
                 (group_list[2], group_list[5]), (group_list[3], group_list[4])]
        for g1, g2 in pairs:
            L1 = group_rankings[g1]
            L2 = group_rankings[g2]
            matches.append({'round': 1, 'match_no': match_no, 'player1_id': L1[0], 'player2_id': L2[1]})
            match_no += 1
            matches.append({'round': 1, 'match_no': match_no, 'player1_id': L2[0], 'player2_id': L1[1]})
            match_no += 1
    
    elif gcount == 7 and first_round_size == 16:
        # For 7 groups with 16 participants: use generic cross pairing
        # Pair groups: (A-G), (B-F), (C-E), D isolated
        # Take 2 from each group, then add 2 more from best 3rd places
        pairs = [(group_list[0], group_list[6]), (group_list[1], group_list[5]), 
                 (group_list[2], group_list[4])]
        isolated_group = group_list[3]
        
        # First 6 matches from pairs (2 per pair)
        for g1, g2 in pairs:
            L1 = group_rankings[g1]
            L2 = group_rankings[g2]
            matches.append({'round': 1, 'match_no': match_no, 'player1_id': L1[0], 'player2_id': L2[1]})
            match_no += 1
            matches.append({'round': 1, 'match_no': match_no, 'player1_id': L2[0], 'player2_id': L1[1]})
            match_no += 1
        
        # Isolated group gets both 1st places (but we need 2 more matches for 16)
        # Take 3rd places from pairs
        for g1, g2 in pairs:
            L1 = group_rankings[g1]
            L2 = group_rankings[g2]
            if len(L1) >= 3 and len(L2) >= 3:
                matches.append({'round': 1, 'match_no': match_no, 'player1_id': L1[2], 'player2_id': L2[2]})
                match_no += 1
                if match_no > first_round_size // 2:  # We need first_round_size // 2 matches total
                    break
        
        # Fill remaining spots with isolated group
        isolated_rankings = group_rankings[isolated_group]
        while match_no <= first_round_size // 2:
            if len(isolated_rankings) >= 2:
                # Use best from isolated group vs next from pairs
                for g1, g2 in pairs:
                    L1 = group_rankings[g1]
                    if len(L1) >= 3:
                        matches.append({'round': 1, 'match_no': match_no, 'player1_id': isolated_rankings[0], 'player2_id': L1[2]})
                        match_no += 1
                        if match_no > first_round_size // 2:
                            break
                    if match_no > first_round_size // 2:
                        break
            break
    
    else:
        # Generic fallback: try to use draw mode logic but keep cross pairing structure
        # Calculate basis per group
        basis_per_group = first_round_size // gcount
        remainder = first_round_size % gcount
        
        # For cross mode with arbitrary groups, pair opposite groups
        # Group pairs: (first, last), (second, second-last), etc.
        half = gcount // 2
        pairs = []
        for i in range(half):
            pairs.append((group_list[i], group_list[gcount - 1 - i]))
        
        # If odd number of groups, middle group is isolated
        isolated_group = None
        if gcount % 2 == 1:
            isolated_group = group_list[half]
        
        # Create matches from pairs
        participants_per_match = basis_per_group * 2
        
        # For each pair, create matches using cross pairing
        for g1, g2 in pairs:
            L1 = group_rankings[g1]
            L2 = group_rankings[g2]
            
            # Create matches in cross pattern: L1[i] vs L2[participants_per_match - 1 - i]
            for i in range(basis_per_group):
                if len(L1) > i and len(L2) > (participants_per_match - 1 - i):
                    pos2 = participants_per_match - 1 - i
                    if pos2 >= len(L2):
                        pos2 = len(L2) - 1
                    matches.append({'round': 1, 'match_no': match_no, 'player1_id': L1[i], 'player2_id': L2[pos2]})
                    match_no += 1
        
        # Handle isolated group if exists
        if isolated_group and remainder > 0:
            isolated_rankings = group_rankings[isolated_group]
            # Use best from isolated group
            for i in range(min(remainder, len(isolated_rankings))):
                # Pair with remaining positions from other groups
                # For simplicity, pair with next available from first group
                if len(group_rankings[group_list[0]]) > basis_per_group + i:
                    matches.append({'round': 1, 'match_no': match_no, 
                                  'player1_id': isolated_rankings[i], 
                                  'player2_id': group_rankings[group_list[0]][basis_per_group + i]})
                    match_no += 1
                    if match_no > first_round_size // 2:
                        break
        
        # Validate we have enough matches
        expected_matches = first_round_size // 2
        if len(matches) < expected_matches:
            raise ValueError(
                f"Kann nicht genügend Spiele für Cross-Mode generieren: "
                f"{len(matches)} Spiele erstellt, {expected_matches} benötigt. "
                f"Bitte verwenden Sie Draw-Mode für {gcount} Gruppen mit {first_round_size} Teilnehmern."
            )
    
    # Add subsequent rounds
    rounds_total = _log2_int(first_round_size)
    for r in range(2, rounds_total + 1):
        mcount = max(1, first_round_size // (2 ** r))
        for m in range(1, mcount + 1):
            matches.append({'round': r, 'match_no': m, 'player1_id': None, 'player2_id': None})
    
    return matches


def _generate_draw_mode(
    group_list: List[int],
    group_rankings: Dict[int, List[int]],
    first_round_size: int,
    gcount: int,
    rng_seed: Optional[int],
    qualification_plan: Optional[Dict] = None
) -> List[Dict]:
    """Generate draw mode bracket"""
    # Collect all qualifiers
    pool = []
    
    if qualification_plan:
        # Use qualification plan with fallback rules
        from app.services.qualification import get_qualified_participants_from_groups
        pool = get_qualified_participants_from_groups(
            group_rankings=group_rankings,
            qualification_plan=qualification_plan
        )
    else:
        # Legacy mode: simple division
        if first_round_size % gcount != 0:
            raise ValueError(f"first_round_size ({first_round_size}) must be divisible by group count ({gcount})")
        
        qualifiers_per_group = first_round_size // gcount
        
        # Collect all qualifiers
        for gid in group_list:
            pool.extend(group_rankings[gid][:qualifiers_per_group])
    
    # Shuffle
    if rng_seed is not None:
        random.seed(rng_seed)
    random.shuffle(pool)
    
    # Create first round matches
    matches = []
    match_no = 1
    for i in range(0, len(pool), 2):
        p1 = pool[i]
        p2 = pool[i + 1] if i + 1 < len(pool) else None
        matches.append({'round': 1, 'match_no': match_no, 'player1_id': p1, 'player2_id': p2})
        match_no += 1
    
    # Add subsequent rounds
    rounds_total = _log2_int(first_round_size)
    for r in range(2, rounds_total + 1):
        mcount = max(1, first_round_size // (2 ** r))
        for m in range(1, mcount + 1):
            matches.append({'round': r, 'match_no': m, 'player1_id': None, 'player2_id': None})
    
    return matches


def generate_ko_bracket_from_participants(
    participant_ids: List[int],
    draw_method: str = 'full_random',
    rng_seed: Optional[int] = None
) -> List[Dict]:
    """
    Generate KO bracket matches directly from participant list (no groups).
    
    Args:
        participant_ids: List of participant IDs to include in bracket
        draw_method: 'full_random', 'pot_system', or 'overall_seeding'
        rng_seed: Optional random seed for reproducible draws
        
    Returns:
        List of match dictionaries
    """
    if not participant_ids or len(participant_ids) < 2:
        raise ValueError("Need at least 2 participants to generate KO bracket")
    
    num_participants = len(participant_ids)
    
    # Round up to next power of 2 (4, 8, 16, 32, etc.)
    # For tournament brackets, we typically want powers of 2
    if num_participants <= 4:
        bracket_size = 4
    elif num_participants <= 8:
        bracket_size = 8
    elif num_participants <= 16:
        bracket_size = 16
    elif num_participants <= 32:
        bracket_size = 32
    else:
        # For more than 32, use next power of 2
        bracket_size = 2 ** (_log2_int(num_participants) + 1)
    
    num_byes = bracket_size - num_participants
    
    # Prepare participant list with byes (None = bye)
    participants = participant_ids.copy()
    participants.extend([None] * num_byes)
    
    # Apply draw method
    if draw_method == 'full_random':
        # Random shuffle
        if rng_seed is not None:
            random.seed(rng_seed)
        random.shuffle(participants)
    elif draw_method == 'pot_system':
        # Split into pots and shuffle within pots
        # For now, simple approach: split into two halves
        mid = len(participants) // 2
        first_half = participants[:mid]
        second_half = participants[mid:]
        if rng_seed is not None:
            random.seed(rng_seed)
        random.shuffle(first_half)
        random.shuffle(second_half)
        participants = first_half + second_half
    elif draw_method == 'overall_seeding':
        # Keep order (participants should be pre-seeded)
        # No shuffling needed
        pass
    else:
        # Default: random
        if rng_seed is not None:
            random.seed(rng_seed)
        random.shuffle(participants)
    
    # Generate first round matches
    matches = []
    match_no = 1
    for i in range(0, len(participants), 2):
        p1 = participants[i]
        p2 = participants[i + 1] if i + 1 < len(participants) else None
        matches.append({'round': 1, 'match_no': match_no, 'player1_id': p1, 'player2_id': p2})
        match_no += 1
    
    # Add subsequent rounds
    rounds_total = _log2_int(bracket_size)
    for r in range(2, rounds_total + 1):
        mcount = max(1, bracket_size // (2 ** r))
        for m in range(1, mcount + 1):
            matches.append({'round': r, 'match_no': m, 'player1_id': None, 'player2_id': None})
    
    return matches
