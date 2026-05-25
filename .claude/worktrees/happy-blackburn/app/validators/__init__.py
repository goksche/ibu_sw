# app/validators/__init__.py
"""
Validators Package für IBU Turniere v1.1.0-alpha.3

Enthält alle Validierungs-Klassen und Convenience-Funktionen.
"""

from .base import (
    BaseValidator,
    is_not_empty,
    is_positive_int,
    is_non_negative_int,
    is_valid_date,
    is_in_range,
    is_valid_length,
    is_valid_email,
    is_one_of,
    sanitize_string,
    validate_required_fields,
    validate_optional_fields,
)

from .tournament import (
    TournamentValidator,
    validate_tournament_name,
    validate_tournament_data,
)

from .participant import (
    ParticipantValidator,
    validate_participant_name,
    validate_participant_data,
)

from .match import (
    MatchValidator,
    GroupMatchValidator,
    KOMatchValidator,
    validate_match_scores,
    validate_group_match_data,
    validate_ko_match_data,
)

__all__ = [
    # Base validators
    "BaseValidator",
    "is_not_empty",
    "is_positive_int",
    "is_non_negative_int",
    "is_valid_date",
    "is_in_range",
    "is_valid_length",
    "is_valid_email",
    "is_one_of",
    "sanitize_string",
    "validate_required_fields",
    "validate_optional_fields",
    # Tournament validators
    "TournamentValidator",
    "validate_tournament_name",
    "validate_tournament_data",
    # Participant validators
    "ParticipantValidator",
    "validate_participant_name",
    "validate_participant_data",
    # Match validators
    "MatchValidator",
    "GroupMatchValidator",
    "KOMatchValidator",
    "validate_match_scores",
    "validate_group_match_data",
    "validate_ko_match_data",
]
