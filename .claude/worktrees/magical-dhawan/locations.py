# Locations API - CRUD for Locations and Spielfelder
# v1.4.0

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import require_user_or_admin, require_viewer_or_above
from app.models.location import Location, Spielfeld
from app.schemas.location import (
    LocationCreate,
    LocationUpdate,
    LocationResponse,
    LocationListResponse,
    SpielfeldCreate,
    SpielfeldCreateForLocation,
    SpielfeldUpdate,
    SpielfeldResponse,
)

router = APIRouter(prefix="/locations", tags=["Locations"])


def _location_to_response(loc: Location) -> LocationResponse:
    return LocationResponse(
        id=loc.id,
        name=loc.name,
        spielfelder=[SpielfeldResponse.model_validate(s) for s in loc.spielfelder],
        created_at=loc.created_at,
        updated_at=loc.updated_at,
    )


@router.get("", response_model=List[LocationListResponse])
def get_locations(
    current_user=Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
):
    locations = db.query(Location).order_by(Location.name).all()
    return [_location_to_response(loc) for loc in locations]


@router.get("/{location_id}", response_model=LocationResponse)
def get_location(
    location_id: int,
    current_user=Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
):
    loc = db.query(Location).filter(Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    return _location_to_response(loc)


@router.post("", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
def create_location(
    payload: LocationCreate,
    current_user=Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    loc = Location(name=payload.name)
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return _location_to_response(loc)


@router.put("/{location_id}", response_model=LocationResponse)
def update_location(
    location_id: int,
    payload: LocationUpdate,
    current_user=Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    loc = db.query(Location).filter(Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    if payload.name is not None:
        loc.name = payload.name
    db.commit()
    db.refresh(loc)
    return _location_to_response(loc)


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location(
    location_id: int,
    current_user=Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    loc = db.query(Location).filter(Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    db.delete(loc)
    db.commit()
    return None


# Spielfelder unter einer Location
@router.get("/{location_id}/spielfelder", response_model=List[SpielfeldResponse])
def get_spielfelder(
    location_id: int,
    current_user=Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
):
    loc = db.query(Location).filter(Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    return [SpielfeldResponse.model_validate(s) for s in loc.spielfelder]


@router.post("/{location_id}/spielfelder", response_model=SpielfeldResponse, status_code=status.HTTP_201_CREATED)
def create_spielfeld(
    location_id: int,
    payload: SpielfeldCreateForLocation,
    current_user=Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    loc = db.query(Location).filter(Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    s = Spielfeld(location_id=location_id, name=payload.name, sort_order=payload.sort_order)
    db.add(s)
    db.commit()
    db.refresh(s)
    return SpielfeldResponse.model_validate(s)


@router.put("/spielfelder/{spielfeld_id}", response_model=SpielfeldResponse)
def update_spielfeld(
    spielfeld_id: int,
    payload: SpielfeldUpdate,
    current_user=Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    s = db.query(Spielfeld).filter(Spielfeld.id == spielfeld_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spielfeld not found")
    if payload.name is not None:
        s.name = payload.name
    if payload.sort_order is not None:
        s.sort_order = payload.sort_order
    db.commit()
    db.refresh(s)
    return SpielfeldResponse.model_validate(s)


@router.delete("/spielfelder/{spielfeld_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_spielfeld(
    spielfeld_id: int,
    current_user=Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    s = db.query(Spielfeld).filter(Spielfeld.id == spielfeld_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spielfeld not found")
    db.delete(s)
    db.commit()
    return None
