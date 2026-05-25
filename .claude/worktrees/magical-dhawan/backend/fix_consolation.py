#!/usr/bin/env python3
import sys
sys.path.insert(0, '/app')

from app.core.database import SessionLocal
from app.models.match import KnockoutMatch
from app.models.tournament import Tournament
from app.services.ko_bracket import generate_consolation_bracket_from_first_round_losers
from app.services.ko_propagation import assign_consolation_first_round_losers

db = SessionLocal()

tournament_id = 7

tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
print(f"Tournament: {tournament.name}")
print(f"KO Structure: {tournament.ko_structure}")
print()

# Get first round matches
r1 = db.query(KnockoutMatch).filter(
    KnockoutMatch.tournament_id == tournament_id,
    KnockoutMatch.round == 1
).order_by(KnockoutMatch.match_no).all()

print(f"Round 1 matches: {len(r1)}")
matches_with_both = [m for m in r1 if m.player1_id and m.player2_id]
print(f"Matches with both players: {len(matches_with_both)}")
print()

# Get current consolation matches
cons_current = db.query(KnockoutMatch).filter(
    KnockoutMatch.tournament_id == tournament_id,
    KnockoutMatch.round < 0
).all()

print(f"Current consolation matches: {len(cons_current)}")
rounds_current = {}
for m in cons_current:
    r = m.round
    if r not in rounds_current:
        rounds_current[r] = []
    rounds_current[r].append(m.match_no)

for r in sorted(rounds_current.keys()):
    print(f"  Round {r}: {len(rounds_current[r])} matches")

print()

# Generate expected structure
first_round_matches_dict = [
    {'player1_id': m.player1_id, 'player2_id': m.player2_id}
    for m in matches_with_both
]

expected_consolation = generate_consolation_bracket_from_first_round_losers(
    first_round_matches=first_round_matches_dict,
    rng_seed=tournament.ko_random_seed,
    draw_method=tournament.ko_draw_method.value if tournament.ko_draw_method else None
)

print(f"Expected consolation matches: {len(expected_consolation)}")
expected_rounds = {}
for m in expected_consolation:
    r = m['round']
    if r not in expected_rounds:
        expected_rounds[r] = []
    expected_rounds[r].append(m['match_no'])

for r in sorted(expected_rounds.keys()):
    print(f"  Round {r}: {len(expected_rounds[r])} matches")

print()

# Check if structure matches
if sorted(rounds_current.keys()) != sorted(expected_rounds.keys()):
    print("❌ Structure mismatch! Regenerating...")
    
    # Delete existing consolation matches
    db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == tournament_id,
        KnockoutMatch.round < 0
    ).delete()
    db.commit()
    
    # Recreate from main bracket first round
    first_round_matches_from_db = [m for m in r1 if m['round'] == 1]
    # This should be done via the API endpoint, but for now let's check what we have
    
    print("Please regenerate KO bracket via API")
else:
    print("✓ Structure matches")
    
    # Try to assign losers
    print("\nAttempting to assign losers...")
    result = assign_consolation_first_round_losers(
        db,
        tournament_id,
        tournament.ko_random_seed,
        tournament.ko_draw_method.value if tournament.ko_draw_method else None
    )
    print(f"Assignment result: {result}")

db.close()
