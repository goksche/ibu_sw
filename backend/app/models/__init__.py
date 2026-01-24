# Models Package - Import all models
# v1.3.0

from app.core.database import Base
from app.models.user import User, UserRole, OTPCode
from app.models.tournament import Tournament, TournamentMode, TournamentStatus, KOStructure, KODrawMethod, LeagueScoringSystem, LeagueVariant
from app.models.participant import Participant, TournamentParticipant
from app.models.group import Group, GroupParticipant
from app.models.match import GroupMatch, KnockoutMatch
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
    "Group", "GroupParticipant",
    "GroupMatch", "KnockoutMatch",
    # Platform Models
    "App", "AppStatus",
    "UserAppPermission",
    "Feedback", "FeedbackComment", "FeedbackType", "FeedbackStatus", "FeedbackPriority",
    "ContainerDeployment", "DeploymentStatus",
]
