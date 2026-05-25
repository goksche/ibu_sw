#!/usr/bin/env python3
"""Test consolation bracket final generation"""
import sys
sys.path.insert(0, '/app')

from app.services.ko_bracket import generate_consolation_bracket_from_first_round_losers
import math

def _log2_int(x: int) -> int:
    """Calculate log2 and round to integer"""
    return int(round(math.log2(x))) if x > 0 else 0

# Test with 8 losers (4 matches)
first_round_matches = [
    {'player1_id': 1, 'player2_id': 2},
    {'player1_id': 3, 'player2_id': 4},
    {'player1_id': 5, 'player2_id': 6},
    {'player1_id': 7, 'player2_id': 8},
]

consolation_matches = generate_consolation_bracket_from_first_round_losers(
    first_round_matches=first_round_matches,
    rng_seed=None,
    draw_method=None
)

print(f"Generated {len(consolation_matches)} consolation matches")

# Group by round
rounds = {}
for m in consolation_matches:
    r = m['round']
    if r not in rounds:
        rounds[r] = []
    rounds[r].append(m['match_no'])

print(f"\nRounds in generated matches:")
for r in sorted(rounds.keys()):
    unique_match_nos = sorted(set(rounds[r]))
    print(f"  Round {r}: {len(rounds[r])} matches, match_nos: {unique_match_nos}")

# Check if final exists
if rounds:
    last_round = min(rounds.keys())  # Most negative round is the final
    final_matches = [m for m in consolation_matches if m['round'] == last_round]
    print(f"\nFinal round: {last_round} with {len(final_matches)} match(es)")
    
    if len(final_matches) != 1:
        print(f"  ⚠️  PROBLEM: Final should have 1 match, but has {len(final_matches)}")
    else:
        print(f"  ✓ Final exists: Match {final_matches[0]['match_no']}")
        
    # Check rounds_total calculation
    consolation_size = 8
    rounds_total = _log2_int(consolation_size)
    print(f"\nDebug: consolation_size={consolation_size}, rounds_total={rounds_total}")
    print(f"  Expected rounds: -1, -2, -3 (for 8 participants)")
    print(f"  Actual rounds: {sorted(rounds.keys())}")
