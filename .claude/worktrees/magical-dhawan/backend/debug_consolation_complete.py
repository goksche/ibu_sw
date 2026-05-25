#!/usr/bin/env python3
"""Complete debug of consolation bracket"""
import sys
sys.path.insert(0, '/app')

from app.core.database import SessionLocal
from app.models.match import KnockoutMatch
from app.models.tournament import Tournament

db = SessionLocal()

tournament_id = 7

# Get tournament
tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
print(f"=== TOURNAMENT INFO ===")
print(f"ID: {tournament.id}")
print(f"Name: {tournament.name}")
print(f"KO Structure: {tournament.ko_structure}")
print()

# Get ALL first round matches
r1_all = db.query(KnockoutMatch).filter(
    KnockoutMatch.tournament_id == tournament_id,
    KnockoutMatch.round == 1
).order_by(KnockoutMatch.match_no).all()

print(f"=== ROUND 1 MATCHES (ALL) ===")
print(f"Total: {len(r1_all)} matches")
print()

matches_with_both = []
matches_with_bye = []

for m in r1_all:
    has_both = m.player1_id is not None and m.player2_id is not None
    has_bye = m.player1_id is None or m.player2_id is None
    
    print(f"Match {m.match_no}: p1={m.player1_id}, p2={m.player2_id}, score={m.score1}:{m.score2}")
    
    if has_both:
        matches_with_both.append(m)
    if has_bye:
        matches_with_bye.append(m)

print()
print(f"Matches with BOTH players: {len(matches_with_both)}")
print(f"Matches with BYE: {len(matches_with_bye)}")
print(f"Expected losers: {len(matches_with_both)}")
print()

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
    import math
    consolation_size = 2 ** (int(math.log2(num_losers)) + 1)

print(f"Expected consolation_size: {consolation_size}")
print()

# Get ALL consolation matches
cons_all = db.query(KnockoutMatch).filter(
    KnockoutMatch.tournament_id == tournament_id,
    KnockoutMatch.round < 0
).order_by(KnockoutMatch.round, KnockoutMatch.match_no).all()

print(f"=== CONSOLATION MATCHES IN DB ===")
print(f"Total: {len(cons_all)} matches")
print()

rounds = {}
for m in cons_all:
    r = m.round
    if r not in rounds:
        rounds[r] = []
    rounds[r].append({
        'match_no': m.match_no,
        'p1': m.player1_id,
        'p2': m.player2_id,
        'score1': m.score1,
        'score2': m.score2
    })

for r in sorted(rounds.keys()):
    matches_in_round = rounds[r]
    print(f"Round {r}: {len(matches_in_round)} matches")
    for match in sorted(matches_in_round, key=lambda x: x['match_no']):
        print(f"  Match {match['match_no']}: p1={match['p1']}, p2={match['p2']}, score={match['score1']}:{match['score2']}")

print()

# Expected structure
import math
def _log2_int(x: int) -> int:
    return int(round(math.log2(x))) if x > 0 else 0

rounds_total = _log2_int(consolation_size)
print(f"=== EXPECTED STRUCTURE ===")
print(f"For {consolation_size} participants:")
print(f"  Round -1: {consolation_size // 2} matches")
for r in range(2, rounds_total + 1):
    mcount = max(1, consolation_size // (2 ** r))
    print(f"  Round -{r}: {mcount} matches")
print(f"  Total rounds: {rounds_total}")
print()

# Check if structure matches
expected_rounds = list(range(-rounds_total, 0))
actual_rounds = sorted(rounds.keys())
print(f"Expected rounds: {expected_rounds}")
print(f"Actual rounds: {actual_rounds}")

if expected_rounds != actual_rounds:
    print(f"❌ PROBLEM: Rounds don't match!")
    missing = set(expected_rounds) - set(actual_rounds)
    extra = set(actual_rounds) - set(expected_rounds)
    if missing:
        print(f"  Missing rounds: {sorted(missing)}")
    if extra:
        print(f"  Extra rounds: {sorted(extra)}")
else:
    print(f"✓ Rounds match")

# Check match counts per round
print()
print(f"=== MATCH COUNT CHECK ===")
for r in expected_rounds:
    expected_count = max(1, consolation_size // (2 ** abs(r)))
    actual_count = len(rounds.get(r, []))
    status = "✓" if expected_count == actual_count else "❌"
    print(f"{status} Round {r}: Expected {expected_count}, Got {actual_count}")

db.close()
