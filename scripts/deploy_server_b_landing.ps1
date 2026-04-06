# Deploy: Beta-Landing (/) + Nginx + Wiki oeffentlich + Frontend — Server B test.finalstage.ch
# Server: root@95.111.238.180, Projekt: /opt/ibu_sw
#
# Ausfuehrung im Repo-Root:
#   powershell -ExecutionPolicy Bypass -File scripts/deploy_server_b_landing.ps1

$ErrorActionPreference = "Stop"
$Server = "root@95.111.238.180"
$RemotePath = "/opt/ibu_sw"

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $repoRoot

$staging = Join-Path $env:TEMP "ibu_landing_deploy"
if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
New-Item -ItemType Directory -Path $staging | Out-Null

$paths = @(
    "nginx/conf.d/default.conf",
    "docker-compose.prod.yml",
    "nginx/landing/index.html",
    "frontend/src/App.tsx"
)

foreach ($rel in $paths) {
    $src = Join-Path $repoRoot $rel
    if (-not (Test-Path $src)) { Write-Error "Fehlt: $rel"; exit 1 }
    $destDir = Join-Path $staging (Split-Path -Parent $rel)
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
    Copy-Item $src (Join-Path $staging $rel) -Force
}

$zipPath = Join-Path $env:TEMP "ibu_landing_deploy.tgz"
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
$tarExe = Join-Path $env:SystemRoot "System32\tar.exe"
if (-not (Test-Path $tarExe)) { Write-Error "tar.exe nicht gefunden: $tarExe"; exit 1 }
Push-Location $staging
try {
    & $tarExe -czf $zipPath nginx docker-compose.prod.yml frontend
} finally {
    Pop-Location
}

Write-Host "Upload Archiv -> ${Server}:${RemotePath}/..." -ForegroundColor Yellow
scp -o ConnectTimeout=90 -o ServerAliveInterval=15 $zipPath "${Server}:${RemotePath}/_landing_deploy.tgz"
if ($LASTEXITCODE -ne 0) {
    Write-Error "SCP fehlgeschlagen. VPN/Netz pruefen."
    exit 1
}

Write-Host "Entpacken, nginx + frontend neu bauen, Stack neu starten..." -ForegroundColor Yellow
$envPick = 'ENVF=.env.prod; [ -f "$ENVF" ] || ENVF=.env; [ -f "$ENVF" ] || { echo "FEHLT: .env.prod oder .env"; exit 1; }'
$one = "cd $RemotePath && tar -xzf _landing_deploy.tgz && rm -f _landing_deploy.tgz && $envPick && docker compose --env-file `$ENVF -f docker-compose.prod.yml build frontend nginx && docker compose --env-file `$ENVF -f docker-compose.prod.yml up -d frontend nginx && docker compose --env-file `$ENVF -f docker-compose.prod.yml exec -T nginx nginx -t && docker compose --env-file `$ENVF -f docker-compose.prod.yml ps"
ssh -o ConnectTimeout=120 $Server $one
if ($LASTEXITCODE -ne 0) { Write-Error "SSH/Docker auf dem Server fehlgeschlagen."; exit 1 }

Write-Host "Fertig. Pruefen: https://test.finalstage.ch/ und Kacheln." -ForegroundColor Green
