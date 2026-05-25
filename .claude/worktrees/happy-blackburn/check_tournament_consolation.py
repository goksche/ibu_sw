#!/usr/bin/env python3
"""Check specific tournament consolation bracket"""
import sys
sys.path.insert(0, '/app')

from app.core.database import SessionLocal
from app.models.match import KnockoutMatch
from app.models.tournament import Tournament

db = SessionLocal()

# Find tournament by name
tournament_name = "Test 25012110"
tournament = db.query(Tournament).filter(Tournament.name == tournament_name).first()

if not tournament:
    print(f"Tournament '{tournament_name}' not found")
    db.close()
    exit(1)

print(f"=== Tournament: {tournament.name} (ID: {tournament.id}) ===")
print(f"KO Structure: {tournament.ko_structure.value if tournament.ko_structure else None}")

# Check round 1 matches
round1_matches = db.query(KnockoutMatch).filter(
    KnockoutMatch.tournament_id == tournament.id,
    KnockoutMatch.round == 1
).order_by(KnockoutMatch.match_no).all()

print(f"\nRound 1 matches: {len(round1_matches)}")
losers = []
for m in round1_matches:
    has_bye = m.player1_id is None or m.player2_id is None
    completed = m.score1 is not None and m.score2 is not None
    if not has_bye and completed:
        loser = m.player2_id if m.score1 > m.score2 else m.player1_id
        losers.append(loser)
    print(f"  Match {m.match_no}: p1={m.player1_id}, p2={m.player2_id}, s1={m.score1}, s2={m.score2}, bye={has_bye}, completed={completed}")

print(f"\nLosers from round 1: {len(losers)}")
print(f"Loser IDs: {losers}")

# Check consolation matches
consolation_matches = db.query(KnockoutMatch).filter(
    KnockoutMatch.tournament_id == tournament.id,
    KnockoutMatch.round < 0
).order_by(KnockoutMatch.round, KnockoutMatch.match_no).all()

print(f"\nConsolation matches: {len(consolation_matches)}")

rounds = {}
for m in consolation_matches:
    if m.round not in rounds:
        rounds[m.round] = []
    rounds[m.round].append((m.match_no, m.player1_id, m.player2_id))

print(f"\nConsolation rounds:")
for r in sorted(rounds.keys()):
    print(f"  Round {r}: {len(rounds[r])} matches")
    for match_no, p1, p2 in rounds[r][:3]:
        print(f"    Match {match_no}: p1={p1}, p2={p2}")

# Check final
if rounds:
    last_round = min(rounds.keys())
    print(f"\nFinal round: {last_round} with {len(rounds[last_round])} match(es)")

db.close()
