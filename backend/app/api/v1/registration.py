from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List
import secrets

from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_password_hash, create_access_token
from app.core.dependencies import require_power_admin, get_current_user
from app.models.user import User, UserRole, OTPCode
from app.models.registration import RegistrationRequest, RegistrationStatus
from app.schemas.registration import (
    RegistrationCreate, RegistrationVerifyOTP, RegistrationReject, RegistrationResponse
)
from app.services.email_service import (
    send_registration_otp, send_registration_approved, send_registration_rejected,
    send_admin_new_registration
)

router = APIRouter(prefix="/auth", tags=["Registration"])


# --- Public endpoints ---

@router.post("/register", response_model=dict)
async def register(data: RegistrationCreate, db: Session = Depends(get_db)):
    """Create a registration request and send OTP for email verification."""
    first_name = (data.first_name or "").strip()
    last_name = (data.last_name or "").strip()

    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ein Konto mit dieser E-Mail existiert bereits. Bitte logge dich ein."
        )

    existing_request = db.query(RegistrationRequest).filter(
        RegistrationRequest.email == data.email
    ).first()

    if existing_request:
        if existing_request.status == RegistrationStatus.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Diese E-Mail wurde bereits genehmigt."
            )
        if existing_request.status == RegistrationStatus.PENDING and existing_request.otp_verified:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Dein Antrag wartet bereits auf Freigabe."
            )
        if existing_request.status == RegistrationStatus.REJECTED:
            db.delete(existing_request)
            db.flush()
            existing_request = None

    if not existing_request:
        existing_request = RegistrationRequest(
            email=data.email,
            first_name=first_name,
            last_name=last_name,
        )
        db.add(existing_request)
        db.flush()
    else:
        existing_request.first_name = first_name
        existing_request.last_name = last_name
        existing_request.otp_verified = False
        existing_request.updated_at = datetime.utcnow()

    otp_code = f"{secrets.randbelow(10 ** settings.OTP_LENGTH):0{settings.OTP_LENGTH}d}"
    expires_at = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)

    db.query(OTPCode).filter(
        OTPCode.email == data.email,
        OTPCode.purpose == "registration",
        OTPCode.is_used == False
    ).update({"is_used": True})

    otp_record = OTPCode(
        user_id=0,
        email=data.email,
        otp_code=otp_code,
        purpose="registration",
        expires_at=expires_at
    )
    db.add(otp_record)
    db.commit()

    if send_registration_otp(data.email, otp_code, first_name):
        return {"message": "Bestätigungscode wurde per E-Mail versendet."}

    if settings.OTP_DEV_MODE:
        print(f"DEV Registration OTP for {data.email}: {otp_code}")
        return {"message": "Bestätigungscode wurde erzeugt (DEV).", "dev_otp_code": otp_code}

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="E-Mail konnte nicht versendet werden. Bitte versuche es später erneut."
    )


@router.post("/register/verify-otp", response_model=dict)
async def register_verify_otp(data: RegistrationVerifyOTP, db: Session = Depends(get_db)):
    """Verify OTP for registration request."""

    otp_record = db.query(OTPCode).filter(
        OTPCode.email == data.email,
        OTPCode.otp_code == data.otp_code,
        OTPCode.purpose == "registration",
        OTPCode.is_used == False
    ).first()

    if not otp_record or not otp_record.is_valid():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültiger oder abgelaufener Code."
        )

    otp_record.is_used = True

    reg = db.query(RegistrationRequest).filter(
        RegistrationRequest.email == data.email,
        RegistrationRequest.status == RegistrationStatus.PENDING
    ).first()

    if not reg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kein Registrierungsantrag gefunden."
        )

    reg.otp_verified = True
    reg.updated_at = datetime.utcnow()
    db.commit()

    _notify_power_admin(db, reg)

    return {"message": "E-Mail verifiziert. Dein Antrag wartet auf Freigabe durch den Administrator."}


# --- Power Admin endpoints ---

@router.get("/admin/registrations", response_model=List[RegistrationResponse])
async def list_registrations(
    current_user: User = Depends(require_power_admin),
    db: Session = Depends(get_db)
):
    """List all registration requests (Power Admin only)."""
    return db.query(RegistrationRequest).order_by(
        RegistrationRequest.created_at.desc()
    ).all()


@router.post("/admin/registrations/{reg_id}/approve", response_model=RegistrationResponse)
async def approve_registration(
    reg_id: int,
    force_unverified: bool = Query(
        False,
        description="Nur Power-Admin: Genehmigen trotz fehlender E-Mail-OTP-Verifizierung (z. B. SMTP-Probleme).",
    ),
    current_user: User = Depends(require_power_admin),
    db: Session = Depends(get_db),
):
    """Approve a registration request – creates a new user account."""
    reg = db.query(RegistrationRequest).filter(RegistrationRequest.id == reg_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Antrag nicht gefunden.")
    if reg.status != RegistrationStatus.PENDING:
        raise HTTPException(status_code=400, detail="Antrag wurde bereits bearbeitet.")
    if not reg.otp_verified and not force_unverified:
        raise HTTPException(status_code=400, detail="E-Mail wurde noch nicht verifiziert.")

    username = reg.email.split("@")[0].lower().replace(".", "_").replace("-", "_")
    base_username = username
    counter = 1
    while db.query(User).filter(User.username == username).first():
        username = f"{base_username}_{counter}"
        counter += 1

    dummy_password = get_password_hash(secrets.token_urlsafe(32))
    new_user = User(
        username=username,
        email=reg.email,
        hashed_password=dummy_password,
        role=UserRole.VIEWER,
        is_active=True
    )
    db.add(new_user)

    reg.status = RegistrationStatus.APPROVED
    reg.reviewed_by = current_user.id
    reg.reviewed_at = datetime.utcnow()
    reg.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(reg)

    send_registration_approved(reg.email, reg.first_name)

    return reg


@router.post("/admin/registrations/{reg_id}/reject", response_model=RegistrationResponse)
async def reject_registration(
    reg_id: int,
    body: RegistrationReject,
    current_user: User = Depends(require_power_admin),
    db: Session = Depends(get_db)
):
    """Reject a registration request."""
    reg = db.query(RegistrationRequest).filter(RegistrationRequest.id == reg_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Antrag nicht gefunden.")
    if reg.status != RegistrationStatus.PENDING:
        raise HTTPException(status_code=400, detail="Antrag wurde bereits bearbeitet.")

    reg.status = RegistrationStatus.REJECTED
    reg.reviewed_by = current_user.id
    reg.reviewed_at = datetime.utcnow()
    reg.reject_reason = body.reason
    reg.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(reg)

    send_registration_rejected(reg.email, reg.first_name, body.reason)

    return reg


@router.delete("/admin/registrations/{reg_id}")
async def delete_registration(
    reg_id: int,
    current_user: User = Depends(require_power_admin),
    db: Session = Depends(get_db)
):
    """Delete a registration request (cleanup)."""
    reg = db.query(RegistrationRequest).filter(RegistrationRequest.id == reg_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Antrag nicht gefunden.")
    db.delete(reg)
    db.commit()
    return {"message": "Antrag gelöscht."}


# --- Helper ---

def _notify_power_admin(db: Session, reg: RegistrationRequest):
    """Send email notification to all power admins."""
    power_admins = db.query(User).filter(User.role == UserRole.POWER_ADMIN, User.is_active == True).all()
    for admin in power_admins:
        send_admin_new_registration(admin.email, reg.email, reg.first_name, reg.last_name)
