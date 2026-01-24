#!/usr/bin/env python3
from app.core.database import SessionLocal, init_db
from app.models.user import User, OTPCode

init_db()
db = SessionLocal()

# Check users
users = db.query(User).all()
print(f'Users in database: {len(users)}')
for user in users:
    print(f'  - {user.username}: {user.email}')

# Check OTP codes
otps = db.query(OTPCode).all()
print(f'OTP codes in database: {len(otps)}')
for otp in otps:
    print(f'  - Email: {otp.email}, Code: {otp.otp_code}, Used: {otp.is_used}, Expired: {otp.is_expired()}')

db.close()