#!/usr/bin/env python3
"""Check consolation bracket in database"""
import sys
sys.path.insert(0, '/app')

from app.core.database import SessionLocal
from app.models.match import KnockoutMatch

db = SessionLocal()

# Check tournament 7 (or find the right tournament)
tournament_id = 7

matches = db.query(KnockoutMatch).filter(
    KnockoutMatch.tournament_id == tournament_id,
    KnockoutMatch.round < 0
).order_by(KnockoutMatch.round, KnockoutMatch.match_no).all()

print(f"Tournament {tournament_id} - Consolation matches:")
print(f"Total: {len(matches)} matches\n")

rounds = {}
for m in matches:
    r = m.round
    if r not in rounds:
        rounds[r] = []
    rounds[r].append(m.match_no)

for r in sorted(rounds.keys()):
    unique_match_nos = sorted(set(rounds[r]))
    print(f"Round {r}: {len(rounds[r])} matches, match_nos: {unique_match_nos}")

if rounds:
    last_round = min(rounds.keys())
    print(f"\nFinal round: {last_round}")
    final_matches = [m for m in matches if m.round == last_round]
    print(f"  {len(final_matches)} match(es)")
    if len(final_matches) == 1:
        print("  ✓ Final exists")
    else:
        print(f"  ✗ PROBLEM: Final should have 1 match, but has {len(final_matches)}")

db.close()
