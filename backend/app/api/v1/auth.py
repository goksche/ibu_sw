# Authentication Endpoints
# v1.2.0-alpha.2

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List, Optional
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token
from app.core.config import settings
from app.core.dependencies import get_current_user, get_user_app_permissions, require_admin
import pyotp
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import timedelta
from app.schemas.user import UserCreate, UserUpdate, UserLogin, UserResponse, Token
from app.models.user import User, UserRole, OTPCode

router = APIRouter(prefix="/auth", tags=["Authentication"])


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
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login and get access token"""
    
    # Find user
    user = db.query(User).filter(User.username == credentials.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id, "role": user.role.value}
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
    try:
        # Email configuration (should be in settings)
        smtp_server = "smtp.gmail.com"  # Example - should be configurable
        smtp_port = 587
        smtp_username = "your-email@gmail.com"  # Should be in settings
        smtp_password = "your-app-password"  # Should be in settings

        # Create message
        msg = MIMEMultipart()
        msg['From'] = smtp_username
        msg['To'] = email
        msg['Subject'] = "IBU Turniere - Ihr Login-Code"

        body = f"""
Hallo,

Ihr Einmal-Code für die Anmeldung bei IBU Turniere lautet:

{otp_code}

Dieser Code ist 10 Minuten gültig.

Falls Sie diese E-Mail nicht erwartet haben, ignorieren Sie sie bitte.

Mit freundlichen Grüßen,
Ihr IBU Turniere Team
"""
        msg.attach(MIMEText(body, 'plain'))

        # Send email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        text = msg.as_string()
        server.sendmail(smtp_username, email, text)
        server.quit()

        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False


@router.post("/send-otp", response_model=dict)
async def send_otp(request: SendOTPRequest, db: Session = Depends(get_db)):
    """Send OTP code to email for login"""

    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # Don't reveal if email exists or not for security
        return {"message": "Wenn die E-Mail-Adresse registriert ist, wurde ein Code versendet."}

    if not user.is_active:
        return {"message": "Account ist nicht aktiv."}

    # Generate OTP (fixed code for development)
    # totp = pyotp.TOTP(pyotp.random_base32(), interval=600)  # 10 minutes
    # otp_code = totp.now()
    otp_code = "123456"  # Fixed code for development testing

    # Save OTP to database
    expires_at = datetime.utcnow() + timedelta(minutes=10)

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

    # Save OTP to file for easy access during development
    otp_file = "otp_codes.txt"
    with open(otp_file, "a") as f:
        f.write(f"{datetime.utcnow()}: OTP Code for {request.email}: {otp_code}\n")

    # Also print to console
    print(f"OTP Code for {request.email}: {otp_code}")
    print(f"OTP also saved to file: {otp_file}")
    print(f"🔑 DEVELOPMENT OTP CODE: {otp_code} (use this for testing)")

    # In production: send_email_otp(request.email, otp_code)

    return {"message": "OTP-Code wurde versendet.", "dev_otp_code": otp_code}


@router.post("/verify-otp", response_model=Token)
async def verify_otp(request: VerifyOTPRequest, db: Session = Depends(get_db)):
    """Verify OTP code and return access token"""

    # Find OTP record
    otp_record = db.query(OTPCode).filter(
        OTPCode.email == request.email,
        OTPCode.otp_code == request.otp_code,
        OTPCode.purpose == "login",
        OTPCode.is_used == False
    ).first()

    if not otp_record or not otp_record.is_valid():
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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account ist nicht aktiv"
        )

    # Create access token
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id, "role": user.role.value}
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

    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )

    # Check if email already exists
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )

    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
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

    # Check if username already exists (excluding current user)
    existing_user = db.query(User).filter(
        User.username == user_data.username,
        User.id != user_id
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )

    # Check if email already exists (excluding current user)
    existing_email = db.query(User).filter(
        User.email == user_data.email,
        User.id != user_id
    ).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )

    # Update user
    user.username = user_data.username
    user.email = user_data.email
    user.role = user_data.role
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

