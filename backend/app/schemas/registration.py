from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class RegistrationCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: Optional[str] = None


class RegistrationVerifyOTP(BaseModel):
    email: EmailStr
    otp_code: str


class RegistrationReject(BaseModel):
    reason: Optional[str] = None


class RegistrationResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    status: str
    otp_verified: bool
    invitation_tournament_id: Optional[int] = None
    invitation_league_id: Optional[int] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    reject_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
