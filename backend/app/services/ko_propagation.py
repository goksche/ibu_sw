# KO Result Propagation Service
# v1.3.4 - Fixed: moved score validation before DB query to avoid stale data

from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.match import KnockoutMatch
from app.models.tournament import Tournament
from app.services.ko_slots import next_round_slot_for
import random

BRONZE_ROUND = 99


def get_winners_of_round(db: Session, tournament_id: int, round_num: int) -> List[int]:
    """Return list of winner participant_ids for the given round (from scores or Bye)."""
    matches = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == tournament_id,
        KnockoutMatch.round == round_num
    ).order_by(KnockoutMatch.match_no).all()
    winners: List[int] = []
    for m in matches:
        if m.player1_id is None and m.player2_id is None:
            continue
        if m.player1_id is None:
            winners.append(m.player2_id)
        elif m.player2_id is None:
            winners.append(m.player1_id)
        elif m.score1 is not None and m.score2 is not None and m.score1 != m.score2:
            winners.append(m.player1_id if m.score1 > m.score2 else m.player2_id)
    return winners


def get_losers_of_round(db: Session, tournament_id: int, round_num: int) -> List[int]:
    """Return list of loser participant_ids for the given round (for Bronze: semi-final losers)."""
    matches = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == tournament_id,
        KnockoutMatch.round == round_num
    ).order_by(KnockoutMatch.match_no).all()
    losers: List[int] = []
    for m in matches:
        if m.player1_id is None or m.player2_id is None:
            continue
        if m.score1 is not None and m.score2 is not None and m.score1 != m.score2:
            losers.append(m.player1_id if m.score1 < m.score2 else m.player2_id)
    return losers


def get_participants_in_round(db: Session, tournament_id: int, round_num: int) -> List[int]:
    """Return list of participant_ids that appear in the given round (player1/player2 of each match).
    Used as fallback for manual pairings when no results yet (no winners/losers)."""
    matches = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == tournament_id,
        KnockoutMatch.round == round_num
    ).order_by(KnockoutMatch.match_no).all()
    seen: set = set()
    result: List[int] = []
    for m in matches:
        if m.player1_id is not None and m.player1_id not in seen:
            seen.add(m.player1_id)
            result.append(m.player1_id)
        if m.player2_id is not None and m.player2_id not in seen:
            seen.add(m.player2_id)
            result.append(m.player2_id)
    return result


def can_enter_ko_result(db: Session, match: KnockoutMatch) -> bool:
    """
    Prueft, ob fuer dieses KO-Match ein Ergebnis eingetragen werden darf.
    Nur erlaubt wenn: Paarung steht (mind. ein Spieler), und Runde 1 bzw. Vorrunde abgeschlossen.
    """
    if match.round is None or match.match_no is None:
        return False
    if match.player1_id is None and match.player2_id is None:
        return False
    if match.round == 1:
        return True
    if match.round == BRONZE_ROUND or (match.round >= 2000):
        return True
    if match.round < 1:
        return False
    pred_no1 = 2 * match.match_no - 1
    pred_no2 = 2 * match.match_no
    pred1 = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == match.tournament_id,
        KnockoutMatch.round == match.round - 1,
        KnockoutMatch.match_no == pred_no1
    ).first()
    pred2 = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == match.tournament_id,
        KnockoutMatch.round == match.round - 1,
        KnockoutMatch.match_no == pred_no2
    ).first()
    if not pred1 or not pred2:
        return False

    def _match_complete(m: KnockoutMatch) -> bool:
        if m.player1_id is None and m.player2_id is None:
            return False
        if m.player1_id is None or m.player2_id is None:
            return True
        if m.score1 is None or m.score2 is None or m.score1 == m.score2:
            return False
        return True

    return _match_complete(pred1) and _match_complete(pred2)


def _draw_method_value(tournament: Optional[Tournament]) -> Optional[str]:
    if not tournament:
        return None
    draw_method = getattr(tournament, "ko_draw_method", None)
    if draw_method is None:
        return None
    return getattr(draw_method, "value", None) or draw_method


def _uses_random_each_round_strategy(tournament: Optional[Tournament]) -> bool:
    """
    Modern strategy first: ko_draw_method == random_each_round.
    Legacy fallback remains supported for existing tournaments via ko_distribution.
    """
    draw_method = _draw_method_value(tournament)
    if draw_method == "random_each_round":
        return True
    return bool(tournament and tournament.ko_distribution == "random_each_round")


