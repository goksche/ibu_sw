# IBU Turniere v1.2.0-alpha.2

## Release Date: 2025-10-29

## Überblick

Dieses Release implementiert das **Web Interface Backend** für IBU Turniere. Die Anwendung kann jetzt als moderne, Docker-basierte Web-Anwendung mit FastAPI Backend, React Frontend und PostgreSQL Datenbank betrieben werden.

## Neue Features

### Web Interface Backend

#### Projektstruktur
- **backend/**: FastAPI Backend mit vollständiger API
- **frontend/**: React Frontend (Placeholder)
- **docker-compose.yml**: Orchestrierung aller Services

#### Docker Setup
- PostgreSQL 15 Datenbank
- FastAPI Backend mit Hot-Reload
- React Frontend mit Vite
- Vollständige Container-Isolation

#### Backend Core
- **Config Management**: Pydantic Settings für Environment Variables
- **Database Setup**: SQLAlchemy + PostgreSQL Integration
- **Security**: JWT Authentication, Password Hashing (bcrypt)
- **Logging**: Strukturiertes Logging System

#### Database Models
- **User Model**: Mit Rollen (admin, user, viewer)
- **Tournament Model**: Vollständige Turnier-Verwaltung
- **Participant Model**: Teilnehmer-Management

#### REST API Endpoints

**Authentication:**
- `POST /api/v1/auth/register` - User Registration
- `POST /api/v1/auth/login` - User Login (JWT Token)
- `GET /api/v1/auth/me` - Current User (Placeholder)

**Tournaments:**
- `GET /api/v1/tournaments` - Liste aller Turniere
- `GET /api/v1/tournaments/{id}` - Turnier Details
- `POST /api/v1/tournaments` - Neues Turnier erstellen
- `PUT /api/v1/tournaments/{id}` - Turnier aktualisieren
- `DELETE /api/v1/tournaments/{id}` - Turnier löschen

**Participants:**
- `GET /api/v1/participants` - Liste aller Teilnehmer
- `GET /api/v1/participants/{id}` - Teilnehmer Details
- `POST /api/v1/participants` - Neuen Teilnehmer erstellen
- `PUT /api/v1/participants/{id}` - Teilnehmer aktualisieren
- `DELETE /api/v1/participants/{id}` - Teilnehmer löschen

## Dokumentation

- Swagger UI: http://localhost:8000/docs
- Redoc: http://localhost:8000/redoc

## Quick Start

### Voraussetzungen
- Docker Desktop oder Docker Engine + Docker Compose

### Installation

```bash
# 1. Repository klonen
git clone https://github.com/yourusername/ibu_sw.git
cd ibu_sw

# 2. Environment konfigurieren
cp .env.example .env
# .env editieren und Passwörter ändern

# 3. Services starten
docker-compose up -d

# 4. Logs anzeigen
docker-compose logs -f

# 5. Zugriff
# - Backend API: http://localhost:8000
# - Swagger UI: http://localhost:8000/docs
# - Frontend: http://localhost:3000
```

## Technischer Stack

**Backend:**
- FastAPI 0.110
- SQLAlchemy 2.0
- PostgreSQL 15
- Pydantic 2.6
- python-jose (JWT)
- passlib (Password Hashing)

**Frontend:**
- React 18
- TypeScript 5
- Vite 5.0

**DevOps:**
- Docker & Docker Compose
- nginx (geplant)

## Testing

### Unit Tests
```bash
# Backend Tests (geplant)
cd backend
pytest
```

### Integration Tests
```bash
# API Tests (geplant)
curl http://localhost:8000/health
```

## Bekannte Einschränkungen

- Frontend ist nur Placeholder
- Group & Match Features noch nicht implementiert
- KO-Phase noch nicht implementiert
- Export Features noch nicht implementiert
- Meisterschaft (Liga-System) noch nicht implementiert

## Roadmap

**v1.2.0-alpha.3** (Geplant):
- React Frontend mit Login/Register
- Tournament & Participant Management UI
- Protected Routes

**v1.2.0-beta.1** (Geplant):
- Group Phase Implementation
- KO Phase Implementation
- Match Results Eingabe

**v1.2.0-beta.2** (Geplant):
- Export Features (PDF, CSV)
- Meisterschaft Support
- Desktop App Migration

**v1.2.0** (Geplant):
- Final Release
- Production Deployment
- Raspberry Pi Support

## Support

Bei Problemen:
1. Logs prüfen: `docker-compose logs`
2. Services neu starten: `docker-compose restart`
3. Clean Rebuild: `docker-compose down -v && docker-compose up --build`

## Breaking Changes

- Keine (erste Alpha-Version)

## Contributors

- Development Team

## License

Proprietary

---

**Status:** Alpha  
**Version:** 1.2.0-alpha.2  
**Build:** Docker Container  
**Datum:** 2025-10-29

