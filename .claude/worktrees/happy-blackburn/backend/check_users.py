#!/usr/bin/env python3
"""
Check users in database
"""

from app.core.database import SessionLocal, init_db
from app.models.user import User

def check_users():
    init_db()
    db = SessionLocal()
    users = db.query(User).all()
    print(f"Found {len(users)} users:")
    for user in users:
        print(f"  Username: {user.username}, Role: {user.role}, Active: {user.is_active}")
    db.close()

if __name__ == "__main__":
    check_users()