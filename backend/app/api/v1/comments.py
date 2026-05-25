"""REST API endpoints for comments and reactions."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from collections import defaultdict

from app.core.database import get_db
from app.core.dependencies import require_viewer_or_above
from app.models.user import User, UserRole
from app.models.comment import Comment, CommentReaction
from app.models.user_profile import UserProfile
from app.schemas.comment import (
    CommentCreate,
    ReactionCreate,
    CommentResponse,
    CommentListResponse,
    ReactionSummary,
)
from app.services.visibility import get_accessible_tournament
from app.services.comment_manager import manager

router = APIRouter(tags=["Comments"])


def _build_comment_response(comment: Comment, current_user_id: int, db: Session) -> dict:
    """Build a CommentResponse dict from a Comment ORM object."""
    reactions = db.query(CommentReaction).filter(CommentReaction.comment_id == comment.id).all()
    summary = {"like": 0, "fire": 0, "trophy": 0, "laugh": 0}
    my_reactions = []
    for r in reactions:
        if r.reaction in summary:
            summary[r.reaction] += 1
        if r.user_id == current_user_id:
            my_reactions.append(r.reaction)

    profile = db.query(UserProfile).filter(UserProfile.user_id == comment.user_id).first()

    return {
        "id": comment.id,
        "tournament_id": comment.tournament_id,
        "user_id": comment.user_id,
        "username": comment.user.username if comment.user else "?",
        "display_name": profile.display_name if profile else None,
        "avatar_url": profile.avatar_url if profile else None,
        "context": comment.context,
        "content": comment.content if not comment.deleted_at else "[Kommentar gelöscht]",
        "reactions": ReactionSummary(**summary, my_reactions=my_reactions),
        "created_at": comment.created_at,
        "is_deleted": comment.deleted_at is not None,
    }


@router.get("/tournaments/{tournament_id}/comments", response_model=CommentListResponse)
def get_comments(
    tournament_id: int,
    context: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer_or_above),
):
    get_accessible_tournament(db, tournament_id, current_user)

    q = db.query(Comment).filter(Comment.tournament_id == tournament_id)
    if context:
        q = q.filter(Comment.context == context)
    q = q.order_by(Comment.created_at.asc())
    comments = q.all()

    result = [_build_comment_response(c, current_user.id, db) for c in comments]
    return {"comments": result, "total": len(result)}


@router.post("/tournaments/{tournament_id}/comments", response_model=CommentResponse, status_code=201)
async def create_comment(
    tournament_id: int,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer_or_above),
):
    get_accessible_tournament(db, tournament_id, current_user)

    comment = Comment(
        tournament_id=tournament_id,
        user_id=current_user.id,
        context=payload.context,
        content=payload.content,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    resp = _build_comment_response(comment, current_user.id, db)
    await manager.broadcast(tournament_id, "new_comment", resp)
    return resp


@router.delete("/comments/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer_or_above),
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Kommentar nicht gefunden")

    is_owner = comment.user_id == current_user.id
    is_admin = current_user.role in (UserRole.ADMIN, UserRole.POWER_ADMIN)
    if not is_owner and not is_admin:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")

    from datetime import datetime
    comment.deleted_at = datetime.utcnow()
    comment.content = ""
    db.commit()

    await manager.broadcast(comment.tournament_id, "delete_comment", {"id": comment_id})
    return


@router.post("/comments/{comment_id}/reactions", response_model=CommentResponse)
async def add_reaction(
    comment_id: int,
    payload: ReactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer_or_above),
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment or comment.deleted_at:
        raise HTTPException(status_code=404, detail="Kommentar nicht gefunden")

    get_accessible_tournament(db, comment.tournament_id, current_user)

    existing = db.query(CommentReaction).filter(
        CommentReaction.comment_id == comment_id,
        CommentReaction.user_id == current_user.id,
        CommentReaction.reaction == payload.reaction,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Reaktion bereits vorhanden")

    reaction = CommentReaction(
        comment_id=comment_id,
        user_id=current_user.id,
        reaction=payload.reaction,
    )
    db.add(reaction)
    db.commit()

    resp = _build_comment_response(comment, current_user.id, db)
    await manager.broadcast(comment.tournament_id, "new_reaction", {
        "comment_id": comment_id,
        "reaction": payload.reaction,
        "user_id": current_user.id,
        "comment": resp,
    })
    return resp


@router.delete("/comments/{comment_id}/reactions/{reaction}", response_model=CommentResponse)
async def remove_reaction(
    comment_id: int,
    reaction: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer_or_above),
):
    if reaction not in ("like", "fire", "trophy", "laugh"):
        raise HTTPException(status_code=400, detail="Ungültige Reaktion")

    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Kommentar nicht gefunden")

    existing = db.query(CommentReaction).filter(
        CommentReaction.comment_id == comment_id,
        CommentReaction.user_id == current_user.id,
        CommentReaction.reaction == reaction,
    ).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Reaktion nicht gefunden")

    db.delete(existing)
    db.commit()

    resp = _build_comment_response(comment, current_user.id, db)
    await manager.broadcast(comment.tournament_id, "remove_reaction", {
        "comment_id": comment_id,
        "reaction": reaction,
        "user_id": current_user.id,
        "comment": resp,
    })
    return resp
