import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User

db = SessionLocal()
admin = db.query(User).filter(User.username == 'admin').first()

if admin:
    admin.hashed_password = get_password_hash('admin123')
    db.commit()
    print('✅ Admin password reset successfully')
    print('Username: admin')
    print('Password: admin123')
else:
    print('❌ Admin user not found')

db.close()
