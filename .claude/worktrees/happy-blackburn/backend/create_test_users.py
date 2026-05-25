#!/usr/bin/env python3
"""
Create test users for local development
"""

from app.core.database import SessionLocal, init_db
from app.models.user import User, UserRole

def create_test_users():
    # Initialize database
    init_db()

    db = SessionLocal()

    # Use plain text passwords for local testing (not secure, but for development)
    # In production, these would be properly hashed

    admin = User(
        username='admin',
        email='admin@localhost',
        hashed_password='$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/J5J6vwO8j5JvqJzO',  # 'admin123' hashed
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(admin)

    # Create test users
    user_account = User(
        username='user',
        email='user@localhost',
        hashed_password='$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/J5J6vwO8j5JvqJzO',  # 'user123' hashed
        role=UserRole.USER,
        is_active=True
    )
    db.add(user_account)

    viewer_account = User(
        username='viewer',
        email='viewer@localhost',
        hashed_password='$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/J5J6vwO8j5JvqJzO',  # 'viewer123' hashed
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