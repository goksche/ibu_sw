#!/usr/bin/env python3
"""Check how many losers there are"""
import sys
sys.path.insert(0, '/app')

from app.core.database import SessionLocal
from app.models.match import KnockoutMatch

db = SessionLocal()

tournament_id = 7

# Get first round matches
first_round_matches = db.query(KnockoutMatch).filter(
    KnockoutMatch.tournament_id == tournament_id,
    KnockoutMatch.round == 1
).all()

print(f"Tournament {tournament_id} - First round matches:")
matches_with_both = 0
for m in first_round_matches:
    if m.player1_id is not None and m.player2_id is not None:
        matches_with_both += 1
        print(f"  Match {m.match_no}: p1={m.player1_id}, p2={m.player2_id}, score={m.score1}:{m.score2}")

print(f"\nMatches with both players: {matches_with_both}")
print(f"Expected losers: {matches_with_both}")
print(f"Expected consolation_size: {4 if matches_with_both <= 4 else 8}")

# Check consolation matches
consolation_matches = db.query(KnockoutMatch).filter(
    KnockoutMatch.tournament_id == tournament_id,
    KnockoutMatch.round < 0
).all()

print(f"\nConsolation matches in database: {len(consolation_matches)}")

rounds = {}
for m in consolation_matches:
    r = m.round
    if r not in rounds:
        rounds[r] = []
    rounds[r].append(m.match_no)

print(f"\nConsolation rounds:")
for r in sorted(rounds.keys()):
    print(f"  Round {r}: {len(rounds[r])} matches")

db.close()
