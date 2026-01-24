#!/usr/bin/env python3
from app.core.database import SessionLocal, init_db
from app.models.user import User, UserRole

init_db()
db = SessionLocal()

# Create user for goksche23@gmail.com
user = User(
    username='goksche',
    email='goksche23@gmail.com',
    hashed_password='dummy',  # Will be replaced with OTP
    role=UserRole.ADMIN,  # Give admin rights for testing
    is_active=True
)
db.add(user)
db.commit()

print('Created user: goksche / goksche23@gmail.com')

db.close()