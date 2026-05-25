# Monitoring-Bericht (Read-Only) – Tabellarische Uebersicht

## 1) Kurzfazit

| Feld | Wert |
|---|---|
| Gesamtstatus | `OK | WARNUNG | KRITISCH` |
| Zeitpunkt (Europe/Zurich) | `YYYY-MM-DD HH:MM:SS CET/CEST` |
| Scope | `Server A | Server B | optional Server C` |
| Monitoring-Typ | `Strict read-only` |

---

## 2) Kennzahlen pro Server

| Kennzahl | Server A (Produktion) | Server B (Test) | Server C (optional) |
|---|---|---|---|
| CPU Usage | `x.x%` | `x.x%` | `x.x%` |
| CPU Idle | `x.x%` | `x.x%` | `x.x%` |
| Load 1m | `x.xx` | `x.xx` | `x.xx` |
| Load 5m | `x.xx` | `x.xx` | `x.xx` |
| Load 15m | `x.xx` | `x.xx` | `x.xx` |
| Kerne (`nproc`) | `N` | `N` | `N` |
| RAM used / total | `x / y MB` | `x / y MB` | `x / y MB` |
| RAM used % | `x.x%` | `x.x%` | `x.x%` |
| Swap total / used | `x / y MB` | `x / y MB` | `x / y MB` |
| Swap-Trend | `stabil | steigend` | `stabil | steigend` | `stabil | steigend` |
| Netzwerk Rx | `x B/s oder MB/s` | `x B/s oder MB/s` | `x B/s oder MB/s` |
| Netzwerk Tx | `x B/s oder MB/s` | `x B/s oder MB/s` | `x B/s oder MB/s` |
| `vnstat` verfuegbar | `ja | nein` | `ja | nein` | `ja | nein` |
| Docker aktiv | `ja | nein` | `ja | nein` | `ja | nein` |
| `sudo -n` verfuegbar | `ja | nein` | `ja | nein` | `ja | nein` |
| `fail2ban` Status | `active | inactive | n/a` | `active | inactive | n/a` | `active | inactive | n/a` |

---

## 3) Vergleich der letzten 3 Messungen

> `M-2` = aelteste, `M-1` = vorherige, `M0` = aktuelle Messung

### Server A (Produktion)

| Kennzahl | M-2 | M-1 | M0 | Trend |
|---|---|---|---|---|
| CPU Usage | `` | `` | `` | `steigend | fallend | stabil` |
| Load 1m | `` | `` | `` | `steigend | fallend | stabil` |
| RAM used % | `` | `` | `` | `steigend | fallend | stabil` |
| Swap used | `` | `` | `` | `steigend | fallend | stabil` |
| Netzwerk Rx | `` | `` | `` | `steigend | fallend | stabil` |
| Netzwerk Tx | `` | `` | `` | `steigend | fallend | stabil` |

### Server B (Test)

| Kennzahl | M-2 | M-1 | M0 | Trend |
|---|---|---|---|---|
| CPU Usage | `` | `` | `` | `steigend | fallend | stabil` |
| Load 1m | `` | `` | `` | `steigend | fallend | stabil` |
| RAM used % | `` | `` | `` | `steigend | fallend | stabil` |
| Swap used | `` | `` | `` | `steigend | fallend | stabil` |
| Netzwerk Rx | `` | `` | `` | `steigend | fallend | stabil` |
| Netzwerk Tx | `` | `` | `` | `steigend | fallend | stabil` |

### Server C (optional)

| Kennzahl | M-2 | M-1 | M0 | Trend |
|---|---|---|---|---|
| CPU Usage | `` | `` | `` | `steigend | fallend | stabil` |
| Load 1m | `` | `` | `` | `steigend | fallend | stabil` |
| RAM used % | `` | `` | `` | `steigend | fallend | stabil` |
| Swap used | `` | `` | `` | `steigend | fallend | stabil` |
| Netzwerk Rx | `` | `` | `` | `steigend | fallend | stabil` |
| Netzwerk Tx | `` | `` | `` | `steigend | fallend | stabil` |

---

## 4) Top 5 Prozesse nach CPU

| Rang | Server A | Server B | Server C (optional) |
|---|---|---|---|
| 1 | `` | `` | `` |
| 2 | `` | `` | `` |
| 3 | `` | `` | `` |
| 4 | `` | `` | `` |
| 5 | `` | `` | `` |

> Formatvorschlag je Zelle: `PID 1234 - prozessname - 12.3% CPU`

---

## 5) Auffaelligkeiten

| Bereich | Server A | Server B | Server C (optional) |
|---|---|---|---|
| SSH | `` | `` | `` |
| CPU/Load | `` | `` | `` |
| RAM/Swap | `` | `` | `` |
| Netzwerk | `` | `` | `` |
| Container | `` | `` | `` |
| Security (fail2ban/journalctl) | `` | `` | `` |
| Sonstiges | `` | `` | `` |

---

## 6) Empfohlene naechste Schritte (nur Empfehlungen)

| Prioritaet | Empfehlung | Grund |
|---|---|---|
| Hoch | `` | `` |
| Mittel | `` | `` |
| Niedrig | `` | `` |

> Keine Ausfuehrung im Rahmen dieses Reports (strict read-only).

---

## 7) Rohdaten (kurz und relevant)

| Kommando / Quelle | Server A | Server B | Server C (optional) |
|---|---|---|---|
| `uptime` | `` | `` | `` |
| `nproc` | `` | `` | `` |
| `top -bn1` (Header) | `` | `` | `` |
| `cat /proc/loadavg` | `` | `` | `` |
| `free -m` | `` | `` | `` |
| `vmstat 1 5` (Zusammenfassung) | `` | `` | `` |
| `vnstat --oneline b` | `` | `` | `` |
| `/proc/net/dev` + 3-Punkt-Diff | `` | `` | `` |
| `ss -tulpen` / `ss -s` | `` | `` | `` |
| `docker ps` / `docker stats` | `` | `` | `` |
| `systemctl is-active fail2ban` | `` | `` | `` |
| `fail2ban-client status sshd` | `` | `` | `` |
| `journalctl -p 3 -n 50` | `` | `` | `` |

---

## Schnellbewertung (Schwellenwerte)

| Kriterium | Warnung | Kritisch |
|---|---|---|
| CPU | einzelne Peaks > `85%` | dauerhaft > `85%` |
| Load | `Load 1m` naehrt sich `Kerne` | `Load 1m > Kerne` ueber laenger |
| RAM/Swap | RAM hoch oder Swap leicht steigend | RAM > `90%` oder Swap steigt schnell |
| Netzwerk | leicht erhoeht ggue. normal | ungewoehnlich hoch ggue. normal |

