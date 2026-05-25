# User Schemas - Pydantic Models
# v1.2.0-alpha.2

from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models.user import UserRole


class UserBase(BaseModel):
    """Base User Schema"""
    username: str
    email: str


class UserCreate(BaseModel):
    """Schema for creating a new user"""
    email: EmailStr
    role: UserRole = UserRole.USER
    is_active: bool = True
    username: str | None = None
    password: str | None = None


class UserUpdate(BaseModel):
    """Schema for updating a user"""
    username: str | None = None
    email: EmailStr | None = None
    password: str | None = None  # Optional for updates
    role: UserRole | None = None
    is_active: bool | None = None


class UserLogin(BaseModel):
    """Schema for user login"""
    username: str
    password: str


class UserResponse(UserBase):
    """Schema for user response"""
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    """Schema for JWT Token Response"""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for JWT Token Payload"""
    user_id: int
    username: str
    role: str

