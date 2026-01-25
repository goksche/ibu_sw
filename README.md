# IBU Turniere (ibu_sw)

Moderne **Web-Anwendung** zur Verwaltung von **Dartturnieren** mit Gruppenphase, KO-Phase und Meisterschaften.  
Läuft auf **Docker** mit PostgreSQL, FastAPI Backend und React Frontend. Ziel: **schnelles, stabiles Turnier-Handling** inkl. Exporten (CSV/PDF) und Meisterschafts-Rangliste.

---

## Inhalt
- [Überblick](#überblick)
- [Highlights in dieser Version](#highlights-in-dieser-version)
- [Features](#features)
- [Systemvoraussetzungen](#systemvoraussetzungen)
- [Quickstart (Docker)](#quickstart-docker)
- [Development Setup](#development-setup)
- [Deployment](#deployment)
- [Projektstruktur](#projektstruktur)
- [API Dokumentation](#api-dokumentation)
- [Changelog](#changelog)
- [Git-Flow & Release auf GitHub](#git-flow--release-auf-github)
- [Fehler melden / Support](#fehler-melden--support)

---

## Überblick

**IBU Turniere** ist ein modernes Turnier-Tool für Dart-Vereine und -Events.  
Die Web-App verwaltet **Spieler**, **Turniere** (Gruppenphase + KO), **Punkteschemata** für Meisterschaften und erstellt **Exporte**.

**Technik**
- **Backend**: FastAPI (Python 3.11), PostgreSQL
- **Frontend**: React 18 + TypeScript, Vite
- **Deployment**: Docker Compose
- **Authentication**: JWT-basiert mit OTP-Support

---

## Highlights in dieser Version

### v1.2.0-alpha3 - Trostturnier-Rangliste
- **🏆 Trostturnier-Rangliste**: Automatische Anzeige der Rangliste im Turnierbaum nach dem Consolation-Finale
- **📊 Rangliste-Berechnung**: Vollständige Platzierung aller Teilnehmer basierend auf KO-Ergebnissen
- **🎨 UI-Verbesserungen**: Medaillen-Icons für Top 3 Plätze, übersichtliche Darstellung

### v1.2.0-alpha2 - KO-Strukturen
- **🎯 Erweiterte KO-Strukturen**: 
  - Single Elimination (Einfach-KO)
  - Consolation Bracket (Trostturnier)
  - Double Elimination (Doppel-KO)
  - Triple Elimination (Dreifach-KO)
  - Aggregate KO
- **📐 Dynamische Bracket-Größen**: Automatische Anpassung für 4, 8, 16, 32, 64, 128 Teilnehmer
- **🎲 Auslosungsmethoden**: 
  - Vollständig zufällig
  - Topf-System
  - Gesamt-Seeding
  - Manuelle Zuweisung
- **⚡ Bye-Handling**: Automatische 3:0-Siege für Freilose, korrekte Propagation

### v1.2.0-alpha1 - Web Interface
- **🌐 Web-basierte Anwendung**: Docker-basiert mit PostgreSQL, FastAPI Backend und React Frontend
- **🔐 Benutzerverwaltung**: Rollenbasierte Zugriffe (Admin, User, Viewer)
- **🏁 Turnier-Management**: Vollständiges CRUD für Turniere, Teilnehmer, Gruppen und Matches
- **📱 Responsive Design**: Moderne, benutzerfreundliche Oberfläche

---

## Features

### Turniere
- Turnier anlegen, bearbeiten und löschen
- **Gruppenphase**: Round-Robin-Spielplan, Ergebnisse erfassen, Rangliste (Diff- oder Punkte-basiert)
- **KO-Phase**: 
  - Multiple KO-Strukturen (Single, Consolation, Double, Triple, Aggregate)
  - Dynamische Bracket-Größen (4-128 Teilnehmer)
  - Automatische Sieger-Propagation
  - Bronze-Spiel (Runde 99)
  - **Trostturnier-Rangliste** mit vollständiger Platzierung
- **Qualifikation**: Flexible Qualifikationsregeln für KO-Phase
- **Auslosung**: Verschiedene Auslosungsmethoden (Random, Topf-System, Seeding, Manuell)

### Teilnehmer
- Verwaltung inkl. optionaler IDs (z. B. Scolia)
- Bulk-Import und -Export
- Manueller Eintrag direkt für Turniere

### Benutzer & Berechtigungen
- Rollenbasierte Zugriffe (Admin, User, Viewer)
- JWT-basierte Authentifizierung
- OTP-Login (mit SMTP oder Development-Mode)

### Exporte
- CSV/PDF je nach Ansicht
- Turnier-Ergebnisse
- Ranglisten

### Qualität
- Ergebnisfelder editierbar, Metadaten read-only
- Robuste DB-Initialisierung & Migration
- Strukturiertes Logging
- Input Validation

---

## Systemvoraussetzungen

- **Docker Desktop** oder **Docker Engine** + **Docker Compose**
- **Git** (für Development)
- **Node.js 20+** (für Frontend Development)
- **Python 3.11+** (für Backend Development)

---

## Quickstart (Docker)

### 1. Repository klonen

```bash
git clone https://github.com/goksche/ibu_sw.git
cd ibu_sw
```

### 2. Environment konfigurieren

```bash
# .env.example nach .env kopieren
cp .env.example .env

# .env bearbeiten und Passwörter/Secrets ändern
```

### 3. Services starten

```bash
# Alle Services starten
docker-compose up -d

# Logs anzeigen
docker-compose logs -f

# Services stoppen
docker-compose down
```

### 4. Zugriff

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432

### 5. Ersten Admin-User erstellen

```bash
# Im Backend-Container
docker-compose exec backend python scripts/create_admin.py
```

---

## Development Setup

### Backend Development

```bash
cd backend

# Virtual Environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# oder
venv\Scripts\activate     # Windows

# Dependencies installieren
pip install -r requirements.txt

# Server starten (mit Hot-Reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
cd frontend

# Dependencies installieren
npm install

# Dev Server starten
npm run dev
```

---

## Deployment

### Production Deployment

```bash
# Production Docker Compose verwenden
docker-compose -f docker-compose.prod.yml up -d --build

# Services neu starten
docker-compose -f docker-compose.prod.yml restart

# Logs anzeigen
docker-compose -f docker-compose.prod.yml logs -f
```

### SSH Deployment (Remote Server)

```bash
# Dateien auf Server kopieren
scp -r backend/ root@SERVER:/root/ibu_sw/
scp -r frontend/ root@SERVER:/root/ibu_sw/
scp docker-compose.prod.yml root@SERVER:/root/ibu_sw/

# Auf Server: Services neu bauen und starten
ssh root@SERVER
cd /root/ibu_sw
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

---

## Projektstruktur

```
ibu_sw/
├── backend/              # FastAPI Backend
│   ├── app/
│   │   ├── api/v1/      # API Endpoints
│   │   │   ├── auth.py
│   │   │   ├── tournaments.py
│   │   │   ├── matches.py
│   │   │   ├── tables.py
│   │   │   └── ...
│   │   ├── core/        # Config, Security, Logging
│   │   ├── models/      # SQLAlchemy Models
│   │   ├── schemas/     # Pydantic Schemas
│   │   └── services/    # Business Logic
│   │       ├── ko_bracket.py
│   │       ├── ko_propagation.py
│   │       └── ...
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/            # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── tournament/
│   │   │       ├── KOBracket.tsx
│   │   │       └── ...
│   │   ├── pages/
│   │   ├── services/
│   │   └── types/
│   ├── Dockerfile.prod
│   └── package.json
├── docker-compose.yml          # Development
├── docker-compose.prod.yml     # Production
├── .env.example
└── README.md
```

---

## API Dokumentation

Die vollständige API-Dokumentation ist verfügbar unter:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Wichtige Endpoints

**Authentication:**
- `POST /api/v1/auth/login` - Login (JWT Token)
- `POST /api/v1/auth/otp/request` - OTP anfordern
- `POST /api/v1/auth/otp/verify` - OTP verifizieren

**Tournaments:**
- `GET /api/v1/tournaments` - Liste aller Turniere
- `POST /api/v1/tournaments` - Neues Turnier erstellen
- `GET /api/v1/tournaments/{id}` - Turnier Details
- `PUT /api/v1/tournaments/{id}` - Turnier aktualisieren
- `POST /api/v1/tournaments/{id}/generate-ko-bracket` - KO-Bracket generieren

**Matches:**
- `GET /api/v1/matches/group?tournament_id={id}` - Gruppen-Matches
- `GET /api/v1/matches/knockout?tournament_id={id}` - KO-Matches
- `PUT /api/v1/matches/knockout/{id}` - KO-Match Ergebnis aktualisieren

**Tables:**
- `GET /api/v1/tables/group/{id}` - Gruppen-Tabelle
- `GET /api/v1/tables/tournament/{id}` - Turnier-Rangliste
- `GET /api/v1/tables/tournament/{id}/consolation` - Trostturnier-Rangliste

---

## Changelog

### v1.2.0-alpha3 (2025-01-26)
- ✅ **Trostturnier-Rangliste**: Automatische Anzeige im Turnierbaum
- ✅ Neuer API-Endpoint `/tables/tournament/{id}/consolation`
- ✅ Verbesserte Rangliste-Berechnung für alle Consolation-Runden

### v1.2.0-alpha2 (2025-01-25)
- ✅ **KO-Strukturen**: Consolation, Double, Triple, Aggregate KO
- ✅ Dynamische Bracket-Größen (4-128 Teilnehmer)
- ✅ Bye-Handling mit automatischer Propagation
- ✅ Verbesserte Consolation-Bracket-Struktur

### v1.2.0-alpha1 (2025-01-24)
- ✅ Web Interface mit FastAPI + React
- ✅ Docker Setup
- ✅ Benutzerverwaltung mit Rollen
- ✅ Turnier-Management

*Vollständiges Changelog siehe [CHANGELOG.md](CHANGELOG.md)*

---

## Git-Flow & Release auf GitHub

```bash
# 1) Änderungen committen
git add -A
git commit -m "Feat: Neue Feature-Beschreibung"

# 2) Remote-Änderungen pullen
git pull origin main

# 3) Push
git push origin main

# 4) Tag für Release setzen
git tag -a v1.2.0-alpha3 -m "v1.2.0-alpha3: Release-Beschreibung"
git push origin v1.2.0-alpha3
```

**Release anlegen (GitHub UI):**
1. Auf der Projektseite `Releases` → **Draft a new release**
2. Tag auswählen, Titel/Notes aus Changelog übernehmen
3. Optional: Assets hochladen

---

## Fehler melden / Support

- **Issues**: GitHub Issues für Bug-Reports und Feature-Requests
- **Repro-Schritte**: Detaillierte Beschreibung des Problems
- **Screenshots/Logs**: Helfen bei der Analyse
- **Datenbank**: Bei DB-Problemen ggf. anonymisierte Datenbank-Kopie bereitstellen

---

## Lizenz

Siehe Hauptprojekt.

---

**Hinweis:** Aktionen wie Überschreiben/Löschen sind bewusst eingeschränkt. Nur autorisierten Personen Zugriff geben.
