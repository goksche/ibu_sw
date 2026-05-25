#!/usr/bin/env python3
import sys
sys.path.append('/app')
from app.core.database import SessionLocal, init_db
from app.models.user import User, UserRole
from app.core.security import get_password_hash

init_db()
db = SessionLocal()

# Erstelle Admin-User
admin_user = User(
    username='goksche',
    email='goksche23@gmail.com',
    hashed_password=get_password_hash('admin123'),
    role=UserRole.ADMIN,
    is_active=True
)

db.add(admin_user)
db.commit()
print("Admin-User 'goksche' erstellt mit Passwort 'admin123'")
db.close()