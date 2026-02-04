# Changelog

Alle wichtigen Änderungen an IBU Turniere werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.1] - 2026-01-26

### Hinzugefügt
- **Gesamtspielplan**: Rundenbasierter Gesamt-Tab über alle Gruppen (nur Gruppenphase)
- **Ergebnis-Editing**: Inline-Erfassung im Gesamtspielplan, synchron zur Gruppenansicht
- **Spielfeld-Fairness**: Gleichmäßige Feldzuweisung über alle Gruppenrunden (nur bei Location)
- **Turnier-Status Sperre**: Status „Abgeschlossen“ verhindert weitere Änderungen (Backend + Frontend)

### Geändert
- **Tab-UI**: „Spiele“ → „Gruppenspiele“; Reihenfolge vor „Gesamtspielplan“
- **Platzhalter**: Ergebnisanzeige nutzt `-` statt `???`

## [1.4.0] - 2025-01-27

### Hinzugefügt
- **Tournament Creation Logic**: Dynamische Aktivierung/Deaktivierung von Gruppenphase und KO-Phase basierend auf Turnier-Modus
  - Round Robin: Nur Gruppenphase aktiv
  - KO-Phase: Nur KO-Phase aktiv
  - Kombiniert: Beide Phasen aktiv
- **Tournament Deletion**: Turniere können gelöscht werden (mit "Ja"-Bestätigung)
  - Löschen-Button im Dashboard und in der Turnier-Detailansicht
  - Sichere Löschung mit Bestätigungsdialog
- **Manual Participant Entry**: Manueller Eintrag von Teilnehmern direkt für ein Turnier
  - Neuer Button "Manuell eintragen" neben "Aus Liste hinzufügen"
  - Teilnehmer werden erstellt und direkt dem Turnier zugeordnet
- **UI Improvements**: Button "Round Robin generieren" wurde zu "Spielplan generieren" umbenannt
- **Version Display**: Versionsnummer wird im Dashboard angezeigt

### Technische Details
- Backend API: `/api/v1/info/version` Endpoint für Versionsinformationen
- Frontend: Versionsanzeige im Dashboard-Header
- Synchronisierte Versionierung: Backend und Frontend verwenden v1.4.0

## [1.3.0] - 2025-01-27

### Hinzugefügt
- **Group Management**: Vollständige CRUD-API für Tournament-Gruppen
- **Match Management**: GroupMatch & KnockoutMatch Models & API
- **Group Schemas**: Pydantic-Validierung für Groups
- **Match Schemas**: Pydantic-Validierung für Matches
- **Group-Participant Assignment**: Teilnehmer zu Gruppen hinzufügen/entfernen
- **Score Management**: Punkte-Eintrag und -Updates für Matches
- **API Endpoints**: 14 neue Endpoints für Groups & Matches

### Technische Details
- **Neue Models**: Group, GroupParticipant, GroupMatch, KnockoutMatch
- **Neue Tabellen**: groups, group_participants, group_matches, knockout_matches
- **Foreign Keys**: CASCADE Deletes implementiert
- **Swagger UI**: Alle neuen Endpoints dokumentiert

## [1.2.0] - 2025-01-27

### Hinzugefügt
- **Web Interface** mit Docker-Unterstützung
- **Backend**: FastAPI + PostgreSQL + SQLAlchemy
- **Frontend**: React + TypeScript + Vite
- **User Authentication**: JWT-basierte Authentifizierung
- **Tournament Management**: CRUD für Tournaments über API
- **Participant Management**: CRUD für Participants über API
- **Protected Routes**: Authentifizierte Bereiche im Frontend
- **Swagger UI**: Interaktive API-Dokumentation
- **Docker Compose**: PostgreSQL, Backend, Frontend in Containern
- **Pydantic Settings**: Typisierte Configuration Management
- **Strukturiertes Logging**: JSON-basiertes Backend-Logging

### Technische Details
- **Docker-basiert**: PostgreSQL, FastAPI, React
- **Multi-Platform**: x86, ARM (Raspberry Pi)
- **Cloud-ready**: Docker Compose Deployment
- **Swagger UI**: http://localhost:8000/docs

## [1.1.0] - 2025-10-28

### Hinzugefügt
- **Exception Handling System**
  - Custom Exception Hierarchy mit spezifischen Fehlertypen
  - `DatabaseError`, `ValidationError`, `TournamentNotFoundError`, `ParticipantNotFoundError`
  - Strukturierte Fehlermeldungen mit Kontext und Details
- **Strukturiertes Logging**
  - Detaillierte Logs mit Timestamp, Level, Module, Message
  - Log-Rotation (5MB, 3 Backups)
  - Spezielle Log-Methoden für Datenbankoperationen und Benutzeraktionen
- **Datenintegrität**
  - Foreign Key Constraints für alle Tabellen
  - Automatische Migration von v1.0.0 Datenbanken
  - Cascading Deletes verhindern Waisen-Datensätze
- **Input Validation Framework**
  - Base Validators mit wiederverwendbaren Funktionen
  - Domain-spezifische Validatoren für Turniere, Teilnehmer, Matches
  - Schutz vor SQL Injection und XSS
  - Automatische Datenbereinigung
