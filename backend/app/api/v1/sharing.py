"""Sharing & visibility endpoints for tournaments and leagues."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import require_user_or_admin
from app.models.tournament import Tournament
from app.models.league import League
from app.models.tournament_share import TournamentShare
from app.models.league_share import LeagueShare
from app.models.user import User, UserRole
from app.schemas.sharing import ShareCreate, ShareResponse, VisibilityUpdate

router = APIRouter(tags=["Sharing"])


def _check_tournament_owner(db: Session, tournament_id: int, user: User) -> Tournament:
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Turnier nicht gefunden")
    if tournament.creator_id != user.id and user.role not in (UserRole.ADMIN, UserRole.POWER_ADMIN):
        raise HTTPException(status_code=403, detail="Nur der Ersteller oder ein Admin kann diese Aktion ausführen")
    return tournament


def _check_league_owner(db: Session, league_id: int, user: User) -> League:
    league = db.query(League).filter(League.id == league_id).first()
    if not league:
        raise HTTPException(status_code=404, detail="Meisterschaft nicht gefunden")
    if user.role not in (UserRole.ADMIN, UserRole.POWER_ADMIN):
        raise HTTPException(status_code=403, detail="Nur ein Admin kann diese Aktion ausführen")
    return league


# ---- Tournament Sharing ----

@router.put("/tournaments/{tournament_id}/visibility")
async def set_tournament_visibility(
    tournament_id: int,
    data: VisibilityUpdate,
    current_user: User = Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    tournament = _check_tournament_owner(db, tournament_id, current_user)
    tournament.visibility = data.visibility
    db.commit()
    return {"message": f"Sichtbarkeit auf '{data.visibility}' gesetzt."}


@router.get("/tournaments/{tournament_id}/shares", response_model=List[ShareResponse])
async def get_tournament_shares(
    tournament_id: int,
    current_user: User = Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    _check_tournament_owner(db, tournament_id, current_user)
    shares = db.query(TournamentShare).filter(TournamentShare.tournament_id == tournament_id).all()
    return shares


@router.post("/tournaments/{tournament_id}/share", response_model=ShareResponse, status_code=201)
async def share_tournament(
    tournament_id: int,
    data: ShareCreate,
    current_user: User = Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    tournament = _check_tournament_owner(db, tournament_id, current_user)

    existing = db.query(TournamentShare).filter(
        TournamentShare.tournament_id == tournament_id,
        TournamentShare.shared_with_email == data.email,
    ).first()
    if existing:
        existing.permission = data.permission
        db.commit()
        db.refresh(existing)
        return existing

    target_user = db.query(User).filter(User.email == data.email).first()

    share = TournamentShare(
        tournament_id=tournament_id,
        shared_with_user_id=target_user.id if target_user else None,
        shared_with_email=data.email,
        permission=data.permission,
    )
    db.add(share)

    if tournament.visibility == "public":
        tournament.visibility = "shared"

    db.commit()
    db.refresh(share)
    return share


@router.delete("/tournaments/{tournament_id}/share/{share_id}", status_code=204)
async def remove_tournament_share(
    tournament_id: int,
    share_id: int,
    current_user: User = Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    _check_tournament_owner(db, tournament_id, current_user)
    share = db.query(TournamentShare).filter(
        TournamentShare.id == share_id,
        TournamentShare.tournament_id == tournament_id,
    ).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share nicht gefunden")
    db.delete(share)
    db.commit()


# ---- League Sharing ----

@router.put("/leagues/{league_id}/visibility")
async def set_league_visibility(
    league_id: int,
    data: VisibilityUpdate,
    current_user: User = Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    league = _check_league_owner(db, league_id, current_user)
    league.visibility = data.visibility
    db.commit()
    return {"message": f"Sichtbarkeit auf '{data.visibility}' gesetzt."}


@router.get("/leagues/{league_id}/shares", response_model=List[ShareResponse])
async def get_league_shares(
    league_id: int,
    current_user: User = Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    _check_league_owner(db, league_id, current_user)
    shares = db.query(LeagueShare).filter(LeagueShare.league_id == league_id).all()
    return shares


@router.post("/leagues/{league_id}/share", response_model=ShareResponse, status_code=201)
async def share_league(
    league_id: int,
    data: ShareCreate,
    current_user: User = Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    league = _check_league_owner(db, league_id, current_user)

    existing = db.query(LeagueShare).filter(
        LeagueShare.league_id == league_id,
        LeagueShare.shared_with_email == data.email,
    ).first()
    if existing:
        existing.permission = data.permission
        db.commit()
        db.refresh(existing)
        return existing

    target_user = db.query(User).filter(User.email == data.email).first()

    share = LeagueShare(
        league_id=league_id,
        shared_with_user_id=target_user.id if target_user else None,
        shared_with_email=data.email,
        permission=data.permission,
    )
    db.add(share)

    if league.visibility == "public":
        league.visibility = "shared"

    db.commit()
    db.refresh(share)
    return share


@router.delete("/leagues/{league_id}/share/{share_id}", status_code=204)
async def remove_league_share(
    league_id: int,
    share_id: int,
    current_user: User = Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    _check_league_owner(db, league_id, current_user)
    share = db.query(LeagueShare).filter(
        LeagueShare.id == share_id,
        LeagueShare.league_id == league_id,
    ).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share nicht gefunden")
    db.delete(share)
    db.commit()
