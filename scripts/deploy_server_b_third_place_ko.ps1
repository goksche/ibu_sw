# Deploy: Spiel um Platz 3 (UI + KO-Bracket) auf Server B — test.finalstage.ch
# Server: root@95.111.238.180, Projekt: /opt/ibu_sw
#
# Ein Archiv (weniger SSH-Runden, stabiler als viele einzelne SCPs).
# Ausfuehrung im Repo-Root:
#   powershell -ExecutionPolicy Bypass -File scripts/deploy_server_b_third_place_ko.ps1

$ErrorActionPreference = "Stop"
$Server = "root@95.111.238.180"
$RemotePath = "/opt/ibu_sw"

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $repoRoot

$staging = Join-Path $env:TEMP "ibu_third_place_ko_deploy"
if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
New-Item -ItemType Directory -Path $staging | Out-Null

$paths = @(
    "backend/app/services/ko_bracket.py",
    "backend/app/services/ko_propagation.py",
    "backend/app/api/v1/tournaments.py",
    "frontend/src/pages/CreateTournament.tsx",
    "frontend/src/pages/EditTournament.tsx",
    "frontend/src/domain/koThirdPlace.ts",
    "frontend/src/locales/de.json",
    "frontend/src/locales/en.json",
    "frontend/src/locales/fr.json",
    "frontend/src/locales/it.json",
    "frontend/src/locales/tr.json"
)

foreach ($rel in $paths) {
    $src = Join-Path $repoRoot $rel
    if (-not (Test-Path $src)) { Write-Error "Fehlt: $rel"; exit 1 }
    $destDir = Join-Path $staging (Split-Path -Parent $rel)
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
    Copy-Item $src (Join-Path $staging $rel) -Force
}

$zipPath = Join-Path $env:TEMP "ibu_third_place_ko.tgz"
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
# tar braugt Pfade relativ zum Staging-Inhalt: backend/... frontend/...
$tarExe = Join-Path $env:SystemRoot "System32\tar.exe"
if (-not (Test-Path $tarExe)) { Write-Error "tar.exe nicht gefunden: $tarExe"; exit 1 }
Push-Location $staging
try {
    & $tarExe -czf $zipPath backend frontend
} finally {
    Pop-Location
}

Write-Host "Upload Archiv ($zipPath) -> ${Server}:${RemotePath}/..." -ForegroundColor Yellow
scp -o ConnectTimeout=90 -o ServerAliveInterval=15 $zipPath "${Server}:${RemotePath}/_third_place_ko_deploy.tgz"
if ($LASTEXITCODE -ne 0) {
    Write-Error "SCP fehlgeschlagen. VPN/Netz pruefen und Skript erneut starten."
    exit 1
}

Write-Host "Entpacken und Docker neu bauen (MIT Env-Datei — sonst kein Login/DB)..." -ForegroundColor Yellow
# Server B: typisch .env.prod; lokal ggf. .env. Ohne --env-file sind SECRET_KEY/POSTGRES_PASSWORD leer.
$envPick = 'ENVF=.env.prod; [ -f "$ENVF" ] || ENVF=.env; [ -f "$ENVF" ] || { echo "FEHLT: .env.prod oder .env"; exit 1; }'
$one = "cd $RemotePath && tar -xzf _third_place_ko_deploy.tgz && rm -f _third_place_ko_deploy.tgz && $envPick && docker compose --env-file `$ENVF -f docker-compose.prod.yml build backend frontend && docker compose --env-file `$ENVF -f docker-compose.prod.yml up -d backend frontend && docker compose --env-file `$ENVF -f docker-compose.prod.yml ps"
ssh -o ConnectTimeout=120 $Server $one
if ($LASTEXITCODE -ne 0) { Write-Error "SSH/Docker auf dem Server fehlgeschlagen."; exit 1 }

Write-Host "Fertig." -ForegroundColor Green
