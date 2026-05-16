"""Hilfsfunktionen für Rollenprüfungen (Admin / Power Admin)."""

from app.models.user import User, UserRole


def is_platform_admin(user: User) -> bool:
    return user.role in (UserRole.ADMIN, UserRole.POWER_ADMIN)
