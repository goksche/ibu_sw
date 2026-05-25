#!/usr/bin/env python3
"""Analyze consolation bracket structure"""
import sys
sys.path.insert(0, '/app')

from app.core.database import SessionLocal
from app.models.match import KnockoutMatch
from app.models.tournament import Tournament

db = SessionLocal()

tournament_id = 7

# Get tournament
tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
print(f"Tournament: {tournament.name}")
print(f"KO Structure: {tournament.ko_structure}")

# Get first round matches
r1 = db.query(KnockoutMatch).filter(
    KnockoutMatch.tournament_id == tournament_id,
    KnockoutMatch.round == 1
).order_by(KnockoutMatch.match_no).all()

print(f"\nRound 1 matches: {len(r1)}")
matches_with_both = []
for m in r1:
    if m.player1_id and m.player2_id:
        matches_with_both.append(m)
        print(f"  Match {m.match_no}: p1={m.player1_id}, p2={m.player2_id}")

print(f"\nMatches with both players: {len(matches_with_both)}")
print(f"Expected losers: {len(matches_with_both)}")

# Calculate expected consolation size
num_losers = len(matches_with_both)
if num_losers <= 2:
    consolation_size = 2
elif num_losers <= 4:
    consolation_size = 4
elif num_losers <= 8:
    consolation_size = 8
elif num_losers <= 16:
    consolation_size = 16
else:
    consolation_size = 2 ** (int(__import__('math').log2(num_losers)) + 1)

print(f"Expected consolation_size: {consolation_size}")

# Get consolation matches
cons = db.query(KnockoutMatch).filter(
    KnockoutMatch.tournament_id == tournament_id,
    KnockoutMatch.round < 0
).order_by(KnockoutMatch.round, KnockoutMatch.match_no).all()

print(f"\nConsolation matches in DB: {len(cons)}")

rounds = {}
for m in cons:
    r = m.round
    if r not in rounds:
        rounds[r] = []
    rounds[r].append((m.match_no, m.player1_id, m.player2_id))

print(f"\nConsolation rounds in DB:")
for r in sorted(rounds.keys()):
    matches_in_round = rounds[r]
    unique_match_nos = sorted(set([m[0] for m in matches_in_round]))
    print(f"  Round {r}: {len(matches_in_round)} matches, match_nos: {unique_match_nos}")
    for match_no, p1, p2 in sorted(matches_in_round, key=lambda x: x[0]):
        print(f"    Match {match_no}: p1={p1}, p2={p2}")

# Expected structure
import math
def _log2_int(x: int) -> int:
    return int(round(math.log2(x))) if x > 0 else 0

rounds_total = _log2_int(consolation_size)
print(f"\nExpected structure for {consolation_size} participants:")
print(f"  Round -1: {consolation_size // 2} matches")
for r in range(2, rounds_total + 1):
    mcount = max(1, consolation_size // (2 ** r))
    print(f"  Round -{r}: {mcount} matches")
print(f"  Total rounds: {rounds_total}")

db.close()
