# KO Result Propagation Service
# v1.3.4 - Fixed: moved score validation before DB query to avoid stale data

from sqlalchemy.orm import Session
from typing import Optional
from app.models.match import KnockoutMatch

BRONZE_ROUND = 99


def _next_round_slot_for(match_no: int) -> tuple[int, int]:
    """Determine target match and slot for winner"""
    target = (match_no + 1) // 2
    slot = 1 if (match_no % 2 == 1) else 2
    return target, slot


def save_ko_result_and_propagate(
    db: Session,
    match_id: int,
    score1: Optional[int],
    score2: Optional[int]
) -> None:
    """
    Propagate winner to next round (scores already saved in match)
    
    Desktop equivalent: save_ko_result_and_propagate
    """
    # Check if we should propagate
    if score1 is None or score2 is None or score1 == score2:
        return
    
    # Get the match
    match = db.query(KnockoutMatch).filter(KnockoutMatch.id == match_id).first()
    if not match:
        return
    
    # Check if we should propagate
    if match.round is None or match.match_no is None:
        return
    
    # Don't propagate from final
    from sqlalchemy import func
    max_round_result = db.query(func.max(KnockoutMatch.round)).filter(
        KnockoutMatch.tournament_id == match.tournament_id,
        KnockoutMatch.round != BRONZE_ROUND
    ).scalar()
    
    if max_round_result and match.round == max_round_result:
        return
    
    # Get winner
    player1_id = match.player1_id
    player2_id = match.player2_id
    if player1_id is None or player2_id is None:
        return
    
    winner_id = player1_id if score1 > score2 else player2_id
    
    # Determine next match
    target_match_no, slot = _next_round_slot_for(match.match_no)
    
    # Find target match
    target_match = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == match.tournament_id,
        KnockoutMatch.round == match.round + 1,
        KnockoutMatch.match_no == target_match_no
    ).first()
    
    if target_match:
        if slot == 1:
            target_match.player1_id = winner_id
        else:
            target_match.player2_id = winner_id
        db.commit()


def ensure_bronze_from_semis(db: Session, tournament_id: int) -> bool:
    """
    Create/update bronze match from semifinal losers
    
    Desktop equivalent: ensure_bronze_from_semis
    """
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

