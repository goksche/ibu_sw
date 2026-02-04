# Models Package - Import all models
# v1.3.0

from app.core.database import Base
from app.models.user import User, UserRole, OTPCode
from app.models.tournament import Tournament, TournamentMode, TournamentStatus, KOStructure, KODrawMethod, LeagueScoringSystem, LeagueVariant
from app.models.participant import Participant, TournamentParticipant
from app.models.league import League, league_participants, league_tournaments
from app.models.group import Group, GroupParticipant
from app.models.match import GroupMatch, KnockoutMatch
from app.models.location import Location, Spielfeld
from app.models.access_request import AccessRequest
from app.models.platform import (
    App, AppStatus,
    UserAppPermission,
    Feedback, FeedbackComment, FeedbackType, FeedbackStatus, FeedbackPriority,
    ContainerDeployment, DeploymentStatus
)

__all__ = [
    "Base",
    "User", "UserRole", "OTPCode",
    "Tournament", "TournamentMode", "TournamentStatus", "KOStructure", "KODrawMethod", "LeagueScoringSystem", "LeagueVariant",
    "Participant", "TournamentParticipant",
    "League", "league_participants", "league_tournaments",
    "Group", "GroupParticipant",
    "GroupMatch", "KnockoutMatch",
    "Location", "Spielfeld",
    "AccessRequest",
    # Platform Models
    "App", "AppStatus",
    "UserAppPermission",
    "Feedback", "FeedbackComment", "FeedbackType", "FeedbackStatus", "FeedbackPriority",
    "ContainerDeployment", "DeploymentStatus",
]
