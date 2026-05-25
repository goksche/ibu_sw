# Server A -> Server B: Spiegelung per Stream (A: nur lesen, keine neuen Dateien unter ibu_sw)
# - Tar: ssh A (tar stdout) -> lokale Temp-Datei (Windows) -> scp nach B (stabiler als reine A|B-Pipe ohne Daten auf der Windows-SSH)
# - pg_dump: ssh A -> lokale Temp-Datei -> scp nach B
# - Restore-Schritte laufen nur auf B (/opt/ibu_sw, Docker)
#
# Voraussetzung: SSH BatchMode zu A und B (Keys), ausfuehren vom PC im Repo-Root:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\scripts\sync_a_to_b_stream_readonly.ps1
#
# Optional: -SkipRestore  nur Stream, kein Einspielen auf /opt/ibu_sw

param(
    [string]$ServerA = "root@144.91.103.103",
    [string]$ServerB = "root@95.111.238.180",
    [string]$AppPathA = "/root/ibu_sw",
    [string]$AppPathB = "/opt/ibu_sw",
    [switch]$SkipRestore,
    [switch]$SkipPgDump,
    [switch]$RestoreViaHop
)

$ErrorActionPreference = "Stop"

function Get-LinuxLfText([string]$Text) {
    if ([string]::IsNullOrEmpty($Text)) { return $Text }
    return (($Text -replace "`r`n", "`n") -replace "`r", "`n").TrimEnd()
}

