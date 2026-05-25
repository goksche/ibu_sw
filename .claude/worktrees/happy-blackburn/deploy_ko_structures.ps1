# Deployment Script für KO-Strukturen
# Dieses Script hilft beim Deployment der neuen KO-Strukturen auf den Server

$SERVER = "root@46.62.173.242"
$REMOTE_PATH = "/root/ibu_sw"

Write-Host "🚀 KO-Strukturen Deployment Script" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""

# Prüfe ob SSH verfügbar ist
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ SSH ist nicht verfügbar. Bitte installiere OpenSSH." -ForegroundColor Red
    Write-Host "   Installiere mit: Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Zu deployende Dateien:" -ForegroundColor Cyan
Write-Host "  1. backend/app/services/ko_bracket.py" -ForegroundColor White
Write-Host "  2. backend/app/services/ko_propagation.py" -ForegroundColor White
Write-Host "  3. backend/app/api/v1/tournaments.py" -ForegroundColor White
Write-Host ""

# Prüfe ob Dateien existieren
$files = @(
    "backend/app/services/ko_bracket.py",
    "backend/app/services/ko_propagation.py",
    "backend/app/api/v1/tournaments.py"
)

$allFilesExist = $true
foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        Write-Host "❌ Datei nicht gefunden: $file" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host ""
    Write-Host "❌ Nicht alle Dateien gefunden. Bitte prüfe den Pfad." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Alle Dateien gefunden" -ForegroundColor Green
Write-Host ""

Write-Host "📤 Deployment-Optionen:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 1: Mit SCP (Command Line)" -ForegroundColor Yellow
Write-Host "  scp backend/app/services/ko_bracket.py ${SERVER}:${REMOTE_PATH}/backend/app/services/ko_bracket.py" -ForegroundColor White
Write-Host "  scp backend/app/services/ko_propagation.py ${SERVER}:${REMOTE_PATH}/backend/app/services/ko_propagation.py" -ForegroundColor White
Write-Host "  scp backend/app/api/v1/tournaments.py ${SERVER}:${REMOTE_PATH}/backend/app/api/v1/tournaments.py" -ForegroundColor White
Write-Host ""

Write-Host "Option 2: Mit WinSCP (GUI, empfohlen)" -ForegroundColor Yellow
Write-Host "  1. Öffne WinSCP" -ForegroundColor White
Write-Host "  2. Verbinde dich mit: $SERVER" -ForegroundColor White
Write-Host "  3. Navigiere zu: $REMOTE_PATH" -ForegroundColor White
Write-Host "  4. Lade die 3 Dateien hoch" -ForegroundColor White
Write-Host ""

Write-Host "Option 3: Automatisch mit diesem Script" -ForegroundColor Yellow
$deploy = Read-Host "Möchtest du jetzt automatisch deployen? (j/n)"

if ($deploy -eq "j" -or $deploy -eq "J" -or $deploy -eq "y" -or $deploy -eq "Y") {
    Write-Host ""
    Write-Host "📤 Lade Dateien hoch..." -ForegroundColor Yellow
    
    try {
        Write-Host "  📄 Lade ko_bracket.py..." -ForegroundColor White
        scp backend/app/services/ko_bracket.py "${SERVER}:${REMOTE_PATH}/backend/app/services/ko_bracket.py"
        Write-Host "    ✅ ko_bracket.py hochgeladen" -ForegroundColor Green
        
        Write-Host "  📄 Lade ko_propagation.py..." -ForegroundColor White
        scp backend/app/services/ko_propagation.py "${SERVER}:${REMOTE_PATH}/backend/app/services/ko_propagation.py"
        Write-Host "    ✅ ko_propagation.py hochgeladen" -ForegroundColor Green
        
        Write-Host "  📄 Lade tournaments.py..." -ForegroundColor White
        scp backend/app/api/v1/tournaments.py "${SERVER}:${REMOTE_PATH}/backend/app/api/v1/tournaments.py"
        Write-Host "    ✅ tournaments.py hochgeladen" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "✅ Alle Dateien erfolgreich hochgeladen!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔄 Nächste Schritte:" -ForegroundColor Cyan
        Write-Host "  1. Verbinde dich per SSH: ssh $SERVER" -ForegroundColor White
        Write-Host "  2. Navigiere zum Projekt: cd $REMOTE_PATH" -ForegroundColor White
        Write-Host "  3. Starte Backend-Container neu: docker compose restart backend" -ForegroundColor White
        Write-Host "  4. Prüfe Logs: docker compose logs backend --tail=50" -ForegroundColor White
        
    } catch {
        Write-Host ""
        Write-Host "❌ Fehler beim Hochladen: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 Tipp: Verwende WinSCP für manuellen Upload" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "ℹ️  Deployment abgebrochen. Verwende eine der oben genannten Optionen." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 Weitere Informationen: Siehe DEPLOYMENT_KO_STRUCTURES.md" -ForegroundColor Cyan
