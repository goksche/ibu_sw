# Abnahme-Checkliste Kontrollwebseite

- [ ] Servertrennung bestätigt: Keine direkte Laufzeitkopplung zwischen Lokal, Server B und Server A
- [ ] Datenquellen bestätigt: Nur lokale Dateien (Plan, Status-JSON, Git-Metadaten)
- [ ] Promotions-Gate Lokal -> Server B geprüft (Health + 1 API-Flow + 1 UI-Flow)
- [ ] Promotions-Gate Server B -> Server A geprüft (Health + 1 API-Flow + 1 UI-Flow)
- [ ] Rollback-Bereitschaft pro Umgebung dokumentiert (Backup-Check + Rückrollweg)
- [ ] Migrationsstand pro Umgebung dokumentiert und nachvollziehbar
- [ ] Versionstracking synchron geprüft (Git-Tag + APP_VERSION + optional Image-Tag)
- [ ] Config-Drift-Status gepflegt (.env, compose, nginx)
- [ ] Zeitstandard verifiziert (UTC speichern, CET anzeigen)
- [ ] No-silent-fallback verifiziert (Fallbacks immer sichtbar in Logs/UI/Status)
- [ ] Offene Pendenzen werden aus Hauptplan korrekt angezeigt
- [ ] Lokale Kontrollseite lässt sich reproduzierbar per Skript neu bauen