# ssh-Stdout binär in Datei (PowerShell-Pipe würde Text-Encoding ruinieren; hält NAT/Firewall bei langem Tar aktiv)
function Invoke-SshRemoteStdoutToFile {
    param(
        [string[]]$SshArgs,
        [string]$TargetHost,
        [string]$RemoteBashOneLiner,
        [string]$OutFile
    )
    if (Test-Path $OutFile) { Remove-Item $OutFile -Force }
    $stderrPath = "$OutFile.stderr"
    if (Test-Path $stderrPath) { Remove-Item $stderrPath -Force }
    $all = $SshArgs + @("-C", $TargetHost, $RemoteBashOneLiner)
    $p = Start-Process -FilePath "ssh" -ArgumentList $all -Wait -NoNewWindow -PassThru `
        -RedirectStandardOutput $OutFile -RedirectStandardError $stderrPath
    if ($p.ExitCode -ne 0) {
        $err = if (Test-Path $stderrPath) { Get-Content $stderrPath -Raw -ErrorAction SilentlyContinue } else { "" }
        Remove-Item $OutFile -ErrorAction SilentlyContinue
        throw "ssh fehlgeschlagen (Exit $($p.ExitCode)): $err"
    }
    Remove-Item $stderrPath -ErrorAction SilentlyContinue
}

function Invoke-ScpToRemote {
    param(
        [string]$LocalPath,
        [string]$ScpTarget
    )
    $scpArgs = @("-o", "BatchMode=yes", "-o", "ConnectTimeout=120", $LocalPath, $ScpTarget)
    $p = Start-Process -FilePath "scp" -ArgumentList $scpArgs -Wait -NoNewWindow -PassThru
    if ($p.ExitCode -ne 0) { throw "scp fehlgeschlagen (Exit $($p.ExitCode)) Ziel: $ScpTarget" }
}

function Get-RemoteFileSizeBytes {
    param([string[]]$SshArgs, [string]$TargetHost, [string]$RemotePath)
    $wcOut = (ssh @SshArgs $TargetHost "wc -c $RemotePath 2>/dev/null").Trim()
    if ([string]::IsNullOrWhiteSpace($wcOut)) { return 0L }
    if ($wcOut -match '^(\d+)') { return [long]$Matches[1] }
    return 0L
}

$Ssh = @(
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=60",
    "-o", "ServerAliveInterval=15",
    "-o", "ServerAliveCountMax=240"
)
$TS = Get-Date -Format "yyyyMMdd_HHmm"
$TarRemoteB = "/root/a_to_b_ibu_sw_$TS.tar.gz"
$SqlRemoteB = "/root/a_to_b_ibu_turniere_$TS.sql"
$BakB = "/opt/ibu_sw.bak_before_a_sync_$TS"

Write-Host "=== A -> B Stream (A read-only, no writes under $AppPathA) ===" -ForegroundColor Cyan
Write-Host "Timestamp: $TS"
Write-Host ""

Write-Host "SSH A ($ServerA) ..." -ForegroundColor Yellow
ssh @Ssh $ServerA "test -d $AppPathA && echo OK"
if ($LASTEXITCODE -ne 0) { throw "Server A: $AppPathA nicht gefunden." }

Write-Host "SSH B ($ServerB) ..." -ForegroundColor Yellow
ssh @Ssh $ServerB "test -d $AppPathB && echo OK"
if ($LASTEXITCODE -ne 0) { throw "Server B: $AppPathB nicht gefunden." }

Write-Host ""
Write-Host "[1/4] Tar-Stream A -> B (kann mehrere Minuten dauern) ..." -ForegroundColor Yellow
Write-Host "      Quelle: ${ServerA}:${AppPathA} (ohne node_modules, .git, __pycache__, Logs)"
Write-Host "      Transport: A -> lokale Temp-Datei -> scp B (stabile SSH-Datenstroeme)" -ForegroundColor DarkGray
$tarOneLine = 'cd /root && tar --exclude=ibu_sw/node_modules --exclude=ibu_sw/.git --exclude=ibu_sw/__pycache__ --exclude=''ibu_sw/**/*.pyc'' --exclude=ibu_sw/backend/logs --exclude=''ibu_sw/*.log'' -czf - ibu_sw'
$localTar = Join-Path $env:TEMP "a_to_b_ibu_sw_$TS.tar.gz"
try {
    Invoke-SshRemoteStdoutToFile -SshArgs $Ssh -TargetHost $ServerA -RemoteBashOneLiner $tarOneLine -OutFile $localTar
    $tarLocalLen = (Get-Item $localTar).Length
    if ($tarLocalLen -lt 50000) {
        throw "Tar lokal zu klein ($tarLocalLen Bytes) - pruefen Sie A (tar/SSH)."
    }
    $scpTarTarget = "${ServerB}:$TarRemoteB"
    Invoke-ScpToRemote -LocalPath $localTar -ScpTarget $scpTarTarget
}
finally {
    Remove-Item $localTar -ErrorAction SilentlyContinue
}
if ($LASTEXITCODE -ne 0) { throw "Tar-Stream fehlgeschlagen." }
ssh @Ssh $ServerB "ls -lh $TarRemoteB"
$tarBytes = Get-RemoteFileSizeBytes -SshArgs $Ssh -TargetHost $ServerB -RemotePath $TarRemoteB
if ($tarBytes -lt 50000) {
    throw "Tar-Archiv zu klein ($($tarBytes) Bytes) - Stream von A pruefen (SSH/tar)."
}

if (-not $SkipPgDump) {
    Write-Host ""
    Write-Host "[2/4] PostgreSQL-Dump-Stream A -> B ..." -ForegroundColor Yellow
    Write-Host "      Transport: A -> lokale Temp-Datei -> scp B" -ForegroundColor DarkGray
    $dumpOneLine = 'set -e; cd ' + $AppPathA + '; if [ -n "$(docker compose --env-file .env.prod -f docker-compose.prod.yml ps -q postgres 2>/dev/null)" ]; then docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres pg_dump -U ibu_admin ibu_turniere; else docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T ibu_postgres_prod pg_dump -U ibu_admin ibu_turniere; fi'
    $localSql = Join-Path $env:TEMP "a_to_b_ibu_turniere_$TS.sql"
    try {
        Invoke-SshRemoteStdoutToFile -SshArgs $Ssh -TargetHost $ServerA -RemoteBashOneLiner $dumpOneLine -OutFile $localSql
        $sqlLocalLen = (Get-Item $localSql).Length
        if ($sqlLocalLen -lt 500) {
            Write-Host "WARN: SQL-Dump sehr klein ($sqlLocalLen Bytes) - pruefen Sie A (postgres-Service)." -ForegroundColor DarkYellow
        }
        $scpSqlTarget = "${ServerB}:$SqlRemoteB"
        Invoke-ScpToRemote -LocalPath $localSql -ScpTarget $scpSqlTarget
        ssh @Ssh $ServerB "ls -lh $SqlRemoteB"
        $sqlBytes = Get-RemoteFileSizeBytes -SshArgs $Ssh -TargetHost $ServerB -RemotePath $SqlRemoteB
        if ($sqlBytes -lt 1000) { Write-Host "WARN: SQL auf B sehr klein ($($sqlBytes) Bytes)." -ForegroundColor DarkYellow }
    }
    catch {
        Write-Host "WARN: pg_dump/SCP fehlgeschlagen: $_" -ForegroundColor DarkYellow
    }
    finally {
        Remove-Item $localSql -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "[2/4] pg_dump uebersprungen (-SkipPgDump)." -ForegroundColor DarkYellow
}

if ($SkipRestore) {
    Write-Host ""
    Write-Host "Fertig (nur Stream). Archive auf B:" -ForegroundColor Green
    Write-Host "  $TarRemoteB"
    if (-not $SkipPgDump) { Write-Host "  $SqlRemoteB" }
    exit 0
}

Write-Host ""
Write-Host "[3/4] Restore auf B: Backup aktuelles $AppPathB, Auspacken, .env B behalten ..." -ForegroundColor Yellow
$restoreScript = @"
set -euo pipefail
TS='$TS'
TAR='$TarRemoteB'
SQL='$SqlRemoteB'
APP='$AppPathB'
BAK='$BakB'
ENV_SAVE=/root/env_b_saved_${TS}.env.prod

if [ ! -f "`$TAR" ]; then echo "Fehlt: `$TAR"; exit 1; fi
if [ -f "`$APP/.env.prod" ]; then cp -a "`$APP/.env.prod" "`$ENV_SAVE"; echo "Gesichert: `$ENV_SAVE"; fi

cd "`$APP"
docker compose --env-file .env.prod -f docker-compose.prod.yml down || true
cd /opt
mv ibu_sw "`$BAK"
mkdir -p ibu_sw
tar -xzf "`$TAR" -C /opt

if [ -d "`$BAK/nginx/conf.d" ]; then
  cp -a "`$BAK/nginx/conf.d/." "`$APP/nginx/conf.d/"
  echo "nginx/conf.d von B-Backup wiederhergestellt (Test-Domains/Zertifikate)."
fi

if [ -f "`$ENV_SAVE" ]; then cp -a "`$ENV_SAVE" "`$APP/.env.prod"; echo "B .env.prod wiederhergestellt (Domains/Secrets von Test-B)."; fi

cd "`$APP"
docker compose --env-file .env.prod -f docker-compose.prod.yml build backend frontend
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d

if [ -f "`$SQL" ] && [ -s "`$SQL" ]; then
  echo "Importiere DB (Drop/Create, nur B) ..."
  sleep 5
  docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d postgres -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'ibu_turniere' AND pid <> pg_backend_pid();" || true
  docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ibu_turniere;"
  docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ibu_turniere OWNER ibu_admin;"
  if cat "`$SQL" | docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres psql -U ibu_admin -d ibu_turniere -v ON_ERROR_STOP=1; then
    echo "DB-Import via Service postgres OK."
  elif cat "`$SQL" | docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T ibu_postgres_prod psql -U ibu_admin -d ibu_turniere -v ON_ERROR_STOP=1; then
    echo "DB-Import via ibu_postgres_prod OK."
  else
    echo "WARN: DB-Import fehlgeschlagen - Dump manuell einspielen: `$SQL"
  fi
  docker compose --env-file .env.prod -f docker-compose.prod.yml restart backend || true
fi

docker compose --env-file .env.prod -f docker-compose.prod.yml ps
echo "Altes Verzeichnis: `$BAK"
"@

# Restore: LF erzwingen; bei SSH-Timeout zu B optional ueber A (-RestoreViaHop)
$restoreLf = Get-LinuxLfText $restoreScript
$hopToB = "ssh -o BatchMode=yes -o ConnectTimeout=60 -o ServerAliveInterval=15 -o ServerAliveCountMax=240 $ServerB bash -s"
if ($RestoreViaHop) {
    $restoreLf | ssh @Ssh $ServerA $hopToB
} else {
    $restoreLf | ssh @Ssh $ServerB "bash -s"
}
if ($LASTEXITCODE -ne 0 -and -not $RestoreViaHop) {
    Write-Host "Direktes SSH zu B fehlgeschlagen - Retry ueber Server A ..." -ForegroundColor DarkYellow
    $restoreLf | ssh @Ssh $ServerA $hopToB
}
if ($LASTEXITCODE -ne 0) { throw "Restore auf B fehlgeschlagen." }

Write-Host ""
Write-Host "[4/4] Kurzcheck Version auf B ..." -ForegroundColor Yellow
ssh @Ssh $ServerB "curl -sS https://test.finalstage.ch/api/v1/info/version || true"

Write-Host ""
Write-Host "=== Fertig ===" -ForegroundColor Green
Write-Host "B: App unter $AppPathB | Backup vorher: $BakB | Stream-Archive: $TarRemoteB $(if (-not $SkipPgDump) { '| ' + $SqlRemoteB })"
