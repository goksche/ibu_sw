#!/bin/bash

# IBU Turniere Production Deployment Script

set -e

echo "🚀 Starting IBU Turniere Deployment..."

# 1. Stop existing containers
echo "📦 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# 2. Build and start containers (without certbot first)
echo "🔨 Building and starting containers..."
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build postgres backend frontend nginx

# 3. Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 15

# 4. Check service health
echo "🏥 Checking service health..."
docker-compose -f docker-compose.prod.yml ps

echo "✅ Deployment completed!"
echo "🌐 Application should be available at: http://$(hostname -I | awk '{print $1}')"
echo "📚 API Docs: http://$(hostname -I | awk '{print $1}')/docs"


