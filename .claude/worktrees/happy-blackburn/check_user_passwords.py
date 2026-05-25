#!/usr/bin/env python3
import sys
sys.path.append('/app')
from app.core.database import SessionLocal, init_db
from app.models.user import User

init_db()
db = SessionLocal()
users = db.query(User).all()
print(f'Anzahl User: {len(users)}')
for u in users:
    has_password = bool(u.hashed_password)
    print(f'{u.username}: password_set={has_password}, role={u.role}, active={u.is_active}')
db.close()