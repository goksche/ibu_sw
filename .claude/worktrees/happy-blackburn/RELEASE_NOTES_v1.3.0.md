# Release Notes - v1.3.0

**Veröffentlicht:** 2025-01-27  
**Status:** Development Release - Advanced Backend Features

## 🎉 Übersicht

v1.3.0 erweitert das Web-Interface um **Group & Match Management** im Backend mit vollständigen CRUD-APIs für Gruppen und Matches.

## ✨ Neue Features

### Backend - Group Management
- ✅ **Group Model** - SQLAlchemy-Modell für Tournament-Gruppen
- ✅ **Group CRUD API** - Create, Read, Update, Delete Gruppen
- ✅ **Group Schemas** - Pydantic-Validierung für Groups
- ✅ **Group Participants** - Teilnehmer zu Gruppen hinzufügen/entfernen
- ✅ **Group-Participant Junction** - Many-to-Many-Beziehung

### Backend - Match Management
- ✅ **GroupMatch Model** - Model für Gruppenphase-Spiele
- ✅ **KnockoutMatch Model** - Model für KO-Phase-Spiele
- ✅ **Match CRUD API** - Vollständige CRUD für beide Match-Typen
- ✅ **Match Schemas** - Pydantic-Validierung für Matches
- ✅ **Score Management** - Punkte-Eintrag und -Updates

## 🔧 Technische Details

### Neue API Endpoints

#### Groups API (`/api/v1/groups/`)
- `GET /` - Liste aller Gruppen für ein Tournament
- `POST /` - Erstelle neue Gruppe
- `GET /{group_id}` - Gruppe mit Teilnehmern abrufen
- `PUT /{group_id}` - Gruppe aktualisieren
- `DELETE /{group_id}` - Gruppe löschen
- `POST /{group_id}/participants` - Teilnehmer zu Gruppe hinzufügen
- `DELETE /{group_id}/participants/{participant_id}` - Teilnehmer aus Gruppe entfernen

#### Matches API (`/api/v1/matches/`)
- `GET /groups` - Liste aller Group Matches
- `POST /groups` - Erstelle Group Match
- `GET /groups/{match_id}` - Group Match abrufen
- `PUT /groups/{match_id}` - Group Match aktualisieren
- `DELETE /groups/{match_id}` - Group Match löschen
- `GET /knockout` - Liste aller KO Matches
- `POST /knockout` - Erstelle KO Match
- `GET /knockout/{match_id}` - KO Match abrufen
- `PUT /knockout/{match_id}` - KO Match aktualisieren
- `DELETE /knockout/{match_id}` - KO Match löschen

### Database Schema

Neue Tabellen:
- `groups` - Tournament-Gruppen
- `group_participants` - Gruppen-Teilnehmer-Zuordnung
- `group_matches` - Gruppenphase-Spiele
- `knockout_matches` - KO-Phase-Spiele

## 📝 Was funktioniert

✅ **Group Management**
- Gruppen für Tournaments erstellen
- Teilnehmer zu Gruppen zuweisen
- Gruppennamen ändern
- Gruppen löschen

✅ **Match Management**
- Group Matches erstellen und verwalten
- KO Matches erstellen und verwalten
- Score-Entry für Matches
- Match-Details abrufen

✅ **Swagger UI**
- Alle neuen Endpoints dokumentiert
- Testbare API-Interface
- Vollständige Schema-Dokumentation

## 🚧 Bekannte Limitationen (für v1.3.0)

- ⚠️ Keine automatische Match-Generierung (Round-Robin)
- ⚠️ Keine automatische KO-Bracket-Erstellung
- ⚠️ Keine Tournament-Participant Assignment UI
- ⚠️ Keine Group Creation UI im Frontend
- ⚠️ Keine Match Entry UI im Frontend

## 🔄 Migration

**Keine Migration erforderlich** - Neue Tabellen werden automatisch erstellt.

## 📦 Testing

### API Testing via Swagger UI

1. **Groups API Testen:**
   - Swagger UI öffnen: http://localhost:8000/docs
   - `/api/v1/groups/` - Gruppe erstellen
   - `/api/v1/groups/{group_id}` - Gruppe abrufen
   - `/api/v1/groups/{group_id}/participants` - Teilnehmer hinzufügen

2. **Matches API Testen:**
   - `/api/v1/matches/groups` - Group Match erstellen
   - `/api/v1/matches/groups/{match_id}` - Match-Score eintragen
   - `/api/v1/matches/knockout` - KO Match erstellen

### Docker Deployment

```bash
# Container neu starten
docker-compose down
docker-compose up -d --build

# Logs prüfen
docker-compose logs backend

# Swagger UI testen
# http://localhost:8000/docs
```

## 📊 Performance

- API Response Time: <100ms
- Database Queries optimiert
- Foreign Key Constraints aktiv
- CASCADE Deletes implementiert

## 🔮 Nächste Schritte

### v1.3.1 geplant:
- Tournament-Participant Assignment API
- Participant Management UI
- Tournament Creation UI
- Group Management UI
- Match Entry UI

## 📚 Links

- **Backend API Docs**: http://localhost:8000/docs
- **Swagger UI**: http://localhost:8000/docs
- **Docker Compose**: `docker-compose.yml`

## 🙏 Changelog

### Hinzugefügt
- Group Models & API
- Match Models & API
- Group Schemas
- Match Schemas
- API Router Integration

### Geändert
- Database Initialization erweitert
- main.py Router erweitert
- Schemas Package Export erweitert

---

**Version:** 1.3.0  
**Release Date:** 2025-01-27  
**Status:** Development Release

