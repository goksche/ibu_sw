# SSH-Verbindung zum Server einrichten

## Server-Informationen
- **Server:** `46.62.173.242`
- **Benutzer:** `root`
- **Passwort:** `Fcb@fcb@9959`

## SSH auf Windows aktivieren

### Option 1: OpenSSH Client installieren (Windows 10/11)

1. **Über Windows Features:**
   - Windows-Taste + R → `appwiz.cpl` → Enter
   - Klicke auf "Windows-Features aktivieren oder deaktivieren"
   - Suche nach "OpenSSH-Client"
   - Aktiviere es und klicke auf OK
   - Starte Windows neu

2. **Über PowerShell (als Administrator):**
   ```powershell
   # Prüfe ob OpenSSH installiert ist
   Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH*'

   # Installiere OpenSSH Client
   Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
   ```

3. **Über Settings:**
   - Settings → Apps → Optional Features
   - "Add a feature" → "OpenSSH Client" → Install

### Option 2: Git Bash verwenden (falls Git installiert ist)
- Git Bash enthält SSH
- Öffne Git Bash und verwende normale SSH-Befehle

### Option 3: PuTTY verwenden
- Download: https://www.putty.org/
- Host: `46.62.173.242`
- Port: `22`
- Connection type: `SSH`
- Username: `root`

## SSH-Verbindung herstellen

### Mit PowerShell/CMD (nach Installation von OpenSSH):

```powershell
# Einfache Verbindung
ssh root@46.62.173.242

# Mit Passwort (wird beim ersten Mal abgefragt)
# Passwort: Fcb@fcb@9959
```

### Mit Git Bash:

```bash
ssh root@46.62.173.242
# Passwort: Fcb@fcb@9959
```

### Mit PuTTY:
1. Öffne PuTTY
2. Host Name: `46.62.173.242`
3. Port: `22`
4. Connection type: `SSH`
5. Klicke "Open"
6. Username: `root`
7. Password: `Fcb@fcb@9959`

## SSH-Key einrichten (optional, für Passwort-freien Login)

```powershell
# 1. Erstelle SSH-Key (falls noch nicht vorhanden)
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 2. Kopiere Public Key auf Server
type $env:USERPROFILE\.ssh\id_rsa.pub | ssh root@46.62.173.242 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

# 3. Teste Verbindung (sollte jetzt ohne Passwort funktionieren)
ssh root@46.62.173.242
```

## Dateien hochladen mit SCP

### Mit OpenSSH (nach Installation):

```powershell
# Einzelne Datei hochladen
scp fix_login.sh root@46.62.173.242:/root/

# Verzeichnis hochladen
scp -r platform-core root@46.62.173.242:/root/
```

### Mit WinSCP (GUI, empfohlen):
1. Download: https://winscp.net/
2. Host: `46.62.173.242`
3. Username: `root`
4. Password: `Fcb@fcb@9959`
5. Protocol: `SFTP`
6. Klicke "Login"
7. Ziehe Dateien per Drag & Drop

## Befehle auf dem Server ausführen

### Einzelner Befehl:
```powershell
ssh root@46.62.173.242 "ls -la /root/platform-core"
```

### Mehrere Befehle:
```powershell
ssh root@46.62.173.242 @"
cd /root/platform-core
docker compose ps
docker compose logs backend --tail=20
"@
```

### Script auf Server ausführen:
```powershell
# Script hochladen
scp fix_login.sh root@46.62.173.242:/root/

# Script ausführen
ssh root@46.62.173.242 "bash /root/fix_login.sh"
```

## Troubleshooting

### "ssh: command not found"
- OpenSSH Client ist nicht installiert
- Siehe "SSH auf Windows aktivieren" oben

### "Connection refused" oder "Connection timed out"
- Prüfe ob Server erreichbar ist: `ping 46.62.173.242`
- Prüfe ob Port 22 offen ist
- Prüfe Firewall-Einstellungen

### "Host key verification failed"
```powershell
# Entferne alten Host-Key
ssh-keygen -R 46.62.173.242

# Oder verbinde mit -o StrictHostKeyChecking=no (nur für Tests!)
ssh -o StrictHostKeyChecking=no root@46.62.173.242
```

### "Permission denied"
- Prüfe Username (sollte `root` sein)
- Prüfe Passwort (`Fcb@fcb@9959`)
- Prüfe ob SSH-Zugriff für root erlaubt ist

## Schnellstart für Login-Fix

```powershell
# 1. Prüfe ob SSH verfügbar ist
Get-Command ssh

# 2. Falls nicht, installiere OpenSSH (als Administrator):
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0

# 3. Verbinde dich mit dem Server
ssh root@46.62.173.242
# Passwort: Fcb@fcb@9959

# 4. Führe das Fix-Script aus (nachdem du es hochgeladen hast)
bash /root/fix_login.sh
```

