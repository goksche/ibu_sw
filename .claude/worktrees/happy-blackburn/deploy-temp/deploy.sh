#!/bin/bash
# Platform Core Deployment Script - Server Side
# Multi-App Platform
# Führe dieses Script auf dem Server aus (nach Upload der Dateien)

set -e

REMOTE_PATH="${REMOTE_PATH:-/root/platform-core}"

echo "🚀 Starting Platform Core Deployment on Server..."
echo "=================================================="

# Navigate to project directory
cd "$REMOTE_PATH" || { 
    echo "❌ Directory not found: $REMOTE_PATH"
    echo "   Please upload files first!"
    exit 1
}

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "⚠️  .env file created. Please edit it with correct values!"
        echo "   Run: nano .env"
        echo ""
        echo "   Required values:"
        echo "   - POSTGRES_PASSWORD"
        echo "   - SECRET_KEY (generate with: openssl rand -hex 32)"
        echo "   - DOMAIN_NAME"
        echo "   - CERTBOT_EMAIL"
        exit 1
    else
        echo "❌ .env.example not found!"
        exit 1
    fi
fi

# Load environment variables
set -a
source .env
set +a

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed!"
    exit 1
fi

# Use docker compose (newer) or docker-compose (older)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Stop existing containers (if any)
echo "🛑 Stopping existing containers..."
$DOCKER_COMPOSE down 2>/dev/null || true

# Build and start containers
echo "🔨 Building and starting containers..."
$DOCKER_COMPOSE up -d --build

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 15

# Check if database is ready
echo "🏥 Checking database health..."
for i in {1..30}; do
    if $DOCKER_COMPOSE exec -T postgres pg_isready -U "${POSTGRES_USER:-platform_admin}" -d "${POSTGRES_DB:-platform_db}" &>/dev/null; then
        echo "✅ Database is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Database not ready after 30 attempts"
        exit 1
    fi
    sleep 1
done

# Run database initialization
echo "🗄️  Initializing database..."
$DOCKER_COMPOSE exec -T backend python -c "from app.core.database import init_db; init_db()" || echo "⚠️  Database init failed or already initialized"

# Create initial admin user
echo "👤 Creating initial admin user..."
$DOCKER_COMPOSE exec -T backend python scripts/create_initial_admin.py || echo "⚠️  Admin user creation failed or user already exists"

# Check container status
echo ""
echo "📊 Container Status:"
$DOCKER_COMPOSE ps

# Check service health
echo ""
echo "🏥 Checking service health..."
if $DOCKER_COMPOSE exec -T backend curl -f http://localhost:8000/health &>/dev/null; then
    echo "✅ Backend is healthy"
else
    echo "⚠️  Backend health check failed"
fi

echo ""
echo "✅ Platform Core deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Configure SSL certificates (Let's Encrypt)"
echo "   2. Configure Nginx/Caddy for domain routing"
echo "   3. Access platform at https://${DOMAIN_NAME:-gsmartsol.ch}"
echo "   4. Login with admin credentials (default: admin/admin123)"
echo "   5. Change admin password after first login!"
echo "   6. Deploy your first app via Admin Interface"
echo ""
echo "📚 Useful commands:"
echo "   - View logs: $DOCKER_COMPOSE logs -f"
echo "   - Stop: $DOCKER_COMPOSE down"
echo "   - Restart: $DOCKER_COMPOSE restart"
echo "   - Backup: bash scripts/backup_containers.sh"