def save_ko_result_and_propagate(
    db: Session,
    match_id: int,
    score1: Optional[int],
    score2: Optional[int],
    force_propagate: bool = False,
) -> None:
    """
    Propagate winner to next round (scores already saved in match)
    
    Desktop equivalent: save_ko_result_and_propagate
    """
    # Get the match first to check for byes
    match = db.query(KnockoutMatch).filter(KnockoutMatch.id == match_id).first()
    if not match:
        return
    
    # Check if we should propagate
    if match.round is None or match.match_no is None:
        return
    
    # Get tournament draw mode
    tournament = db.query(Tournament).filter(Tournament.id == match.tournament_id).first()
    # Don't propagate in manual draw mode ??? user enters next round pairings manually
    if tournament and _draw_method_value(tournament) == 'manual' and not force_propagate:
            return

    # Get winner - handle byes FIRST before checking scores
    player1_id = match.player1_id
    player2_id = match.player2_id
    
    # Handle byes: if one player is None, the other automatically wins
    if player1_id is None and player2_id is not None:
        # Player 2 has bye, automatically wins
        winner_id = player2_id
        # Ensure score is set to 3:0 if not already set
        if match.score1 is None or match.score2 is None:
            match.score1 = 0
            match.score2 = 3
            db.commit()
        # Update score1 and score2 for propagation check
        score1 = match.score1
        score2 = match.score2
    elif player2_id is None and player1_id is not None:
        # Player 1 has bye, automatically wins
        winner_id = player1_id
        # Ensure score is set to 3:0 if not already set
        if match.score1 is None or match.score2 is None:
            match.score1 = 3
            match.score2 = 0
            db.commit()
        # Update score1 and score2 for propagation check
        score1 = match.score1
        score2 = match.score2
    elif player1_id is None or player2_id is None:
        # Both are None or invalid state
        return
    else:
        # Both players exist, determine winner from scores
        # Use match scores if provided scores are None
        if score1 is None:
            score1 = match.score1
        if score2 is None:
            score2 = match.score2
        
        # Check if we should propagate (after handling byes and getting scores)
        if score1 is None or score2 is None or score1 == score2:
            return
        
        winner_id = player1_id if score1 > score2 else player2_id
    
    # Check if we should propagate (for byes, we already have scores)
    if score1 is None or score2 is None or score1 == score2:
        return
    
    # Don't propagate from final
    from sqlalchemy import func
    max_round_result = db.query(func.max(KnockoutMatch.round)).filter(
        KnockoutMatch.tournament_id == match.tournament_id,
        KnockoutMatch.round != BRONZE_ROUND
    ).scalar()
    
    if max_round_result and match.round == max_round_result:
        return

    if _uses_random_each_round_strategy(tournament) and not force_propagate:
        # Bei "random_each_round" NICHT automatisch propagieren
        # Die Auslosung wird manuell über den /draw-next-round Endpoint ausgelöst
        return
    
    # Handle consolation bracket (negative rounds: -1, -2, etc.)
    if match.round < 0 and match.round > -1000:
        # For consolation bracket, next round is round - 1 (e.g., -1 -> -2)
        next_round = match.round - 1
        
        # Check if there is a next round (final is the most negative round)
        next_round_exists = db.query(KnockoutMatch).filter(
            KnockoutMatch.tournament_id == match.tournament_id,
            KnockoutMatch.round == next_round
        ).first()
        
        if not next_round_exists:
            # This is the final, don't propagate
            return
        
        target_match_no, slot = next_round_slot_for(match.match_no)
        
        target_match = db.query(KnockoutMatch).filter(
            KnockoutMatch.tournament_id == match.tournament_id,
            KnockoutMatch.round == next_round,
            KnockoutMatch.match_no == target_match_no
        ).first()
        
        if target_match:
            if slot == 1:
                target_match.player1_id = winner_id
            else:
                target_match.player2_id = winner_id
            db.commit()
        return
    
    # Handle double elimination losers bracket (negative rounds: -1001, -1002, etc.)
    if match.round <= -1001 and match.round > -2000:
        # For double elimination losers bracket, next round is round - 1
        next_round = match.round - 1
        target_match_no, slot = next_round_slot_for(match.match_no)
        
        target_match = db.query(KnockoutMatch).filter(
            KnockoutMatch.tournament_id == match.tournament_id,
            KnockoutMatch.round == next_round,
            KnockoutMatch.match_no == target_match_no
        ).first()
        
        if target_match:
            if slot == 1:
                target_match.player1_id = winner_id
            else:
                target_match.player2_id = winner_id
            db.commit()
        
        # Check if this is the final of losers bracket, then propagate to grand final
        from sqlalchemy import func
        min_losers_round = db.query(func.min(KnockoutMatch.round)).filter(
            KnockoutMatch.tournament_id == match.tournament_id,
            KnockoutMatch.round <= -1001,
            KnockoutMatch.round > -2000
        ).scalar()
        
        if min_losers_round and match.round == min_losers_round:
            # This is the final of losers bracket, propagate to grand final
            grand_final = db.query(KnockoutMatch).filter(
                KnockoutMatch.tournament_id == match.tournament_id,
                KnockoutMatch.round == 2000
            ).first()
            if grand_final:
                grand_final.player2_id = winner_id  # Losers bracket winner is player2 in grand final
                db.commit()
        return
    
    # Handle triple elimination first losers bracket (negative rounds: -2001, -2002, etc.)
    if match.round <= -2001 and match.round > -3000:
        # For triple elimination first losers bracket, next round is round - 1
        next_round = match.round - 1
        target_match_no, slot = next_round_slot_for(match.match_no)
        
        target_match = db.query(KnockoutMatch).filter(
            KnockoutMatch.tournament_id == match.tournament_id,
            KnockoutMatch.round == next_round,
            KnockoutMatch.match_no == target_match_no
        ).first()
        
        if target_match:
            if slot == 1:
                target_match.player1_id = winner_id
            else:
                target_match.player2_id = winner_id
            db.commit()
        
        # Check if this is the final of first losers bracket, then propagate to second losers bracket
        from sqlalchemy import func
        min_losers1_round = db.query(func.min(KnockoutMatch.round)).filter(
            KnockoutMatch.tournament_id == match.tournament_id,
            KnockoutMatch.round <= -2001,
            KnockoutMatch.round > -3000
        ).scalar()
        
        if min_losers1_round and match.round == min_losers1_round:
            # This is the final of first losers bracket, propagate to second losers bracket
            # Find first match of second losers bracket
            first_losers2_match = db.query(KnockoutMatch).filter(
                KnockoutMatch.tournament_id == match.tournament_id,
                KnockoutMatch.round <= -3001,
                KnockoutMatch.round > -4000
            ).order_by(KnockoutMatch.round.asc(), KnockoutMatch.match_no.asc()).first()
            if first_losers2_match:
                if first_losers2_match.player1_id is None:
                    first_losers2_match.player1_id = winner_id
                elif first_losers2_match.player2_id is None:
                    first_losers2_match.player2_id = winner_id
                db.commit()
        return
    
    # Handle triple elimination second losers bracket (negative rounds: -3001, -3002, etc.)
    if match.round <= -3001 and match.round > -4000:
        # For triple elimination second losers bracket, next round is round - 1
        next_round = match.round - 1
        target_match_no, slot = next_round_slot_for(match.match_no)
        
        target_match = db.query(KnockoutMatch).filter(
            KnockoutMatch.tournament_id == match.tournament_id,
            KnockoutMatch.round == next_round,
            KnockoutMatch.match_no == target_match_no
        ).first()
        
        if target_match:
            if slot == 1:
                target_match.player1_id = winner_id
            else:
                target_match.player2_id = winner_id
            db.commit()
        
        # Check if this is the final of second losers bracket, then propagate to grand final
        from sqlalchemy import func
        min_losers2_round = db.query(func.min(KnockoutMatch.round)).filter(
            KnockoutMatch.tournament_id == match.tournament_id,
            KnockoutMatch.round <= -3001,
            KnockoutMatch.round > -4000
        ).scalar()
        
        if min_losers2_round and match.round == min_losers2_round:
            # This is the final of second losers bracket, propagate to grand final
            grand_final = db.query(KnockoutMatch).filter(
                KnockoutMatch.tournament_id == match.tournament_id,
                KnockoutMatch.round == 4000
            ).first()
            if grand_final:
                grand_final.player2_id = winner_id  # Second losers bracket winner is player2 in grand final
                db.commit()
        return
    
    # Handle main bracket (positive rounds: 1, 2, 3, etc.)
    # Check if this is aggregate KO (both legs need to be completed)
    if tournament and tournament.ko_structure and tournament.ko_structure.value == 'aggregate_ko':
        # For aggregate KO, we need to check if both legs are completed
        # Find the other leg of this match
        other_leg = db.query(KnockoutMatch).filter(
            KnockoutMatch.tournament_id == match.tournament_id,
            KnockoutMatch.round == match.round,
            KnockoutMatch.match_no == match.match_no,
            KnockoutMatch.id != match.id
        ).first()
        
        if not other_leg or other_leg.score1 is None or other_leg.score2 is None:
            # Other leg not completed yet, don't propagate
            return
        
        # Calculate aggregate score
        total_score1 = match.score1 + other_leg.score2  # player1's total (home + away)
        total_score2 = match.score2 + other_leg.score1  # player2's total (home + away)
        
        if total_score1 == total_score2:
            # Tie - use away goals rule (goals scored away count more)
            away_goals1 = other_leg.score2  # player1's away goals
            away_goals2 = match.score2  # player2's away goals
            
            if away_goals1 == away_goals2:
                # Still tied - for now, don't propagate (would need extra time/penalties)
                return
            else:
                winner_id = player1_id if away_goals1 > away_goals2 else player2_id
        else:
            winner_id = player1_id if total_score1 > total_score2 else player2_id
        
        # Propagate winner to next round (both legs of next round)
        target_match_no, slot = next_round_slot_for(match.match_no)
        next_round = match.round + 1
        
        # Find both legs of next round match
        next_leg1 = db.query(KnockoutMatch).filter(
            KnockoutMatch.tournament_id == match.tournament_id,
            KnockoutMatch.round == next_round,
            KnockoutMatch.match_no == target_match_no
        ).order_by(KnockoutMatch.id.asc()).first()
        
        if next_leg1:
            # Assign to first leg
            if slot == 1:
                next_leg1.player1_id = winner_id
            else:
                next_leg1.player2_id = winner_id
            
            # Find second leg and assign (swapped)
            next_leg2 = db.query(KnockoutMatch).filter(
                KnockoutMatch.tournament_id == match.tournament_id,
                KnockoutMatch.round == next_round,
                KnockoutMatch.match_no == target_match_no,
                KnockoutMatch.id != next_leg1.id
            ).first()
            
            if next_leg2:
                if slot == 1:
                    next_leg2.player2_id = winner_id  # Swapped for away leg
                else:
                    next_leg2.player1_id = winner_id  # Swapped for away leg
            
            db.commit()
        return
    
    # Handle double elimination winners bracket
    # Check if this is winners bracket final, then propagate to grand final
    if tournament and tournament.ko_structure and tournament.ko_structure.value == 'double_elimination':
        from sqlalchemy import func
        max_winners_round = db.query(func.max(KnockoutMatch.round)).filter(
            KnockoutMatch.tournament_id == match.tournament_id,
            KnockoutMatch.round > 0,
            KnockoutMatch.round < 2000
        ).scalar()
        
        if max_winners_round and match.round == max_winners_round:
            # This is the final of winners bracket, propagate to grand final
            grand_final = db.query(KnockoutMatch).filter(
                KnockoutMatch.tournament_id == match.tournament_id,
                KnockoutMatch.round == 2000
            ).first()
            if grand_final:
                grand_final.player1_id = winner_id  # Winners bracket winner is player1 in grand final
                db.commit()
            
            # Also propagate loser to losers bracket
            loser_id = player2_id if score1 > score2 else player1_id
            # Find appropriate losers bracket match (this is complex, simplified here)
            # In a full implementation, we'd need to track which losers bracket round receives this loser
            return
        
        # Also propagate loser to losers bracket for earlier rounds
        if match.round >= 1:
            loser_id = player2_id if score1 > score2 else player1_id
            # Find appropriate losers bracket match
            # This is simplified - in full implementation, we'd need proper losers bracket assignment logic
            # For now, we'll let the losers bracket be populated when matches are completed
        
        # For double elimination, also propagate winner to next winners bracket round
        if (
            match.round >= 1
            and max_winners_round is not None
            and match.round < max_winners_round
        ):
            next_round = match.round + 1
            target_match_no, slot = next_round_slot_for(match.match_no)
            
            target_match = db.query(KnockoutMatch).filter(
                KnockoutMatch.tournament_id == match.tournament_id,
                KnockoutMatch.round == next_round,
                KnockoutMatch.round > 0,
                KnockoutMatch.round < 2000,
                KnockoutMatch.match_no == target_match_no
            ).first()
            
            if target_match:
                if slot == 1:
                    target_match.player1_id = winner_id
                else:
                    target_match.player2_id = winner_id
                db.commit()
        return
    
    # Handle triple elimination winners bracket
    if tournament and tournament.ko_structure and tournament.ko_structure.value == 'triple_elimination':
        from sqlalchemy import func
        max_winners_round = db.query(func.max(KnockoutMatch.round)).filter(
            KnockoutMatch.tournament_id == match.tournament_id,
            KnockoutMatch.round > 0,
            KnockoutMatch.round < 4000
        ).scalar()
        
        if max_winners_round and match.round == max_winners_round:
            # This is the final of winners bracket, propagate to grand final
            grand_final = db.query(KnockoutMatch).filter(
                KnockoutMatch.tournament_id == match.tournament_id,
                KnockoutMatch.round == 4000
            ).first()
            if grand_final:
                grand_final.player1_id = winner_id  # Winners bracket winner is player1 in grand final
                db.commit()
            return
        
        # Propagate loser to first losers bracket
        if match.round >= 1:
            loser_id = player2_id if score1 > score2 else player1_id
            # Find appropriate first losers bracket match
            # Simplified - full implementation would need proper assignment logic
        
        # For triple elimination, also propagate winner to next winners bracket round
        if match.round >= 1:
            max_winners_round = db.query(func.max(KnockoutMatch.round)).filter(
                KnockoutMatch.tournament_id == match.tournament_id,
                KnockoutMatch.round > 0,
                KnockoutMatch.round < 4000
            ).scalar()
            if max_winners_round and match.round < max_winners_round:
                next_round = match.round + 1
                target_match_no, slot = next_round_slot_for(match.match_no)
                
                target_match = db.query(KnockoutMatch).filter(
                    KnockoutMatch.tournament_id == match.tournament_id,
                    KnockoutMatch.round == next_round,
                    KnockoutMatch.round > 0,
                    KnockoutMatch.round < 4000,
                    KnockoutMatch.match_no == target_match_no
                ).first()
                
                if target_match:
                    if slot == 1:
                        target_match.player1_id = winner_id
                    else:
                        target_match.player2_id = winner_id
                    db.commit()
        return
    
    # Standard propagation for normal single elimination KO bracket
    # Only execute if not aggregate_ko, not double_elimination, not triple_elimination
    if match.round > 0 and match.round < 2000:
        next_round = match.round + 1
        target_match_no, slot = next_round_slot_for(match.match_no)
        
        target_match = db.query(KnockoutMatch).filter(
            KnockoutMatch.tournament_id == match.tournament_id,
            KnockoutMatch.round == next_round,
            KnockoutMatch.match_no == target_match_no
        ).first()
        
        if target_match:
            if slot == 1:
                target_match.player1_id = winner_id
            else:
                target_match.player2_id = winner_id
            db.commit()
    
    # Erste Runde: Trostturnier-Zuweisung und Bye-Propagation nur bei Konsolation-Struktur
    if match.round == 1 and tournament and tournament.ko_structure and tournament.ko_structure.value == 'consolation_bracket':
        draw_method = None
        if tournament.ko_draw_method:
            draw_method = tournament.ko_draw_method.value
        # Zuerst Bye-Matches abarbeiten, damit alle Runde-1-Ergebnisse (inkl. Byes) stehen
        _propagate_round_one_byes(db, match.tournament_id)
        # Danach Verlierer ins Trostturnier zuweisen (mit aktuellem DB-Stand)
        assign_consolation_first_round_losers(
            db,
            match.tournament_id,
            tournament.ko_random_seed if tournament else None,
            draw_method=draw_method
        )


