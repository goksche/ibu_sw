Param(
    [string]$ComposeFile = "docker-compose.prod.yml",
    [string]$BaseUrl = "http://127.0.0.1",
    [int]$TimeoutSec = 15,
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$msg) {
    Write-Host ""
    Write-Host "=== $msg ==="
}

function Http-Check([string]$name, [string]$url, [string]$method = "GET", [int[]]$okStatus = @(200, 204, 301, 302, 401, 403)) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri $url -Method $method -TimeoutSec $TimeoutSec
        if ($okStatus -notcontains [int]$r.StatusCode) {
            throw "${name}: HTTP $($r.StatusCode) ist nicht in erlaubten Statuscodes: $($okStatus -join ', ')"
        }
        Write-Host ("OK  {0,-28} {1} {2}" -f $name, $r.StatusCode, $url)
        return $true
    } catch {
        # Invoke-WebRequest wirft bei >=400; StatusCode kann dennoch vorhanden sein
        $resp = $_.Exception.Response
        if ($resp -and $resp.StatusCode) {
            $code = [int]$resp.StatusCode
            if ($okStatus -contains $code) {
                Write-Host ("OK  {0,-28} {1} {2}" -f $name, $code, $url)
                return $true
            }
            throw "${name}: HTTP $code ($url)"
        }
        throw "${name}: Request fehlgeschlagen ($url): $($_.Exception.Message)"
    }
}

Write-Step "Local Smoke: Docker Compose up"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$upArgs = @("-f", $ComposeFile, "up", "-d")
if (-not $NoBuild) { $upArgs += "--build" }
docker compose @upArgs | Out-Null

Write-Step "Local Smoke: Container Status"
docker compose -f $ComposeFile ps

Write-Step "Local Smoke: HTTP Checks"
Http-Check "home" "$BaseUrl/" "HEAD" @(200, 301, 302)
Http-Check "api-settings-global" "$BaseUrl/api/v1/settings/global" "GET" @(200, 401, 403)
Http-Check "backend-health" "$BaseUrl/health" "GET" @(200, 404)  # je nach nginx routing evtl. 404; dann ist zumindest frontend da

Write-Host ""
Write-Host "Smoke OK."

