# IBU Turniere - Web Interface (v1.2.0)

## Überblick

Moderne, Docker-basierte Web-Anwendung für IBU Turnier-Verwaltung mit:
- **Backend**: FastAPI + PostgreSQL
- **Frontend**: React + TypeScript
- **Deployment**: Docker Compose

## Schnellstart

### 1. Voraussetzungen

- Docker Desktop oder Docker Engine + Docker Compose
- Git

### 2. Environment konfigurieren

```bash
# .env.example nach .env kopieren
cp .env.example .env

# Edit .env und Passwörter ändern
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

## Projektstruktur

```
ibu_sw/
├── backend/              # FastAPI Backend
│   ├── app/
│   │   ├── api/v1/      # API Endpoints
│   │   ├── core/        # Config, Security, Logging
│   │   ├── models/      # SQLAlchemy Models
│   │   ├── schemas/     # Pydantic Schemas
│   │   └── services/    # Business Logic
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/            # React Frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── types/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── .env.example
```

## Development

### Backend Development

```bash
# In backend Verzeichnis
cd backend

# Virtual Environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# oder
venv\Scripts\activate     # Windows

# Dependencies installieren
pip install -r requirements.txt

# Server starten
uvicorn app.main:app --reload
```

### Frontend Development

```bash
# In frontend Verzeichnis
cd frontend

# Dependencies installieren
npm install

# Dev Server starten
npm run dev
```

## Status

🔄 **v1.2.0-alpha.1** - Projektstruktur und Docker Setup

- ✅ Projektstruktur erstellt
- ✅ Docker Compose konfiguriert
- ✅ Backend Dockerfile
- ✅ Frontend Dockerfile
- ⏳ Backend Implementation
- ⏳ Frontend Implementation

## Nächste Schritte

1. Backend: FastAPI Grundgerüst mit Authentication
2. Frontend: React App mit Routing
3. Database Models & Migrations
4. API Endpoints implementieren

## Support

Bei Problemen:
1. Docker Logs prüfen: `docker-compose logs`
2. Services neu starten: `docker-compose restart`
3. Clean Build: `docker-compose down -v && docker-compose up --build`

## Lizenz

Siehe Hauptprojekt README.

