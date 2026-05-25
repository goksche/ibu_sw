# Release-Todos — ab v1.8.0 (Server B)

**Baseline:** v1.8.0 nach A→B-Spiegelung · Manifest auf B: `/root/releases/BASELINE_v1.8.0.manifest.json`  
**Plan:** `/opt/ibu_sw/docs/RELEASE_PLAN_v1.8.0_SERVER_B.md` (Server B) · Gate: `cd /opt/ibu_sw && ./scripts/smoke_server_b.sh`

| Version | Todo | Prio | Status |
|---------|------|------|--------|
| **v1.8.0** | Qualitätssicherung — Smoke-Gate + manuelle Regression | #high | in Arbeit (Smoke grün) |
| v1.8.1 | Datenmigration & Sicherheit — Backup/Restore/Rollback B | #high | offen |
| v1.8.1 | Observability — 422/500, Diagnose-Endpoint, Logs | #medium | offen |
| v1.8.2 | Sicherheit/Betrieb — Rollen, Rate-Limits, Env-Drift | #medium | offen |
| v1.8.3 | API/Frontend Contract — TS-Typen, Legacy KO | #high | offen |
| v1.8.3 | Turnier-Modi/Varianten Matrix E2E auf B | #high | offen |
| v1.8.4 | KO-Auslosungsarten auf B | #high | Gate + Wizard; Stufe A manuell |
| v1.8.5 | Matrix-Restriktionen HTTP 422 | #high | offen |
| v1.8.6 | GSmartSol Wizard 4/5 Dropdown-Kontrast | #high | offen |
| v1.8.7 | Feedback-Formular | #high | offen |
| v1.8.7 | Wiki Auslosung/Wertung/Gleichstand | #medium | offen |
| v1.8.7 | Discovery Verbesserungen | #low | offen |
| v1.8.8 | Konzept Google/Apple Login (nur Konzept) | #medium | offen |
| v1.8.9 | Abnahme-Gate B; Promotion A nur nach Freigabe | #medium | offen |

*Hinweis: Frühere Planung ab v1.7.0 war veraltet; gültiger Start ist v1.8.0.*
