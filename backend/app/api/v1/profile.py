from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from app.core.database import get_db
from app.core.config import settings as app_settings
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.user_profile import UserProfile
from app.models.participant import Participant
from app.schemas.profile import ProfileUpdate, ProfileResponse, ProfilePublic, ParticipantMatch
from app.services.s3_service import upload_avatar, delete_avatar

router = APIRouter(prefix="/profile", tags=["Profile"])


def _get_or_create_profile(db: Session, user: User) -> UserProfile:
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        profile = UserProfile(user_id=user.id, display_name=user.username)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return _get_or_create_profile(db, current_user)


@router.put("/me", response_model=ProfileResponse)
async def update_my_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = _get_or_create_profile(db, current_user)
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)
    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/me/avatar", response_model=ProfileResponse)
async def upload_my_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Nur JPG, PNG oder WebP erlaubt.")

    data = await file.read()
    if len(data) > app_settings.AVATAR_MAX_SIZE:
        raise HTTPException(status_code=400, detail="Datei zu gross (max. 2 MB).")

    url = upload_avatar(current_user.id, data, file.content_type)
    if not url:
        raise HTTPException(status_code=500, detail="Upload fehlgeschlagen.")

    profile = _get_or_create_profile(db, current_user)
    profile.avatar_url = url
    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)
    return profile


@router.delete("/me/avatar", response_model=ProfileResponse)
async def delete_my_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = _get_or_create_profile(db, current_user)
    if profile.avatar_url:
        delete_avatar(current_user.id, profile.avatar_url)
        profile.avatar_url = None
        profile.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(profile)
    return profile


@router.get("/{user_id}", response_model=ProfilePublic)
async def get_user_profile(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profil nicht gefunden.")
    if profile.is_private and profile.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Profil nicht gefunden.")
    return ProfilePublic(
        user_id=profile.user_id,
        display_name=profile.display_name,
        club=profile.club,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
    )


# --- Participant Matching ---

@router.get("/me/participant-match", response_model=Optional[ParticipantMatch])
async def check_participant_match(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if a participant with matching email exists for linking."""
    profile = _get_or_create_profile(db, current_user)
    if profile.participant_match_checked:
        return None

    already_linked = db.query(Participant).filter(Participant.user_id == current_user.id).first()
    if already_linked:
        profile.participant_match_checked = True
        db.commit()
        return None

    match = db.query(Participant).filter(
        Participant.email == current_user.email,
        Participant.user_id.is_(None)
    ).first()

    if not match:
        return None

    return ParticipantMatch(
        participant_id=match.id,
        first_name=match.first_name,
        last_name=match.last_name,
        email=match.email,
        club=match.club,
        already_linked=False,
    )


@router.post("/me/link-participant/{participant_id}", response_model=dict)
async def link_participant(
    participant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(Participant).filter(Participant.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bereits mit einem Teilnehmer verknüpft.")

    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Teilnehmer nicht gefunden.")
    if participant.user_id is not None:
        raise HTTPException(status_code=400, detail="Teilnehmer ist bereits verknüpft.")

    participant.user_id = current_user.id
    profile = _get_or_create_profile(db, current_user)
    profile.participant_match_checked = True
    db.commit()

    return {"message": f"Verknüpft mit {participant.first_name} {participant.last_name}."}


@router.delete("/me/unlink-participant", response_model=dict)
async def unlink_participant(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    participant = db.query(Participant).filter(Participant.user_id == current_user.id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Keine Verknüpfung vorhanden.")

    participant.user_id = None
    db.commit()
    return {"message": "Verknüpfung aufgehoben."}
