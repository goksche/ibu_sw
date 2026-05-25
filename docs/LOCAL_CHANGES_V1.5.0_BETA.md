# Lokale Änderungen – Leitfaden Server B (Version 1.5.0 Beta)

Stand: 2026-02-09  
Scope: lokale Anpassungen für Test/Deploy auf Server B

## Überblick (Kurzfassung)
- Versionierung auf **1.5.0 Beta** angehoben (Frontend + Backend Anzeige).
- UI/UX‑Anpassungen rund um Turnier‑Tabs, Gruppen/KO‑Ansicht, Tabellen und Übersicht.
- Gleichstandsregel **LF** (goals_for) in UI + Rankinglogik integriert.
- Manuelle Gruppen‑Zuordnung: Dropdown nur für **nicht zugewiesene** Teilnehmer.
- Löschen **abgeschlossener** Turniere nur mit Passwort **414141** (Frontend + Backend).
- Neue Modus‑Visualisierung im Create/Edit und Overview‑Tab.
- Diverse Stabilitäts‑ und Qualitätsverbesserungen (Tab‑Logik, Hook‑Reihenfolge, Robustheit).

## Änderungen im Detail (funktional)

### 1) Gleichstandsregel „LF“
- **UI**: Gleichstandsregeln enthalten jetzt „LF“ (goals_for).
- **Rankinglogik**: LF wird als Tie‑Breaker in Qualifikation und Tabellen berücksichtigt.
- Wirkung: höhere erzielte Legs/Tore/Score = besser (Reihenfolge aus UI/Regeln).

### 2) Gruppen manuell befüllen (Dropdown‑Filter)
- In der Gruppen‑Ansicht zeigt das Dropdown nur Teilnehmer, die **noch in keiner Gruppe** sind.
- Gilt in `TournamentGroupsContent` und `TournamentGroups`.

### 3) Löschen abgeschlossener Turniere (Passwort)
- **Frontend** (Dashboard + TournamentDetail): Passwortfeld bei „Abgeschlossen“.
- **Backend**: POST `/tournaments/{id}/delete` akzeptiert `{ password: "414141" }`.
- Ohne korrektes Passwort wird **403** zurückgegeben.

### 4) Turnier‑Tabs & Spielplan‑Ansichten
- Gruppenspiele + Gesamtspielplan im selben Bereich.
- KO‑Matches sind in separatem Tab.
- Buttons und Logik nach Modus/Flags bereinigt.

### 5) Modus‑Visualisierung
- Neue Komponente zeigt Gruppen‑ und KO‑Phase als kleine Übersicht.
- Eingebaut in **CreateTournament**, **EditTournament** und **TournamentOverview**.

### 6) Version & Branding
- **Version**: 1.5.0 Beta (Backend‑APP_VERSION + Frontend‑Anzeige).
- **Branding**: „IBU Turniere“ → „FinalStage.ch“ (Dashboard, Login, Header).

## Backend‑Änderungen (API/Logic)
- `backend/app/api/v1/tournaments.py`: Passwortschutz beim Löschen abgeschlossen.
- `backend/app/api/v1/tables.py`: LF in Tie‑Breaking‑Keys integriert.
- `backend/app/services/qualification.py`: LF in Ranking‑Key integriert.
- `backend/app/core/config.py`: `APP_VERSION` auf **1.5.0 Beta**.
- KO‑Bracket Fix (Cross‑Mode 7 Gruppen / 16er‑Start) zur Vermeidung von Doppelteinträgen.

## Frontend‑Änderungen (UI/Views)
- `TournamentDetail`: neue Tab‑Logik, Löschdialog mit Passwort für „abgeschlossen“.
- `Dashboard`: Löschdialog mit Passwort, Version 1.5.0 Beta Anzeige.
- `CreateTournament`/`EditTournament`: dynamische Beschreibungen + Modus‑Visualisierung + LF‑Regel.
- `TournamentGroupsContent`/`TournamentGroups`: Filter nur nicht zugewiesene Teilnehmer.
- `TournamentOverview`: Modus‑Visualisierung integriert.
- `Header`/`Login`/`Dashboard`: Branding „FinalStage.ch“.

## Server‑B Umsetzung (Leitfaden)

### Voraussetzungen
- Deployment/Build via Docker‑Compose auf Server B.
- Sicherstellen, dass Server B aktiv ist (test.finalstage.ch / betabilic.finalstage.ch).

### Schritte
1. **Code übernehmen** (Git Pull / Sync auf Server B).
2. **Containers rebuilden**:
   - `docker-compose up -d --build`
3. **Datenbank prüfen**:
   - Falls migrations relevant: `backend/migrations/*.sql` prüfen und ggf. ausführen.
4. **Smoke‑Test**:
   - Login → Dashboard → Version „1.5.0 Beta“ sichtbar
   - Löschen eines „Abgeschlossen“ Turniers erfordert Passwort 414141
   - Gruppenzuordnung Dropdown zeigt nur nicht zugewiesene Teilnehmer
   - LF‑Regel auswählbar und in Tabellen wirksam

### Hinweis zu Server A
Nur auf expliziten Wunsch des Users (siehe Server‑Regeln).

