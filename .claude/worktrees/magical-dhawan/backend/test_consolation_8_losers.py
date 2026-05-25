#!/usr/bin/env python3
"""Test with 8 losers"""
import sys
sys.path.insert(0, '/app')

from app.services.ko_bracket import generate_consolation_bracket_from_first_round_losers

# Test with 8 losers (8 matches)
first_round_matches = [
    {'player1_id': 1, 'player2_id': 2},
    {'player1_id': 3, 'player2_id': 4},
    {'player1_id': 5, 'player2_id': 6},
    {'player1_id': 7, 'player2_id': 8},
    {'player1_id': 9, 'player2_id': 10},
    {'player1_id': 11, 'player2_id': 12},
    {'player1_id': 13, 'player2_id': 14},
    {'player1_id': 15, 'player2_id': 16},
]

print("Input: 8 matches with both players")
print("Expected: 8 losers -> consolation_size = 8")
print("  Round -1: 4 matches")
print("  Round -2: 2 matches (semi-final)")
print("  Round -3: 1 match (final)")
print()

consolation_matches = generate_consolation_bracket_from_first_round_losers(
    first_round_matches=first_round_matches,
    rng_seed=None,
    draw_method=None
)

print(f"Generated {len(consolation_matches)} matches:")

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
