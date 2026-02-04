# Datenbank von Server B auf Server A wiederherstellen
# 1) Backup von B holen (Dump) und nach A kopieren (backup_b_to_a.ps1)
# 2) Auf A: Datenbank ersetzen und Dump einspielen
# Auf B wird nur gelesen (pg_dump); Schreibzugriffe nur in /root/backup_ibu_sw_* (nicht in ibu_sw).

param(
    [string]$ServerA = "root@144.91.103.103",
    [string]$ServerB = "root@95.111.238.180"
)

$ErrorActionPreference = "Stop"

Write-Host "=== DB von B nach A kopieren ===" -ForegroundColor Cyan
Write-Host "B (nur lesen): $ServerB"
Write-Host "A (Restore):   $ServerA"
Write-Host ""

# Schritt 1: Backup B -> A (Dump wird mitkopiert)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackupScript = Join-Path $ScriptDir "backup_b_to_a.ps1"
if (-not (Test-Path $BackupScript)) {
    Write-Host "Fehler: $BackupScript nicht gefunden." -ForegroundColor Red
    exit 1
}
Write-Host "Schritt 1: Backup von B nach A (Dump wird kopiert)..." -ForegroundColor Yellow
& $BackupScript -ServerA $ServerA -ServerB $ServerB -NoVerify
if ($LASTEXITCODE -ne 0) {
    Write-Host "Backup fehlgeschlagen." -ForegroundColor Red
    exit 1
}

# Schritt 2: Auf A neuestes Backup finden und DB restoren
Write-Host ""
Write-Host "Schritt 2: Auf A Datenbank mit Dump von B ueberschreiben..." -ForegroundColor Yellow
$RestoreCommands = @'
BACKUP_ROOT=$(ls -dt /root/backup_ibu_sw_* 2>/dev/null | head -1)
if [ -z "$BACKUP_ROOT" ]; then echo "Kein Backup auf A gefunden."; exit 1; fi
DUMP=$(ls "$BACKUP_ROOT"/pg_dump_*.sql 2>/dev/null | head -1)
if [ -z "$DUMP" ] || [ ! -f "$DUMP" ]; then echo "Kein pg_dump in $BACKUP_ROOT gefunden."; exit 1; fi
echo "Restore aus: $DUMP"
cd /root/ibu_sw && docker compose -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='ibu_turniere' AND pid<>pg_backend_pid();" 2>/dev/null || true
cd /root/ibu_sw && docker compose -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d postgres -c "DROP DATABASE IF EXISTS ibu_turniere;"
cd /root/ibu_sw && docker compose -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d postgres -c "CREATE DATABASE ibu_turniere;"
cat "$DUMP" | (cd /root/ibu_sw && docker compose -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d ibu_turniere)
echo "Restore abgeschlossen."
'@
ssh -o ConnectTimeout=15 $ServerA $RestoreCommands
if ($LASTEXITCODE -ne 0) {
    Write-Host "Restore auf A fehlgeschlagen." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== DB von B nach A kopiert ===" -ForegroundColor Green
Write-Host "Turniere und Daten von B sind jetzt auf A (finalstage.ch)."
