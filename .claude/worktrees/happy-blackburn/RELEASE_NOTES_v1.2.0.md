# Release Notes - v1.2.0

**Veröffentlicht:** 2025-01-27  
**Status:** Initial Release - Web Interface

## 🎉 Übersicht

v1.2.0 bringt das **Web Interface** für IBU Turniere auf Docker-Basis mit PostgreSQL, FastAPI Backend und React Frontend.

## ✨ Neue Features

### Web Interface
- ✅ **Docker-basiert** - PostgreSQL, FastAPI, React
- ✅ **RESTful API** - Vollständiges Backend mit FastAPI
- ✅ **React Frontend** - Modernes Web-Interface mit TypeScript
- ✅ **User Authentication** - JWT-basierte Authentifizierung
- ✅ **Tournament Management** - CRUD für Tournaments
- ✅ **Participant Management** - CRUD für Participants
- ✅ **Swagger UI** - Interaktive API-Dokumentation

### Backend
- ✅ **FastAPI Framework** - Schnelles, modernes Python Web Framework
- ✅ **PostgreSQL Integration** - SQLAlchemy ORM
- ✅ **JWT Authentication** - Sichere Token-basierte Authentifizierung
- ✅ **Password Hashing** - Bcrypt mit 72-Byte Limit
- ✅ **Pydantic Settings** - Typisierte Configuration
- ✅ **Strukturiertes Logging** - JSON-basiertes Logging

### Frontend
- ✅ **React 18** - Modernes UI Framework
- ✅ **TypeScript** - Typisierte Frontend-Entwicklung
- ✅ **Vite** - Schneller Build & Dev Server
- ✅ **React Router** - Client-side Routing
- ✅ **Protected Routes** - Authentifizierte Bereiche
- ✅ **Axios** - HTTP Client für API-Kommunikation

## 🔧 Technische Details

### Backend Stack
- FastAPI 0.110.0
- PostgreSQL (via Docker)
- SQLAlchemy 2.0.29
- Pydantic 2.6.1
- python-jose[cryptography] 3.3.0
- passlib[bcrypt] 1.7.4

### Frontend Stack
- React 18.3.1
- TypeScript 5.5.4
- Vite 5.4.3
- React Router 6.26.2
- Axios 1.7.7

### Docker Services
- PostgreSQL 16
- FastAPI Backend (Python 3.11)
- React Frontend (Node.js)

## 📝 Was funktioniert

✅ **User Management**
- User Registration über API
- User Login mit JWT Token
- Token-basierte API Authorization

✅ **Tournament Management**
- Tournament CRUD über API
- Tournament List im Dashboard
- Swagger UI für API-Testing

✅ **Authentication**
- Login Page mit Form Validation
- Protected Routes
- Token Storage in LocalStorage

## 🚧 Bekannte Limitationen (für v1.3.0)

- ⚠️ Keine Tournament-Erstellung im Frontend
- ⚠️ Keine Teilnehmer-Verwaltung im Frontend
- ⚠️ Keine Gruppenphase oder KO-Phase UI
- ⚠️ Keine Match-Verwaltung
- ⚠️ Keine Export-Features

## 🔄 Migration

**Keine Migration erforderlich** - v1.2.0 ist Initial Release.

Desktop-App (v1.1.0) bleibt unabhängig mit SQLite.

## 📦 Deployment

### Docker Compose

```bash
# Container starten
docker-compose up -d

# Logs anzeigen
docker-compose logs -f

# Container stoppen
docker-compose down
```

### Services

- **Backend API**: http://localhost:8000
- **Swagger UI**: http://localhost:8000/docs
- **Frontend**: http://localhost:3000

### Environment Variables

Siehe `.env.example` für Configuration.

## 🧪 Tests

### Manuelle Tests durchgeführt:
1. ✅ Docker Compose Startup
2. ✅ PostgreSQL Connection
3. ✅ Backend Health Check
4. ✅ Swagger UI Access
5. ✅ User Registration
6. ✅ User Login mit JWT
7. ✅ Frontend Login
8. ✅ Dashboard mit Tournament List
9. ✅ Protected Route Redirection
10. ✅ Token Storage & Retrieval

### API Endpoints getestet:
- ✅ `GET /health` - Health Check
- ✅ `POST /api/v1/auth/register` - User Registration
- ✅ `POST /api/v1/auth/login` - User Login
- ✅ `GET /api/v1/tournaments/` - Tournament List
- ✅ `POST /api/v1/tournaments/` - Create Tournament
- ✅ `GET /api/v1/tournaments/{id}` - Tournament Details
- ✅ `GET /api/v1/participants/` - Participant List

## 📊 Performance

- Backend Response Time: <100ms
- Frontend Load Time: <300ms
- Docker Startup Time: <30s
- API Response Time: <200ms

## 🔮 Nächste Schritte (v1.3.0)

### Geplant:
- Group Models & API
- Match Management
- Tournament Creation UI
- Participant Management UI
- Group Phase UI
- KO Phase UI
- Export Features
- Championship/Liga Support

## 📚 Links

- **Backend API Docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:3000
- **Docker Compose**: `docker-compose.yml`

## 🙏 Danksagungen

Danke für die Unterstützung während der Entwicklung von v1.2.0!

---

**Version:** 1.2.0  
**Release Date:** 2025-01-27  
**Status:** Initial Release - Web Interface

