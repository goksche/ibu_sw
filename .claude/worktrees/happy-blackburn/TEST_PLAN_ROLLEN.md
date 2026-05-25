# Test-Plan: Rollen-System (Sprint 7)

## Übersicht

Dieser Test-Plan beschreibt die umfassenden Tests für das Rollen-System mit drei Rollen:
- **ADMIN**: Vollzugriff, kann User erstellen/verwalten
- **USER**: Kann Turniere/Participants/Matches/Groups verwalten
- **VIEWER**: Nur Leserechte

## Vorbereitung

### 1. Test-User erstellen

Führe das Skript aus, um Test-User zu erstellen:

```bash
cd backend
python scripts/create_test_users.py
```

Oder manuell über die Admin-Oberfläche nach Login als Admin.

**Erwartete Test-User:**
- `admin` / `admin123` (ADMIN)
- `testuser` / `testuser123` (USER)
- `testviewer` / `testviewer123` (VIEWER)

## Test-Checkliste

### Backend API Tests

#### ✅ Test 1: Auth-Endpunkte

**Als VIEWER:**
- [ ] `POST /auth/login` - Login funktioniert
- [ ] `GET /auth/me` - User-Daten werden korrekt zurückgegeben
- [ ] `POST /auth/register` - Sollte 404 geben (Endpunkt entfernt)

**Als USER:**
- [ ] `POST /auth/login` - Login funktioniert
- [ ] `GET /auth/me` - User-Daten werden korrekt zurückgegeben

**Als ADMIN:**
- [ ] `POST /auth/login` - Login funktioniert
- [ ] `GET /auth/me` - User-Daten werden korrekt zurückgegeben

---

#### ✅ Test 2: Tournaments-Endpunkte

**Als VIEWER (nur Lesen):**
- [ ] `GET /tournaments` - ✅ Sollte funktionieren (200)
- [ ] `GET /tournaments/{id}` - ✅ Sollte funktionieren (200)
- [ ] `GET /tournaments/templates` - ✅ Sollte funktionieren (200)
- [ ] `POST /tournaments` - ❌ Sollte 403 geben
- [ ] `PUT /tournaments/{id}` - ❌ Sollte 403 geben
- [ ] `DELETE /tournaments/{id}` - ❌ Sollte 403 geben
- [ ] `POST /tournaments/{id}/duplicate` - ❌ Sollte 403 geben
- [ ] `POST /tournaments/{id}/generate-*` - ❌ Sollte 403 geben

**Als USER (Lesen + Schreiben):**
- [ ] `GET /tournaments` - ✅ Sollte funktionieren (200)
- [ ] `GET /tournaments/{id}` - ✅ Sollte funktionieren (200)
- [ ] `POST /tournaments` - ✅ Sollte funktionieren (201)
- [ ] `PUT /tournaments/{id}` - ✅ Sollte funktionieren (200)
- [ ] `DELETE /tournaments/{id}` - ✅ Sollte funktionieren (204)
- [ ] `POST /tournaments/{id}/duplicate` - ✅ Sollte funktionieren (201)
- [ ] `POST /tournaments/{id}/generate-*` - ✅ Sollte funktionieren

**Als ADMIN (Vollzugriff):**
- [ ] Alle Endpunkte wie USER, zusätzlich:
- [ ] User-Management-Endpunkte sollten funktionieren

---

#### ✅ Test 3: Participants-Endpunkte

**Als VIEWER (nur Lesen):**
- [ ] `GET /participants` - ✅ Sollte funktionieren (200)
- [ ] `GET /participants/{id}` - ✅ Sollte funktionieren (200)
- [ ] `GET /participants/tournament/{tournament_id}` - ✅ Sollte funktionieren (200)
- [ ] `POST /participants` - ❌ Sollte 403 geben
- [ ] `PUT /participants/{id}` - ❌ Sollte 403 geben
- [ ] `DELETE /participants/{id}` - ❌ Sollte 403 geben
- [ ] `POST /participants/import` - ❌ Sollte 403 geben

**Als USER (Lesen + Schreiben):**
- [ ] `GET /participants` - ✅ Sollte funktionieren (200)
- [ ] `POST /participants` - ✅ Sollte funktionieren (201)
- [ ] `PUT /participants/{id}` - ✅ Sollte funktionieren (200)
- [ ] `DELETE /participants/{id}` - ✅ Sollte funktionieren (204)
- [ ] `POST /participants/import` - ✅ Sollte funktionieren

**Als ADMIN:**
- [ ] Alle Endpunkte wie USER

