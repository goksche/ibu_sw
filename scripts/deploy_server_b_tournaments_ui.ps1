# Turniere-UI nach Server B: alle Dateien in EINER tar|ssh-Pipeline + Frontend neu bauen
# Aus Repo-Root: pwsh -File scripts/deploy_server_b_tournaments_ui.ps1

$ErrorActionPreference = "Stop"
$Server = "root@95.111.238.180"
$RemotePath = "/opt/ibu_sw"
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$fe = Join-Path $repoRoot "frontend"

$files = @(
    "src/pages/Tournaments.tsx",
    "src/services/tournamentService.ts",
    "src/locales/de.json",
    "src/locales/en.json",
    "src/locales/fr.json",
    "src/locales/it.json",
    "src/locales/tr.json"
)

foreach ($rel in $files) {
    if (-not (Test-Path (Join-Path $fe $rel))) { Write-Error "Datei fehlt: $rel"; exit 1 }
}

$tarList = $files -join " "
$remoteUnpack = "cd ${RemotePath}/frontend && tar -xf -"

# cmd.exe: tar stdout -> ssh stdin (zuverlaessiger als reine PS-Pipes fuer Binaerdaten)
$tarExe = Join-Path $env:SystemRoot "System32\tar.exe"
$sshExe = Join-Path $env:SystemRoot "System32\OpenSSH\ssh.exe"
if (-not (Test-Path $sshExe)) { $sshExe = "ssh" }
$bat = @"
@echo off
cd /d "$fe"
"$tarExe" -cf - $tarList | "$sshExe" -o ConnectTimeout=180 $Server "$remoteUnpack"
if errorlevel 1 exit /b 1
"@
$batPath = Join-Path $env:TEMP "ibu_deploy_tournaments_ui.bat"
Set-Content -LiteralPath $batPath -Value $bat -Encoding OEM

Write-Host "Upload (tar | ssh) ..." -ForegroundColor Yellow
& "${env:SystemRoot}\System32\cmd.exe" /c "`"$batPath`""
$ec = $LASTEXITCODE
Remove-Item -ErrorAction SilentlyContinue $batPath
if ($ec -ne 0) { Write-Error "Upload fehlgeschlagen (Exit $ec)"; exit 1 }

$verify = "grep -c Trash ${RemotePath}/frontend/src/pages/Tournaments.tsx || true"
Write-Host "Verify Trash count on server:" -ForegroundColor Cyan
& $sshExe -o ConnectTimeout=60 $Server $verify

$remote = "cd $RemotePath && docker compose --env-file .env.prod -f docker-compose.prod.yml build --no-cache frontend && docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --force-recreate frontend && docker compose --env-file .env.prod -f docker-compose.prod.yml ps frontend"
Write-Host "Docker build frontend (kann mehrere Minuten dauern)..." -ForegroundColor Yellow
& $sshExe -o ConnectTimeout=600 $Server $remote
if ($LASTEXITCODE -ne 0) { Write-Error "Docker fehlgeschlagen"; exit 1 }
Write-Host "Fertig. test.finalstage.ch/turnier/ - ggf. Hard-Reload (Cache)." -ForegroundColor Green