def _propagate_round_one_byes(db: Session, tournament_id: int) -> None:
    """
    Findet alle Runde-1-Matches mit Bye (ein Spieler leer), setzt automatisch 3:0/0:3,
    speichert und propagiert den Gewinner in die nächste Runde.
    Wird nach dem Speichern eines Runde-1-Ergebnisses aufgerufen, damit Bye-Gewinner
    auch ohne manuelle Ergebnis-Eingabe im Turnierbaum erscheinen.
    """
    first_round = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == tournament_id,
        KnockoutMatch.round == 1
    ).all()
    for m in first_round:
        if m.score1 is not None and m.score2 is not None:
            continue
        if m.player1_id is None and m.player2_id is not None:
            m.score1 = 0
            m.score2 = 3
            db.commit()
            save_ko_result_and_propagate(db, m.id, 0, 3)
        elif m.player2_id is None and m.player1_id is not None:
            m.score1 = 3
            m.score2 = 0
            db.commit()
            save_ko_result_and_propagate(db, m.id, 3, 0)


def _assign_next_round_randomly(db: Session, tournament_id: int, current_round: int, rng_seed: Optional[int]) -> None:
    """Assign next round participants randomly once the current round is complete."""
    # Get matches for current round
    current_round_matches = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == tournament_id,
        KnockoutMatch.round == current_round
    ).all()

    if not current_round_matches:
        return

    # Ensure all matches in current round are completed
    winners: List[int] = []
    for match in current_round_matches:
        if match.score1 is None or match.score2 is None or match.score1 == match.score2:
            return
        if match.player1_id is None or match.player2_id is None:
            return
        winner_id = match.player1_id if match.score1 > match.score2 else match.player2_id
        winners.append(winner_id)

    # Determine next round
    next_round = current_round + 1
    next_round_matches = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == tournament_id,
        KnockoutMatch.round == next_round
    ).order_by(KnockoutMatch.match_no.asc()).all()

    if not next_round_matches:
        return

    # Avoid reshuffling if next round already has scores
    if any(m.score1 is not None or m.score2 is not None for m in next_round_matches):
        return

    rng = random.Random(rng_seed + current_round) if rng_seed is not None else random
    rng.shuffle(winners)

    # Clear existing assignments before re-draw
    for match in next_round_matches:
        match.player1_id = None
        match.player2_id = None

    # Assign winners to next round matches
    idx = 0
    for match in next_round_matches:
        if idx < len(winners):
            match.player1_id = winners[idx]
            idx += 1
        if idx < len(winners):
            match.player2_id = winners[idx]
            idx += 1

    db.commit()


