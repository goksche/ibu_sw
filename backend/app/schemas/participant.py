# Participant Schemas - Pydantic Models
# v1.2.0-alpha.2

from pydantic import BaseModel, Field, EmailStr
from datetime import datetime


class ParticipantBase(BaseModel):
    """Base Participant Schema"""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    club: str | None = Field(default=None, max_length=200)
    license_number: str | None = Field(default=None, max_length=50)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)


class ParticipantCreate(ParticipantBase):
    """Schema for creating a new participant"""
    pass


class ParticipantUpdate(BaseModel):
    """Schema for updating a participant"""
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    club: str | None = None
    license_number: str | None = None
    email: EmailStr | None = None
    phone: str | None = None


class ParticipantResponse(ParticipantBase):
    """Schema for participant response"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

