# User Schemas - Pydantic Models
# v1.2.0-alpha.2

from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models.user import UserRole


class UserBase(BaseModel):
    """Base User Schema"""
    username: str
    email: EmailStr


class UserCreate(UserBase):
    """Schema for creating a new user"""
    password: str
    role: UserRole = UserRole.USER
    is_active: bool = True


class UserUpdate(BaseModel):
    """Schema for updating a user"""
    username: str
    email: EmailStr
    password: str = None  # Optional for updates
    role: UserRole
    is_active: bool = True


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

