# KO Bracket Generation Service
# v1.3.2

from typing import List, Tuple, Dict, Optional
import math
import random

from app.services.ko_propagation import BRONZE_ROUND


def append_third_place_placeholder_if_needed(
    matches: List[Dict],
    *,
    ko_third_place_match: bool,
    ko_structure: Optional[str],
) -> List[Dict]:
    """
    Append a placeholder match for the bronze / 3rd-place game (round BRONZE_ROUND) when the
    tournament requests it and the KO structure is a classic single-elimination tree.
    """
    if any(m.get("round") == BRONZE_ROUND for m in matches):
        return matches

    struct = (ko_structure or "").strip()
    if struct in (
        "double_elimination",
        "triple_elimination",
        "consolation_bracket",
        "aggregate_ko",
        "page_playoff",
    ):
        return matches

    want = bool(ko_third_place_match) or struct == "single_elimination_with_third"
    if not want:
        return matches

    matches.append(
        {
            "round": BRONZE_ROUND,
            "match_no": 1,
            "player1_id": None,
            "player2_id": None,
        }
    )
    return matches


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
    qualification_plan: Optional[Dict] = None,  # Optional qualification plan for advanced qualification
    block_same_group: bool = True,
    block_same_position: bool = False,
    group_stats: Optional[Dict[int, Dict[int, Dict]]] = None,
    tie_breaking_rules: Optional[List[str]] = None,
    draw_method: Optional[str] = None
) -> List[Dict]:
    """
    Generate KO bracket matches from group rankings.
    
    Args:
        group_rankings: Dict mapping group_id to ranked participant IDs
        first_round_size: Number of participants in first KO round (4, 8, or 16)
        mode: 'cross' or 'draw'
        rng_seed: Optional random seed for draw mode
        qualification_plan: Optional qualification plan (if provided, uses fallback rules)
        block_same_group: Avoid same-group pairings in draw mode
        block_same_position: Avoid same-position pairings in draw mode
        
    Returns:
        List of match dictionaries
    """
    if first_round_size not in (4, 8, 16, 32):
        raise ValueError(f"Invalid first_round_size: {first_round_size}. Must be 4, 8, 16, or 32")
    
    # Get groups in order
    group_list = sorted(group_rankings.keys())
    gcount = len(group_list)
    
    if mode == 'cross':
        return _generate_cross_mode(
            group_list,
            group_rankings,
            first_round_size,
            gcount,
            qualification_plan,
            group_stats=group_stats,
            tie_breaking_rules=tie_breaking_rules
        )
    else:  # draw
        return _generate_draw_mode(
            group_list,
            group_rankings,
            first_round_size,
            gcount,
            rng_seed,
            qualification_plan,
            block_same_group=block_same_group,
            block_same_position=block_same_position,
            group_stats=group_stats,
            tie_breaking_rules=tie_breaking_rules,
            draw_method=draw_method
        )


def _generate_cross_mode(
    group_list: List[int],
    group_rankings: Dict[int, List[int]],
    first_round_size: int,
    gcount: int,
    qualification_plan: Optional[Dict] = None,
    group_stats: Optional[Dict[int, Dict[int, Dict]]] = None,
    tie_breaking_rules: Optional[List[str]] = None
) -> List[Dict]:
    """Generate cross mode bracket"""
    matches = []
    match_no = 1
    
    # If qualification plan is provided and has fallback rules, we need to use qualified participants
    # Otherwise, use direct group rankings
    if qualification_plan:
        min_needed_full = qualification_plan.get("basis_per_group", 0)
        for rule in qualification_plan.get("fallback_rules", []):
            min_needed_full = max(min_needed_full, rule.get("position", 0))

        for gid in group_list:
            if len(group_rankings.get(gid, [])) < min_needed_full:
                raise ValueError(
                    f"Not enough ranked participants in group {gid}: need {min_needed_full}, "
                    f"have {len(group_rankings.get(gid, []))}"
                )

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
            group_stats=group_stats,
            tie_breaking_rules=tie_breaking_rules
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
    
    # Validate we have enough participants per group for pairing
    if qualification_plan:
        min_needed = qualification_plan.get("basis_per_group", 0)
    else:
        min_needed = first_round_size // gcount

    if min_needed > 0:
        for gid in group_list:
            if len(group_rankings.get(gid, [])) < min_needed:
                raise ValueError(
                    f"Not enough ranked participants in group {gid}: need {min_needed}, "
                    f"have {len(group_rankings.get(gid, []))}"
                )
    
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
        
        # Remaining 2 matches: isolated group top2 vs best two 3rd places (unique)
        isolated_rankings = group_rankings[isolated_group]
        if len(isolated_rankings) < 2:
            raise ValueError(
                f"Not enough ranked participants in isolated group {isolated_group}: need 2, "
                f"have {len(isolated_rankings)}"
            )

        # Rank best 3rd places across all groups (position 3)
        try:
            from app.services.qualification import rank_candidates_with_keys
            ranked_thirds = rank_candidates_with_keys(
                group_rankings=group_rankings,
                position=3,
                group_stats=group_stats,
                tie_breaking_rules=tie_breaking_rules
            )
            third_candidates = [c["participant_id"] for c in ranked_thirds]
        except Exception:
            third_candidates = []

        if not third_candidates:
            # Fallback: keep group order
            third_candidates = [
                group_rankings[gid][2]
                for gid in group_list
                if len(group_rankings.get(gid, [])) >= 3
            ]

        if len(third_candidates) < 2:
            raise ValueError(
                "Nicht genügend Drittplatzierte für 7 Gruppen / 16er-Start. "
                "Bitte prüfen Sie die Gruppengrößen oder verwenden Sie Draw-Mode."
            )

        third1, third2 = third_candidates[0], third_candidates[1]
        matches.append({'round': 1, 'match_no': match_no, 'player1_id': isolated_rankings[0], 'player2_id': third2})
        match_no += 1
        matches.append({'round': 1, 'match_no': match_no, 'player1_id': isolated_rankings[1], 'player2_id': third1})
        match_no += 1
    
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