---

#### ✅ Test 4: Matches-Endpunkte

**Als VIEWER (nur Lesen):**
- [ ] `GET /groups?tournament_id={id}` - ✅ Sollte funktionieren (200)
- [ ] `GET /groups/{match_id}` - ✅ Sollte funktionieren (200)
- [ ] `GET /knockout?tournament_id={id}` - ✅ Sollte funktionieren (200)
- [ ] `GET /knockout/{match_id}` - ✅ Sollte funktionieren (200)
- [ ] `POST /groups` - ❌ Sollte 403 geben
- [ ] `PUT /groups/{match_id}` - ❌ Sollte 403 geben
- [ ] `DELETE /groups/{match_id}` - ❌ Sollte 403 geben
- [ ] `POST /knockout` - ❌ Sollte 403 geben
- [ ] `PUT /knockout/{match_id}` - ❌ Sollte 403 geben
- [ ] `DELETE /knockout/{match_id}` - ❌ Sollte 403 geben

**Als USER (Lesen + Schreiben):**
- [ ] `GET /groups?tournament_id={id}` - ✅ Sollte funktionieren (200)
- [ ] `POST /groups` - ✅ Sollte funktionieren (201)
- [ ] `PUT /groups/{match_id}` - ✅ Sollte funktionieren (200)
- [ ] `DELETE /groups/{match_id}` - ✅ Sollte funktionieren (204)
- [ ] `GET /knockout?tournament_id={id}` - ✅ Sollte funktionieren (200)
- [ ] `POST /knockout` - ✅ Sollte funktionieren (201)
- [ ] `PUT /knockout/{match_id}` - ✅ Sollte funktionieren (200)

**Als ADMIN:**
- [ ] Alle Endpunkte wie USER

---

#### ✅ Test 5: Groups-Endpunkte

**Als VIEWER (nur Lesen):**
- [ ] `GET /groups/?tournament_id={id}` - ✅ Sollte funktionieren (200)
- [ ] `GET /groups/{group_id}` - ✅ Sollte funktionieren (200)
- [ ] `POST /groups/` - ❌ Sollte 403 geben
- [ ] `PUT /groups/{group_id}` - ❌ Sollte 403 geben
- [ ] `DELETE /groups/{group_id}` - ❌ Sollte 403 geben
- [ ] `POST /groups/{group_id}/participants` - ❌ Sollte 403 geben
- [ ] `DELETE /groups/{group_id}/participants/{participant_id}` - ❌ Sollte 403 geben

**Als USER (Lesen + Schreiben):**
- [ ] `GET /groups/?tournament_id={id}` - ✅ Sollte funktionieren (200)
- [ ] `POST /groups/` - ✅ Sollte funktionieren (201)
- [ ] `PUT /groups/{group_id}` - ✅ Sollte funktionieren (200)
- [ ] `DELETE /groups/{group_id}` - ✅ Sollte funktionieren (204)
- [ ] `POST /groups/{group_id}/participants` - ✅ Sollte funktionieren (200)
- [ ] `DELETE /groups/{group_id}/participants/{participant_id}` - ✅ Sollte funktionieren (204)

**Als ADMIN:**
- [ ] Alle Endpunkte wie USER

---

#### ✅ Test 6: Tables-Endpunkte

**Als VIEWER (nur Lesen):**
- [ ] `GET /group/{group_id}` - ✅ Sollte funktionieren (200)
- [ ] `GET /tournament/{tournament_id}` - ✅ Sollte funktionieren (200)
- [ ] `POST /group/{group_id}/tie-break/playoff` - ❌ Sollte 403 geben
- [ ] `POST /group/{group_id}/tie-break/random` - ❌ Sollte 403 geben
- [ ] `POST /group/{group_id}/tie-break/manual` - ❌ Sollte 403 geben

**Als USER (Lesen + Schreiben):**
- [ ] `GET /group/{group_id}` - ✅ Sollte funktionieren (200)
- [ ] `GET /tournament/{tournament_id}` - ✅ Sollte funktionieren (200)
- [ ] `POST /group/{group_id}/tie-break/playoff` - ✅ Sollte funktionieren (201)
- [ ] `POST /group/{group_id}/tie-break/random` - ✅ Sollte funktionieren (200)
- [ ] `POST /group/{group_id}/tie-break/manual` - ✅ Sollte funktionieren (200)

**Als ADMIN:**
- [ ] Alle Endpunkte wie USER

---

### Frontend UI Tests

