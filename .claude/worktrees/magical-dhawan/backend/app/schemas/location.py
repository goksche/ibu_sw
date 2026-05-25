# Location & Spielfeld Schemas
# v1.4.0

from pydantic import BaseModel, Field
from typing import List
from datetime import datetime


class SpielfeldBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    sort_order: int = Field(default=0, ge=0)


class SpielfeldCreate(SpielfeldBase):
    location_id: int = Field(..., description="Location ID")


class SpielfeldCreateForLocation(SpielfeldBase):
    """Body when creating Spielfeld under POST /locations/{id}/spielfelder (location_id from path)"""
    pass


class SpielfeldUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    sort_order: int | None = Field(default=None, ge=0)


class SpielfeldResponse(SpielfeldBase):
    id: int
    location_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LocationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)


class LocationResponse(LocationBase):
    id: int
    spielfelder: List[SpielfeldResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LocationListResponse(LocationBase):
    id: int
    spielfelder: List[SpielfeldResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