def draw_next_round_manually(db: Session, tournament_id: int, current_round: int) -> dict:
    """
    Manuelle Auslosung für die nächste Runde durchführen.
    Wird aufgerufen wenn die Strategie 'random_each_round' aktiv ist und User den Button klickt.
    
    Returns:
        dict mit status, message und ggf. den neuen Paarungen
    """
    from sqlalchemy import func
    
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        return {"status": "error", "message": "Turnier nicht gefunden"}
    
    # Prüfe ob random_each_round aktiv ist
    if not _uses_random_each_round_strategy(tournament):
        return {"status": "error", "message": "Turnier ist nicht auf 'Jede Runde neu auslosen' eingestellt"}
    
    # Finde die höchste Runde (Finale) - ohne Bronze-Match
    max_round = db.query(func.max(KnockoutMatch.round)).filter(
        KnockoutMatch.tournament_id == tournament_id,
        KnockoutMatch.round != BRONZE_ROUND,
        KnockoutMatch.round > 0
    ).scalar()
    
    if not max_round:
        return {"status": "error", "message": "Keine KO-Matches gefunden"}
    
    # Prüfe ob aktuelle Runde das Finale ist
    if current_round >= max_round:
        return {"status": "error", "message": "Finale erreicht - keine weitere Auslosung möglich"}
    
    # Hole alle Matches der aktuellen Runde
    current_round_matches = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == tournament_id,
        KnockoutMatch.round == current_round
    ).all()
    
    if not current_round_matches:
        return {"status": "error", "message": f"Keine Matches in Runde {current_round} gefunden"}
    
    # Prüfe ob alle Matches der Runde fertig sind und sammle Gewinner
    winners: List[int] = []
    incomplete_matches = []
    
    for match in current_round_matches:
        # Bye-Matches (ein Spieler fehlt) überspringen
        if match.player1_id is None and match.player2_id is None:
            continue
        if match.player1_id is None or match.player2_id is None:
            # Bye - automatischer Gewinner
            winner_id = match.player1_id or match.player2_id
            winners.append(winner_id)
            continue
            
        # Normale Matches müssen ein Ergebnis haben
        if match.score1 is None or match.score2 is None:
            incomplete_matches.append(match.match_no)
            continue
        if match.score1 == match.score2:
            incomplete_matches.append(match.match_no)
            continue
            
        winner_id = match.player1_id if match.score1 > match.score2 else match.player2_id
        winners.append(winner_id)
    
    if incomplete_matches:
        return {
            "status": "error", 
            "message": f"Nicht alle Matches fertig. Fehlende: Spiel {', '.join(map(str, incomplete_matches))}"
        }
    
    if not winners:
        return {"status": "error", "message": "Keine Gewinner gefunden"}
    
    # Hole Matches der nächsten Runde
    next_round = current_round + 1
    next_round_matches = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == tournament_id,
        KnockoutMatch.round == next_round
    ).order_by(KnockoutMatch.match_no.asc()).all()
    
    if not next_round_matches:
        return {"status": "error", "message": f"Keine Matches für Runde {next_round} gefunden"}
    
    # Prüfe ob nächste Runde bereits Ergebnisse hat
    if any(m.score1 is not None or m.score2 is not None for m in next_round_matches):
        return {"status": "error", "message": "Nächste Runde hat bereits Ergebnisse - Auslosung nicht möglich"}
    
    # Zufällige Auslosung durchführen
    rng_seed = tournament.ko_random_seed
    rng = random.Random(rng_seed + next_round) if rng_seed is not None else random
    rng.shuffle(winners)
    
    # Bestehende Zuweisungen löschen
    for match in next_round_matches:
        match.player1_id = None
        match.player2_id = None
    
    # Gewinner zuweisen
    pairings = []
    idx = 0
    for match in next_round_matches:
        player1_id = winners[idx] if idx < len(winners) else None
        idx += 1
        player2_id = winners[idx] if idx < len(winners) else None
        idx += 1
        
        match.player1_id = player1_id
        match.player2_id = player2_id
        
        pairings.append({
            "match_no": match.match_no,
            "player1_id": player1_id,
            "player2_id": player2_id
        })
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Auslosung für Runde {next_round} erfolgreich",
        "round": next_round,
        "pairings": pairings
    }