#### ✅ Test 7: Login & Navigation

**Als VIEWER:**
- [ ] Login funktioniert
- [ ] Nach Login wird zu Dashboard weitergeleitet
- [ ] User-Rolle wird korrekt angezeigt (optional)

**Als USER:**
- [ ] Login funktioniert
- [ ] Nach Login wird zu Dashboard weitergeleitet

**Als ADMIN:**
- [ ] Login funktioniert
- [ ] Nach Login wird zu Dashboard weitergeleitet

---

#### ✅ Test 8: Dashboard

**Als VIEWER:**
- [ ] Dashboard wird angezeigt
- [ ] Turniere werden angezeigt
- [ ] ❌ "Neues Turnier" Button ist NICHT sichtbar
- [ ] ❌ "Teilnehmer-Verwaltung" Button ist NICHT sichtbar
- [ ] ❌ Delete-Button bei Turnieren ist NICHT sichtbar
- [ ] ✅ "Öffnen" Button ist sichtbar

**Als USER:**
- [ ] Dashboard wird angezeigt
- [ ] Turniere werden angezeigt
- [ ] ✅ "Neues Turnier" Button ist sichtbar
- [ ] ✅ "Teilnehmer-Verwaltung" Button ist sichtbar
- [ ] ✅ Delete-Button bei Turnieren ist sichtbar
- [ ] ✅ "Öffnen" Button ist sichtbar

**Als ADMIN:**
- [ ] Alle Buttons wie USER
- [ ] Zusätzlich: User-Management sollte sichtbar sein (falls implementiert)

---

#### ✅ Test 9: Tournament Detail Seite

**Als VIEWER:**
- [ ] Turnier-Details werden angezeigt
- [ ] Alle Tabs (Overview, Participants, Groups, Matches, Tables) sind sichtbar
- [ ] ❌ "Bearbeiten" Button ist NICHT sichtbar
- [ ] ❌ "Duplizieren" Button ist NICHT sichtbar
- [ ] ❌ "Als Vorlage speichern" Button ist NICHT sichtbar
- [ ] ❌ "Löschen" Button ist NICHT sichtbar
- [ ] ✅ "Zurück" Button ist sichtbar

**Als USER:**
- [ ] Turnier-Details werden angezeigt
- [ ] ✅ "Bearbeiten" Button ist sichtbar
- [ ] ✅ "Duplizieren" Button ist sichtbar
- [ ] ✅ "Als Vorlage speichern" Button ist sichtbar
- [ ] ✅ "Löschen" Button ist sichtbar

**Als ADMIN:**
- [ ] Alle Buttons wie USER

---

#### ✅ Test 10: Participants Seite

**Als VIEWER:**
- [ ] Participants-Liste wird angezeigt
- [ ] ❌ "CSV Import" Button ist NICHT sichtbar
- [ ] ❌ "Neuer Teilnehmer" Button ist NICHT sichtbar
- [ ] ❌ Edit-Button bei Teilnehmern ist NICHT sichtbar
- [ ] ❌ Delete-Button bei Teilnehmern ist NICHT sichtbar

**Als USER:**
- [ ] Participants-Liste wird angezeigt
- [ ] ✅ "CSV Import" Button ist sichtbar
- [ ] ✅ "Neuer Teilnehmer" Button ist sichtbar
- [ ] ✅ Edit-Button bei Teilnehmern ist sichtbar
- [ ] ✅ Delete-Button bei Teilnehmern ist sichtbar

**Als ADMIN:**
- [ ] Alle Buttons wie USER

---

#### ✅ Test 11: Tournament Participants Tab

**Als VIEWER:**
- [ ] Teilnehmer-Liste wird angezeigt
- [ ] ❌ "+ Aus Liste hinzufügen" Button ist NICHT sichtbar
- [ ] ❌ "+ Manuell eintragen" Button ist NICHT sichtbar
- [ ] ❌ "Entfernen" Button ist NICHT sichtbar

**Als USER:**
- [ ] Teilnehmer-Liste wird angezeigt
- [ ] ✅ "+ Aus Liste hinzufügen" Button ist sichtbar
- [ ] ✅ "+ Manuell eintragen" Button ist sichtbar
- [ ] ✅ "Entfernen" Button ist sichtbar

**Als ADMIN:**
- [ ] Alle Buttons wie USER

---

#### ✅ Test 12: Tournament Groups Tab

