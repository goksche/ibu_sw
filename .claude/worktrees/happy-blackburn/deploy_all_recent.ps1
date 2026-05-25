# Deployment aller letzten Änderungen auf 144.91.103.103
# Backend + Frontend-Dateien hochladen, Container neu starten
# Production (test.finalstage.ch): $UseProd = $true → docker-compose.prod.yml + frontend:80

$Server = "root@144.91.103.103"
$UseProd = $true  # true = docker-compose.prod.yml (frontend:80), false = docker-compose.yml (frontend:3000)
$RemotePath = "/root/ibu_sw"

$backendFiles = @(
    "backend/app/api/v1/matches.py",
    "backend/app/services/ko_propagation.py",
    "backend/app/api/v1/tables.py"
)
$frontendFiles = @(
    "frontend/src/components/tournament/KOBracket.tsx",
    "frontend/src/pages/TournamentDetail.tsx",
    "frontend/src/components/tournament/TournamentOverview.tsx"
)

foreach ($f in $backendFiles + $frontendFiles) {
    if (-not (Test-Path $f)) { Write-Error "Fehlt: $f"; exit 1 }
}

Write-Host "Backend hochladen..." -ForegroundColor Yellow
foreach ($f in $backendFiles) {
    scp $f "${Server}:${RemotePath}/$f"
    if ($LASTEXITCODE -ne 0) { Write-Error "SCP fehlgeschlagen: $f"; exit 1 }
}

Write-Host "Frontend hochladen..." -ForegroundColor Yellow
foreach ($f in $frontendFiles) {
    scp $f "${Server}:${RemotePath}/$f"
    if ($LASTEXITCODE -ne 0) { Write-Error "SCP fehlgeschlagen: $f"; exit 1 }
}

$ComposeArgs = if ($UseProd) { "-f docker-compose.prod.yml" } else { "" }

Write-Host "Backend neu starten..." -ForegroundColor Yellow
ssh $Server "cd $RemotePath && docker compose $ComposeArgs restart backend"
if ($LASTEXITCODE -ne 0) { Write-Host "Backend-Neustart fehlgeschlagen" -ForegroundColor Red }

Write-Host "Frontend neu bauen und starten..." -ForegroundColor Yellow
ssh $Server "cd $RemotePath && docker compose $ComposeArgs build frontend && docker compose $ComposeArgs up -d frontend"
if ($LASTEXITCODE -ne 0) { Write-Host "Frontend-Build/Start fehlgeschlagen" -ForegroundColor Red }

# Nginx-Upstream prüfen und ggf. korrigieren (502 vermeiden: Prod = frontend:80)
Write-Host "Nginx-Upstream prüfen..." -ForegroundColor Yellow
if ($UseProd) {
    $fixResult = ssh $Server "cd $RemotePath && if grep -q 'frontend:3000' nginx/conf.d/default.conf; then sed -i 's/frontend:3000/frontend:80/' nginx/conf.d/default.conf; echo 'KORRIGIERT'; fi && docker compose -f docker-compose.prod.yml restart nginx"
    if ($fixResult -match "KORRIGIERT") { Write-Host "Nginx-Config war falsch (3000), wurde auf 80 korrigiert und nginx neu gestartet." -ForegroundColor Yellow }
}
ssh $Server "cd $RemotePath && grep 'upstream frontend' nginx/conf.d/default.conf"

Write-Host "Deployment beendet." -ForegroundColor Green