def get_draw_status(db: Session, tournament_id: int) -> dict:
    """
    Prüft ob eine manuelle Auslosung möglich/nötig ist.
    
    Returns:
        dict mit can_draw, current_round, next_round, winners_count
    """
    from sqlalchemy import func
    
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        return {"can_draw": False, "reason": "Turnier nicht gefunden"}
    
    # Nur bei random_each_round relevant
    if not _uses_random_each_round_strategy(tournament):
        return {"can_draw": False, "reason": "Nicht auf 'Jede Runde neu auslosen' eingestellt"}
    
    # Finde die höchste Runde mit Spielern (aktuelle Runde)
    # und prüfe welche Runde ausgelost werden muss
    
    all_matches = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == tournament_id,
        KnockoutMatch.round > 0,
        KnockoutMatch.round != BRONZE_ROUND
    ).order_by(KnockoutMatch.round.asc()).all()
    
    if not all_matches:
        return {"can_draw": False, "reason": "Keine KO-Matches"}
    
    # Finde die aktuelle Runde (letzte Runde mit Spielern, die noch nicht alle gespielt haben ODER
    # die nächste Runde die noch keine Spieler hat)
    max_round = max(m.round for m in all_matches)
    
    for round_num in range(1, max_round + 1):
        round_matches = [m for m in all_matches if m.round == round_num]
        
        # Prüfe ob alle Matches dieser Runde komplett sind
        all_complete = True
        winners = []
        
        for m in round_matches:
            if m.player1_id is None and m.player2_id is None:
                continue  # Leeres Match
            if m.player1_id is None or m.player2_id is None:
                # Bye
                winners.append(m.player1_id or m.player2_id)
                continue
            if m.score1 is None or m.score2 is None or m.score1 == m.score2:
                all_complete = False
                break
            winners.append(m.player1_id if m.score1 > m.score2 else m.player2_id)
        
        if not all_complete:
            return {
                "can_draw": False,
                "reason": f"Runde {round_num} noch nicht fertig",
                "current_round": round_num
            }
        
        # Prüfe ob nächste Runde bereits Spieler hat
        if round_num < max_round:
            next_round_matches = [m for m in all_matches if m.round == round_num + 1]
            has_players = any(m.player1_id is not None or m.player2_id is not None for m in next_round_matches)
            has_scores = any(m.score1 is not None or m.score2 is not None for m in next_round_matches)
            
            if not has_players and not has_scores:
                # Nächste Runde hat keine Spieler - Auslosung möglich!
                return {
                    "can_draw": True,
                    "current_round": round_num,
                    "next_round": round_num + 1,
                    "winners_count": len(winners)
                }
    
    return {"can_draw": False, "reason": "Turnier abgeschlossen oder keine Auslosung nötig"}


