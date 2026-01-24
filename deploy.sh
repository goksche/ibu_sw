#!/bin/bash

# IBU Turniere Production Deployment Script - Sprint 9
# v1.2.0 - Complete server deployment with user creation and testing

set -e

echo "🚀 Starting IBU Turniere Sprint 9 Deployment..."

# 1. Check environment file
if [ ! -f .env.prod ]; then
    echo "❌ .env.prod file not found! Please create it from .env.example"
    exit 1
fi

# 2. Stop existing containers
echo "📦 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# 3. Build and start containers
echo "🔨 Building and starting containers..."
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build postgres backend frontend nginx

# 4. Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 20

# 5. Check service health
echo "🏥 Checking service health..."
docker-compose -f docker-compose.prod.yml ps

# 6. Initialize database
echo "🗄️  Initializing database..."
docker-compose -f docker-compose.prod.yml exec -T backend python -c "from app.core.database import init_db; init_db()"

# 7. Create admin user
echo "👤 Creating admin user..."
docker-compose -f docker-compose.prod.yml exec -T backend python -c "
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
"

# 8. Create test users (USER and VIEWER)
echo "👥 Creating test users..."
docker-compose -f docker-compose.prod.yml exec -T backend python -c "
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole

db = SessionLocal()

# Create USER test account
user = db.query(User).filter(User.username == 'user').first()
if not user:
    user = User(
        username='user',
        email='user@gsmartsol.ch',
        hashed_password=get_password_hash('user123'),
        role=UserRole.USER,
        is_active=True
    )
    db.add(user)
    db.commit()
    print('✅ USER test account created')
else:
    print('ℹ️  USER test account already exists')

# Create VIEWER test account
viewer = db.query(User).filter(User.username == 'viewer').first()
if not viewer:
    viewer = User(
        username='viewer',
        email='viewer@gsmartsol.ch',
        hashed_password=get_password_hash('viewer123'),
        role=UserRole.VIEWER,
        is_active=True
    )
    db.add(viewer)
    db.commit()
    print('✅ VIEWER test account created')
else:
    print('ℹ️  VIEWER test account already exists')
"

# 9. Health checks
echo "🔍 Performing health checks..."

# Backend health check
echo "   📡 Backend health check..."
docker-compose -f docker-compose.prod.yml exec -T backend curl -f http://localhost:8000/health || echo "⚠️  Backend health check failed"

# External health check (if domain is configured)
if [ -n "$DOMAIN_NAME" ]; then
    echo "   🌐 External health check for $DOMAIN_NAME..."
    curl -I https://$DOMAIN_NAME || echo "⚠️  External health check failed (SSL may not be configured yet)"
    curl https://$DOMAIN_NAME/api/v1/health || echo "⚠️  API health check failed"
fi

echo "✅ Sprint 9 Deployment completed successfully!"
echo ""
echo "📝 Test Accounts:"
echo "   👑 Admin: admin / admin123"
echo "   👤 User:  user  / user123"
echo "   👁️  Viewer: viewer / viewer123"
echo ""
echo "🌐 Application URLs:"
if [ -n "$DOMAIN_NAME" ]; then
    echo "   Frontend: https://$DOMAIN_NAME"
    echo "   API Docs: https://$DOMAIN_NAME/docs"
else
    echo "   Frontend: http://$(hostname -I | awk '{print $1}')"
    echo "   API Docs: http://$(hostname -I | awk '{print $1}')/docs"
fi
echo ""
echo "🧪 Next: Run server tests with different user roles"


