#!/usr/bin/env python3
"""Test bracket generation"""
import sys
sys.path.insert(0, '/app')

from app.services.ko_bracket import generate_consolation_bracket_from_first_round_losers

# Simulate 4 losers
first_round_matches = [
    {'player1_id': 1, 'player2_id': 2},  # Loser will be 2
    {'player1_id': 3, 'player2_id': 4},  # Loser will be 4
    {'player1_id': 5, 'player2_id': 6},  # Loser will be 6
    {'player1_id': 7, 'player2_id': 8},  # Loser will be 8
]

consolation_matches = generate_consolation_bracket_from_first_round_losers(
    first_round_matches=first_round_matches,
    rng_seed=None,
    draw_method=None
)

print(f"Generated {len(consolation_matches)} consolation matches")

rounds = {}
for m in consolation_matches:
    r = m['round']
    if r not in rounds:
        rounds[r] = []
    rounds[r].append((m['match_no'], m['player1_id'], m['player2_id']))

print(f"\nRounds:")
for r in sorted(rounds.keys()):
    print(f"  Round {r}: {len(rounds[r])} matches")
    for match_no, p1, p2 in rounds[r]:
        print(f"    Match {match_no}: p1={p1}, p2={p2}")

# Check final
if rounds:
    last_round = min(rounds.keys())
    print(f"\nFinal round: {last_round} with {len(rounds[last_round])} match(es)")
