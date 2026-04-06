# Participant Schemas - Pydantic Models
# v1.2.0-alpha.2

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


class ParticipantBase(BaseModel):
    """Base Participant Schema"""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(default="", max_length=100)
    club: str | None = Field(default=None, max_length=200)
    scolia_id: str | None = Field(default=None, max_length=50, description="Scolia ID")
    email: str | None = Field(default=None, max_length=200)
    nickname: str | None = Field(default=None, max_length=50)
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        """Validate email if provided"""
        if v is None or v == '':
            return None
        # Use EmailStr for validation
        from email_validator import validate_email, EmailNotValidError
        try:
            validate_email(v)
            return v
        except EmailNotValidError:
            raise ValueError('Invalid email format')

    @field_validator('first_name')
    @classmethod
    def validate_first_name(cls, v: str) -> str:
        value = (v or '').strip()
        if not value:
            raise ValueError('First name is required')
        return value

    @field_validator('last_name')
    @classmethod
    def normalize_last_name(cls, v: str | None) -> str:
        return (v or '').strip()


class ParticipantCreate(ParticipantBase):
    """Schema for creating a new participant"""
    pass


class ParticipantUpdate(BaseModel):
    """Schema for updating a participant"""
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    club: str | None = None
    scolia_id: str | None = None
    email: str | None = Field(default=None, max_length=200)
    nickname: str | None = None


class ParticipantResponse(ParticipantBase):
    """Schema for participant response"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

