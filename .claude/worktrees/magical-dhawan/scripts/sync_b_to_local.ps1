# Sync von Server B (95.111.238.180) nach lokal
# Holt Projekt + DB-Dump von B und überschreibt lokale Daten
# WICHTIG: Server B wird NICHT geändert - nur gelesen.

param(
    [string]$ServerB = "root@95.111.238.180",
    [string]$LocalPath = "c:\Cursor\ibu_sw",
    [string]$BackupDir = "/root/backup_mvp"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Sync B → Lokal ===" -ForegroundColor Cyan
Write-Host "Quelle: $ServerB"
Write-Host "Ziel:   $LocalPath"
Write-Host ""

# Neuestes Backup auf B finden
$LatestBackup = ssh $ServerB "ls -dt ${BackupDir}_* 2>/dev/null | head -1"
if (-not $LatestBackup) {
    Write-Host "Fehler: Kein MVP-Backup auf B. Zuerst backup_mvp_on_server_b.sh auf B ausführen." -ForegroundColor Red
    exit 1
}
Write-Host "Nutze Backup: $LatestBackup" -ForegroundColor Yellow

# Oder: direkt aus /root/ibu_sw (falls kein Backup existiert)
$SourceDir = "/root/ibu_sw"
$TempDir = "$env:TEMP\ibu_sw_sync_$(Get-Date -Format 'yyyyMMdd_HHmm')"
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

Write-Host "Hole Projekt von B (rsync/scp)..." -ForegroundColor Yellow
# rsync falls verfügbar, sonst scp
$exclude = @("node_modules", "__pycache__", ".git", "*.log")
$excludeArgs = ($exclude | ForEach-Object { "--exclude=$_" }) -join " "
$rsyncCmd = "rsync -avz --delete $excludeArgs $ServerB`:$SourceDir/ $TempDir/"
try {
    Invoke-Expression $rsyncCmd 2>$null
} catch {
    Write-Host "rsync nicht verfügbar, nutze scp..." -ForegroundColor Yellow
    scp -r "${ServerB}:${SourceDir}/*" $TempDir/
}

Write-Host "Hole DB-Dump von B..."
$DumpPath = ssh $ServerB "ls `"$LatestBackup`"/pg_dump_*.sql 2>/dev/null | head -1"
if ($DumpPath) {
    scp "${ServerB}:$DumpPath" "$LocalPath\scripts\pg_dump_from_b.sql"
    Write-Host "DB-Dump gespeichert: scripts\pg_dump_from_b.sql" -ForegroundColor Green
}

Write-Host "Kopiere Projektdateien nach $LocalPath ..." -ForegroundColor Yellow
# Kritische Verzeichnisse überschreiben (ohne .git)
$dirs = @("backend", "frontend", "nginx", "scripts", "docs")
foreach ($d in $dirs) {
    $src = Join-Path $TempDir $d
    $dst = Join-Path $LocalPath $d
    if (Test-Path $src) {
        Copy-Item -Path "$src\*" -Destination $dst -Recurse -Force
        Write-Host "  $d"
    }
}
# Einzelne Dateien
$files = @("docker-compose.yml", "docker-compose.prod.yml", ".env.example")
foreach ($f in $files) {
    $src = Join-Path $TempDir $f
    if (Test-Path $src) {
        Copy-Item $src (Join-Path $LocalPath $f) -Force
        Write-Host "  $f"
    }
}

Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "=== Sync abgeschlossen ===" -ForegroundColor Green
Write-Host "Lokaler Stand = Server B"
