#!/bin/bash
# Container Image Backup Script
# Multi-App Platform

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)

echo "💾 Starting container image backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Get list of all Docker images
IMAGES=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep -v "<none>")

for IMAGE in $IMAGES; do
    # Replace / and : with _ for filename
    FILENAME=$(echo "$IMAGE" | sed 's/\//_/g' | sed 's/:/_/g')
    BACKUP_FILE="$BACKUP_DIR/${FILENAME}_${DATE}.tar.gz"
    
    echo "📦 Backing up $IMAGE..."
    docker save "$IMAGE" | gzip > "$BACKUP_FILE"
    
    echo "✅ Saved to $BACKUP_FILE"
done

# Backup database
echo "🗄️  Backing up database..."
DB_BACKUP_FILE="$BACKUP_DIR/platform_db_${DATE}.sql"
docker exec platform_postgres pg_dump -U platform_admin platform_db > "$DB_BACKUP_FILE" || echo "⚠️  Database backup failed"

echo "✅ Backup completed!"
echo "📁 Backup location: $BACKUP_DIR"


