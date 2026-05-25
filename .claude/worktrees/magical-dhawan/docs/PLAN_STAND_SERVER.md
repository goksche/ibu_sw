# Plan „MVP-Erweiterung 1 – Verbesserungen“ vs. Stand auf dem Server

Gegenüberstellung: Was im Plan als erledigt markiert ist vs. was auf dem **Main-Server** (A: 144.91.103.103, finalstage.ch / www.finalstage.ch) bzw. im Repository **tatsächlich umgesetzt und vorhanden** ist. Neue Änderungen werden zuerst auf dem **Test-Server** (B: 95.111.238.180, test.finalstage.ch) erprobt (siehe Plan-Abschnitt „Server & Umgebungen“).

**Stand der Prüfung:** Januar 2026 (nach Deployment-Fixes, Teilnehmer-Suche/Sortierung, Tabellen-/Edit-Fixes).

---

## Kurzfassung

| Kategorie | Anzahl Plan-Todos | Auf Server/Repo vorhanden | Nicht vorhanden |
|-----------|-------------------|---------------------------|------------------|
| Alle Todos | 20 | 18 | **2** |
| Kritische Lücken | – | – | **Live-Ticker**, **Spielorte/Locations** |

**Wichtig:** Die beiden Punkte **Live-Ticker** und **Spielorte/Locations** sind im Plan als **pending** geführt. **Live-Ticker** ist weder auf Main noch im Repo umgesetzt. **Spielorte/Locations**: Backend (Model, API), Frontend (Pages, Service) und Migrationen existieren im Repo; auf dem Main-Server (A) sind sie **noch nicht deployt** (kann zuerst auf Test (B) erprobt werden).

---

## Todo-für-Todo Übersicht