## Ergänzung für Plan‑Datei
Für den PMT-/Hauptplan `@c:\Users\goksc\.cursor\plans\mvp-erweiterung-1-verbesserungen_b90f1322.plan.md` (**Projektname in PMT:** `finalstage.ch`, Workspace `e:\Projects\finalstage.ch`):
- **LF‑Regel** in UI + Backend Ranking integriert (goals_for).
- **Manuelle Gruppen‑Zuordnung** Dropdown filtert bereits zugewiesene Teilnehmer aus.
- **Passwortschutz** für Löschen abgeschlossener Turniere (`414141`).
- **Turnier‑Beschreibungen** dynamisch (Create/Edit).
- **Modus‑Visualisierung** (Create/Edit/Overview).
- **Version** 1.5.0 Beta.

## Dateiliste (lokale Änderungen)

### Geänderte Dateien (git status)
backend/app/api/v1/auth.py  
backend/app/api/v1/groups.py  
backend/app/api/v1/matches.py  
backend/app/api/v1/participants.py  
backend/app/api/v1/tables.py  
backend/app/api/v1/tournaments.py  
backend/app/core/config.py  
backend/app/core/database.py  
backend/app/main.py  
backend/app/models/__init__.py  
backend/app/models/group.py  
backend/app/models/match.py  
backend/app/models/tournament.py  
backend/app/schemas/group.py  
backend/app/schemas/match.py  
backend/app/schemas/tournament.py  
backend/app/services/decision_matches.py  
backend/app/services/ko_bracket.py  
backend/app/services/ko_propagation.py  
backend/app/services/qualification.py  
docker-compose.prod.yml  
docker-compose.yml  
frontend/Dockerfile  
frontend/index.html  
frontend/package-lock.json  
frontend/package.json  
frontend/src/App.tsx  
frontend/src/components/Layout/Header.tsx  
frontend/src/components/tournament/KOBracket.tsx  
frontend/src/components/tournament/TournamentGroupsContent.tsx  
frontend/src/components/tournament/TournamentMatchesContent.tsx  
frontend/src/components/tournament/TournamentOverview.tsx  
frontend/src/components/tournament/TournamentParticipantsContent.tsx  
frontend/src/components/tournament/TournamentTables.tsx  
frontend/src/components/ui/Button.tsx  
frontend/src/components/ui/Card.tsx  
frontend/src/components/ui/Input.tsx  
frontend/src/components/ui/Select.tsx  
frontend/src/components/ui/Textarea.tsx  
frontend/src/index.css  
frontend/src/pages/Admin/UserManagement.tsx  
frontend/src/pages/CreateLeague.tsx  
frontend/src/pages/CreateLocation.tsx  
frontend/src/pages/CreateTournament.tsx  
frontend/src/pages/Dashboard.tsx  
frontend/src/pages/EditLeague.tsx  
frontend/src/pages/EditLocation.tsx  
frontend/src/pages/EditTournament.tsx  
frontend/src/pages/LeagueDetail.tsx  
frontend/src/pages/Leagues.tsx  
frontend/src/pages/LiveTicker.tsx  
frontend/src/pages/LocationDetail.tsx  
frontend/src/pages/Locations.tsx  
frontend/src/pages/Login.tsx  
frontend/src/pages/Participants.tsx  
frontend/src/pages/TournamentDetail.tsx  
frontend/src/pages/TournamentGroups.tsx  
frontend/src/pages/TournamentMatches.tsx  
frontend/src/pages/TournamentParticipants.tsx  
frontend/src/services/groupService.ts  
frontend/src/services/matchService.ts  
frontend/src/services/tournamentService.ts  
frontend/src/theme/theme.ts  
frontend/src/types/index.ts  
frontend/vite.config.ts  
nginx/conf.d/default.conf  

### Neue Dateien (untracked)
backend/app/api/v1/logs.py  
backend/app/api/v1/platform/admin/logs.py  
backend/app/api/v1/settings.py  
backend/app/models/app_settings.py  
backend/app/models/logs.py  
backend/app/schemas/logs.py  
backend/app/schemas/settings.py  
backend/app/services/logs_service.py  
backend/migrations/add_app_settings.sql  
backend/migrations/add_group_spielfeld.sql  
backend/migrations/add_logs_tables.sql  
frontend/src/components/tournament/TournamentModeVisualization.tsx  
frontend/src/pages/Admin/Logs.tsx  
frontend/src/pages/Settings.tsx  
frontend/src/services/logsService.ts  
frontend/src/services/settingsService.ts  

### Dateien, die **nicht** auf Server B gehören (prüfen/auslassen)
.cursor/  
.env.prod  
backend/app/api/v1/tournaments.py.bak  
backend/app/api/v1/tournaments.py.bak_enum  
backend/app/services/ko_propagation.py.bak  
frontend/src/pages/CreateTournament.tsx.bak  
tmp_assets.js  

## Offene Punkte / Hinweise
- Bei Übernahme auf Server B bitte **git diff** gegen main prüfen und ggf. bereinigen.
- Eventuelle CRLF/LF‑Warnungen prüfen (Windows‑Zeilenenden).
- Falls Versionsanzeige an anderen Stellen nötig ist: zusätzliche UI‑Labels ergänzen.
