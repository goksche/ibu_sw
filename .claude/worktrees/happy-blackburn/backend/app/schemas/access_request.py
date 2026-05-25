from pydantic import BaseModel, Field, EmailStr
from typing import Optional


class AccessRequestCreate(BaseModel):
    """Schema für Zugangs-Anfrage (Landing Page)."""
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    sport: str = Field(..., min_length=1, max_length=100)
    organisation: Optional[str] = Field(None, max_length=200)
    source: Optional[str] = Field(None, max_length=200)
    website: Optional[str] = None  # Honeypot – wenn gesetzt, nicht speichern


class AccessRequestResponse(BaseModel):
    """Response nach erfolgreicher Anfrage."""
    success: bool = True
    message: str = "Anfrage wurde gesendet."
