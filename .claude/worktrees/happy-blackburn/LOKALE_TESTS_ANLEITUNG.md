# Anleitung: Lokale Tests des Rollen-Systems

## Voraussetzungen

✅ Docker Container laufen bereits:
- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- PostgreSQL: localhost:5433

✅ Test-User wurden erstellt:
- `admin` / `admin123` (ADMIN)
- `testuser` / `testuser123` (USER)
- `testviewer` / `testviewer123` (VIEWER)

## Test-Durchführung

### 1. Frontend öffnen

Öffne im Browser: **http://localhost:3000**

### 2. Tests mit verschiedenen Rollen durchführen

#### Test als VIEWER (testviewer / testviewer123)

**Erwartetes Verhalten:**
- ✅ Kann sich einloggen
- ✅ Kann Dashboard sehen
- ✅ Kann Turniere sehen
- ✅ Kann Turnier-Details öffnen
- ❌ **KEINE** Buttons für:
  - "Neues Turnier"
  - "Teilnehmer-Verwaltung"
  - "Bearbeiten", "Löschen", "Duplizieren" bei Turnieren
  - "Ergebnis" Button bei Matches
  - "Gruppen generieren", "Spielplan generieren" etc.
  - Alle Bearbeitungs-Buttons

**Zu testen:**
1. Login als `testviewer` / `testviewer123`
2. Dashboard öffnen - prüfe, dass keine Bearbeitungs-Buttons sichtbar sind
3. Ein Turnier öffnen - prüfe, dass keine Bearbeitungs-Buttons sichtbar sind
4. Versuche direkt auf `/tournaments/create` zuzugreifen - sollte zu Dashboard umleiten
5. Versuche direkt auf `/tournaments/{id}/edit` zuzugreifen - sollte zu Dashboard umleiten

---

#### Test als USER (testuser / testuser123)

**Erwartetes Verhalten:**
- ✅ Kann sich einloggen
- ✅ Kann Turniere erstellen/bearbeiten/löschen
- ✅ Kann Participants verwalten
- ✅ Kann Matches verwalten (Ergebnisse eintragen)
- ✅ Kann Groups verwalten
- ❌ **KEIN** Zugriff auf User-Management (falls vorhanden)

**Zu testen:**
1. Login als `testuser` / `testuser123`
2. Dashboard - prüfe, dass alle Bearbeitungs-Buttons sichtbar sind
3. Neues Turnier erstellen
4. Turnier bearbeiten
5. Participants hinzufügen/bearbeiten
6. Matches - Ergebnisse eintragen
7. Groups - Gruppen erstellen/verwalten

---

#### Test als ADMIN (admin / admin123)

**Erwartetes Verhalten:**
- ✅ Alle Funktionen wie USER
- ✅ Zusätzlich: User-Management (falls vorhanden)

**Zu testen:**
1. Login als `admin` / `admin123`
2. Alle Funktionen wie USER testen
3. User-Management testen (falls vorhanden)

---

## API-Tests (Optional)

Du kannst auch direkt die API testen:

### 1. Token holen

```bash
# Als VIEWER
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testviewer","password":"testviewer123"}'

# Als USER
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testuser123"}'
```

### 2. API-Endpunkte testen

```bash
# Token aus Schritt 1 verwenden
TOKEN="dein_token_hier"

# GET-Endpunkt (sollte für VIEWER funktionieren)
curl -X GET http://localhost:8000/api/v1/tournaments \
  -H "Authorization: Bearer $TOKEN"

# POST-Endpunkt (sollte für VIEWER 403 geben)
curl -X POST http://localhost:8000/api/v1/tournaments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Turnier","start_date":"2025-01-01"}'
```

---

## Checkliste

Verwende die detaillierte Checkliste in `TEST_PLAN_ROLLEN.md` für eine vollständige Testabdeckung.

### Schnell-Checkliste:

- [ ] VIEWER kann sich einloggen
- [ ] VIEWER sieht keine Bearbeitungs-Buttons
- [ ] VIEWER kann Turniere lesen
- [ ] VIEWER bekommt 403 bei POST/PUT/DELETE (API)
- [ ] USER kann sich einloggen
- [ ] USER sieht alle Bearbeitungs-Buttons
- [ ] USER kann Turniere erstellen/bearbeiten
- [ ] USER kann Participants verwalten
- [ ] USER kann Matches verwalten
- [ ] ADMIN hat vollen Zugriff
- [ ] Keine JavaScript-Fehler in der Browser-Konsole
- [ ] Keine unerwarteten 500-Fehler

---

## Bekannte Probleme dokumentieren

Wenn du Bugs findest, dokumentiere sie hier:

1. **Bug:** ...
   - **Rolle:** VIEWER/USER/ADMIN
   - **Beschreibung:** ...
   - **Schritte zur Reproduktion:** ...

---

## Nach den Tests

Wenn alle Tests erfolgreich sind:
- ✅ Sprint 7 (Testing) ist abgeschlossen
- ✅ Sprint 8 (Server-Installation) ist bereits abgeschlossen
- ✅ Bereit für Sprint 9 (Deployment auf Server)

Wenn Bugs gefunden wurden:
- 📝 Dokumentiere sie
- 🔧 Sprint 7b (Bugfixes) durchführen
- ✅ Dann Sprint 9 (Deployment)
