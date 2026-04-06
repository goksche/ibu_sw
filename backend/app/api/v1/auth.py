# Authentication Endpoints
# v1.2.0-alpha.2

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
import re
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token
from app.core.config import settings
from app.core.dependencies import get_current_user, get_user_app_permissions, require_admin
import secrets
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
 
from app.schemas.user import UserCreate, UserUpdate, UserLogin, UserResponse, Token
from app.models.user import User, UserRole, OTPCode
from app.models.logs import LoginEventLog
from app.services.logs_service import extract_client_ip, extract_user_agent, maybe_cleanup_old_logs

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _safe_log_login_event(
    db: Session,
    request: Request,
    event_type: str,
    success: bool,
    username: Optional[str] = None,
    email: Optional[str] = None,
    user_id: Optional[int] = None,
    reason: Optional[str] = None
) -> None:
    try:
        log = LoginEventLog(
            user_id=user_id,
            username=username,
            email=email,
            event_type=event_type,
            success=success,
            reason=reason,
            ip=extract_client_ip(request),
            user_agent=extract_user_agent(request)
        )
        db.add(log)
        db.commit()
        try:
            maybe_cleanup_old_logs(db)
        except Exception:
            pass
    except Exception:
        db.rollback()


class TokenRefresh(BaseModel):
    """Schema for token refresh request"""
    access_token: str


class TokenValidation(BaseModel):
    """Schema for token validation response"""
    valid: bool
    user_id: Optional[int] = None
    username: Optional[str] = None
    role: Optional[str] = None


class UserResponseWithPermissions(UserResponse):
    """User Response with app permissions"""
    app_permissions: List[int] = []


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, request: Request, db: Session = Depends(get_db)):
    """Login and get access token"""
    
    # Find user
    user = db.query(User).filter(User.username == credentials.username).first()
    if not user:
        _safe_log_login_event(
            db=db,
            request=request,
            event_type="password_login",
            success=False,
            username=credentials.username,
            reason="user_not_found"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user.hashed_password):
        _safe_log_login_event(
            db=db,
            request=request,
            event_type="password_login",
            success=False,
            username=credentials.username,
            user_id=user.id,
            reason="invalid_password"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Check if user is active
    if not user.is_active:
        _safe_log_login_event(
            db=db,
            request=request,
            event_type="password_login",
            success=False,
            username=credentials.username,
            user_id=user.id,
            reason="inactive_user"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id, "role": user.role.value}
    )

    _safe_log_login_event(
        db=db,
        request=request,
        event_type="password_login",
        success=True,
        username=user.username,
        user_id=user.id
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponseWithPermissions)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current authenticated user with app permissions"""
    app_permissions = get_user_app_permissions(current_user.id, db)
    
    return UserResponseWithPermissions(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        app_permissions=app_permissions
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_data: TokenRefresh,
    db: Session = Depends(get_db)
):
    """Refresh access token"""
    payload = decode_access_token(token_data.access_token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    username: str = payload.get("sub")
    user_id: int = payload.get("user_id")
    role: str = payload.get("role")
    
    if username is None or user_id is None or role is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Verify user still exists and is active
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Create new access token
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id, "role": user.role.value}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/validate", response_model=TokenValidation)
async def validate_token(token_data: TokenRefresh):
    """Validate access token"""
    payload = decode_access_token(token_data.access_token)
    
    if payload is None:
        return TokenValidation(valid=False)
    
    username: str = payload.get("sub")
    user_id: int = payload.get("user_id")
    role: str = payload.get("role")
    
    if username is None or user_id is None or role is None:
        return TokenValidation(valid=False)
    
    return TokenValidation(
        valid=True,
        user_id=user_id,
        username=username,
        role=role
    )


# OTP Authentication Routes

class SendOTPRequest(BaseModel):
    """Request model for sending OTP"""
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    """Request model for verifying OTP"""
    email: EmailStr
    otp_code: str


def send_email_otp(email: str, otp_code: str) -> bool:
    """Send OTP code via email"""
    if not settings.SMTP_HOST:
        print("SMTP not configured - cannot send OTP email.")
        return False

    try:
        smtp_from = settings.SMTP_FROM or settings.SMTP_USERNAME or "noreply@localhost"

        # Create message
        msg = MIMEMultipart()
        msg['From'] = smtp_from
        msg['To'] = email
        msg['Subject'] = "IBU Turniere - Ihr Login-Code"

        body = f"""
Hallo,

Ihr Einmal-Code für die Anmeldung bei IBU Turniere lautet:

{otp_code}

Dieser Code ist {settings.OTP_EXPIRY_MINUTES} Minuten gültig.

Falls Sie diese E-Mail nicht erwartet haben, ignorieren Sie sie bitte.

