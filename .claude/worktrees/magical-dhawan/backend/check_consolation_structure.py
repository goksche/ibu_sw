#!/usr/bin/env python3
"""Check consolation bracket structure"""
import sys
sys.path.insert(0, '/app')

from app.core.database import SessionLocal
from app.models.match import KnockoutMatch

db = SessionLocal()

tournament_id = 7

# Get first round matches
r1 = db.query(KnockoutMatch).filter(
    KnockoutMatch.tournament_id == tournament_id,
    KnockoutMatch.round == 1
).all()

matches_with_both = [m for m in r1 if m.player1_id and m.player2_id]
print(f"Round 1 matches: {len(r1)}")
print(f"Matches with both players: {len(matches_with_both)}")
print(f"Expected losers: {len(matches_with_both)}")

# Get consolation matches
cons = db.query(KnockoutMatch).filter(
    KnockoutMatch.tournament_id == tournament_id,
    KnockoutMatch.round < 0
).order_by(KnockoutMatch.round, KnockoutMatch.match_no).all()

print(f"\nConsolation matches: {len(cons)}")

rounds = {}
for m in cons:
    r = m.round
    if r not in rounds:
        rounds[r] = []
    rounds[r].append(m.match_no)

print(f"\nConsolation rounds:")
for r in sorted(rounds.keys()):
    unique_match_nos = sorted(set(rounds[r]))
    print(f"  Round {r}: {len(rounds[r])} matches, match_nos: {unique_match_nos}")

if rounds:
    last_round = min(rounds.keys())
    print(f"\nFinal round: {last_round} with {len(rounds[last_round])} match(es)")

db.close()
