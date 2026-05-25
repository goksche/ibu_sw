#!/usr/bin/env python3
"""Check match creation logic"""
import sys
sys.path.insert(0, '/app')

from app.services.ko_bracket import generate_consolation_bracket_from_first_round_losers

# Simulate 4 losers (like tournament 7)
first_round_matches = [
    {'player1_id': 1, 'player2_id': 2},  # Will have loser
    {'player1_id': 3, 'player2_id': 4},  # Will have loser
    {'player1_id': 5, 'player2_id': 6},  # Will have loser
    {'player1_id': 7, 'player2_id': 8},  # Will have loser
]

consolation_matches = generate_consolation_bracket_from_first_round_losers(
    first_round_matches=first_round_matches,
    rng_seed=None,
    draw_method=None
)

print(f"Generated {len(consolation_matches)} consolation matches")

# Check for duplicates
seen = set()
duplicates = []
for m in consolation_matches:
    key = (m['round'], m['match_no'])
    if key in seen:
        duplicates.append(key)
    seen.add(key)

if duplicates:
    print(f"\n⚠️  Found {len(duplicates)} duplicate (round, match_no) pairs:")
    for r, m in duplicates:
        print(f"  Round {r}, Match {m}")
else:
    print("\n✓ No duplicates in generated matches")

# Group by round
rounds = {}
for m in consolation_matches:
    r = m['round']
    if r not in rounds:
        rounds[r] = []
    rounds[r].append(m['match_no'])

print(f"\nRounds in generated matches:")
for r in sorted(rounds.keys()):
    print(f"  Round {r}: {len(rounds[r])} matches, match_nos: {sorted(set(rounds[r]))}")
