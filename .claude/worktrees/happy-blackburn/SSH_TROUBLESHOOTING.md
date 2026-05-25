# SSH-Verbindungsprobleme beheben

## Problem: SSH-Verbindung funktioniert nicht mehr

### 1. Server-Erreichbarkeit prüfen

```powershell
# Ping-Test
ping 46.62.173.242

# Port-Test (Port 22 = SSH)
Test-NetConnection -ComputerName 46.62.173.242 -Port 22
```

**Mögliche Ergebnisse:**
- ✅ **TcpTestSucceeded: True** → Server ist erreichbar, SSH läuft
- ❌ **TcpTestSucceeded: False** → Port 22 ist blockiert oder SSH läuft nicht
- ❌ **Timeout** → Server ist nicht erreichbar oder Firewall blockiert

### 2. SSH-Verbindung testen

```powershell
# Mit Timeout (5 Sekunden)
C:\Windows\System32\OpenSSH\ssh.exe -o ConnectTimeout=5 root@46.62.173.242 "echo 'test'"

# Mit verbose Output (zeigt Details)
C:\Windows\System32\OpenSSH\ssh.exe -v root@46.62.173.242

# Mit StrictHostKeyChecking (für erste Verbindung)
C:\Windows\System32\OpenSSH\ssh.exe -o StrictHostKeyChecking=no root@46.62.173.242
```

### 3. Häufige Probleme und Lösungen

#### Problem: "Connection refused"
**Ursache:** SSH-Service läuft nicht auf dem Server

**Lösung (auf dem Server):**
```bash
# Prüfe ob SSH läuft
systemctl status ssh
# oder
systemctl status sshd

# Starte SSH falls nicht aktiv
systemctl start ssh
systemctl enable ssh
```

#### Problem: "Connection timed out"
**Ursache:** Firewall blockiert Port 22 oder Server ist nicht erreichbar

**Lösung:**
1. Prüfe Firewall-Regeln auf dem Server
2. Prüfe ob Port 22 in der Firewall geöffnet ist
3. Prüfe ob der Server online ist

```bash
# Auf dem Server: Firewall prüfen
ufw status
# oder
iptables -L

# SSH-Port öffnen (falls nötig)
ufw allow 22/tcp
```

#### Problem: "Permission denied"
**Ursache:** Falsches Passwort oder SSH-Zugriff für root deaktiviert

**Lösung:**
1. Passwort prüfen: `Fcb@fcb@9959`
2. Prüfe SSH-Konfiguration auf dem Server:
```bash
# Auf dem Server
cat /etc/ssh/sshd_config | grep PermitRootLogin
# Sollte sein: PermitRootLogin yes
```

#### Problem: "Host key verification failed"
**Ursache:** SSH-Key hat sich geändert

**Lösung:**
```powershell
# Entferne alten Host-Key
C:\Windows\System32\OpenSSH\ssh-keygen.exe -R 46.62.173.242

# Oder verbinde mit StrictHostKeyChecking=no (nur für Tests!)
C:\Windows\System32\OpenSSH\ssh.exe -o StrictHostKeyChecking=no root@46.62.173.242
```

#### Problem: "ssh: command not found" in CMD
**Ursache:** OpenSSH ist nicht im PATH

**Lösung:**
```powershell
# Verwende vollständigen Pfad
C:\Windows\System32\OpenSSH\ssh.exe root@46.62.173.242

# Oder füge OpenSSH zum PATH hinzu (als Administrator):
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Windows\System32\OpenSSH", "Machine")
```

### 4. Alternative Verbindungsmethoden

#### Option A: PuTTY (GUI)
1. Download: https://www.putty.org/
2. Host: `46.62.173.242`
3. Port: `22`
4. Connection type: `SSH`
5. Username: `root`
6. Password: `Fcb@fcb@9959`

#### Option B: WinSCP (GUI für Dateien)
1. Download: https://winscp.net/
2. Host: `46.62.173.242`
3. Username: `root`
4. Password: `Fcb@fcb@9959`
5. Protocol: `SFTP`

#### Option C: Git Bash (falls installiert)
```bash
ssh root@46.62.173.242
```

### 5. SSH-Verbindung auf dem Server prüfen

Falls du einen anderen Zugang zum Server hast (z.B. über eine Web-Konsole), prüfe:

```bash
# SSH-Status prüfen
systemctl status ssh
# oder
systemctl status sshd

# SSH-Logs prüfen
journalctl -u ssh -n 50
# oder
tail -f /var/log/auth.log

# SSH-Konfiguration prüfen
cat /etc/ssh/sshd_config | grep -E "Port|PermitRootLogin|PasswordAuthentication"

# SSH neu starten
systemctl restart ssh
```

### 6. Schnelltest-Script

Erstelle `test_ssh.ps1`:

```powershell
$server = "46.62.173.242"
$user = "root"

Write-Host "🔍 SSH-Verbindungstest" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
Write-Host ""

# 1. Ping-Test
Write-Host "1. Ping-Test..." -ForegroundColor Yellow
$ping = Test-Connection -ComputerName $server -Count 2 -Quiet
if ($ping) {
    Write-Host "   ✅ Server ist erreichbar" -ForegroundColor Green
} else {
    Write-Host "   ❌ Server ist nicht erreichbar" -ForegroundColor Red
    exit 1
}

# 2. Port-Test
Write-Host "2. Port 22 Test..." -ForegroundColor Yellow
$port = Test-NetConnection -ComputerName $server -Port 22 -WarningAction SilentlyContinue
if ($port.TcpTestSucceeded) {
    Write-Host "   ✅ Port 22 ist offen" -ForegroundColor Green
} else {
    Write-Host "   ❌ Port 22 ist blockiert oder SSH läuft nicht" -ForegroundColor Red
    exit 1
}

# 3. SSH-Verbindungstest
Write-Host "3. SSH-Verbindungstest..." -ForegroundColor Yellow
try {
    $result = & "C:\Windows\System32\OpenSSH\ssh.exe" -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$user@$server" "echo 'SSH erfolgreich'" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ SSH-Verbindung erfolgreich!" -ForegroundColor Green
        Write-Host "   $result" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ SSH-Verbindung fehlgeschlagen" -ForegroundColor Red
        Write-Host "   $result" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Fehler: $_" -ForegroundColor Red
}
```

### 7. Wenn nichts funktioniert

1. **Prüfe ob Server online ist:**
   - Besuche die Website: https://gsmartsol.ch
   - Wenn die Website lädt, ist der Server online

2. **Kontaktiere Server-Administrator:**
   - Prüfe ob SSH-Service läuft
   - Prüfe Firewall-Regeln
   - Prüfe ob IP-Adresse sich geändert hat

3. **Alternative Zugänge:**
   - Web-basierte Konsole (falls verfügbar)
   - VNC/RDP (falls konfiguriert)
   - Server-Management-Panel (falls vorhanden)

