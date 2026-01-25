#!/usr/bin/env python3
"""Fix duplicate consolation matches and ensure final exists"""
import sys
sys.path.insert(0, '/app')

from app.core.database import SessionLocal
from app.models.match import KnockoutMatch
from sqlalchemy import func

db = SessionLocal()

tournament_id = 7

# Find duplicates
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

print(f"Found {len(duplicates)} duplicate (round, match_no) pairs")

# Delete duplicates, keep the first one
for r, m, count in duplicates:
    matches = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == tournament_id,
        KnockoutMatch.round == r,
        KnockoutMatch.match_no == m
    ).order_by(KnockoutMatch.id).all()
    
    # Keep first, delete rest
    for match in matches[1:]:
        print(f"  Deleting duplicate: Round {r}, Match {m}, ID {match.id}")
        db.delete(match)

db.commit()

# Check final
matches = db.query(KnockoutMatch).filter(
    KnockoutMatch.tournament_id == tournament_id,
    KnockoutMatch.round < 0
).order_by(KnockoutMatch.round, KnockoutMatch.match_no).all()

rounds = {}
for m in matches:
    if m.round not in rounds:
        rounds[m.round] = []
    rounds[m.round].append(m.match_no)

print(f"\nAfter cleanup:")
for r in sorted(rounds.keys()):
    print(f"  Round {r}: {len(rounds[r])} matches")

if rounds:
    last_round = min(rounds.keys())
    final_matches = [m for m in matches if m.round == last_round]
    print(f"\nFinal round: {last_round} with {len(final_matches)} match(es)")
    
    if len(final_matches) != 1:
        print(f"  ⚠️  PROBLEM: Final should have 1 match, but has {len(final_matches)}")
    else:
        print(f"  ✓ Final exists: Match {final_matches[0].match_no}")

db.close()
