# SSH in CMD verwenden - Anleitung

## ✅ Gute Nachricht: SSH funktioniert!

Die Tests zeigen:
- ✅ Port 22 ist offen
- ✅ SSH-Verbindung funktioniert
- ✅ Server ist erreichbar

## Problem: SSH ist nicht im PATH in CMD

In PowerShell funktioniert SSH, aber in CMD möglicherweise nicht, weil OpenSSH nicht im PATH ist.

## Lösung: SSH in CMD verwenden

### Option 1: Vollständigen Pfad verwenden (funktioniert immer)

```cmd
C:\Windows\System32\OpenSSH\ssh.exe root@46.62.173.242
```

**Passwort:** `Fcb@fcb@9959`

### Option 2: SSH zum PATH hinzufügen

**In PowerShell (als Administrator):**
```powershell
# Prüfe aktuellen PATH
$env:Path

# Füge OpenSSH hinzu (nur für aktuelle Session)
$env:Path += ";C:\Windows\System32\OpenSSH"

# Oder permanent (als Administrator):
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Windows\System32\OpenSSH", "Machine")
```

**Dann in CMD:**
```cmd
ssh root@46.62.173.242
```

### Option 3: CMD mit OpenSSH-PATH starten

```cmd
set PATH=%PATH%;C:\Windows\System32\OpenSSH
ssh root@46.62.173.242
```

## SSH-Verbindung in CMD testen

```cmd
REM Test 1: Mit vollständigem Pfad
C:\Windows\System32\OpenSSH\ssh.exe root@46.62.173.242 "echo 'SSH funktioniert'"

REM Test 2: Wenn SSH im PATH ist
ssh root@46.62.173.242 "echo 'SSH funktioniert'"
```

## Häufige Fehler in CMD

### Fehler: "'ssh' is not recognized as an internal or external command"

**Lösung:** Verwende den vollständigen Pfad:
```cmd
C:\Windows\System32\OpenSSH\ssh.exe root@46.62.173.242
```

### Fehler: "Connection refused" oder "Connection timed out"

**Prüfe:**
1. Ist der Server online? → `ping 46.62.173.242`
2. Läuft SSH auf dem Server?
3. Ist Port 22 in der Firewall offen?

### Fehler: "Permission denied"

**Prüfe:**
1. Username: `root`
2. Passwort: `Fcb@fcb@9959`
3. Ist root-Login erlaubt?

## Praktische Beispiele

### Datei hochladen (SCP)
```cmd
C:\Windows\System32\OpenSSH\scp.exe fix_login.sh root@46.62.173.242:/root/
```

### Befehl ausführen
```cmd
C:\Windows\System32\OpenSSH\ssh.exe root@46.62.173.242 "docker ps"
```

### Mehrere Befehle
```cmd
C:\Windows\System32\OpenSSH\ssh.exe root@46.62.173.242 "cd /root/platform-core && docker compose ps"
```

## Alternative: PowerShell verwenden

PowerShell hat weniger Probleme mit SSH. Verwende einfach:

```powershell
C:\Windows\System32\OpenSSH\ssh.exe root@46.62.173.242
```

Oder wenn SSH im PATH ist:
```powershell
ssh root@46.62.173.242
```

## Schnelltest-Script für CMD

Erstelle `test_ssh.cmd`:

```cmd
@echo off
echo SSH-Verbindungstest
echo ===================
echo.

REM Test mit vollständigem Pfad
C:\Windows\System32\OpenSSH\ssh.exe -o ConnectTimeout=5 root@46.62.173.242 "echo SSH erfolgreich"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ SSH-Verbindung funktioniert!
) else (
    echo.
    echo ❌ SSH-Verbindung fehlgeschlagen!
    echo.
    echo Tipp: Verwende den vollständigen Pfad:
    echo    C:\Windows\System32\OpenSSH\ssh.exe root@46.62.173.242
)

pause
```

## Zusammenfassung

**SSH funktioniert!** Verwende einfach:

```cmd
C:\Windows\System32\OpenSSH\ssh.exe root@46.62.173.242
```

**Passwort:** `Fcb@fcb@9959`

Falls du Probleme hast, verwende PowerShell statt CMD - dort funktioniert es zuverlässiger.

