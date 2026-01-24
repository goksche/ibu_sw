# Group Schemas - Pydantic
# v1.3.0

from pydantic import BaseModel, Field
from typing import Optional, List


class GroupBase(BaseModel):
    """Base schema for Group"""
    name: str = Field(..., min_length=1, max_length=50, description="Group name")


class GroupCreate(GroupBase):
    """Schema for creating a group"""
    tournament_id: int = Field(..., description="Tournament ID")


class GroupUpdate(BaseModel):
    """Schema for updating a group"""
    name: Optional[str] = Field(None, min_length=1, max_length=50, description="Group name")


class GroupResponse(GroupBase):
    """Schema for group response"""
    id: int
    tournament_id: int
    
    class Config:
        from_attributes = True


class GroupParticipantAdd(BaseModel):
    """Schema for adding participant to group"""
    participant_id: int = Field(..., description="Participant ID")


class GroupParticipantRemove(BaseModel):
    """Schema for removing participant from group"""
    participant_id: int = Field(..., description="Participant ID")


class GroupWithParticipants(GroupResponse):
    """Schema for group with participants"""
    participants: List[dict] = []

    class Config:
        from_attributes = True

