# PostgreSQL-Dumps von Server A und Server B lokal speichern (nur lesend auf den Servern).
# PC: powershell -ExecutionPolicy Bypass -File .\scripts\backup_db_both_servers_local.ps1
#
# Bei Server A: RemotePathA anpassen, falls das Projekt nicht unter /root/ibu_sw liegt.

param(
    [string]$ServerA = "root@144.91.103.103",
    [string]$ServerB = "root@95.111.238.180",
    [string]$RemotePathA = "/root/ibu_sw",
    [string]$RemotePathB = "/opt/ibu_sw",
    [string]$ComposeFile = "docker-compose.prod.yml",
    [string]$EnvFile = ".env.prod",
    [string]$DbUser = "ibu_admin",
    [string]$DbName = "ibu_turniere",
    [string]$LocalBackupRoot = "",
    [switch]$AllowPartial
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($LocalBackupRoot)) {
    $LocalBackupRoot = Join-Path $repoRoot "backups"
}

$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$sessionDir = Join-Path $LocalBackupRoot "dual_db_$ts"
New-Item -ItemType Directory -Path $sessionDir -Force | Out-Null

function Invoke-RemotePgDumpToLocal {
    param(
        [string]$Label,
        [string]$Server,
        [string]$RemoteProjectDir
    )
    $remoteTmp = "/tmp/pg_dump_${Label}_$ts.sql"
    Write-Host "[$Label] pg_dump auf $Server ($RemoteProjectDir) ..." -ForegroundColor Yellow

    $remoteScript = @'
set -e
cd "REMOTE_DIR"
test -f "COMPOSE_FILE" || { echo "Fehlt COMPOSE_FILE"; exit 1; }
if [ -f "ENV_FILE" ]; then
  docker compose --env-file "ENV_FILE" -f "COMPOSE_FILE" exec -T postgres pg_dump -U "DB_USER" "DB_NAME" > "REMOTE_TMP"
else
  docker compose -f "COMPOSE_FILE" exec -T postgres pg_dump -U "DB_USER" "DB_NAME" > "REMOTE_TMP"
fi
test -s "REMOTE_TMP" || { echo "Dump leer"; exit 1; }
'@
    $remoteScript = $remoteScript.Replace("REMOTE_DIR", $RemoteProjectDir)
    $remoteScript = $remoteScript.Replace("COMPOSE_FILE", $ComposeFile)
    $remoteScript = $remoteScript.Replace("ENV_FILE", $EnvFile)
    $remoteScript = $remoteScript.Replace("DB_USER", $DbUser)
    $remoteScript = $remoteScript.Replace("DB_NAME", $DbName)
    $remoteScript = $remoteScript.Replace("REMOTE_TMP", $remoteTmp)

    $remoteScriptUnix = $remoteScript -replace "`r`n", "`n"
    $remoteScriptUnix | ssh -o ConnectTimeout=30 -o ServerAliveInterval=15 $Server "bash -s"
    if ($LASTEXITCODE -ne 0) {
        throw "[$Label] pg_dump auf dem Server fehlgeschlagen."
    }

    $localFile = Join-Path $sessionDir "${Label}_${DbName}.sql"
    scp -o ConnectTimeout=60 -o ServerAliveInterval=15 "${Server}:${remoteTmp}" $localFile
    if ($LASTEXITCODE -ne 0) {
        throw "[$Label] SCP des Dumps fehlgeschlagen."
    }
    ssh -o ConnectTimeout=20 $Server "rm -f '$remoteTmp'" 2>$null

    $len = (Get-Item $localFile).Length
    if ($len -lt 500) {
        throw "[$Label] Lokale Datei zu klein ($len Bytes)."
    }
    Write-Host "[$Label] OK -> $localFile ($len Bytes)" -ForegroundColor Green
}

Write-Host "=== Lokales Backup: $sessionDir ===" -ForegroundColor Cyan
Write-Host ""

$aOk = $false
try {
    Invoke-RemotePgDumpToLocal -Label "server_a" -Server $ServerA -RemoteProjectDir $RemotePathA
    $aOk = $true
}
catch {
    Write-Host "SERVER A FEHLER: $_" -ForegroundColor Red
    Write-Host "Tipp: -RemotePathA anpassen oder pruefen, ob Docker/Compose auf A laeuft." -ForegroundColor DarkYellow
}

try {
    Invoke-RemotePgDumpToLocal -Label "server_b" -Server $ServerB -RemoteProjectDir $RemotePathB
}
catch {
    Write-Host "SERVER B FEHLER: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Fertig: $sessionDir" -ForegroundColor Cyan
Write-Host "backups/ nicht committen." -ForegroundColor DarkYellow

if (-not $aOk -and -not $AllowPartial) {
    Write-Host ""
    Write-Host "FEHLER: Server-A-Backup fehlt. Ohne beide Dumps kein sauberer Go-Live-Schutz." -ForegroundColor Red
    Write-Host "Wenn A bewusst nicht erreichbar: erneut mit -AllowPartial (Exit 0)." -ForegroundColor DarkYellow
    exit 1
}
