# Anwendungscode von Server B nach Server A kopieren (ohne DB auf A zu ersetzen).
# .env und .env.prod von B werden nicht ins Archiv aufgenommen – Konfiguration auf A bleibt.
#
# Vorher: .\scripts\backup_db_both_servers_local.ps1 (empfohlen: beide Dumps ohne -AllowPartial)
# Ausfuehrung: powershell -ExecutionPolicy Bypass -File .\scripts\sync_app_code_b_to_a.ps1

param(
    [string]$ServerA = "root@144.91.103.103",
    [string]$ServerB = "root@95.111.238.180",
    [string]$RemotePathB = "/opt/ibu_sw",
    [string]$RemotePathA = "/root/ibu_sw",
    [switch]$WhatIf
)

$ErrorActionPreference = "Stop"
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$bundle = "ibu_app_sync_$ts.tgz"
$remoteBundleB = "/tmp/$bundle"
$remoteBundleA = "/tmp/$bundle"
$localTmp = Join-Path $env:TEMP $bundle

Write-Host "=== Sync App-Code B -> A (kein DB-Restore) ===" -ForegroundColor Cyan
Write-Host "Quelle: $ServerB $RemotePathB"
Write-Host "Ziel:   $ServerA $RemotePathA"
Write-Host ""

if ($WhatIf) {
    Write-Host "WhatIf: keine Aenderungen." -ForegroundColor Yellow
    exit 0
}

$pack = @'
set -e
cd "PATH_B"
tar czf "REMOTE_BUNDLE" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='frontend/node_modules' \
  --exclude='.env' \
  --exclude='.env.prod' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='backend/logs' \
  --exclude='*.log' \
  .
test -s "REMOTE_BUNDLE"
'@
$pack = $pack.Replace("PATH_B", $RemotePathB).Replace("REMOTE_BUNDLE", $remoteBundleB)

Write-Host "Packe auf B..." -ForegroundColor Yellow
($pack -replace "`r`n", "`n") | ssh -o ConnectTimeout=60 -o ServerAliveInterval=15 $ServerB "bash -s"
if ($LASTEXITCODE -ne 0) { throw "Tar auf B fehlgeschlagen." }

Write-Host "Lade Archiv auf diesen PC..." -ForegroundColor Yellow
scp -o ConnectTimeout=180 -o ServerAliveInterval=15 "${ServerB}:${remoteBundleB}" $localTmp
if (-not (Test-Path $localTmp)) { throw "Download fehlgeschlagen." }

Write-Host "Lade Archiv nach A..." -ForegroundColor Yellow
ssh -o ConnectTimeout=30 $ServerA "mkdir -p '$RemotePathA'"
scp -o ConnectTimeout=180 $localTmp "${ServerA}:${remoteBundleA}"

$unpack = @'
set -e
ROOT="PATH_A"
ARCH="REMOTE_A"
mkdir -p "$ROOT"
if [ -d "$ROOT" ] && [ -n "$(ls -A "$ROOT" 2>/dev/null)" ]; then
  tar czf /root/backup_app_before_sync_TS.tgz -C "$(dirname "$ROOT")" "$(basename "$ROOT")" || true
fi
tar xzf "$ARCH" -C "$ROOT"
rm -f "$ARCH"
echo "OK entpackt nach $ROOT"
'@
$unpack = $unpack.Replace("PATH_A", $RemotePathA).Replace("REMOTE_A", $remoteBundleA).Replace("TS", $ts)

Write-Host "Sichere ggf. altes Verzeichnis auf A, entpacke..." -ForegroundColor Yellow
($unpack -replace "`r`n", "`n") | ssh -o ConnectTimeout=120 $ServerA "bash -s"
if ($LASTEXITCODE -ne 0) { throw "Entpacken auf A fehlgeschlagen." }

ssh -o ConnectTimeout=20 $ServerB "rm -f '$remoteBundleB'" 2>$null
Remove-Item -Force $localTmp -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Fertig. Code liegt auf A unter $RemotePathA." -ForegroundColor Green
Write-Host "Auf A: docker compose -f docker-compose.prod.yml --env-file .env.prod build backend frontend && docker compose --env-file .env.prod -f docker-compose.prod.yml up -d backend frontend nginx" -ForegroundColor DarkYellow
