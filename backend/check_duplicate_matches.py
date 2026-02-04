#!/usr/bin/env python3
"""Check for duplicate matches"""
import sys
sys.path.insert(0, '/app')

from app.core.database import SessionLocal
from app.models.match import KnockoutMatch
from sqlalchemy import func

db = SessionLocal()

tournament_id = 7
matches = db.query(KnockoutMatch).filter(
    KnockoutMatch.tournament_id == tournament_id,
    KnockoutMatch.round < 0
).all()

print(f"Total consolation matches: {len(matches)}")

# Check for duplicates by round and match_no
duplicates = db.query(
    KnockoutMatch.round,
    KnockoutMatch.match_no,
    func.count(KnockoutMatch.id).label('count')
).filter(
    KnockoutMatch.tournament_id == tournament_id,
    KnockoutMatch.round < 0
).group_by(
    KnockoutMatch.round,
    KnockoutMatch.match_no
).having(
    func.count(KnockoutMatch.id) > 1
).all()

if duplicates:
    print(f"\n⚠️  Found {len(duplicates)} duplicate match_nos:")
    for r, m, count in duplicates:
        print(f"  Round {r}, Match {m}: {count} times")
        
        # Show all matches with this round/match_no
        dup_matches = db.query(KnockoutMatch).filter(
            KnockoutMatch.tournament_id == tournament_id,
            KnockoutMatch.round == r,
            KnockoutMatch.match_no == m
        ).all()
        for match in dup_matches:
            print(f"    ID: {match.id}, p1={match.player1_id}, p2={match.player2_id}")
else:
    print("\n✓ No duplicate match_nos found")

# Check rounds
rounds = {}
for m in matches:
    if m.round not in rounds:
        rounds[m.round] = []
    rounds[m.round].append(m.match_no)

print(f"\nRounds in database:")
for r in sorted(rounds.keys()):
    unique_match_nos = len(set(rounds[r]))
    total_matches = len(rounds[r])
    print(f"  Round {r}: {total_matches} matches, {unique_match_nos} unique match_nos")
    if total_matches != unique_match_nos:
        print(f"    ⚠️  Duplicates detected!")

db.close()
