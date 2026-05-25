# Match Schemas - Pydantic
# v1.3.0

from pydantic import BaseModel, Field
from typing import Optional


class MatchBase(BaseModel):
    """Base schema for Match"""
    round: int = Field(..., ge=1, description="Round number")
    match_no: int = Field(..., ge=1, description="Match number within round")


class KnockoutMatchBase(BaseModel):
    """Base schema for Knockout Match (allows negative rounds for consolation and 99 for bronze)"""
    round: int = Field(..., description="Round number (positive for main bracket, negative for consolation, 99 for bronze)")
    match_no: int = Field(..., ge=1, description="Match number within round")


class GroupMatchCreate(MatchBase):
    """Schema for creating a group match"""
    tournament_id: int = Field(..., description="Tournament ID")
    group_id: int = Field(..., description="Group ID")
    player1_id: Optional[int] = Field(None, description="Player 1 ID")
    player2_id: Optional[int] = Field(None, description="Player 2 ID")
    spielfeld_id: Optional[int] = Field(None, description="Spielfeld/Board ID")


class GroupMatchUpdate(BaseModel):
    """Schema for updating a group match"""
    player1_id: Optional[int] = Field(None, description="Player 1 ID")
    player2_id: Optional[int] = Field(None, description="Player 2 ID")
    score1: Optional[int] = Field(None, ge=0, description="Player 1 score")
    score2: Optional[int] = Field(None, ge=0, description="Player 2 score")
    spielfeld_id: Optional[int] = Field(None, description="Spielfeld/Board ID")


class GroupMatchResponse(MatchBase):
    """Schema for group match response"""
    id: int
    tournament_id: int
    group_id: int
    player1_id: Optional[int]
    player2_id: Optional[int]
    score1: Optional[int]
    score2: Optional[int]
    is_decision_match: bool
    spielfeld_id: Optional[int] = None

    class Config:
        from_attributes = True


class KnockoutMatchCreate(KnockoutMatchBase):
    """Schema for creating a knockout match"""
    tournament_id: int = Field(..., description="Tournament ID")
    player1_id: Optional[int] = Field(None, description="Player 1 ID")
    player2_id: Optional[int] = Field(None, description="Player 2 ID")
    spielfeld_id: Optional[int] = Field(None, description="Spielfeld/Board ID")


class KnockoutMatchUpdate(BaseModel):
    """Schema for updating a knockout match"""
    player1_id: Optional[int] = Field(None, description="Player 1 ID")
    player2_id: Optional[int] = Field(None, description="Player 2 ID")
    score1: Optional[int] = Field(None, ge=0, description="Player 1 score")
    score2: Optional[int] = Field(None, ge=0, description="Player 2 score")
    spielfeld_id: Optional[int] = Field(None, description="Spielfeld/Board ID")


class KnockoutMatchResponse(KnockoutMatchBase):
    """Schema for knockout match response"""
    id: int
    tournament_id: int
    player1_id: Optional[int]
    player2_id: Optional[int]
    score1: Optional[int]
    score2: Optional[int]
    spielfeld_id: Optional[int] = None

    class Config:
        from_attributes = True

