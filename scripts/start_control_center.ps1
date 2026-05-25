Param(
    [string]$PlanPath = ""
)

$ErrorActionPreference = "Stop"
$Builder = Join-Path $PSScriptRoot "build_control_page.py"
$ServerScript = Join-Path $PSScriptRoot "control_query_server.py"
$ServerUrl = "http://127.0.0.1:8765/"

function Resolve-ShellExe {
    $candidates = @(
        (Join-Path $PSHOME "pwsh.exe"),
        (Join-Path $PSHOME "powershell.exe"),
        "pwsh.exe",
        "powershell.exe"
    )
    foreach ($candidate in $candidates) {
        try {
            $cmd = Get-Command $candidate -ErrorAction Stop
            return $cmd.Source
        } catch {
        }
    }
    throw "Keine PowerShell-Executable gefunden (pwsh/powershell)."
}

if ($PlanPath -ne "") {
    $env:CONTROL_MAIN_PLAN_PATH = $PlanPath
}

python "$Builder"

# Falls bereits ein Server laeuft, einfach Browser oeffnen.
try {
    $health = Invoke-WebRequest -Uri "http://127.0.0.1:8765/health" -UseBasicParsing -TimeoutSec 2
    if ($health.StatusCode -eq 200) {
        Start-Process "$ServerUrl"
        Write-Host "Control Center bereits aktiv: $ServerUrl"
        exit 0
    }
} catch {
    # ignorieren und neu starten
}

# Neuen Server in separatem Fenster starten.
$escapedServerScript = $ServerScript.Replace("'", "''")
$cmd = "python '$escapedServerScript'"
$shellExe = Resolve-ShellExe
Start-Process $shellExe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $cmd | Out-Null

Start-Sleep -Seconds 1
Start-Process "$ServerUrl"
Write-Host "Control Center gestartet: $ServerUrl"
Write-Host "Hinweis: Das separate PowerShell-Fenster muss offen bleiben."
