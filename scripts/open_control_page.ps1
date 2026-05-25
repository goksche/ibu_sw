Param(
    [string]$PlanPath = ""
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Builder = Join-Path $PSScriptRoot "build_control_page.py"
$Output = Join-Path $RepoRoot "docs\control_center.html"

if ($PlanPath -ne "") {
    $env:CONTROL_MAIN_PLAN_PATH = $PlanPath
}

python "$Builder"

if (-not (Test-Path $Output)) {
    throw "Kontrollseite wurde nicht erzeugt: $Output"
}

Start-Process "$Output"
Write-Host "Kontrollseite geoeffnet: $Output"
