#!/usr/bin/env python3
"""
Reset and create test users with correct passwords
"""

from app.core.database import SessionLocal, init_db
from app.models.user import User, UserRole
import hashlib

def reset_users():
    init_db()
    db = SessionLocal()

    # Delete existing users
    db.query(User).delete()
    db.commit()

    # Create users with simple hashed passwords for testing
    # Using a simple hash function instead of bcrypt for now

    def simple_hash(password):
        return hashlib.sha256(password.encode()).hexdigest()

    admin = User(
        username='admin',
        email='admin@localhost',
        hashed_password=simple_hash('admin123'),
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(admin)

    user_account = User(
        username='user',
        email='user@localhost',
        hashed_password=simple_hash('user123'),
        role=UserRole.USER,
        is_active=True
    )
    db.add(user_account)

    viewer_account = User(
        username='viewer',
        email='viewer@localhost',
        hashed_password=simple_hash('viewer123'),
        role=UserRole.VIEWER,
        is_active=True
    )
    db.add(viewer_account)

    db.commit()
    print('Users reset and recreated successfully!')
    print('Admin: admin / admin123')
    print('User: user / user123')
    print('Viewer: viewer / viewer123')

if __name__ == "__main__":
    reset_users()