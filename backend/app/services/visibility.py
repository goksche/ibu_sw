"""Visibility/access-control helpers for tournaments and leagues."""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, Query
from sqlalchemy import or_

from app.models.tournament import Tournament
from app.models.league import League
from app.models.tournament_share import TournamentShare
from app.models.league_share import LeagueShare
from app.models.user import User, UserRole


def _is_power_admin(user: User) -> bool:
    return user.role == UserRole.POWER_ADMIN


def _user_has_tournament_access(db: Session, tournament: Tournament, user: User) -> bool:
    if _is_power_admin(user):
        return True
    if tournament.visibility == "public":
        return True
    if tournament.creator_id == user.id:
        return True
    if tournament.visibility in ("shared", "private"):
        share = db.query(TournamentShare).filter(
            TournamentShare.tournament_id == tournament.id,
            or_(
                TournamentShare.shared_with_user_id == user.id,
                TournamentShare.shared_with_email == user.email,
            ),
        ).first()
        if share:
            return True
    return False


def get_accessible_tournament(db: Session, tournament_id: int, current_user: User) -> Tournament:
    """Load tournament and check visibility. Returns 404 to avoid revealing existence."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turnier nicht gefunden")
    if not _user_has_tournament_access(db, tournament, current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turnier nicht gefunden")
    return tournament


def get_visible_tournaments_query(db: Session, current_user: User) -> Query:
    """Return a query that only includes tournaments visible to the user."""
    if _is_power_admin(current_user):
        return db.query(Tournament)

    shared_ids_subq = (
        db.query(TournamentShare.tournament_id)
        .filter(
            or_(
                TournamentShare.shared_with_user_id == current_user.id,
                TournamentShare.shared_with_email == current_user.email,
            )
        )
        .subquery()
    )

    return db.query(Tournament).filter(
        or_(
            Tournament.visibility == "public",
            Tournament.creator_id == current_user.id,
            Tournament.id.in_(shared_ids_subq),
        )
    )


# --- League analogues ---

def _user_has_league_access(db: Session, league: League, user: User) -> bool:
    if _is_power_admin(user):
        return True
    if league.visibility == "public":
        return True
    share = db.query(LeagueShare).filter(
        LeagueShare.league_id == league.id,
        or_(
            LeagueShare.shared_with_user_id == user.id,
            LeagueShare.shared_with_email == user.email,
        ),
    ).first()
    if share:
        return True
    return False


def get_accessible_league(db: Session, league_id: int, current_user: User) -> League:
    league = db.query(League).filter(League.id == league_id).first()
    if not league:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meisterschaft nicht gefunden")
    if not _user_has_league_access(db, league, current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meisterschaft nicht gefunden")
    return league


def get_visible_leagues_query(db: Session, current_user: User) -> Query:
    if _is_power_admin(current_user):
        return db.query(League)

    shared_ids_subq = (
        db.query(LeagueShare.league_id)
        .filter(
            or_(
                LeagueShare.shared_with_user_id == current_user.id,
                LeagueShare.shared_with_email == current_user.email,
            )
        )
        .subquery()
    )

    return db.query(League).filter(
        or_(
            League.visibility == "public",
            League.id.in_(shared_ids_subq),
        )
    )
