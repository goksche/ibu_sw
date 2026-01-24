# PowerShell Script zum Hochladen und Ausführen des Fix-Scripts
# Führe aus: .\fix_login.ps1

$server = "root@46.62.173.242"
$scriptPath = "fix_login.sh"

Write-Host "📤 Lade Fix-Script auf Server hoch..." -ForegroundColor Cyan

# Prüfe ob OpenSSH verfügbar ist
$sshPath = Get-Command ssh -ErrorAction SilentlyContinue
if (-not $sshPath) {
    Write-Host "❌ SSH nicht gefunden. Bitte installiere OpenSSH oder verwende WinSCP." -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Kopiere fix_login.sh manuell auf den Server und führe aus:" -ForegroundColor Yellow
    Write-Host "   bash fix_login.sh" -ForegroundColor Yellow
    exit 1
}

# Versuche Script hochzuladen
try {
    # Erstelle temporäres Script auf Server
    $scriptContent = Get-Content $scriptPath -Raw
    $base64Content = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($scriptContent))
    
    Write-Host "📝 Erstelle Script auf Server..." -ForegroundColor Cyan
    $createScript = @"
cat > /root/fix_login.sh << 'SCRIPTEOF'
$scriptContent
SCRIPTEOF
chmod +x /root/fix_login.sh
"@
    
    $createScript | ssh $server bash
    
    Write-Host "✅ Script hochgeladen!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Führe Fix-Script aus..." -ForegroundColor Cyan
    Write-Host ""
    
    # Führe Script aus
    ssh $server "bash /root/fix_login.sh"
    
    Write-Host ""
    Write-Host "✅ Fertig! Bitte teste das Login im Browser." -ForegroundColor Green
    
} catch {
    Write-Host "❌ Fehler beim Hochladen/Ausführen: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Kopiere fix_login.sh manuell auf den Server und führe aus:" -ForegroundColor Yellow
    Write-Host "   bash fix_login.sh" -ForegroundColor Yellow
}

