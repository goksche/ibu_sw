#!/usr/bin/env python3
from app.core.database import SessionLocal, init_db
from app.models.user import User, UserRole

init_db()
db = SessionLocal()

# Delete existing users
db.query(User).delete()

# Create user with valid email
user = User(
    username='admin',
    email='admin@example.com',
    hashed_password='dummy',  # Will be replaced with OTP
    role=UserRole.ADMIN,
    is_active=True
)
db.add(user)
db.commit()

print('Created user with email: admin@example.com')