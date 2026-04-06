# Eine Backend-Datei nach Server B kopieren, nur Backend-Image neu bauen (mit .env.prod)
# Repo-Root: powershell -File scripts/deploy_server_b_backend_file.ps1 backend/app/api/v1/participants.py

param(
    [Parameter(Mandatory = $true)]
    [string]$RelativePath
)

$ErrorActionPreference = "Stop"
$Server = "root@95.111.238.180"
$RemotePath = "/opt/ibu_sw"
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$src = Join-Path $repoRoot $RelativePath
if (-not (Test-Path $src)) { Write-Error "Datei fehlt: $RelativePath"; exit 1 }

Write-Host "SCP $RelativePath" -ForegroundColor Yellow
scp -o ConnectTimeout=90 $src "${Server}:${RemotePath}/$RelativePath"
if ($LASTEXITCODE -ne 0) { exit 1 }

$remote = "cd $RemotePath && docker compose --env-file .env.prod -f docker-compose.prod.yml build backend && docker compose --env-file .env.prod -f docker-compose.prod.yml up -d backend && docker compose --env-file .env.prod -f docker-compose.prod.yml ps"
ssh -o ConnectTimeout=180 $Server $remote
if ($LASTEXITCODE -ne 0) { Write-Error "Docker fehlgeschlagen"; exit 1 }
Write-Host "Fertig (Backend)." -ForegroundColor Green
