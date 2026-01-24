#!/usr/bin/env python3
"""
Create test users for local development
"""

from app.core.database import SessionLocal, init_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole

def create_test_users():
    # Initialize database
    init_db()

    db = SessionLocal()

    # Create admin user
    admin = User(
        username='admin',
        email='admin@localhost',
        hashed_password=get_password_hash('admin123'),
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(admin)

    # Create test users
    user_account = User(
        username='user',
        email='user@localhost',
        hashed_password=get_password_hash('user123'),
        role=UserRole.USER,
        is_active=True
    )
    db.add(user_account)

    viewer_account = User(
        username='viewer',
        email='viewer@localhost',
        hashed_password=get_password_hash('viewer123'),
        role=UserRole.VIEWER,
        is_active=True
    )
    db.add(viewer_account)

    db.commit()
    print('✅ Test users created successfully!')
    print('Admin: admin / admin123')
    print('User: user / user123')
    print('Viewer: viewer / viewer123')

if __name__ == "__main__":
    create_test_users()