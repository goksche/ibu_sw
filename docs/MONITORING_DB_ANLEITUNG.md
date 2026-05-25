# Lokale Monitoring-Datenbank (SQLite)

Diese Anleitung speichert Messwerte und Berichtsresultate systematisch in einer lokalen SQLite-Datenbank.

## Dateien

- Script: `scripts/monitoring_db.py`
- Beispiel-Report (JSON): `docs/monitoring_report_template.json`
- Standard-DB-Pfad: `data/monitoring/monitoring.sqlite`

## 1) Datenbank initialisieren

```bash
python scripts/monitoring_db.py init
```

## 2) Bericht importieren

```bash
python scripts/monitoring_db.py import-report docs/monitoring_report_template.json
```

Optional mit eigenem DB-Pfad:

```bash
python scripts/monitoring_db.py --db data/monitoring/mein_monitoring.sqlite import-report docs/monitoring_report_template.json
```

## 3) Letzte Runs anzeigen

```bash
python scripts/monitoring_db.py list-runs --limit 20
```

## 4) Run im Detail ansehen

```bash
python scripts/monitoring_db.py show-run 1
```

## JSON-Struktur (kurz)

Pflichtfelder:
- `run_timestamp`
- `timezone`
- `overall_status`
- `servers` (Liste)

Servereintrag:
- `server_key`, `server_name`, `status`
- `metrics` (CPU/Load/RAM/Swap/Netz/Security-Flags)
- optional: `top_processes`, `findings`, `raw_data`, `notes`

## Hinweise

- Das Tool arbeitet rein lokal und veraendert keine Server.
- Empfohlen: pro Monitoring-Durchlauf genau einen JSON-Report importieren.
- Fuer die 3-Messungen-Ansicht kannst du spaeter SQL-Vergleiche ueber die letzten 3 `run_id` bauen.