def _build_overall_seeding_pool(
    group_list: List[int],
    group_rankings: Dict[int, List[int]],
    group_stats: Optional[Dict[int, Dict[int, Dict]]] = None,
    tie_breaking_rules: Optional[List[str]] = None
) -> List[int]:
    """
    Build an overall seeding list across groups by position and performance.
    Group winners come first, then second places, etc., each ranked by stats.
    """
    max_position = max((len(ranking) for ranking in group_rankings.values()), default=0)
    if max_position == 0:
        return []

    ordered: List[int] = []
    try:
        from app.services.qualification import rank_candidates_with_keys
    except Exception:
        rank_candidates_with_keys = None  # Fallback if import fails

    for position in range(1, max_position + 1):
        if rank_candidates_with_keys and group_stats:
            ranked = rank_candidates_with_keys(
                group_rankings=group_rankings,
                position=position,
                group_stats=group_stats,
                tie_breaking_rules=tie_breaking_rules
            )
            ordered.extend([entry["participant_id"] for entry in ranked])
        else:
            for gid in group_list:
                ranking = group_rankings.get(gid, [])
                pos_index = position - 1
                if pos_index < len(ranking):
                    ordered.append(ranking[pos_index])

    return ordered


def _generate_draw_mode(
    group_list: List[int],
    group_rankings: Dict[int, List[int]],
    first_round_size: int,
    gcount: int,
    rng_seed: Optional[int],
    qualification_plan: Optional[Dict] = None,
    block_same_group: bool = True,
    block_same_position: bool = False,
    group_stats: Optional[Dict[int, Dict[int, Dict]]] = None,
    tie_breaking_rules: Optional[List[str]] = None,
    draw_method: Optional[str] = None
) -> List[Dict]:
    """Generate draw mode bracket"""
    # Map participant -> group and position (1-based)
    participant_meta = {}
    for gid, ranking in group_rankings.items():
        for idx, pid in enumerate(ranking):
            participant_meta[pid] = {
                "group_id": gid,
                "position": idx + 1
            }

    # Collect all qualifiers
    pool = []
    
    if qualification_plan:
        # Use qualification plan with fallback rules
        from app.services.qualification import get_qualified_participants_from_groups
        pool = get_qualified_participants_from_groups(
            group_rankings=group_rankings,
            qualification_plan=qualification_plan,
            group_stats=group_stats,
            tie_breaking_rules=tie_breaking_rules
        )
    else:
        # Legacy mode: simple division
        if first_round_size % gcount != 0:
            raise ValueError(f"first_round_size ({first_round_size}) must be divisible by group count ({gcount})")
        
        qualifiers_per_group = first_round_size // gcount
        
        # Collect all qualifiers
        for gid in group_list:
            pool.extend(group_rankings[gid][:qualifiers_per_group])
    
    # Build pool with metadata
    pool_items = []
    for pid in pool:
        meta = participant_meta.get(pid, {})
        pool_items.append({
            "id": pid,
            "group_id": meta.get("group_id"),
            "position": meta.get("position")
        })

    # Seeded ordering for advanced draw methods
    seeded_methods = {'overall_seeding', 'pot_system', 'bonus_draw_for_winners', 'predefined_bracket'}
    if draw_method in seeded_methods:
        seeded_order = _build_overall_seeding_pool(
            group_list=group_list,
            group_rankings=group_rankings,
            group_stats=group_stats,
            tie_breaking_rules=tie_breaking_rules
        )
        qualified_set = {item["id"] for item in pool_items}
        ordered_ids = [pid for pid in seeded_order if pid in qualified_set]
        remaining = [item["id"] for item in pool_items if item["id"] not in ordered_ids]
        ordered_ids.extend(remaining)
        meta_map = {item["id"]: item for item in pool_items}
        pool_items = [meta_map[pid] for pid in ordered_ids if pid in meta_map]
    elif draw_method != 'full_random':
        # Default to full random if draw_method unknown
        draw_method = 'full_random'

    # Shuffle for random draw
    if draw_method == 'full_random':
        if rng_seed is not None:
            random.seed(rng_seed)
        random.shuffle(pool_items)

    def violates(p1: Dict, p2: Dict) -> bool:
        if block_same_group and p1.get("group_id") and p2.get("group_id"):
            if p1["group_id"] == p2["group_id"]:
                return True
        if block_same_position and p1.get("position") and p2.get("position"):
            if p1["position"] == p2["position"]:
                return True
        return False
    
    # Create first round matches
    matches = []
    match_no = 1

    if draw_method in (None, 'full_random'):
        while pool_items:
            p1 = pool_items.pop(0)
            if not pool_items:
                p2 = None
            else:
                idx = next((i for i, candidate in enumerate(pool_items) if not violates(p1, candidate)), None)
                if idx is None:
                    p2 = pool_items.pop(0)
                else:
                    p2 = pool_items.pop(idx)
            matches.append({
                'round': 1,
                'match_no': match_no,
                'player1_id': p1["id"],
                'player2_id': p2["id"] if p2 else None
            })
            match_no += 1
    elif draw_method in ('overall_seeding', 'predefined_bracket'):
        # Pair best vs worst (seeded)
        left = 0
        right = len(pool_items) - 1
        while left <= right:
            p1 = pool_items[left]
            p2 = pool_items[right] if right != left else None
            matches.append({
                'round': 1,
                'match_no': match_no,
                'player1_id': p1["id"],
                'player2_id': p2["id"] if p2 else None
            })
            match_no += 1
            left += 1
            right -= 1
    elif draw_method == 'pot_system':
        pot_size = max(1, math.ceil(len(pool_items) / 2))
        pot1 = pool_items[:pot_size]
        pot2 = pool_items[pot_size:]
        if rng_seed is not None:
            random.seed(rng_seed)
        random.shuffle(pot1)
        random.shuffle(pot2)
        for i, p1 in enumerate(pot1):
            if i < len(pot2):
                if violates(p1, pot2[i]):
                    swap_idx = next((j for j in range(i + 1, len(pot2)) if not violates(p1, pot2[j])), None)
                    if swap_idx is not None:
                        pot2[i], pot2[swap_idx] = pot2[swap_idx], pot2[i]
                p2 = pot2[i]
            else:
                p2 = None
            matches.append({
                'round': 1,
                'match_no': match_no,
                'player1_id': p1["id"],
                'player2_id': p2["id"] if p2 else None
            })
            match_no += 1
        # Pair remaining pot2 entries among themselves
        remaining = pot2[len(pot1):] if len(pot2) > len(pot1) else []
        for i in range(0, len(remaining), 2):
            p1 = remaining[i]
            p2 = remaining[i + 1] if i + 1 < len(remaining) else None
            matches.append({
                'round': 1,
                'match_no': match_no,
                'player1_id': p1["id"],
                'player2_id': p2["id"] if p2 else None
            })
            match_no += 1
    elif draw_method == 'bonus_draw_for_winners':
        winners = [item for item in pool_items if item.get("position") == 1]
        others = [item for item in pool_items if item.get("position") != 1]
        if rng_seed is not None:
            random.seed(rng_seed)
        random.shuffle(winners)
        random.shuffle(others)

        used_winners = 0
        for winner in winners:
            if not others:
                break
            idx = next((i for i, candidate in enumerate(others) if not violates(winner, candidate)), None)
            opponent = others.pop(idx if idx is not None else 0)
            matches.append({
                'round': 1,
                'match_no': match_no,
                'player1_id': winner["id"],
                'player2_id': opponent["id"]
            })
            match_no += 1
            used_winners += 1

        remaining = winners[used_winners:] + others
        for i in range(0, len(remaining), 2):
            p1 = remaining[i]
            p2 = remaining[i + 1] if i + 1 < len(remaining) else None
            matches.append({
                'round': 1,
                'match_no': match_no,
                'player1_id': p1["id"],
                'player2_id': p2["id"] if p2 else None
            })
            match_no += 1
    
    # Add subsequent rounds
    rounds_total = _log2_int(first_round_size)
    for r in range(2, rounds_total + 1):
        mcount = max(1, first_round_size // (2 ** r))
        for m in range(1, mcount + 1):
            matches.append({'round': r, 'match_no': m, 'player1_id': None, 'player2_id': None})
    
    return matches


def generate_consolation_bracket_from_first_round_losers(
    first_round_matches: List[Dict],
    rng_seed: Optional[int] = None,
    draw_method: Optional[str] = None
) -> List[Dict]:
    """
    Generate consolation bracket structure from first round matches.
    Note: Participants are NOT assigned here - they will be assigned later
    when the losers of the first round are determined.
    
    Args:
        first_round_matches: List of first round matches from main bracket
        rng_seed: Optional random seed for reproducible draws (not used for now)
        
    Returns:
        List of consolation match dictionaries (with negative round numbers)
        All matches have player1_id and player2_id set to None initially.
    """
    # Count matches in first round - each match produces one loser (except bye matches)
    # IMPORTANT: The number of losers = number of matches in round 1
    # Example: 16 participants in round 1 = 8 matches = 8 losers (half go to consolation)
    # Even if some matches have byes, we still count all matches for bracket size calculation
    num_matches = len(first_round_matches)
    
    # Count actual losers (only from matches with both players, no byes)
    # This is used to determine how many players we can actually assign
    matches_with_both_players = []
    for match in first_round_matches:
        p1 = match.get('player1_id')
        p2 = match.get('player2_id')
        if p1 is not None and p2 is not None:
            matches_with_both_players.append(match)
    
    # The consolation bracket size should be based on the number of matches (potential losers)
    # This ensures the bracket structure matches the main tournament structure
    num_losers = num_matches
    
    if num_losers < 2:
        return []  # Not enough losers for consolation bracket
    
    # Calculate consolation bracket size (power of 2)
    # Choose next possible bracket size: 4, 8, 16, 32, 64, 128, etc.
    # Dynamic calculation: find the smallest power of 2 that fits all losers
    if num_losers <= 2:
        consolation_size = 4  # Minimum size is 4
    elif num_losers <= 4:
        consolation_size = 4
    elif num_losers <= 8:
        consolation_size = 8
    elif num_losers <= 16:
        consolation_size = 16
    elif num_losers <= 32:
        consolation_size = 32
    elif num_losers <= 64:
        consolation_size = 64
    elif num_losers <= 128:
        consolation_size = 128
    else:
        # For more than 128, calculate next power of 2
        consolation_size = 2 ** (_log2_int(num_losers) + 1)
    
    # Generate consolation matches (use negative round numbers: -1, -2, etc.)
    # First round will have participants assigned later (losers from first round)
    # But we prepare the structure with placeholders that will be filled
    consolation_matches = []
    
    # First consolation round - participants will be assigned when losers are determined
    # But we create the structure now
    # For 2 participants, we need 1 match (the final)
    # For 4 participants, we need 2 matches in first round, then 1 final
    # For 8 participants, we need 4 matches in first round, then 2, then 1 final
    num_first_round_matches = consolation_size // 2
    for match_no in range(1, num_first_round_matches + 1):
        consolation_matches.append({
            'round': -1, 
            'match_no': match_no, 
            'player1_id': None,  # Will be filled with loser from first round
            'player2_id': None   # Will be filled with loser from first round
        })
    
    # Subsequent consolation rounds - also all None (will be filled by winners of previous rounds)
    # Calculate total rounds needed (including final)
    rounds_total = _log2_int(consolation_size)
    
    # Special case: if consolation_size is 2, Round -1 is already the final (1 match)
    if consolation_size == 2:
        # Round -1 is the final, no additional rounds needed
        return consolation_matches
    
    # Create all rounds up to and including the final
    # For 4 participants: Round -1 (2 matches), Round -2 is the final (1 match)
    # For 8 participants: Round -1 (4 matches), Round -2 (2 matches), Round -3 is the final (1 match)
    # Always create rounds from 2 to rounds_total (inclusive) to ensure final exists
    for r in range(2, rounds_total + 1):
        mcount = max(1, consolation_size // (2 ** r))
        for m in range(1, mcount + 1):
            consolation_matches.append({
                'round': -r, 
                'match_no': m, 
                'player1_id': None, 
                'player2_id': None
            })
    
    # Verify structure is correct
    # The final round should be -rounds_total with exactly 1 match
    final_round = -rounds_total
    final_matches = [m for m in consolation_matches if m['round'] == final_round]
    
    # Ensure final always exists and has exactly 1 match
    if not final_matches or len(final_matches) != 1:
        # Remove any existing final matches with wrong count
        consolation_matches = [m for m in consolation_matches if m['round'] != final_round]
        # Add correct final match
        consolation_matches.append({
            'round': final_round,
            'match_no': 1,
            'player1_id': None,
            'player2_id': None
        })
    
    # Verify all rounds are present and have correct match counts
    expected_rounds = list(range(-rounds_total, 0))
    actual_rounds_dict = {}
    for m in consolation_matches:
        r = m['round']
        if r not in actual_rounds_dict:
            actual_rounds_dict[r] = []
        actual_rounds_dict[r].append(m['match_no'])
    
    # Ensure all expected rounds exist with correct match counts
    for r in expected_rounds:
        expected_count = max(1, consolation_size // (2 ** abs(r)))
        if r not in actual_rounds_dict:
            # Round is missing, create it
            for m in range(1, expected_count + 1):
                consolation_matches.append({
                    'round': r,
                    'match_no': m,
                    'player1_id': None,
                    'player2_id': None
                })
        else:
            # Round exists, verify match count
            actual_count = len(set(actual_rounds_dict[r]))
            if actual_count != expected_count:
                # Remove existing matches for this round
                consolation_matches = [m for m in consolation_matches if m['round'] != r]
                # Add correct number of matches
                for m in range(1, expected_count + 1):
                    consolation_matches.append({
                        'round': r,
                        'match_no': m,
                        'player1_id': None,
                        'player2_id': None
                    })
    
    return consolation_matches


def generate_ko_bracket_from_participants(
    participant_ids: List[int],
    draw_method: str = 'full_random',
    rng_seed: Optional[int] = None,
    ko_structure: Optional[str] = None
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
    
    # Choose next possible bracket size (4, 8, 16, 32, 64, 128, etc.)
    # Dynamic calculation: find the smallest power of 2 that fits all participants
    # Example: 39 participants -> 64 bracket (because 39 > 32)
    if num_participants <= 2:
        bracket_size = 4  # Minimum size is 4
    elif num_participants <= 4:
        bracket_size = 4
    elif num_participants <= 8:
        bracket_size = 8
    elif num_participants <= 16:
        bracket_size = 16
    elif num_participants <= 32:
        bracket_size = 32
    elif num_participants <= 64:
        bracket_size = 64
    elif num_participants <= 128:
        bracket_size = 128
    else:
        # For more than 128, use next power of 2
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
        
        # If one player has a bye, set automatic score 3:0
        score1 = None
        score2 = None
        if p1 is None and p2 is not None:
            # Player 2 has bye, automatically wins 3:0
            score1 = 0
            score2 = 3
        elif p2 is None and p1 is not None:
            # Player 1 has bye, automatically wins 3:0
            score1 = 3
            score2 = 0
        
        matches.append({
            'round': 1, 
            'match_no': match_no, 
            'player1_id': p1, 
            'player2_id': p2,
            'score1': score1,
            'score2': score2
        })
        match_no += 1
    
    # Add subsequent rounds
    rounds_total = _log2_int(bracket_size)
    for r in range(2, rounds_total + 1):
        mcount = max(1, bracket_size // (2 ** r))
        for m in range(1, mcount + 1):
            matches.append({'round': r, 'match_no': m, 'player1_id': None, 'player2_id': None})
    
    # Generate additional structures if needed
    if ko_structure == 'consolation_bracket':
        first_round_matches = [m for m in matches if m['round'] == 1]
        # Get draw method for consolation bracket
        consolation_draw_method = draw_method if draw_method in ('full_random', 'pot_system', 'overall_seeding') else 'full_random'
        consolation_matches = generate_consolation_bracket_from_first_round_losers(
            first_round_matches=first_round_matches,
            rng_seed=rng_seed,
            draw_method=consolation_draw_method
        )
        matches.extend(consolation_matches)
    elif ko_structure == 'double_elimination':
        # Double elimination: winners bracket + losers bracket
        double_elim_matches = generate_double_elimination_bracket(
            participant_ids=participant_ids,
            draw_method=draw_method,
            rng_seed=rng_seed
        )
        matches = double_elim_matches
    elif ko_structure == 'triple_elimination':
        # Triple elimination: three brackets (winners, losers, elimination)
        triple_elim_matches = generate_triple_elimination_bracket(
            participant_ids=participant_ids,
            draw_method=draw_method,
            rng_seed=rng_seed
        )
        matches = triple_elim_matches
    elif ko_structure == 'aggregate_ko':
        # Aggregate KO: each match is played twice (home/away)
        aggregate_matches = generate_aggregate_ko_bracket(
            participant_ids=participant_ids,
            draw_method=draw_method,
            rng_seed=rng_seed
        )
        matches = aggregate_matches
    
    return matches


def generate_double_elimination_bracket(
    participant_ids: List[int],
    draw_method: str = 'full_random',
    rng_seed: Optional[int] = None
) -> List[Dict]:
    """
    Generate double elimination bracket (winners bracket + losers bracket).
    
    In double elimination:
    - Winners bracket: Standard single elimination
    - Losers bracket: Players who lose in winners bracket drop down
    - Grand final: Winner of winners bracket vs winner of losers bracket
    - If losers bracket winner wins grand final, they play again (double elimination)
    
    Args:
        participant_ids: List of participant IDs
        draw_method: 'full_random', 'pot_system', or 'overall_seeding'
        rng_seed: Optional random seed
        
    Returns:
        List of match dictionaries with special round encoding:
        - Positive rounds: Winners bracket (1, 2, 3, ...)
        - Negative rounds -1000: Losers bracket (-1001, -1002, ...)
        - Round 2000: Grand final
        - Round 2001: Second grand final (if needed)
    """
    if not participant_ids or len(participant_ids) < 2:
        raise ValueError("Need at least 2 participants for double elimination")
    
    num_participants = len(participant_ids)
    
    # Choose next possible bracket size (4, 8, 16, 32, 64, etc.)
    # Example: 39 participants -> 64 bracket (because 39 > 32)
    if num_participants <= 2:
        bracket_size = 2
    elif num_participants <= 4:
        bracket_size = 4
    elif num_participants <= 8:
        bracket_size = 8
    elif num_participants <= 16:
        bracket_size = 16
    elif num_participants <= 32:
        bracket_size = 32
    elif num_participants <= 64:
        bracket_size = 64
    else:
        bracket_size = 2 ** (_log2_int(num_participants) + 1)
    
    num_byes = bracket_size - num_participants
    participants = participant_ids.copy()
    participants.extend([None] * num_byes)
    
    # Apply draw method
    if draw_method == 'full_random':
        if rng_seed is not None:
            random.seed(rng_seed)
        random.shuffle(participants)
    elif draw_method == 'pot_system':
        mid = len(participants) // 2
        first_half = participants[:mid]
        second_half = participants[mid:]
        if rng_seed is not None:
            random.seed(rng_seed)
        random.shuffle(first_half)
        random.shuffle(second_half)
        participants = first_half + second_half
    
    matches = []
    
    # Winners bracket (positive rounds: 1, 2, 3, ...)
    rounds_total = _log2_int(bracket_size)
    
    # First round of winners bracket
    match_no = 1
    for i in range(0, len(participants), 2):
        p1 = participants[i]
        p2 = participants[i + 1] if i + 1 < len(participants) else None
        
        # If one player has a bye, set automatic score 3:0
        score1 = None
        score2 = None
        if p1 is None and p2 is not None:
            # Player 2 has bye, automatically wins 3:0
            score1 = 0
            score2 = 3
        elif p2 is None and p1 is not None:
            # Player 1 has bye, automatically wins 3:0
            score1 = 3
            score2 = 0
        
        matches.append({
            'round': 1,
            'match_no': match_no,
            'player1_id': p1,
            'player2_id': p2,
            'bracket_type': 'winners',
            'score1': score1,
            'score2': score2
        })
        match_no += 1
    
    # Subsequent winners bracket rounds
    for r in range(2, rounds_total + 1):
        mcount = max(1, bracket_size // (2 ** r))
        for m in range(1, mcount + 1):
            matches.append({
                'round': r,
                'match_no': m,
                'player1_id': None,
                'player2_id': None,
                'bracket_type': 'winners'
            })
    
    # Losers bracket (negative rounds: -1001, -1002, ...)
    # Losers bracket has more rounds than winners bracket
    # First round of losers bracket receives losers from winners bracket round 1
    losers_round = -1001
    losers_match_no = 1
    
    # First losers bracket round: losers from winners bracket round 1
    num_first_winners_matches = bracket_size // 2
    num_first_losers_matches = num_first_winners_matches // 2
    for m in range(1, num_first_losers_matches + 1):
        matches.append({
            'round': losers_round,
            'match_no': losers_match_no,
            'player1_id': None,
            'player2_id': None,
            'bracket_type': 'losers'
        })
        losers_match_no += 1
    
    # Subsequent losers bracket rounds
    # Losers bracket structure is more complex - it receives:
    # - Losers from winners bracket (each round)
    # - Winners from previous losers bracket round
    losers_round -= 1
    current_losers_size = num_first_losers_matches
    
    for winners_round in range(2, rounds_total + 1):
        # Losers from this winners bracket round
        losers_from_winners = bracket_size // (2 ** winners_round)
        
        # Matches in losers bracket that receive these losers
        if current_losers_size > 0:
            # Winners from previous losers round play against losers from winners bracket
            num_losers_matches = max(1, current_losers_size // 2)
            for m in range(1, num_losers_matches + 1):
                matches.append({
                    'round': losers_round,
                    'match_no': losers_match_no,
                    'player1_id': None,
                    'player2_id': None,
                    'bracket_type': 'losers'
                })
                losers_match_no += 1
            current_losers_size = num_losers_matches
            losers_round -= 1
    
    # Grand final (round 2000)
    matches.append({
        'round': 2000,
        'match_no': 1,
        'player1_id': None,
        'player2_id': None,
        'bracket_type': 'grand_final'
    })
    
    # Second grand final if needed (round 2001)
    matches.append({
        'round': 2001,
        'match_no': 1,
        'player1_id': None,
        'player2_id': None,
        'bracket_type': 'grand_final_second'
    })
    
    return matches


def generate_triple_elimination_bracket(
    participant_ids: List[int],
    draw_method: str = 'full_random',
    rng_seed: Optional[int] = None
) -> List[Dict]:
    """
    Generate triple elimination bracket (three brackets).
    
    In triple elimination:
    - Winners bracket: Standard single elimination
    - Losers bracket 1: First loss bracket
    - Losers bracket 2: Second loss bracket
    - Grand final: Winner of winners bracket vs winner of losers bracket 2
    
    Args:
        participant_ids: List of participant IDs
        draw_method: 'full_random', 'pot_system', or 'overall_seeding'
        rng_seed: Optional random seed
        
    Returns:
        List of match dictionaries with special round encoding:
        - Positive rounds: Winners bracket (1, 2, 3, ...)
        - Negative rounds -2000: First losers bracket (-2001, -2002, ...)
        - Negative rounds -3000: Second losers bracket (-3001, -3002, ...)
        - Round 4000: Grand final
    """
    if not participant_ids or len(participant_ids) < 2:
        raise ValueError("Need at least 2 participants for triple elimination")
    
    num_participants = len(participant_ids)
    
    # Choose next possible bracket size (4, 8, 16, 32, 64, etc.)
    # Example: 39 participants -> 64 bracket (because 39 > 32)
    if num_participants <= 2:
        bracket_size = 2
    elif num_participants <= 4:
        bracket_size = 4
    elif num_participants <= 8:
        bracket_size = 8
    elif num_participants <= 16:
        bracket_size = 16
    elif num_participants <= 32:
        bracket_size = 32
    elif num_participants <= 64:
        bracket_size = 64
    else:
        bracket_size = 2 ** (_log2_int(num_participants) + 1)
    
    num_byes = bracket_size - num_participants
    participants = participant_ids.copy()
    participants.extend([None] * num_byes)
    
    # Apply draw method
    if draw_method == 'full_random':
        if rng_seed is not None:
            random.seed(rng_seed)
        random.shuffle(participants)
    elif draw_method == 'pot_system':
        mid = len(participants) // 2
        first_half = participants[:mid]
        second_half = participants[mid:]
        if rng_seed is not None:
            random.seed(rng_seed)
        random.shuffle(first_half)
        random.shuffle(second_half)
        participants = first_half + second_half
    
    matches = []
    
    # Winners bracket (positive rounds: 1, 2, 3, ...)
    rounds_total = _log2_int(bracket_size)
    
    # First round of winners bracket
    match_no = 1
    for i in range(0, len(participants), 2):
        p1 = participants[i]
        p2 = participants[i + 1] if i + 1 < len(participants) else None
        
        # If one player has a bye, set automatic score 3:0
        score1 = None
        score2 = None
        if p1 is None and p2 is not None:
            # Player 2 has bye, automatically wins 3:0
            score1 = 0
            score2 = 3
        elif p2 is None and p1 is not None:
            # Player 1 has bye, automatically wins 3:0
            score1 = 3
            score2 = 0
        
        matches.append({
            'round': 1,
            'match_no': match_no,
            'player1_id': p1,
            'player2_id': p2,
            'bracket_type': 'winners',
            'score1': score1,
            'score2': score2
        })
        match_no += 1
    
    # Subsequent winners bracket rounds
    for r in range(2, rounds_total + 1):
        mcount = max(1, bracket_size // (2 ** r))
        for m in range(1, mcount + 1):
            matches.append({
                'round': r,
                'match_no': m,
                'player1_id': None,
                'player2_id': None,
                'bracket_type': 'winners'
            })
    
    # First losers bracket (negative rounds: -2001, -2002, ...)
    # Receives losers from winners bracket
    losers1_round = -2001
    losers1_match_no = 1
    num_first_winners_matches = bracket_size // 2
    num_first_losers1_matches = num_first_winners_matches // 2
    
    for m in range(1, num_first_losers1_matches + 1):
        matches.append({
            'round': losers1_round,
            'match_no': losers1_match_no,
            'player1_id': None,
            'player2_id': None,
            'bracket_type': 'losers1'
        })
        losers1_match_no += 1
    
    # Subsequent first losers bracket rounds
    losers1_round -= 1
    current_losers1_size = num_first_losers1_matches
    
    for winners_round in range(2, rounds_total + 1):
        if current_losers1_size > 0:
            num_losers1_matches = max(1, current_losers1_size // 2)
            for m in range(1, num_losers1_matches + 1):
                matches.append({
                    'round': losers1_round,
                    'match_no': losers1_match_no,
                    'player1_id': None,
                    'player2_id': None,
                    'bracket_type': 'losers1'
                })
                losers1_match_no += 1
            current_losers1_size = num_losers1_matches
            losers1_round -= 1
    
    # Second losers bracket (negative rounds: -3001, -3002, ...)
    # Receives losers from first losers bracket
    losers2_round = -3001
    losers2_match_no = 1
    num_first_losers2_matches = max(1, num_first_losers1_matches // 2)
    
    for m in range(1, num_first_losers2_matches + 1):
        matches.append({
            'round': losers2_round,
            'match_no': losers2_match_no,
            'player1_id': None,
            'player2_id': None,
            'bracket_type': 'losers2'
        })
        losers2_match_no += 1
    
    # Subsequent second losers bracket rounds
    losers2_round -= 1
    current_losers2_size = num_first_losers2_matches
    
    for _ in range(2, rounds_total):
        if current_losers2_size > 0:
            num_losers2_matches = max(1, current_losers2_size // 2)
            for m in range(1, num_losers2_matches + 1):
                matches.append({
                    'round': losers2_round,
                    'match_no': losers2_match_no,
                    'player1_id': None,
                    'player2_id': None,
                    'bracket_type': 'losers2'
                })
                losers2_match_no += 1
            current_losers2_size = num_losers2_matches
            losers2_round -= 1
    
    # Grand final (round 4000)
    matches.append({
        'round': 4000,
        'match_no': 1,
        'player1_id': None,
        'player2_id': None,
        'bracket_type': 'grand_final'
    })
    
    return matches


def generate_aggregate_ko_bracket(
    participant_ids: List[int],
    draw_method: str = 'full_random',
    rng_seed: Optional[int] = None
) -> List[Dict]:
    """
    Generate aggregate KO bracket (each match played twice: home/away).
    
    In aggregate KO:
    - Each pairing is played twice (home and away)
    - Winner determined by aggregate score
    - If tied, away goals rule applies, then extra time/penalties
    
    Args:
        participant_ids: List of participant IDs
        draw_method: 'full_random', 'pot_system', or 'overall_seeding'
        rng_seed: Optional random seed
        
    Returns:
        List of match dictionaries with special round encoding:
        - Round 1: First leg matches
        - Round 2: Second leg matches (same match_no as first leg)
        - Subsequent rounds follow same pattern
    """
    if not participant_ids or len(participant_ids) < 2:
        raise ValueError("Need at least 2 participants for aggregate KO")
    
    num_participants = len(participant_ids)
    
    # Choose next possible bracket size (4, 8, 16, 32, 64, etc.)
    # Example: 39 participants -> 64 bracket (because 39 > 32)
    if num_participants <= 2:
        bracket_size = 2
    elif num_participants <= 4:
        bracket_size = 4
    elif num_participants <= 8:
        bracket_size = 8
    elif num_participants <= 16:
        bracket_size = 16
    elif num_participants <= 32:
        bracket_size = 32
    elif num_participants <= 64:
        bracket_size = 64
    else:
        bracket_size = 2 ** (_log2_int(num_participants) + 1)
    
    num_byes = bracket_size - num_participants
    participants = participant_ids.copy()
    participants.extend([None] * num_byes)
    
    # Apply draw method
    if draw_method == 'full_random':
        if rng_seed is not None:
            random.seed(rng_seed)
        random.shuffle(participants)
    elif draw_method == 'pot_system':
        mid = len(participants) // 2
        first_half = participants[:mid]
        second_half = participants[mid:]
        if rng_seed is not None:
            random.seed(rng_seed)
        random.shuffle(first_half)
        random.shuffle(second_half)
        participants = first_half + second_half
    
    matches = []
    rounds_total = _log2_int(bracket_size)
    
    # Generate matches for each round (each round has two legs)
    for r in range(1, rounds_total + 1):
        if r == 1:
            # First round: create first leg matches
            match_no = 1
            for i in range(0, len(participants), 2):
                p1 = participants[i]
                p2 = participants[i + 1] if i + 1 < len(participants) else None
                
                # If one player has a bye, set automatic score 3:0 for both legs
                score1_leg1 = None
                score2_leg1 = None
                score1_leg2 = None
                score2_leg2 = None
                if p1 is None and p2 is not None:
                    # Player 2 has bye, automatically wins 3:0 in both legs
                    score1_leg1 = 0
                    score2_leg1 = 3
                    score1_leg2 = 3  # Swapped for leg 2
                    score2_leg2 = 0
                elif p2 is None and p1 is not None:
                    # Player 1 has bye, automatically wins 3:0 in both legs
                    score1_leg1 = 3
                    score2_leg1 = 0
                    score1_leg2 = 0  # Swapped for leg 2
                    score2_leg2 = 3
                
                # First leg
                matches.append({
                    'round': r,
                    'match_no': match_no,
                    'player1_id': p1,
                    'player2_id': p2,
                    'leg': 1,
                    'bracket_type': 'aggregate',
                    'score1': score1_leg1,
                    'score2': score2_leg1
                })
                # Second leg (same match_no, different leg)
                matches.append({
                    'round': r,
                    'match_no': match_no,
                    'player1_id': p2,  # Home/away swapped
                    'player2_id': p1,
                    'leg': 2,
                    'bracket_type': 'aggregate',
                    'score1': score1_leg2,
                    'score2': score2_leg2
                })
                match_no += 1
        else:
            # Subsequent rounds: create both legs (players will be assigned later)
            mcount = max(1, bracket_size // (2 ** r))
            for m in range(1, mcount + 1):
                # First leg
                matches.append({
                    'round': r,
                    'match_no': m,
                    'player1_id': None,
                    'player2_id': None,
                    'leg': 1,
                    'bracket_type': 'aggregate'
                })
                # Second leg
                matches.append({
                    'round': r,
                    'match_no': m,
                    'player1_id': None,
                    'player2_id': None,
                    'leg': 2,
                    'bracket_type': 'aggregate'
                })
    
    return matches