- **Memory Management**
  - Resource Manager für zentrale Ressourcenverwaltung
  - Automatische Bereinigung von QTimer und QWidget Instanzen
  - Memory Profiling und Leak Detection
- **Umfassende Test Suite**
  - Exception Handling Tests
  - Validator Tests
  - Memory Profiling Tests
  - Integration Tests
  - 100% Testabdeckung für kritische Features

### Geändert
- **Datenbank-Schema**
  - Foreign Key Constraints aktiviert
  - Automatische Migration beim ersten Start
  - Verbesserte Datenintegrität
- **Fehlerbehandlung**
  - Alle 62+ generischen `except Exception:` Blöcke ersetzt
  - Spezifische Exception-Behandlung in allen Datenbankoperationen
  - Benutzerfreundliche Fehlermeldungen
- **Input-Validierung**
  - Alle Benutzereingaben werden validiert
  - Automatische Bereinigung von Eingaben
  - Schutz vor ungültigen Daten

### Sicherheit
- **Input Validation**: Alle Eingaben werden validiert und bereinigt
- **SQL Injection Schutz**: Parametrisierte Queries und Input-Sanitization
- **XSS Prevention**: Bereinigung von gefährlichen Zeichen
- **Datenintegrität**: Foreign Key Constraints verhindern Datenverlust

### Technische Verbesserungen
- **Code-Qualität**: Modulare Architektur mit klarer Trennung
- **Wartbarkeit**: Strukturiertes Logging für besseres Debugging
- **Performance**: Optimierte Speicherverwaltung
- **Stabilität**: Robuste Fehlerbehandlung in allen Komponenten

### Migration
- **Automatische Migration**: v1.0.0 Datenbanken werden automatisch migriert
- **Backup**: Automatisches Backup vor Migration
- **Rückwärtskompatibilität**: Alle v1.0.0 Features bleiben erhalten

## [1.0.0] - 2024-12-28

### Hinzugefügt
- **KO-Phase – neue Cross-Setzlogik** gemäss Schema:
  - **2 Gruppen**
    - *Top 4*: `A1–B2`, `B1–A2`
    - *Top 8*: `A1–B4`, `A2–B3`, `A3–B2`, `A4–B1`
  - **4 Gruppen** (Paarung **A↔D**, **B↔C**)
    - *Top 4*: `A1–D1`, `B1–C1`
    - *Top 8*: `A1–D2`, `B1–C2`, `C1–B2`, `D1–A2`
    - *Top 16*: `A1–D4`, `B1–C4`, `A2–D3`, `B2–C3`, `A3–D2`, `B3–C2`, `A4–D1`, `B4–C1`
  - **8 Gruppen**
    - *Top 8*: Paarungen `A–H`, `B–G`, `C–F`, `D–E` – jeweils **1. vs 1.**
    - *Top 16*: je Paar **1. vs 2.** (gespiegelt)
- **Rangliste**: ausschliesslich nach **Differenz**; Tie-Breaker: Direktduell (2 Spieler) bzw. Mini-Tabelle (≥3 Spieler)
- **Gruppenphase**: Alle Gruppen **gleichzeitig** sichtbar (Tabelle links, Spielplan rechts je Gruppe)
- **Eingaben bleiben sichtbar**; **automatisches Speichern beim Registerwechsel** (kein extra Popup)

### Geändert
- **UI-Verbesserungen**: Tabellen/Spalten fester Breiten
- **Stabilität**: Robuste DB-Initialisierung & Migration (kompatibel zu älteren Datenbanken)

---

## Versionierung

- **MAJOR** (X.0.0): Inkompatible API-Änderungen
- **MINOR** (X.Y.0): Neue Features, rückwärtskompatibel
- **PATCH** (X.Y.Z): Bug-Fixes, rückwärtskompatibel

## Release-Status

- **v1.4.1**: ✅ Stable - Gesamtspielplan & Turnier-Abschluss
- **v1.4.0**: ✅ Stable - Tournament Management Improvements
- **v1.3.0**: ✅ Stable - Group & Match Management Backend
- **v1.2.0**: ✅ Stable - Web Interface Initial Release
- **v1.1.0**: ✅ Stable - Desktop App (Stabilität & Sicherheit)
- **v1.0.0**: ✅ Stable - Desktop App (Turnier-Features)

## Bekannte Probleme

- **PyQt6 Abhängigkeit**: Für Entwicklung wird PyQt6 benötigt
- **Windows-spezifisch**: Optimiert für Windows 10/11
- **SQLite**: Lokale Datenbank, keine Netzwerk-Funktionalität

## Upgrade-Pfad

- **v1.0.0 → v1.1.0**: Automatische Migration, vollständig rückwärtskompatibel (Desktop App)
- **v1.2.0**: Initial Release - Web Interface (unabhängig von Desktop App)
- **v1.3.0**: Development - Group & Match Management Backend
- **v1.3.1**: Geplant - Tournament & Participant Management UI
