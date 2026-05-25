# PowerShell Script zum Ausführen des Login-Fixes
# Führe aus: .\run_fix.ps1

$server = "root@46.62.173.242"
$sshPath = "C:\Windows\System32\OpenSSH\ssh.exe"
$scriptPath = "fix_login.sh"

Write-Host "🔧 Platform Core - Login-Fix ausführen" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Prüfe ob Script existiert
if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ Script $scriptPath nicht gefunden!" -ForegroundColor Red
    exit 1
}

# Lade Script-Inhalt
$scriptContent = Get-Content $scriptPath -Raw

Write-Host "📤 Lade Fix-Script auf Server hoch..." -ForegroundColor Yellow

# Erstelle Script auf Server
$createCommand = @"
cat > /root/fix_login.sh << 'ENDOFSCRIPT'
$scriptContent
ENDOFSCRIPT
chmod +x /root/fix_login.sh
echo 'Script erstellt'
"@

try {
    $createCommand | & $sshPath $server bash
    Write-Host "✅ Script hochgeladen!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Führe Fix-Script aus..." -ForegroundColor Yellow
    Write-Host ""
    
    # Führe Script aus
    & $sshPath $server "bash /root/fix_login.sh"
    
    Write-Host ""
    Write-Host "✅ Fix abgeschlossen!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Teste jetzt: https://gsmartsol.ch" -ForegroundColor Cyan
    Write-Host "🔐 Login: admin / admin123" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Fehler: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tipp: Stelle sicher, dass du dich mit dem Server verbinden kannst" -ForegroundColor Yellow
}
