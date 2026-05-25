#!/usr/bin/env python3
"""Check consolation bracket assignment"""
import sys
sys.path.insert(0, '/app')

from app.core.database import SessionLocal
from app.models.match import KnockoutMatch
from app.models.tournament import Tournament
from app.services.ko_propagation import assign_consolation_first_round_losers

db = SessionLocal()

# Find tournament with consolation bracket
all_tournaments = db.query(Tournament).filter(Tournament.has_ko_phase == True).all()
print(f"Found {len(all_tournaments)} tournaments with KO phase")

# Find tournaments with consolation_bracket structure
consolation_tournaments = [t for t in all_tournaments if t.ko_structure and t.ko_structure.value == 'consolation_bracket']
print(f"Found {len(consolation_tournaments)} tournaments with consolation_bracket structure")

if not consolation_tournaments:
    print("\n⚠️  PROBLEM: No tournaments with 'consolation_bracket' structure found!")
    print("Tournaments with KO phase:")
    for t in all_tournaments[:5]:
        print(f"  ID: {t.id}, KO Structure: {t.ko_structure.value if t.ko_structure else None}")

# Test with tournament ID 4 specifically (has completed matches)
tournament_4 = [t for t in all_tournaments if t.id == 4]
tournaments = tournament_4 if tournament_4 else (consolation_tournaments if consolation_tournaments else all_tournaments[:3])

for t in tournaments[:3]:
    print(f"\n=== Tournament ID: {t.id} ===")
    print(f"KO Structure: {t.ko_structure.value if t.ko_structure else None}")
    
    # Check round 1 matches
    round1_matches = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == t.id,
        KnockoutMatch.round == 1
    ).order_by(KnockoutMatch.match_no).all()
    
    print(f"Round 1 matches: {len(round1_matches)}")
    losers = []
    for m in round1_matches[:10]:
        has_bye = m.player1_id is None or m.player2_id is None
        completed = m.score1 is not None and m.score2 is not None
        if not has_bye and completed:
            loser = m.player2_id if m.score1 > m.score2 else m.player1_id
            losers.append(loser)
        print(f"  Match {m.match_no}: p1={m.player1_id}, p2={m.player2_id}, s1={m.score1}, s2={m.score2}, bye={has_bye}, completed={completed}")
    
    print(f"Losers found: {len(losers)}")
    
    # Check consolation matches
    consolation_matches = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == t.id,
        KnockoutMatch.round == -1
    ).order_by(KnockoutMatch.match_no).all()
    
    print(f"Consolation matches (round -1): {len(consolation_matches)}")
    for m in consolation_matches[:5]:
        print(f"  Match {m.match_no}: p1={m.player1_id}, p2={m.player2_id}")
    
    # Try to assign
    if t.ko_structure and t.ko_structure.value == 'consolation_bracket':
        print(f"\nTrying to assign losers...")
        draw_method = t.ko_draw_method.value if t.ko_draw_method else None
        result = assign_consolation_first_round_losers(
            db, t.id, rng_seed=t.ko_random_seed, draw_method=draw_method
        )
        print(f"Assignment result: {result}")
        
        # Check again
        consolation_matches_after = db.query(KnockoutMatch).filter(
            KnockoutMatch.tournament_id == t.id,
            KnockoutMatch.round == -1
        ).order_by(KnockoutMatch.match_no).all()
        
        print(f"Consolation matches after assignment: {len(consolation_matches_after)}")
        for m in consolation_matches_after[:5]:
            print(f"  Match {m.match_no}: p1={m.player1_id}, p2={m.player2_id}")

db.close()
