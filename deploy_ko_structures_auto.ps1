# Automatisches Deployment Script für KO-Strukturen
# Deployed direkt via SSH wie andere Agents in diesem Projekt

$SERVER = "root@144.91.103.103"
$REMOTE_PATH = "/root/ibu_sw"

Write-Host "🚀 Automatisches Deployment: KO-Strukturen" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""

# Prüfe ob SSH verfügbar ist
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ SSH ist nicht verfügbar. Bitte installiere OpenSSH." -ForegroundColor Red
    exit 1
}

# Prüfe ob Dateien existieren
$files = @(
    @{Path="backend/app/services/ko_bracket.py"; Remote="backend/app/services/ko_bracket.py"},
    @{Path="backend/app/services/ko_propagation.py"; Remote="backend/app/services/ko_propagation.py"},
    @{Path="backend/app/api/v1/tournaments.py"; Remote="backend/app/api/v1/tournaments.py"}
)

Write-Host "📋 Prüfe Dateien..." -ForegroundColor Cyan
foreach ($file in $files) {
    if (-not (Test-Path $file.Path)) {
        Write-Host "❌ Datei nicht gefunden: $($file.Path)" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ Alle Dateien gefunden" -ForegroundColor Green
Write-Host ""

# Lade Dateien hoch
Write-Host "📤 Lade Dateien auf Server hoch..." -ForegroundColor Yellow
$uploadSuccess = $true

foreach ($file in $files) {
    Write-Host "  📄 Lade $($file.Path)..." -ForegroundColor White
    $scpCommand = "scp `"$($file.Path)`" ${SERVER}:${REMOTE_PATH}/$($file.Remote)"
    
    try {
        $result = Invoke-Expression $scpCommand 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✅ Erfolgreich hochgeladen" -ForegroundColor Green
        } else {
            Write-Host "    ❌ Fehler: $result" -ForegroundColor Red
            $uploadSuccess = $false
        }
    } catch {
        Write-Host "    ❌ Fehler: $_" -ForegroundColor Red
        $uploadSuccess = $false
    }
}

if (-not $uploadSuccess) {
    Write-Host ""
    Write-Host "❌ Einige Dateien konnten nicht hochgeladen werden." -ForegroundColor Red
    Write-Host "   Bitte prüfe die Server-Verbindung." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ Alle Dateien erfolgreich hochgeladen!" -ForegroundColor Green
Write-Host ""

# Starte Backend-Container neu
Write-Host "🔄 Starte Backend-Container neu..." -ForegroundColor Yellow

$restartCommand = "ssh ${SERVER} 'cd ${REMOTE_PATH} && docker compose restart backend'"
try {
    $result = Invoke-Expression $restartCommand 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Backend-Container neu gestartet" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Container-Neustart: $result" -ForegroundColor Yellow
        Write-Host "   Versuche mit docker-compose..." -ForegroundColor Yellow
        $restartCommand2 = "ssh ${SERVER} 'cd ${REMOTE_PATH} && docker-compose restart backend'"
        Invoke-Expression $restartCommand2 2>&1 | Out-Null
    }
} catch {
    Write-Host "⚠️  Fehler beim Neustart: $_" -ForegroundColor Yellow
    Write-Host "   Bitte starte den Container manuell neu:" -ForegroundColor Yellow
    Write-Host "   ssh ${SERVER}" -ForegroundColor White
    Write-Host "   cd ${REMOTE_PATH}" -ForegroundColor White
    Write-Host "   docker compose restart backend" -ForegroundColor White
}

Write-Host ""
Write-Host "📊 Prüfe Backend-Logs..." -ForegroundColor Cyan
$logsCommand = "ssh ${SERVER} 'cd ${REMOTE_PATH} && docker compose logs backend --tail=20'"
try {
    $logs = Invoke-Expression $logsCommand 2>&1
    Write-Host $logs
} catch {
    Write-Host "⚠️  Konnte Logs nicht abrufen" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Deployment abgeschlossen!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Nächste Schritte:" -ForegroundColor Cyan
Write-Host "  1. Prüfe Backend-Logs auf Fehler" -ForegroundColor White
Write-Host "  2. Teste die neuen KO-Strukturen in der UI" -ForegroundColor White
Write-Host "  3. Erstelle ein Test-Turnier mit double_elimination, triple_elimination oder aggregate_ko" -ForegroundColor White
