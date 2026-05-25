#!/bin/bash
# Platform Core Deployment Script
# Multi-App Platform

set -e

echo "🚀 Starting Platform Core Deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found! Please create it from .env.example"
    exit 1
fi

# Load environment variables
source .env

# Navigate to platform-core directory
cd platform-core || exit 1

# Build and start containers
echo "📦 Building and starting containers..."
docker-compose up -d --build

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run migrations (if needed)
echo "🗄️  Running database migrations..."
docker-compose exec backend python -m alembic upgrade head || echo "⚠️  Alembic not configured, skipping migrations"

# Create initial admin user
echo "👤 Creating initial admin user..."
docker-compose exec backend python scripts/create_initial_admin.py || echo "⚠️  Admin user creation failed or user already exists"

echo "✅ Platform Core deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Access the platform at https://${DOMAIN_NAME:-gsmartsol.ch}"
echo "   2. Login with admin credentials"
echo "   3. Configure SSL certificates (if not already done)"
echo "   4. Deploy your first app!"


