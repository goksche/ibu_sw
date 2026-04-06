# Schliesst Go-Live auf Server A ab (Projekt unter /root/ibu_sw, Docker installiert).
# powershell -ExecutionPolicy Bypass -File .\scripts\complete_go_live_server_a.ps1
# Optional: -SkipDbRestore

param(
    [string]$ServerA = "root@144.91.103.103",
    [string]$RemotePath = "/root/ibu_sw",
    [string]$DumpLocal = "",
    [switch]$SkipDbRestore
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($DumpLocal)) {
    $repo = Resolve-Path (Join-Path $PSScriptRoot "..")
    $latest = Get-ChildItem -Path (Join-Path $repo "backups") -Filter "go_live_*" -Directory -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending | Select-Object -First 1
    if ($latest) {
        $cand = Join-Path $latest.FullName "server_b_ibu_turniere.sql"
        if (Test-Path $cand) { $DumpLocal = $cand }
    }
}
if (-not $SkipDbRestore -and ([string]::IsNullOrWhiteSpace($DumpLocal) -or -not (Test-Path $DumpLocal))) {
    Write-Host "Kein Dump: -DumpLocal setzen oder go_live_* Backup." -ForegroundColor Red
    exit 1
}

Write-Host "=== Domains .env.prod (test -> finalstage) ===" -ForegroundColor Cyan
ssh -o ConnectTimeout=60 $ServerA "sed -i 's/test\.finalstage\.ch/finalstage.ch/g' '$RemotePath/.env.prod'"

Write-Host "=== UFW ===" -ForegroundColor Cyan
ssh -o ConnectTimeout=60 $ServerA "if command -v ufw >/dev/null; then ufw allow 22/tcp; ufw allow 80/tcp; ufw allow 443/tcp; ufw --force enable; ufw status; fi"

$compose = "cd '$RemotePath' && docker compose -f docker-compose.prod.yml --env-file .env.prod"

Write-Host "=== Postgres ===" -ForegroundColor Cyan
ssh -o ConnectTimeout=120 $ServerA "$compose up -d postgres"
Start-Sleep -Seconds 20

if (-not $SkipDbRestore) {
    Write-Host "=== Dump -> A & Restore ===" -ForegroundColor Cyan
    scp -o ConnectTimeout=300 $DumpLocal "${ServerA}:/tmp/ibu_restore.sql"

    $rp = $RemotePath.Replace("'", "'\''")
    $remote = @"
set -e
cd '$rp'
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T postgres psql -U ibu_admin -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='ibu_turniere' AND pid <> pg_backend_pid();" 2>/dev/null || true
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T postgres psql -U ibu_admin -d postgres -c 'DROP DATABASE IF EXISTS ibu_turniere;'
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T postgres psql -U ibu_admin -d postgres -c 'CREATE DATABASE ibu_turniere;'
cat /tmp/ibu_restore.sql | docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T postgres psql -U ibu_admin -d ibu_turniere
rm -f /tmp/ibu_restore.sql
echo RESTORE_OK
"@
    ($remote -replace "`r`n", "`n") | ssh -o ConnectTimeout=600 $ServerA "bash -s"
    if ($LASTEXITCODE -ne 0) { Write-Host "WARN: Restore-Exit != 0 (pg_dump \\restrict o.a. pruefen)." -ForegroundColor Yellow }
}

Write-Host "=== Build & up backend frontend nginx ===" -ForegroundColor Cyan
ssh -o ConnectTimeout=600 $ServerA "$compose build backend frontend && $compose up -d backend frontend nginx"

ssh -o ConnectTimeout=60 $ServerA "$compose ps"

Write-Host ""
Write-Host "Danach: TLS mit certbot (DOMAIN in .env.prod), dann nginx wieder mit 443." -ForegroundColor DarkYellow
