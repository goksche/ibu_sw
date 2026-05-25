# Deployment: KO Bye-Propagation + Trostturnier (Verlierer-Zuweisung)
# Kopiert die geänderten Backend-Dateien auf den Server und startet das Backend neu.
# Server: 144.91.103.103 (Standard)

param(
    [string]$Server = "root@144.91.103.103",
    [string]$RemotePath = "/root/ibu_sw"
)

$ErrorActionPreference = "Stop"

Write-Host "KO Bye + Trostturnier – Deployment" -ForegroundColor Green
Write-Host "Server: $Server  Pfad: $RemotePath" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "SSH nicht gefunden. OpenSSH installieren." -ForegroundColor Red
    exit 1
}

$files = @(
    @{ Path = "backend/app/api/v1/matches.py"; Remote = "backend/app/api/v1/matches.py" },
    @{ Path = "backend/app/services/ko_propagation.py"; Remote = "backend/app/services/ko_propagation.py" }
)

foreach ($f in $files) {
    if (-not (Test-Path $f.Path)) {
        Write-Host "Datei nicht gefunden: $($f.Path)" -ForegroundColor Red
        exit 1
    }
}
Write-Host "Dateien gefunden." -ForegroundColor Green

Write-Host "Upload..." -ForegroundColor Yellow
foreach ($f in $files) {
    Write-Host "  $($f.Path)"
    scp $f.Path "${Server}:${RemotePath}/$($f.Remote)"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Fehler beim Upload von $($f.Path)" -ForegroundColor Red
        exit 1
    }
}
Write-Host "Upload abgeschlossen." -ForegroundColor Green

Write-Host "Backend auf Server neu starten..." -ForegroundColor Yellow
ssh $Server "cd $RemotePath && (docker compose restart backend 2>/dev/null || docker-compose restart backend 2>/dev/null) && echo OK || echo RESTART_FAILED"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Neustart evtl. fehlgeschlagen. Bitte manuell prüfen:" -ForegroundColor Yellow
    Write-Host "  ssh $Server" -ForegroundColor White
    Write-Host "  cd $RemotePath && docker compose restart backend" -ForegroundColor White
} else {
    Write-Host "Deployment abgeschlossen." -ForegroundColor Green
}