def assign_consolation_first_round_losers(db: Session, tournament_id: int, rng_seed: Optional[int] = None, draw_method: Optional[str] = None) -> bool:
    """
    Assign losers from first round (round 1) to consolation bracket first round (round -1).
    Only assigns if all first round matches (with two players) are completed.
    Applies draw method to assign losers to consolation bracket matches.
    
    Returns:
        True if assignment was successful, False otherwise
    """
    # Session-Cache leeren, damit Runde-1-Matches mit aktuellen Ergebnissen gelesen werden
    db.expire_all()
    
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        return False
    
    # Nur bei Trostturnier-Struktur Consolation-Matches suchen
    if not tournament.ko_structure or tournament.ko_structure.value != 'consolation_bracket':
        return False
    
    # Get draw method from tournament
    if not draw_method:
        if tournament.ko_draw_method:
            draw_method = tournament.ko_draw_method.value
        else:
            draw_method = 'full_random'
    
    # Get all first round matches
    first_round_matches = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == tournament_id,
        KnockoutMatch.round == 1
    ).order_by(KnockoutMatch.match_no.asc()).all()
    
    if not first_round_matches:
        return False
    
    # Collect losers from first round matches
    # IMPORTANT: Each match in round 1 produces one loser (the half that doesn't advance)
    # Only matches with BOTH players (no bye) can have actual losers
    losers = []
    matches_with_both_players = []
    
    for match in first_round_matches:
        # Check if match has both players (not a bye)
        if match.player1_id is None or match.player2_id is None:
            # Bye match - no actual loser, skip it (don't require it to be completed)
            # But the bracket structure still accounts for this match slot
            continue
        
        # Match has both players - track it
        matches_with_both_players.append(match)
        
        # Check if this match is completed
        if match.score1 is None or match.score2 is None or match.score1 == match.score2:
            return False  # Not all matches with both players are completed yet
        
        # Determine loser (only for matches with both players)
        # The loser is the one with the lower score
        loser_id = match.player2_id if match.score1 > match.score2 else match.player1_id
        losers.append(loser_id)
    
    # If no matches with both players, no losers to assign
    if not matches_with_both_players:
        # But still return True if consolation bracket exists (even if empty)
        # This allows the bracket to be created even if there are no losers yet
        consolation_matches = db.query(KnockoutMatch).filter(
            KnockoutMatch.tournament_id == tournament_id,
            KnockoutMatch.round == -1
        ).first()
        if consolation_matches:
            return True  # Consolation bracket exists, but no losers to assign
        return False
    
    # If we have losers but no consolation matches, that's an error
    if not losers:
        return False
    
    # Get consolation first round matches (round -1)
    consolation_matches = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == tournament_id,
        KnockoutMatch.round == -1
    ).order_by(KnockoutMatch.match_no.asc()).all()
    
    if not consolation_matches:
        return False  # No consolation bracket exists
    
    # Check if already assigned (avoid re-assignment)
    if all(m.player1_id is not None or m.player2_id is not None for m in consolation_matches):
        # Check if all slots are filled
        all_filled = True
        for m in consolation_matches:
            if m.player1_id is None and m.player2_id is None:
                all_filled = False
                break
        if all_filled:
            return True  # Already assigned
    
    # Apply draw method to losers (same as main bracket)
    if draw_method == 'full_random':
        if rng_seed is not None:
            rng = random.Random(rng_seed + 1000)  # Different seed for consolation
            rng.shuffle(losers)
        else:
            random.shuffle(losers)
    elif draw_method == 'pot_system':
        # Split losers into pots
        mid = len(losers) // 2
        pot1 = losers[:mid]
        pot2 = losers[mid:]
        if rng_seed is not None:
            rng = random.Random(rng_seed + 1000)
            rng.shuffle(pot1)
            rng.shuffle(pot2)
        else:
            random.shuffle(pot1)
            random.shuffle(pot2)
        # Interleave pots
        losers = []
        for i in range(max(len(pot1), len(pot2))):
            if i < len(pot1):
                losers.append(pot1[i])
            if i < len(pot2):
                losers.append(pot2[i])
    # For 'overall_seeding', keep order (losers are already in order from matches)
    
    # Assign losers to consolation matches (pair them up)
    # If there are fewer losers than slots, some matches will have byes (None)
    loser_idx = 0
    for match in consolation_matches:
        if loser_idx < len(losers):
            match.player1_id = losers[loser_idx]
            loser_idx += 1
        if loser_idx < len(losers):
            match.player2_id = losers[loser_idx]
            loser_idx += 1
        # If match has a bye (one player is None), set automatic score 3:0
        if match.player1_id is None and match.player2_id is not None:
            match.score1 = 0
            match.score2 = 3
        elif match.player2_id is None and match.player1_id is not None:
            match.score1 = 3
            match.score2 = 0
    
    db.commit()
    
    # Propagate bye matches in consolation bracket immediately
    from app.services.ko_propagation import save_ko_result_and_propagate
    for match in consolation_matches:
        if match.score1 is not None and match.score2 is not None:
            db.refresh(match)  # Ensure we have the ID
            save_ko_result_and_propagate(
                db,
                match.id,
                match.score1,
                match.score2
            )
    
    return True