**Als VIEWER:**
- [ ] Gruppen werden angezeigt
- [ ] ❌ "Gruppen generieren" Button ist NICHT sichtbar
- [ ] ❌ "Spielplan generieren" Button ist NICHT sichtbar
- [ ] ❌ "KO-Bracket generieren" Button ist NICHT sichtbar
- [ ] ❌ "+ Neue Gruppe" Button ist NICHT sichtbar
- [ ] ❌ "Löschen" Button bei Gruppen ist NICHT sichtbar
- [ ] ❌ "+ Teilnehmer hinzufügen" Button ist NICHT sichtbar

**Als USER:**
- [ ] Gruppen werden angezeigt
- [ ] ✅ "Gruppen generieren" Button ist sichtbar
- [ ] ✅ "Spielplan generieren" Button ist sichtbar
- [ ] ✅ "KO-Bracket generieren" Button ist sichtbar
- [ ] ✅ "+ Neue Gruppe" Button ist sichtbar
- [ ] ✅ "Löschen" Button bei Gruppen ist sichtbar
- [ ] ✅ "+ Teilnehmer hinzufügen" Button ist sichtbar

**Als ADMIN:**
- [ ] Alle Buttons wie USER

---

#### ✅ Test 13: Tournament Matches Tab

**Als VIEWER:**
- [ ] Matches werden angezeigt
- [ ] ❌ "Ergebnis" Button ist NICHT sichtbar
- [ ] ❌ Edit/Save-Buttons sind NICHT sichtbar

**Als USER:**
- [ ] Matches werden angezeigt
- [ ] ✅ "Ergebnis" Button ist sichtbar
- [ ] ✅ Edit/Save-Buttons sind sichtbar
- [ ] ✅ Ergebnisse können eingetragen werden

**Als ADMIN:**
- [ ] Alle Buttons wie USER

---

#### ✅ Test 14: Tournament Tables Tab

**Als VIEWER:**
- [ ] Tabellen werden angezeigt
- [ ] ❌ "Spielplan erstellen" Button ist NICHT sichtbar
- [ ] ❌ "Manuell wählen" Button ist NICHT sichtbar
- [ ] ❌ "Zufällig wählen" Button ist NICHT sichtbar

**Als USER:**
- [ ] Tabellen werden angezeigt
- [ ] ✅ "Spielplan erstellen" Button ist sichtbar
- [ ] ✅ "Manuell wählen" Button ist sichtbar
- [ ] ✅ "Zufällig wählen" Button ist sichtbar

**Als ADMIN:**
- [ ] Alle Buttons wie USER

---

#### ✅ Test 15: Create/Edit Tournament Seiten

**Als VIEWER:**
- [ ] Direkter Zugriff auf `/tournaments/create` sollte zu Dashboard umleiten
- [ ] Direkter Zugriff auf `/tournaments/{id}/edit` sollte zu Dashboard umleiten

**Als USER:**
- [ ] Zugriff auf `/tournaments/create` funktioniert
- [ ] Zugriff auf `/tournaments/{id}/edit` funktioniert
- [ ] Turnier kann erstellt werden
- [ ] Turnier kann bearbeitet werden

**Als ADMIN:**
- [ ] Alle Funktionen wie USER

---

## Fehlerbehandlung Tests

#### ✅ Test 16: Fehlerbehandlung

**Als VIEWER:**
- [ ] 403-Fehler werden korrekt angezeigt (nicht als 500 oder andere Fehler)
- [ ] Fehlermeldungen sind benutzerfreundlich
- [ ] Keine JavaScript-Fehler in der Konsole

**Als USER:**
- [ ] 403-Fehler werden korrekt angezeigt (falls versucht, auf Admin-Funktionen zuzugreifen)
- [ ] Fehlermeldungen sind benutzerfreundlich

**Als ADMIN:**
- [ ] Keine unerwarteten Fehler

---

## Zusammenfassung

Nach Abschluss aller Tests sollten folgende Punkte bestätigt sein:

- ✅ VIEWER kann alle Daten lesen, aber nichts ändern
- ✅ USER kann Turniere/Participants/Matches/Groups verwalten
- ✅ ADMIN hat vollen Zugriff
- ✅ Alle Buttons werden korrekt basierend auf Rolle angezeigt/versteckt
- ✅ Fehlerbehandlung funktioniert korrekt
- ✅ Keine unerwarteten Fehler oder Crashes

## Bekannte Probleme

Liste hier alle gefundenen Bugs auf:

1. [ ] Bug 1: ...
2. [ ] Bug 2: ...

## Test-Datum

- **Datum:** _______________
- **Getestet von:** _______________
- **Version:** _______________
