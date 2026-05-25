# Read-Only Server Monitoring Template

Zweck: Schnelle, gelegentliche Gesundheitspruefung von Linux-Servern (CPU/Load, RAM/Swap, Netzwerk, Docker, Security) **ohne** Systemaenderungen.

## 1) Regeln (immer)

- Nur read-only arbeiten: keine Config-Aenderungen, keine Restarts, keine Kills, keine Installs.
- Bei SSH-/Sudo-Problemen nur melden, nicht beheben.
- Zeitangaben immer in `Europe/Zurich`.
- Wenn `sudo -n` nicht verfuegbar: sauber dokumentieren und ohne privilegierte Teile fortfahren.

## 2) Zielserver

- Server A (Produktion): `root@144.91.103.103` (Fallback falls noetig: `opsadmin@144.91.103.103`)
- Server B (Test): `opsadmin@95.111.238.180`
- Optional Server C: `opsadmin@157.173.114.105`

## 3) Kommandos pro Server (Read-Only)

> Tipp: Erst SSH testen, danach die Bloecke A-E ausfuehren.

### SSH-Test

```bash
ssh -o BatchMode=yes -o ConnectTimeout=10 <USER>@<HOST> "TZ=Europe/Zurich date '+%Y-%m-%d %H:%M:%S %Z'; hostname; uptime"
```

### A) CPU / Load

```bash
uptime
nproc
top -bn1 | sed -n '1,12p'
ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%cpu | head -n 12
cat /proc/loadavg
```

### B) RAM / Swap

```bash
free -m
vmstat 1 5
```

### C) Bandbreite / Netzwerk

Primar:

```bash
vnstat --oneline b
```

Fallback:

```bash
cat /proc/net/dev
```

3 Messpunkte in 10s Abstand (Rx/Tx-Differenz):

```bash
# Punkt 1
date +%s
cat /proc/net/dev

# 10 Sekunden warten
sleep 10

# Punkt 2
date +%s
cat /proc/net/dev

# 10 Sekunden warten
sleep 10

# Punkt 3
date +%s
cat /proc/net/dev
```

Offene Verbindungen:

```bash
ss -tulpen | head -n 60
ss -s
```

### D) Container-Last (falls Docker aktiv)

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}'
docker stats --no-stream
```

### E) Security / Anomalien (read-only)

```bash
systemctl is-active fail2ban
fail2ban-client status sshd
journalctl -p 3 -n 50 --no-pager
```

## 4) Sudo-Handling (Template-Logik)

```bash
if sudo -n true 2>/dev/null; then
  echo "SUDO_NOPASSWD=YES"
  SUDO="sudo -n"
else
  echo "SUDO_NOPASSWD=NO"
  SUDO=""
fi
```

Beispiele:

```bash
[ -n "$SUDO" ] && $SUDO systemctl is-active fail2ban || systemctl is-active fail2ban
[ -n "$SUDO" ] && $SUDO docker stats --no-stream || docker stats --no-stream
```

## 5) Bewertungslogik (Ampel)

- **CPU kritisch**: dauerhaft >85% ueber mehrere Stichproben.
- **Load kritisch**: 1m-Load > Anzahl CPU-Kerne ueber laengeren Zeitraum.
- **RAM kritisch**: >90% belegt oder Swap waechst schnell.
- **Netz auffaellig**: egress/ingress deutlich ueber dem ueblichen Muster.

### Status-Definition

- **OK**: keine Schwellwerte verletzt, keine harten Anomalien.
- **WARNUNG**: einzelne Auffaelligkeiten (z. B. Bruteforce-Rauschen, sudo fehlt, kurzzeitige Lastspitze).
- **KRITISCH**: Schwellwerte klar verletzt oder mehrere starke Anomalien gleichzeitig.

## 6) Ausgabeformat (kopierfertig)

```text
1) Kurzfazit (OK / WARNUNG / KRITISCH)
- Gesamtstatus:
- Zeitpunkt (Europe/Zurich):

2) Kennzahlen pro Server (CPU, Load, RAM, Rx/Tx)
- Server A:
  CPU:
  Load:
  RAM/Swap:
  Rx/Tx:
- Server B:
  CPU:
  Load:
  RAM/Swap:
  Rx/Tx:
- Server C (optional):
  CPU:
  Load:
  RAM/Swap:
  Rx/Tx:

3) Top 5 Prozesse nach CPU
- Server A:
  1.
  2.
  3.
  4.
  5.
- Server B:
  1.
  2.
  3.
  4.
  5.
- Server C (optional):
  1.
  2.
  3.
  4.
  5.

4) Auffaelligkeiten
- Server A:
- Server B:
- Server C:

5) Empfohlene naechste Schritte (nur Empfehlungen, nichts ausgefuehrt)
- 1)
- 2)
- 3)

6) Rohdaten-Abschnitt mit wichtigsten Kommandos/Outputs
- [uptime]
- [nproc]
- [top -bn1 | sed -n '1,12p']
- [ps ... --sort=-%cpu | head -n 12]
- [cat /proc/loadavg]
- [free -m]
- [vmstat 1 5]
- [vnstat --oneline b] oder [/proc/net/dev + 3-Punkt-Diff]
- [ss -tulpen | head -n 60]
- [ss -s]
- [docker ps / docker stats] (falls aktiv)
- [fail2ban / journalctl]
```

## 7) Kurze Plausibilitaets-Checks vor Abgabe

- Zeitstempel in `Europe/Zurich` gesetzt?
- Alle Server klar getrennt dokumentiert?
- SSH-/sudo-Probleme explizit genannt?
- Top-Prozesse enthalten Monitoring-Kommandos (`top`, `ps`, `bash`) als Artefakte markiert oder bereinigt?
- Empfehlungen nur vorgeschlagen, nichts ausgefuehrt?

