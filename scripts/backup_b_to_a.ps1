# Backup von Server B (Test) nach Server A (Produktion)
# AUSFUEHRUNG LOKAL AUF DEM PC. Steuerung der Server ausschliesslich per SSH/SCP.
# Falls Ausfuehrung blockiert: In dieser Konsole zuerst ausfuehren:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
# Dann: .\backup_b_to_a.ps1
# Alternative (neues Fenster): powershell.exe -ExecutionPolicy Bypass -File .\backup_b_to_a.ps1
# Erstellt auf B ein Backup von /root/ibu_sw, kopiert es ueber den PC nach A.
# Beide Server haben danach dasselbe Backup (backup_ibu_sw_YYYYMMDD_HHMM).
# HINWEIS: Es wird NUR ins Backup-Verzeichnis auf A geschrieben – /root/ibu_sw auf A wird NICHT ueberschrieben.

param(
    [string]$ServerA = "root@144.91.103.103",
    [string]$ServerB = "root@95.111.238.180",
    [string]$SourceDir = "/root/ibu_sw",
    [switch]$SkipPgDump,
    [switch]$NoVerify,
    [switch]$KeepTemp
)

$ErrorActionPreference = "Stop"
$TS = Get-Date -Format "yyyyMMdd_HHmm"
$BackupRoot = "/root/backup_ibu_sw_$TS"
$TempDir = Join-Path $env:TEMP "backup_ibu_sw_$TS"

Write-Host "=== Backup B -> A ===" -ForegroundColor Cyan
Write-Host "Quelle: $ServerB ($SourceDir)"
Write-Host "Ziel:   $ServerA (nur Backup-Verzeichnis)"
Write-Host "Backup: $BackupRoot (TS: $TS)"
Write-Host ""

# 1) SSH-Verbindungen pruefen
Write-Host "Pruefe SSH zu B..." -ForegroundColor Yellow
$null = ssh -o ConnectTimeout=10 $ServerB "exit"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Fehler: SSH zu B ($ServerB) nicht moeglich." -ForegroundColor Red
    exit 1
}
Write-Host "Pruefe SSH zu A..." -ForegroundColor Yellow
$null = ssh -o ConnectTimeout=10 -o BatchMode=yes $ServerA "exit"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Fehler: SSH zu A ($ServerA) nicht moeglich. Pruefe Key/Netzwerk." -ForegroundColor Red
    exit 1
}

# 2) Auf B: Backup-Verzeichnis anlegen und Tar erstellen
Write-Host "Erstelle Backup auf B..." -ForegroundColor Yellow
ssh $ServerB "mkdir -p $BackupRoot"
if ($LASTEXITCODE -ne 0) { Write-Host "Fehler: Verzeichnis auf B anlegen." -ForegroundColor Red; exit 1 }

ssh $ServerB "cd /root && tar --exclude='node_modules' --exclude='__pycache__' --exclude='*.pyc' --exclude='.git' --exclude='*.log' --exclude='backend/logs' -cvf $BackupRoot/ibu_sw_backup_$TS.tar ibu_sw"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Fehler: Tar auf B fehlgeschlagen." -ForegroundColor Red
    ssh $ServerB "rm -rf $BackupRoot"
    exit 1
}

# Optional: PostgreSQL-Dump auf B
if (-not $SkipPgDump) {
    Write-Host "Erstelle DB-Dump auf B..." -ForegroundColor Yellow
    ssh $ServerB "cd $SourceDir && (docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U ibu_admin ibu_turniere 2>/dev/null || docker compose -f docker-compose.prod.yml exec -T ibu_postgres_prod pg_dump -U ibu_admin ibu_turniere) > $BackupRoot/pg_dump_$TS.sql"
    if ($LASTEXITCODE -ne 0) { Write-Host "Hinweis: PG-Dump auf B uebersprungen oder fehlgeschlagen." -ForegroundColor DarkYellow }
}

# .env kopieren (optional)
ssh $ServerB "cd $SourceDir && (cp -a .env $BackupRoot/.env 2>/dev/null || cp -a .env.prod $BackupRoot/.env 2>/dev/null || true)"

# Checksumme auf B (optional)
ssh $ServerB "sha256sum $BackupRoot/ibu_sw_backup_$TS.tar > $BackupRoot/ibu_sw_backup_$TS.tar.sha256 2>/dev/null || true"

# 3) Backup von B auf PC holen
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
Write-Host "Hole Backup von B auf PC..." -ForegroundColor Yellow
scp "${ServerB}:${BackupRoot}/ibu_sw_backup_${TS}.tar" "$TempDir\"
if (-not (Test-Path "$TempDir\ibu_sw_backup_$TS.tar")) {
    Write-Host "Fehler: Tar von B nicht erhalten." -ForegroundColor Red
    if (-not $KeepTemp) { Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue }
    exit 1
}
scp "${ServerB}:${BackupRoot}/ibu_sw_backup_${TS}.tar.sha256" "$TempDir\" 2>$null
scp "${ServerB}:${BackupRoot}/pg_dump_${TS}.sql" "$TempDir\" 2>$null
scp "${ServerB}:${BackupRoot}/.env" "$TempDir\.env" 2>$null

# 4) Backup vom PC nach A kopieren (nur Backup-Verzeichnis – Produktions-ibu_sw bleibt unberuehrt)
Write-Host "Kopiere Backup von PC nach A (nur Backup-Verzeichnis)..." -ForegroundColor Yellow
ssh $ServerA "mkdir -p $BackupRoot"
scp "$TempDir\ibu_sw_backup_${TS}.tar" "${ServerA}:${BackupRoot}/"
if (Test-Path "$TempDir\ibu_sw_backup_$TS.tar.sha256") { scp "$TempDir\ibu_sw_backup_${TS}.tar.sha256" "${ServerA}:${BackupRoot}/" }
if (Test-Path "$TempDir\pg_dump_$TS.sql") { scp "$TempDir\pg_dump_$TS.sql" "${ServerA}:${BackupRoot}/" }
if (Test-Path "$TempDir\.env") { scp "$TempDir\.env" "${ServerA}:${BackupRoot}/" }

# 5) Vorhandene Backups anzeigen
Write-Host ""
Write-Host "--- Vorhandene Backups (backup_ibu_sw_*) auf B ---" -ForegroundColor Cyan
ssh $ServerB "ls -lt /root/backup_ibu_sw_* 2>/dev/null || echo '(keine)'"
Write-Host "--- Vorhandene Backups (backup_ibu_sw_*) auf A ---" -ForegroundColor Cyan
ssh $ServerA "ls -lt /root/backup_ibu_sw_* 2>/dev/null || echo '(keine)'"

# 6) Erfolg pruefen (auf A)
if (-not $NoVerify) {
    Write-Host ""
    Write-Host "Pruefe Backup auf A..." -ForegroundColor Yellow
    $remoteCheck = ssh $ServerA "test -f $BackupRoot/ibu_sw_backup_$TS.tar && test -s $BackupRoot/ibu_sw_backup_$TS.tar && echo OK || echo FAIL"
    if ($remoteCheck -match "OK") {
        Write-Host "Backup auf A vorhanden und nicht leer." -ForegroundColor Green
    } else {
        Write-Host "Warnung: Backup-Datei auf A fehlt oder ist leer." -ForegroundColor Red
        if (-not $KeepTemp) { Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue }
        exit 1
    }
}

# 7) Aufraumen (optional)
if (-not $KeepTemp) {
    Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "=== Backup B -> A abgeschlossen ===" -ForegroundColor Green
Write-Host "Backup: $BackupRoot (auf B und A)"
