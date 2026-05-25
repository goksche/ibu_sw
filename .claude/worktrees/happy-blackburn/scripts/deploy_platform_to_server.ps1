# Platform Core Deployment Script - Upload to Server
# Multi-App Platform

$SERVER = "root@46.62.173.242"
$REMOTE_PATH = "/root/platform-core"
$LOCAL_PATH = "."

Write-Host "🚀 Platform Core Deployment to Server" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# Prüfe ob SSH verfügbar ist
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ SSH ist nicht verfügbar. Bitte installiere OpenSSH." -ForegroundColor Red
    exit 1
}

Write-Host "📋 Deployment Plan:" -ForegroundColor Cyan
Write-Host "  1. Dateien auf Server hochladen" -ForegroundColor White
Write-Host "  2. Platform Core Container starten" -ForegroundColor White
Write-Host "  3. Datenbank initialisieren" -ForegroundColor White
Write-Host "  4. Initial Admin User erstellen" -ForegroundColor White
Write-Host ""

# Erstelle temporäres Deployment-Verzeichnis
$TEMP_DIR = "deploy-temp"
if (Test-Path $TEMP_DIR) {
    Remove-Item -Recurse -Force $TEMP_DIR
}
New-Item -ItemType Directory -Path $TEMP_DIR | Out-Null

Write-Host "📁 Erstelle Deployment-Paket..." -ForegroundColor Yellow

# Kopiere platform-core Verzeichnis
if (Test-Path "platform-core") {
    Copy-Item -Recurse "platform-core" "$TEMP_DIR/"
    Write-Host "  ✅ platform-core kopiert" -ForegroundColor Green
} else {
    Write-Host "  ❌ platform-core nicht gefunden" -ForegroundColor Red
}

# Kopiere backend Verzeichnis
if (Test-Path "backend") {
    Copy-Item -Recurse "backend" "$TEMP_DIR/"
    Write-Host "  ✅ backend kopiert" -ForegroundColor Green
} else {
    Write-Host "  ❌ backend nicht gefunden" -ForegroundColor Red
}

# Kopiere frontend Verzeichnis
if (Test-Path "frontend") {
    Copy-Item -Recurse "frontend" "$TEMP_DIR/"
    Write-Host "  ✅ frontend kopiert" -ForegroundColor Green
} else {
    Write-Host "  ❌ frontend nicht gefunden" -ForegroundColor Red
}

# Kopiere nginx Config
New-Item -ItemType Directory -Path "$TEMP_DIR/nginx/conf.d" -Force | Out-Null
if (Test-Path "nginx/conf.d/platform.conf") {
    Copy-Item "nginx/conf.d/platform.conf" "$TEMP_DIR/nginx/conf.d/"
    Write-Host "  ✅ nginx/platform.conf kopiert" -ForegroundColor Green
}
if (Test-Path "nginx/conf.d/apps.conf.template") {
    Copy-Item "nginx/conf.d/apps.conf.template" "$TEMP_DIR/nginx/conf.d/"
    Write-Host "  ✅ nginx/apps.conf.template kopiert" -ForegroundColor Green
}

# Kopiere .env.example
$envExamplePath = Join-Path $PWD ".env.example"
if (Test-Path $envExamplePath) {
    Copy-Item $envExamplePath (Join-Path $TEMP_DIR ".env.example")
    Write-Host "  ✅ .env.example kopiert" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  .env.example nicht gefunden (optional)" -ForegroundColor Yellow
}

# Kopiere deploy.sh Script
$deployScriptPath = Join-Path $PWD "scripts\deploy_platform_server.sh"
if (Test-Path $deployScriptPath) {
    Copy-Item $deployScriptPath (Join-Path $TEMP_DIR "deploy.sh")
    Write-Host "  ✅ deploy.sh kopiert" -ForegroundColor Green
} else {
    Write-Host "  ❌ deploy_platform_server.sh nicht gefunden" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Deployment-Paket erstellt in: $TEMP_DIR" -ForegroundColor Green
Write-Host ""

Write-Host "📤 Upload-Anleitung:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 1: Mit WinSCP (empfohlen)" -ForegroundColor Yellow
Write-Host "  1. Öffne WinSCP" -ForegroundColor White
Write-Host "  2. Verbinde dich mit: $SERVER" -ForegroundColor White
Write-Host "  3. Erstelle Verzeichnis: $REMOTE_PATH" -ForegroundColor White
Write-Host "  4. Lade den Inhalt von '$TEMP_DIR' nach '$REMOTE_PATH' hoch" -ForegroundColor White
Write-Host "  5. Führe auf dem Server aus: bash $REMOTE_PATH/deploy.sh" -ForegroundColor White
Write-Host ""

Write-Host "Option 2: Mit SCP (Command Line)" -ForegroundColor Yellow
Write-Host "  scp -r $TEMP_DIR\* ${SERVER}:${REMOTE_PATH}/" -ForegroundColor White
Write-Host "  ssh ${SERVER} 'cd ${REMOTE_PATH}; bash deploy.sh'" -ForegroundColor White
Write-Host ""

Write-Host "Option 3: Mit rsync (empfohlen für Updates)" -ForegroundColor Yellow
Write-Host "  rsync -avz --exclude 'node_modules' --exclude '__pycache__' --exclude '*.pyc' $TEMP_DIR/ ${SERVER}:${REMOTE_PATH}/" -ForegroundColor White
Write-Host "  ssh ${SERVER} 'cd ${REMOTE_PATH}; bash deploy.sh'" -ForegroundColor White
Write-Host ""

Write-Host "⚠️  WICHTIG: Vor dem Deployment auf dem Server:" -ForegroundColor Red
Write-Host "  1. Erstelle .env Datei mit korrekten Werten" -ForegroundColor White
Write-Host "  2. Stelle sicher, dass Docker installiert ist" -ForegroundColor White
Write-Host "  3. Stelle sicher, dass Port 80/443 frei sind oder Caddy konfiguriert ist" -ForegroundColor White
Write-Host ""

Write-Host "📋 Server-Befehle (nach Upload):" -ForegroundColor Cyan
Write-Host "  ssh $SERVER" -ForegroundColor White
Write-Host "  cd $REMOTE_PATH" -ForegroundColor White
Write-Host "  cp .env.example .env" -ForegroundColor White
Write-Host "  nano .env  # Bearbeite die Werte" -ForegroundColor White
Write-Host "  bash deploy.sh" -ForegroundColor White
Write-Host ""

Write-Host "✅ Deployment-Paket bereit in: $TEMP_DIR" -ForegroundColor Green
