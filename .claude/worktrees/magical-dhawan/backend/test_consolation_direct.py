#!/usr/bin/env python3
"""Direct test of consolation bracket generation"""
import sys
sys.path.insert(0, '/app')

from app.services.ko_bracket import generate_consolation_bracket_from_first_round_losers
import math

def _log2_int(x: int) -> int:
    return int(round(math.log2(x))) if x > 0 else 0

# Test with 4 losers (should create consolation_size = 4, but user wants 8)
first_round_matches = [
    {'player1_id': 1, 'player2_id': 2},
    {'player1_id': 3, 'player2_id': 4},
    {'player1_id': 5, 'player2_id': 6},
    {'player1_id': 7, 'player2_id': 8},
]

print("Input: 4 matches with both players")
print("Expected: 4 losers -> consolation_size = 4")
print("  Round -1: 2 matches")
print("  Round -2: 1 match (final)")
print()

consolation_matches = generate_consolation_bracket_from_first_round_losers(
    first_round_matches=first_round_matches,
    rng_seed=None,
    draw_method=None
)

print(f"Generated {len(consolation_matches)} matches:")
for m in consolation_matches:
    print(f"  Round {m['round']}, Match {m['match_no']}")

rounds = {}
for m in consolation_matches:
    r = m['round']
    if r not in rounds:
        rounds[r] = []
    rounds[r].append(m['match_no'])

print(f"\nGrouped by round:")
for r in sorted(rounds.keys()):
    print(f"  Round {r}: {len(rounds[r])} matches, match_nos: {sorted(set(rounds[r]))}")

# Check final
if rounds:
    last_round = min(rounds.keys())
    print(f"\nFinal round: {last_round}")
    if len(rounds[last_round]) == 1:
        print("  ✓ Final exists")
    else:
        print(f"  ✗ Final should have 1 match, but has {len(rounds[last_round])}")
