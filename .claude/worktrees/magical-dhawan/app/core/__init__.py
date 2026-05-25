# app/core/__init__.py
"""
Core Module für IBU Turniere v1.1.0

Enthält grundlegende Funktionalitäten wie Exception Handling,
Logging und Resource Management.
"""

from .exceptions import (
    IBUTurniereException,
    DatabaseError,
    ValidationError,
    TournamentNotFoundError,
    ParticipantNotFoundError,
    GroupNotFoundError,
    MatchNotFoundError,
    InvalidInputError,
    ConfigurationError,
    ExportError,
    BackupError,
)

from .logging import (
    IBULogger,
    get_logger,
    debug,
    info,
    warning,
    error,
    critical,
)

from .resource_manager import (
    ResourceManager,
    get_resource_manager,
    cleanup_all_resources,
    register_timer,
    register_widget,
    register_connection,
)

__all__ = [
    # Exceptions
    "IBUTurniereException",
    "DatabaseError",
    "ValidationError",
    "TournamentNotFoundError",
    "ParticipantNotFoundError",
    "GroupNotFoundError",
    "MatchNotFoundError",
    "InvalidInputError",
    "ConfigurationError",
    "ExportError",
    "BackupError",
    # Logging
    "IBULogger",
    "get_logger",
    "debug",
    "info",
    "warning",
    "error",
    "critical",
    # Resource Management
    "ResourceManager",
    "get_resource_manager",
    "cleanup_all_resources",
    "register_timer",
    "register_widget",
    "register_connection",
]
