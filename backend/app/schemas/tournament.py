# Tournament Schemas - Pydantic Models
# v1.2.0-alpha.2

from pydantic import BaseModel, Field
from datetime import date, datetime
from app.models.tournament import TournamentMode, TournamentStatus


class TournamentBase(BaseModel):
    """Base Tournament Schema"""
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    start_date: date
    end_date: date | None = None
    mode: TournamentMode = TournamentMode.ROUND_ROBIN
    has_group_phase: bool = True
    has_ko_phase: bool = False


class TournamentCreate(TournamentBase):
    """Schema for creating a new tournament"""
    groups_count: int = Field(default=0, ge=0)
    participants_per_group: int | None = Field(default=None, ge=2)
    group_distribution: str = Field(default='random', pattern='^(random|seeded)$')
    ko_participants: int = Field(default=0, ge=0)
    ko_first_round_size: int | None = Field(default=4, ge=4, le=16)
    ko_distribution: str | None = Field(default='cross', pattern='^(cross|draw)$')
    show_matches: bool = True
    show_tables: bool = True


class TournamentUpdate(BaseModel):
    """Schema for updating a tournament"""
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: TournamentStatus | None = None
    show_matches: bool | None = None
    show_tables: bool | None = None


class TournamentResponse(TournamentBase):
    """Schema for tournament response"""
    id: int
    status: TournamentStatus
    groups_count: int
    participants_per_group: int | None
    group_distribution: str
    ko_participants: int
    ko_first_round_size: int | None
    ko_distribution: str | None
    show_matches: bool
    show_tables: bool
    created_at: datetime
    updated_at: datetime
    creator_id: int | None
    
    class Config:
        from_attributes = True

