# User Model - SQLAlchemy
# v1.2.0-alpha.2

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator
import enum
from datetime import datetime
from app.core.database import Base


class UserRole(str, enum.Enum):
    """User roles; values = public API (JWT, Frontend). DB userrole uses uppercase labels."""

    POWER_ADMIN = "power_admin"
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"


_pg_userrole = PgEnum(
    "POWER_ADMIN",
    "ADMIN",
    "USER",
    "VIEWER",
    name="userrole",
    create_type=False,
)


class PgUserRoleType(TypeDecorator):
    """Maps PostgreSQL native ``userrole`` labels to :class:`UserRole`."""

    impl = _pg_userrole
    cache_ok = True

    _PG_TO_PY = {
        "POWER_ADMIN": UserRole.POWER_ADMIN,
        "ADMIN": UserRole.ADMIN,
        "USER": UserRole.USER,
        "VIEWER": UserRole.VIEWER,
    }
    _PY_TO_PG = {py: pg for pg, py in _PG_TO_PY.items()}

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, UserRole):
            return self._PY_TO_PG[value]
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, UserRole):
            return value
        label = value.name if hasattr(value, "name") else str(value)
        mapped = self._PG_TO_PY.get(label)
        if mapped is not None:
            return mapped
        return value


class User(Base):
    """User Model for Authentication and Authorization"""

    __tablename__ = "users"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # User Information
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    # Role (Postgres native enum userrole ↔ Python UserRole)
    role = Column(PgUserRoleType(), default=UserRole.USER, nullable=False)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    # tournaments = relationship("Tournament", back_populates="creator")
    app_permissions = relationship(
        "UserAppPermission",
        foreign_keys="[UserAppPermission.user_id]",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    feedbacks = relationship("Feedback", back_populates="user", cascade="all, delete-orphan")
    feedback_comments = relationship("FeedbackComment", back_populates="user", cascade="all, delete-orphan")


class OTPCode(Base):
    """OTP Code Model for Email-based Authentication"""

    __tablename__ = "otp_codes"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Foreign Key to User
    user_id = Column(Integer, index=True, nullable=False)

    # OTP Information
    email = Column(String(100), nullable=False)
    otp_code = Column(String(6), nullable=False)
    purpose = Column(String(20), default="login", nullable=False)  # login, password_reset, etc.

    # Expiration
    expires_at = Column(DateTime, nullable=False)

    # Status
    is_used = Column(Boolean, default=False, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def is_expired(self) -> bool:
        """Check if OTP code is expired"""
        return datetime.utcnow() > self.expires_at

    def is_valid(self) -> bool:
        """Check if OTP code is valid (not used and not expired)"""
        return not self.is_used and not self.is_expired()
