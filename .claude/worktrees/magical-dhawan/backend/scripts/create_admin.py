from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole

db = SessionLocal()
admin = db.query(User).filter(User.username == 'admin').first()

if not admin:
    admin = User(
        username='admin',
        email='admin@gsmartsol.ch',
        hashed_password=get_password_hash('admin123'),
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(admin)
    db.commit()
    print('✅ Admin user created')
else:
    print('ℹ️  Admin user already exists')


