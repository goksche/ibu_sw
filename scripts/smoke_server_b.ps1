# Smoke-Test gegen Server B (von Windows/Dev-Rechner; kein Docker-Zwang).
# Standard: https://test.finalstage.ch
#
#   powershell -ExecutionPolicy Bypass -File .\scripts\smoke_server_b.ps1
#   powershell -ExecutionPolicy Bypass -File .\scripts\smoke_server_b.ps1 -BaseUrl https://betabilic.finalstage.ch

Param(
    [string]$BaseUrl = "https://test.finalstage.ch",
    [int]$TimeoutSec = 20
)

$ErrorActionPreference = "Stop"
$BaseUrl = $BaseUrl.TrimEnd("/")

function Write-Step([string]$msg) {
    Write-Host ""
    Write-Host "=== $msg ==="
}

function Http-Check([string]$name, [string]$url, [string]$method = "GET", [int[]]$okStatus = @(200)) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri $url -Method $method -TimeoutSec $TimeoutSec
        if ($okStatus -notcontains [int]$r.StatusCode) {
            throw "${name}: HTTP $($r.StatusCode) nicht erlaubt (erlaubt: $($okStatus -join ', '))"
        }
        Write-Host ("OK  {0,-28} {1} {2}" -f $name, $r.StatusCode, $url)
        return
    } catch {
        $resp = $_.Exception.Response
        if ($resp -and $resp.StatusCode) {
            $code = [int]$resp.StatusCode
            if ($okStatus -contains $code) {
                Write-Host ("OK  {0,-28} {1} {2}" -f $name, $code, $url)
                return
            }
            throw "${name}: HTTP $code ($url)"
        }
        throw "${name}: Request fehlgeschlagen ($url): $($_.Exception.Message)"
    }
}

Write-Step "Server-B Smoke (BaseUrl=$BaseUrl)"
Http-Check "home" "$BaseUrl/" "GET" @(200)
Http-Check "api-info-version" "$BaseUrl/api/v1/info/version" "GET" @(200)
# Optional route: nicht überall hinter Nginx erreichbar (z. B. 404 ohne interne Weiterleitung)
Http-Check "api-info-diagnostics" "$BaseUrl/api/v1/info/diagnostics" "GET" @(200)
Write-Host ""
Write-Host "Smoke OK."
