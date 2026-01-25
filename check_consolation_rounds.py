#!/usr/bin/env python3
"""Check consolation bracket rounds"""
import sys
sys.path.insert(0, '/app')

from app.core.database import SessionLocal
from app.models.match import KnockoutMatch

db = SessionLocal()

# Check tournament 4
tournament_id = 4
matches = db.query(KnockoutMatch).filter(
    KnockoutMatch.tournament_id == tournament_id,
    KnockoutMatch.round < 0
).order_by(KnockoutMatch.round, KnockoutMatch.match_no).all()

rounds = {}
for m in matches:
    if m.round not in rounds:
        rounds[m.round] = []
    rounds[m.round].append(m.match_no)

print(f"Consolation bracket for tournament {tournament_id}:")
print(f"Total matches: {len(matches)}")
print(f"\nRounds:")
for r in sorted(rounds.keys()):
    print(f"  Round {r}: {len(rounds[r])} matches (match_nos: {sorted(rounds[r])})")

# Check if there's a final (should be 1 match in the last round)
if rounds:
    last_round = min(rounds.keys())  # Most negative = final
    print(f"\nFinal round: {last_round} with {len(rounds[last_round])} match(es)")

db.close()