| Plan-ID | Inhalt | Im Plan | Auf Server/Repo |
|---------|--------|---------|------------------|
| participants-select-all | Teilnehmerliste nach Vorname sortieren + Alle auswählen/löschen | completed | ✅ Umgesetzt (inkl. Suche, Sortierung Vorname/Nachname) |
| tables-points-right | Punkte-Spalte ganz rechts + nur im Punkte-Modus sichtbar | completed | ✅ Vorhanden |
| tie-breaker-wins | Gleichstand-Regel „Nach Siegen“ in UI + Backend | completed | ✅ Vorhanden (inkl. Differenz-Regel) |
| decision-matches-flow | Entscheidungsspiele bei Gruppengleichstand + separate Tabelle | completed | ✅ Vorhanden |
| login-timeout-10h | Token-Laufzeit 10h + Refresh | completed | ✅ Konfigurierbar (config.py, authService) |
| best-third-tie | Best-Third Regeln + Stichspiel/manuelle Wahl | completed | ✅ Vorhanden (qualification.py, UI) |
| ko-draw-modes | KO-Auslosung a/b/c als Modi | completed | ✅ Vorhanden (ko_bracket, draw modes) |
| top4-bracket-visual | Top-4 im KO-Tree visualisieren | completed | ✅ In KOBracket vorhanden |
| league-entity-backend | Meisterschaft/Liga DB, API, Schema | completed | ✅ Vorhanden (backend leagues, models, schemas) |
| league-entity-frontend | Meisterschaft/Liga UI (Erstellen, Turniere, Teilnehmer) | completed | ✅ Vorhanden (Leagues, CreateLeague, EditLeague, LeagueDetail, leagueService) |
| participants-select-list-size | Teilnehmerauswahl-Liste vergrößern (≥15 Einträge) | completed | ✅ Umgesetzt |
| **live-ticker** | **Live-Ticker pro Turnier (Auto-Rotation, Spielplan/Ranking/Quali)** | **pending** | **❌ Nicht vorhanden** (kein Ticker, keine Route, kein „live“/„ticker“ im Frontend) |
| **match-locations** | **Spielorte/Locations verwalten + Zuweisung im Turnier/Spielplan** | **pending** | **⚠️ Im Repo vorhanden** (Backend location model/API, Frontend Locations/Pages, Migrationen); **auf Main (A) nicht deployt** |
| ko-only-flow | KO-only bedienbar (KO-Tab, Bracket, Ergebnisse ohne Gruppen) | completed | ✅ Vorhanden |
| ko-manual-draw-ui | Manuelle KO-Auslosung UI | completed | ✅ Vorhanden |
| ko-structures-impl | KO-Strukturen (double/triple/consolation/aggregate) | completed | ✅ Teilweise: Consolation ✅, double/triple/aggregate ⏳ |
| ko-draw-methods-impl | KO-Auslosungsarten (overall_seeding, pot_system, …) | completed | ✅ Vorhanden |
| ui-show-matches-tables | show_matches/show_tables in UI (Tabs) | completed | ✅ Vorhanden |
| detailed-test-plan | Detaillierten Testplan erstellen | completed | ⚠️ Teilweise (Tests vorhanden, dedizierter Plan offen) |
| ssl-finalstage-ch | SSL für finalstage.ch | completed | ✅ Eingerichtet (Let's Encrypt, Nginx) |

---

## Details zu den Lücken

### 1. Live-Ticker (Plan: completed, Server: **nicht vorhanden**)

- **Plan:** Pro Turnier ein Live-Ticker (auth-only), rotierende Ansicht: Spielplan/Resultate, Gruppen-Ranking, Qualifikations-Stand.
- **Repo/Server:** Keine Treffer für „Ticker“, „live score“, „Live-Ticker“ im Frontend; keine dedizierte Route/Page dafür.
- **Fazit:** Entweder als „nicht umgesetzt“ im Projektstand führen oder separat implementieren.

### 2. Spielorte/Locations (Plan: pending, Repo: **teilweise**, Main-Server: **nicht deployt**)

- **Plan:** Spielorte verwalten (ähnlich Teilnehmer), Locations + Austragungsorte; bei Turnier Toggle/Zuweisung; Match-Daten um Spielort erweitern, Anzeige im Spielplan.
- **Repo:** Backend (`backend/app/models/location.py`, API, Schemas), Frontend (Locations, CreateLocation, EditLocation, LocationDetail, locationService), Migrationen (add_locations_spielfelder.sql, add_spielfeld_assignment.sql) sind vorhanden.
- **Main-Server (A):** Noch nicht deployt; Migration und Rollout können zuerst auf Test-Server (B) erprobt werden.
- **Fazit:** Im Plan als pending; Deployment auf Main bzw. zuerst auf Test vorgesehen.

---

## Was auf dem Main-Server (A: 144.91.103.103) sicher aktiv ist (Auswahl)

- Backend/Frontend/Postgres/Nginx (bzw. Caddy) laufen.
- Login (inkl. API-URL-Fix), HTTPS, ggf. HTTP→HTTPS Redirect.
- Turnier anlegen/bearbeiten/löschen (inkl. Löschen-Dialog-Fix).
- Tabellen/Minitabelle (inkl. Gleichstand „Differenz“, `is_completely_tied`-Fix).
- Teilnehmer verwalten inkl. Suche und Sortierung (Vorname/Nachname).
- Liga/Meisterschaft: Seiten und API vorhanden und deploybar.
- KO-only, manuelle Auslosung, Consolation-Bracket, show_matches/show_tables.
- SSL finalstage.ch.

---

## Empfehlung

1. **Plan:** Die Todos `live-ticker` und `match-locations` sind im Plan auf **pending** gestellt; zweiter Server **Test (B: 95.111.238.180, test.finalstage.ch)** für Vorab-Tests nutzen (siehe Plan „Server & Umgebungen“).
2. **Live-Ticker:** Als eigenes Feature umsetzen (neue Route/Page, Auto-Rotation mit bestehenden Turnier-Daten); zuerst auf Test (B) deployen.
3. **Spielorte:** Bereits im Repo (Backend/Frontend/Migrationen); zuerst auf Test (B) deployen und testen, dann auf Main (A) (vgl. `docs/DEPLOYMENT_LOCATIONS.md`).

Damit ist dokumentiert, was auf dem Main-Server vom Plan umgesetzt ist und dass Test (B) für neue Änderungen zuerst genutzt wird.
