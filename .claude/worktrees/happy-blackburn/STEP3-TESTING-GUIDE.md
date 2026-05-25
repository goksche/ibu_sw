# Schritt 3: Backend Core - Test Guide

## ✅ Was wurde implementiert?

### Core Modules
- Config Management (Pydantic Settings)
- Database Setup (SQLAlchemy)
- Security (JWT, Password Hashing)
- Logging System

### API Endpoints
- User Registration
- User Login
- Get Current User (Placeholder)

## 🧪 Testen im Swagger UI

**Öffnen Sie:** http://localhost:8000/docs

### 1. Test: User Registration

**Endpoint:** `POST /api/v1/auth/register`

**Request Body:**
```json
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "secret123",
  "role": "admin"
}
```

**Erwartete Response:**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "role": "admin",
  "is_active": true,
  "created_at": "2025-10-29T22:40:00Z"
}
```

### 2. Test: User Login

**Endpoint:** `POST /api/v1/auth/login`

**Request Body:**
```json
{
  "username": "admin",
  "password": "secret123"
}
```

**Erwartete Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

### 3. Test: Health Check

**Endpoint:** `GET /health`

**Erwartete Response:**
```json
{
  "status": "healthy",
  "service": "backend",
  "version": "1.2.0-alpha.1"
}
```

### 4. Test: Root Endpoint

**Endpoint:** `GET /`

**Erwartete Response:**
```json
{
  "message": "IBU Turniere API",
  "version": "1.2.0-alpha.1",
  "docs": "/docs",
  "api": "/api/v1"
}
```

## 📋 Checkliste

- [ ] Swagger UI lädt korrekt
- [ ] Registration Endpoint funktioniert
- [ ] Login Endpoint funktioniert
- [ ] JWT Token wird generiert
- [ ] Passwort wird gehashed
- [ ] Keine Fehler in Backend Logs

## 🔍 Fehlerüberprüfung

Falls Fehler auftreten:
```bash
docker-compose logs backend --tail 50
```

## ➡️ Nächste Schritte

Wenn alle Tests erfolgreich sind:
- v1.2.0-alpha.2 Rest: Tournament Models, Participant Models
- v1.2.0-alpha.3: React Frontend mit Login

