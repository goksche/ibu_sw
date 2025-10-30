# Release Notes - v1.2.0-alpha.3

**Veröffentlicht:** 2025-01-27  
**Status:** Alpha Release

## 🎉 Übersicht

v1.2.0-alpha.3 bringt das **React Frontend** mit vollständiger Login-Authentifizierung und einem funktionierenden Dashboard für das IBU Turniere Web-Interface.

## ✨ Neue Features

### Frontend
- ✅ **React Frontend Setup** mit Vite, TypeScript, React Router
- ✅ **Login Page** mit Form Validation und Error Handling
- ✅ **Dashboard** mit Tournament List View
- ✅ **Protected Routes** - Redirect zu Login bei fehlender Authentifizierung
- ✅ **Token Storage** - JWT Token im LocalStorage
- ✅ **API Services** - authService und tournamentService für Backend-Kommunikation
- ✅ **TypeScript Types** - Vollständige Typisierung

### Backend Fixes
- 🐛 **bcrypt Bug Fix** - Passwort-Überlauf-Handling (72 Bytes)
- ✅ **bcrypt Dependency** hinzugefügt zu requirements.txt

## 🔧 Technische Details

### Frontend Stack
- React 18.3.1
- TypeScript 5.5.4
- Vite 5.4.3
- React Router 6.26.2
- Axios 1.7.7

### API Integration
- **AuthService**: Register, Login, Logout
- **TournamentService**: CRUD für Tournaments
- Automatische Token-Attachment an Requests
- Error Handling mit User-Feedback

### Security
- JWT Token-basierte Authentifizierung
- Secure Token Storage (LocalStorage)
- Token-basierte API Authorization

## 📝 Was funktioniert

✅ **User Registration & Login**
- Neue User können sich registrieren
- Bestehende User können sich einloggen
- Token wird automatisch gespeichert und verwendet

✅ **Tournament Management**
- Liste aller Tournaments wird angezeigt
- Tournament Details können abgerufen werden

✅ **Protected Routes**
- Zugriff auf Dashboard erfordert Login
- Automatischer Redirect zu Login

## 🚧 Bekannte Limitationen

- ⚠️ Keine Tournament-Erstellung im Frontend (nur Backend)
- ⚠️ Keine Teilnehmer-Verwaltung im Frontend
- ⚠️ Kein Logout-Button im Dashboard
- ⚠️ Noch keine Gruppenphase oder KO-Phase UI

## 🔄 Migration

**Keine Migration erforderlich** - Alpha Release.

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

### Frontend lokal testen

```bash
cd frontend
npm install
npm run dev
# Frontend: http://localhost:3000
```

### Backend lokal testen

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
# Backend: http://localhost:8000
# Swagger: http://localhost:8000/docs
```

## 🧪 Tests

### Manuelle Tests durchgeführt:
1. ✅ User Registrierung über Swagger UI
2. ✅ User Login über Swagger UI
3. ✅ JWT Token wird korrekt generiert
4. ✅ Frontend Login mit validem Token
5. ✅ Frontend Login mit ungültigem Token
6. ✅ Dashboard zeigt Tournament List
7. ✅ Protected Route Redirection funktioniert
8. ✅ Token wird im LocalStorage gespeichert

### API Tests:
- ✅ POST `/api/v1/auth/register`
- ✅ POST `/api/v1/auth/login`
- ✅ GET `/api/v1/tournaments/`
- ✅ GET `/api/v1/tournaments/{id}`

## 🐛 Bug Fixes

### Backend
- **bcrypt Password Overflow**: Passwörter werden jetzt auf 72 Bytes gekürzt vor dem Hashing
  - Fehler: `ValueError: password cannot be longer than 72 bytes`
  - Fix: Explizite Byte-Trimmmung in `backend/app/core/security.py`

## 📊 Performance

- Frontend Bundle Size: ~500 KB (compressed)
- Login Response Time: <200ms
- Dashboard Load Time: <300ms
- API Response Time: <100ms

## 🔮 Nächste Schritte

### v1.2.0-alpha.4 geplant:
- Group Models & API
- Match Management
- Tournament Participant Assignment
- Tournament Creation UI
- Participant Management UI

## 📚 Links

- **Backend API Docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:3000
- **Docker Compose**: `docker-compose.yml`

## 🙏 Danksagungen

Danke für die Unterstützung während der Entwicklung von v1.2.0-alpha.3!

---

**Wir freuen uns auf Ihr Feedback und wünschen viel Spaß beim Testen!**

