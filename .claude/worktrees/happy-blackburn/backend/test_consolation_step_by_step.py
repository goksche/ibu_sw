#!/usr/bin/env python3
"""Step-by-step test of consolation bracket generation"""
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

# Simulate the logic step by step
num_losers = 4
consolation_size = 8
rounds_total = _log2_int(consolation_size)
num_first_round_matches = consolation_size // 2

print(f"Step-by-step calculation:")
print(f"  num_losers = {num_losers}")
print(f"  consolation_size = {consolation_size}")
print(f"  rounds_total = {rounds_total}")
print(f"  num_first_round_matches = {consolation_size} // 2 = {num_first_round_matches}")
print(f"\nFirst round (Round -1):")
print(f"  Should create matches: range(1, {num_first_round_matches + 1}) = {list(range(1, num_first_round_matches + 1))}")
print(f"\nSubsequent rounds:")
for r in range(2, rounds_total + 1):
    mcount = max(1, consolation_size // (2 ** r))
    print(f"  Round -{r}: mcount = max(1, {consolation_size} // {2**r}) = {mcount}, matches: {list(range(1, mcount + 1))}")

print(f"\n" + "="*50)
print(f"Actual generation:")
consolation_matches = generate_consolation_bracket_from_first_round_losers(
    first_round_matches=first_round_matches,
    rng_seed=None,
    draw_method=None
)

print(f"Total matches generated: {len(consolation_matches)}")
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
