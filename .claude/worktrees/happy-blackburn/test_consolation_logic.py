#!/usr/bin/env python3
"""Test consolation bracket logic"""
import sys
sys.path.insert(0, '/app')

from app.core.database import SessionLocal
from app.models.match import KnockoutMatch
from app.models.tournament import Tournament

db = SessionLocal()

tournament_name = "Test 25012110"
tournament = db.query(Tournament).filter(Tournament.name == tournament_name).first()

if not tournament:
    print(f"Tournament not found")
    db.close()
    exit(1)

print(f"=== Tournament: {tournament.name} (ID: {tournament.id}) ===")

# Get all round 1 matches
round1_matches = db.query(KnockoutMatch).filter(
    KnockoutMatch.tournament_id == tournament.id,
    KnockoutMatch.round == 1
).order_by(KnockoutMatch.match_no).all()

print(f"\nRound 1 matches: {len(round1_matches)}")
print("\nAnalyzing matches:")
all_participants = set()
for m in round1_matches:
    p1 = m.player1_id
    p2 = m.player2_id
    has_bye = p1 is None or p2 is None
    completed = m.score1 is not None and m.score2 is not None
    
    if p1 is not None:
        all_participants.add(p1)
    if p2 is not None:
        all_participants.add(p2)
    
    if not has_bye and completed:
        loser = p2 if m.score1 > m.score2 else p1
        print(f"  Match {m.match_no}: p1={p1}, p2={p2}, loser={loser}, bye={has_bye}")
    else:
        print(f"  Match {m.match_no}: p1={p1}, p2={p2}, bye={has_bye}, completed={completed}")

print(f"\nAll participants in round 1: {len(all_participants)}")
print(f"Participants: {sorted(all_participants)}")

# Count actual losers (matches with both players)
losers = []
for m in round1_matches:
    if m.player1_id is not None and m.player2_id is not None:
        if m.score1 is not None and m.score2 is not None:
            loser = m.player2_id if m.score1 > m.score2 else m.player1_id
            losers.append(loser)

print(f"\nActual losers (from matches with both players): {len(losers)}")
print(f"Losers: {losers}")

# The issue: Only 2 matches have both players, so only 2 losers
# But user says there should be 8 players in consolation bracket
# Maybe the issue is that the bracket was created with wrong size?

db.close()