Mit freundlichen Grüßen,
Ihr IBU Turniere Team
"""
        msg.attach(MIMEText(body, 'plain'))

        # Send email (robust against strict SMTP servers)
        try:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            server.ehlo()
            if settings.SMTP_USE_TLS:
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(smtp_from, [email], msg.as_string())
            server.quit()
            return True
        except smtplib.SMTPServerDisconnected:
            # Some providers close the first session unexpectedly; reconnect once.
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            server.ehlo()
            if settings.SMTP_USE_TLS:
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(smtp_from, [email], msg.as_string())
            server.quit()
            return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False


@router.post("/send-otp", response_model=dict)
async def send_otp(request: SendOTPRequest, db: Session = Depends(get_db), http_request: Request = None):
    """Send OTP code to email for login"""

    # Whitelist: email must exist and be active
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not user.is_active:
        if http_request:
            _safe_log_login_event(
                db=db,
                request=http_request,
                event_type="otp_send",
                success=False,
                email=request.email,
                reason="user_not_active_or_missing"
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="E-Mail ist nicht freigegeben oder Account ist inaktiv"
        )

    # Generate OTP
    otp_code = f"{secrets.randbelow(10 ** settings.OTP_LENGTH):0{settings.OTP_LENGTH}d}"

    # Save OTP to database
    expires_at = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)

    # Invalidate any existing OTPs for this user
    db.query(OTPCode).filter(
        OTPCode.user_id == user.id,
        OTPCode.purpose == "login",
        OTPCode.is_used == False
    ).update({"is_used": True})

    # Create new OTP
    otp_record = OTPCode(
        user_id=user.id,
        email=request.email,
        otp_code=otp_code,
        purpose="login",
        expires_at=expires_at
    )
    db.add(otp_record)
    db.commit()

    # Send email (or dev fallback)
    if send_email_otp(request.email, otp_code):
        if http_request:
            _safe_log_login_event(
                db=db,
                request=http_request,
                event_type="otp_send",
                success=True,
                email=request.email,
                user_id=user.id
            )
        return {"message": "OTP-Code wurde per E-Mail versendet."}

    if settings.OTP_DEV_MODE:
        if http_request:
            _safe_log_login_event(
                db=db,
                request=http_request,
                event_type="otp_send",
                success=True,
                email=request.email,
                user_id=user.id
            )
        print(f"DEV OTP Code for {request.email}: {otp_code}")
        return {"message": "OTP-Code wurde erzeugt (DEV).", "dev_otp_code": otp_code}

    if http_request:
        _safe_log_login_event(
            db=db,
            request=http_request,
            event_type="otp_send",
            success=False,
            email=request.email,
            user_id=user.id,
            reason="smtp_not_configured_or_failed"
        )
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="OTP konnte nicht versendet werden. SMTP-Konfiguration oder Verbindung prüfen."
    )


@router.post("/verify-otp", response_model=Token)
async def verify_otp(request: VerifyOTPRequest, db: Session = Depends(get_db), http_request: Request = None):
    """Verify OTP code and return access token"""

    # Find OTP record
    otp_record = db.query(OTPCode).filter(
        OTPCode.email == request.email,
        OTPCode.otp_code == request.otp_code,
        OTPCode.purpose == "login",
        OTPCode.is_used == False
    ).first()

    if not otp_record or not otp_record.is_valid():
        if http_request:
            _safe_log_login_event(
                db=db,
                request=http_request,
                event_type="otp_verify",
                success=False,
                email=request.email,
                reason="invalid_or_expired"
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültiger oder abgelaufener OTP-Code"
        )

    # Mark OTP as used
    otp_record.is_used = True
    db.commit()

    # Get user
    user = db.query(User).filter(User.id == otp_record.user_id).first()
    if not user or not user.is_active:
        if http_request:
            _safe_log_login_event(
                db=db,
                request=http_request,
                event_type="otp_verify",
                success=False,
                email=request.email,
                user_id=otp_record.user_id,
                reason="inactive_user"
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account ist nicht aktiv"
        )

    # Create access token
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id, "role": user.role.value}
    )

    if http_request:
        _safe_log_login_event(
            db=db,
            request=http_request,
            event_type="otp_verify",
            success=True,
            email=request.email,
            user_id=user.id,
            username=user.username
        )

    return Token(access_token=access_token, token_type="bearer")


@router.get("/dev-otp/{email}")
async def get_dev_otp(email: str):
    """Get the development OTP code for an email (only for development)"""
    return {"email": email, "otp_code": "123456", "message": "Development OTP code"}


# User Management Routes (Admin only)

@router.get("/users", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all users (Admin only)"""
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a new user (Admin only)"""

    # Check if email already exists
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )

    def normalize_username(value: str) -> str:
        cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "", value.strip().lower())
        return cleaned or "user"

    # Resolve username (optional)
    if user_data.username and user_data.username.strip():
        candidate = user_data.username.strip()
        existing_user = db.query(User).filter(User.username == candidate).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
    else:
        base = normalize_username(user_data.email.split("@")[0])
        candidate = base
        suffix = 1
        while db.query(User).filter(User.username == candidate).first():
            candidate = f"{base}{suffix}"
            suffix += 1

    # Create new user
    if user_data.password and user_data.password.strip():
        hashed_password = get_password_hash(user_data.password)
    else:
        hashed_password = get_password_hash(secrets.token_urlsafe(24))
    new_user = User(
        username=candidate,
        email=user_data.email,
        hashed_password=hashed_password,
        role=user_data.role,
        is_active=user_data.is_active
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update a user (Admin only)"""

    # Get user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user_data.username is not None:
        candidate = user_data.username.strip()
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username cannot be empty"
            )
        existing_user = db.query(User).filter(
            User.username == candidate,
            User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
        user.username = candidate

    if user_data.email is not None:
        existing_email = db.query(User).filter(
            User.email == user_data.email,
            User.id != user_id
        ).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )
        user.email = user_data.email

    if user_data.role is not None:
        user.role = user_data.role

    if user_data.is_active is not None:
        user.is_active = user_data.is_active

    # Update password if provided
    if user_data.password and user_data.password.strip():
        user.hashed_password = get_password_hash(user_data.password)

    db.commit()
    db.refresh(user)

    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete a user (Admin only)"""

    # Cannot delete yourself
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    # Get user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Delete user
    db.delete(user)
    db.commit()

    return

