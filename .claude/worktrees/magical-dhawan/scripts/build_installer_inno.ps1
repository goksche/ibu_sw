# Baut PyInstaller-OneFolder und kompiliert Inno-Setup-Installer
# Voraussetzungen: Python 3.10+ und Inno Setup (ISCC) im PATH

$ErrorActionPreference = "Stop"

param(
  [string]$Version = "1.0.0"
)

# 1) Virtuelle Umgebung + Dependencies
if (-not (Test-Path -Path ".venv")) {
  python -m venv .venv
}
& .\.venv\Scripts\pip install --upgrade pip
& .\.venv\Scripts\pip install -r requirements.txt

# 2) Clean
Remove-Item -Recurse -Force "build","dist" -ErrorAction SilentlyContinue

# 3) PyInstaller OneFolder-Build
& .\.venv\Scripts\pyinstaller --noconfirm --clean ibu_sw.spec

$srcDir = "dist\ibu_sw"
if (-not (Test-Path $srcDir)) {
  Write-Error "PyInstaller-Output nicht gefunden: $srcDir"
}

# 4) Inno Setup kompilieren
$iss = "installer\ibu_sw.iss"
$outDir = "dist\installer"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# Prüfe ISCC
$iscc = Get-Command iscc.exe -ErrorAction SilentlyContinue
if (-not $iscc) {
  Write-Error "Inno Setup Compiler 'iscc.exe' nicht im PATH. Installiere z.B. via Chocolatey: choco install innosetup"
}

# ISCC Build mit Defines
& iscc.exe `
  "/DAppVersion=$Version" `
  "/DSourceDir=$srcDir" `
  "/DOutputDir=$outDir" `
  $iss

# 5) Ergebnis
$setup = Get-ChildItem "$outDir\IBU_Setup_*.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($setup -ne $null) {
  Write-Host "Fertig: $($setup.FullName)"
} else {
  Write-Error "Kein Setup-Output gefunden."
}
