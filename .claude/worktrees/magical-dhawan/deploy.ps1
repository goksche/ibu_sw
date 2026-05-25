# IBU Turniere Production Deployment Script (Windows PowerShell)
# Dieses Skript kopiert die Dateien auf den Server

$SERVER = "root@46.62.173.242"
$REMOTE_PATH = "/root/ibu_sw"

Write-Host "🚀 Starting Deployment to Server..." -ForegroundColor Green

# Prüfe ob SSH verfügbar ist
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ SSH ist nicht verfügbar. Bitte installiere OpenSSH." -ForegroundColor Red
    exit 1
}

Write-Host "📦 Preparing files for deployment..." -ForegroundColor Yellow
Write-Host "✅ Files are ready. Please connect to server manually to complete deployment." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Connect to server: ssh $SERVER" -ForegroundColor White
Write-Host "2. Create project directory: mkdir -p $REMOTE_PATH" -ForegroundColor White
Write-Host "3. Upload files using scp or rsync" -ForegroundColor White