def ensure_bronze_from_semis(db: Session, tournament_id: int) -> bool:
    """
    Create/update bronze match from semifinal losers
    
    Desktop equivalent: ensure_bronze_from_semis
    """
    t = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not t or not getattr(t, "ko_third_place_match", False):
        return False

    # Find max round (final)
    from sqlalchemy import func
    max_round = db.query(func.max(KnockoutMatch.round)).filter(
        KnockoutMatch.tournament_id == tournament_id,
        KnockoutMatch.round != BRONZE_ROUND
    ).scalar()
    if not max_round or max_round < 2:
        return False
    
    semi_round = max_round - 1
    
    # Get semifinals
    semis = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == tournament_id,
        KnockoutMatch.round == semi_round
    ).order_by(KnockoutMatch.match_no).limit(2).all()
    
    if len(semis) < 2:
        return False
    
    # Check both semis are complete
    losers = []
    for semi in semis:
        if semi.score1 is None or semi.score2 is None or semi.score1 == semi.score2:
            return False
        p1 = semi.player1_id
        p2 = semi.player2_id
        if p1 is None or p2 is None:
            return False
        loser = p2 if semi.score1 > semi.score2 else p1
        losers.append(loser)
    
    # Find or create bronze match
    bronze = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == tournament_id,
        KnockoutMatch.round == BRONZE_ROUND
    ).first()
    
    if bronze:
        bronze.player1_id = losers[0]
        bronze.player2_id = losers[1]
    else:
        bronze = KnockoutMatch(
            tournament_id=tournament_id,
            round=BRONZE_ROUND,
            match_no=1,
            player1_id=losers[0],
            player2_id=losers[1]
        )
        db.add(bronze)
    
    db.commit()
    return True

