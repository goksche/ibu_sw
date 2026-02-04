# Match Location Assignment Service

from typing import List, Dict, Optional
import random
from sqlalchemy.orm import Session

from app.models.location import Venue
from app.models.tournament import Tournament


DEFAULT_STANDARD_PREFIX = "Platz"


def build_venue_labels(db: Session, tournament: Tournament) -> List[str]:
    """Build list of venue labels for a tournament based on settings."""
    if not tournament.use_match_locations:
        return []

    mode = tournament.location_mode or "standard"
    if mode == "standard":
        count = tournament.location_count or 0
        return [f"{DEFAULT_STANDARD_PREFIX} {i}" for i in range(1, count + 1)]

    if mode == "location" and tournament.location_group_id:
        venues = (
            db.query(Venue)
            .filter(Venue.location_id == tournament.location_group_id)
            .order_by(Venue.id)
            .all()
        )
        return [v.name for v in venues]

    return []


def build_group_venue_map(venue_labels: List[str], group_ids: List[int]) -> Dict[int, str]:
    """Assign a stable venue label per group."""
    if not venue_labels:
        return {}
    sorted_groups = sorted(group_ids)
    return {gid: venue_labels[idx % len(venue_labels)] for idx, gid in enumerate(sorted_groups)}


def get_rng(seed: Optional[int]) -> random.Random:
    if seed is None:
        return random.Random()
    rng = random.Random()
    rng.seed(seed)
    return rng


def choose_venue_label(
    venue_labels: List[str],
    assignment: str,
    rng: random.Random,
    index: Optional[int] = None
) -> Optional[str]:
    if not venue_labels:
        return None
    if assignment == "random":
        return rng.choice(venue_labels)
    # Default: sequential
    if index is None:
        index = 0
    return venue_labels[index % len(venue_labels)]
