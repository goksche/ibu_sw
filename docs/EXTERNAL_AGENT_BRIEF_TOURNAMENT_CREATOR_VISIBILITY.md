# Brief für externen Agenten: Turnier-Sichtbarkeit & `creator_id`

## Problem (Symptom)

Turniere (z. B. IDs 21, 22, 23) erscheinen **nicht** in der Liste oder **GET** `/api/v1/tournaments/{id}` liefert **404**, obwohl der Nutzer eingeloggt ist und das Turnier „eben erstellt“ hat.

Typische Ursache in diesem Projekt:

- `visibility` ist **`private`** oder **`shared`**, aber **`creator_id`** in der Tabelle `tournaments` ist **`NULL`** oder passt nicht zum eingeloggten User.
- Die Zugriffslogik steckt in `backend/app/services/visibility.py`: ohne `creator_id` bist du bei private/shared **nicht** als Ersteller erkannt → kein Zugriff.

**Wichtig:** Du musst **keine** neuen Turnier-IDs „erfinden“. Bestehende Zeilen reparieren oder sicherstellen, dass **neu** erstellte Zeilen immer `creator_id` haben.

---

## Dateien, die der Agent vollständig lesen soll

### Backend (Pflicht)

| Pfad | Zweck |
|------|--------|
| `backend/app/services/visibility.py` | Filter für Liste + Zugriff Einzelturnier |
| `backend/app/api/v1/tournaments.py` | `create_tournament`, `duplicate_tournament`, `get_tournaments`, `get_tournament` |
| `backend/app/models/tournament.py` | Spalte `creator_id` |
| `backend/app/schemas/tournament.py` | `TournamentCreate`, `TournamentResponse` (enthält `creator_id`) |
| `backend/app/core/dependencies.py` | `get_current_user`, Rollen |
| `backend/app/api/v1/sharing.py` | Sichtbarkeit ändern, Shares (Ersteller-Check) |

### Optional / Randfälle

| Pfad | Zweck |
|------|--------|
| `backend/app/api/v1/leagues.py` | Legt bei Auto-Turnieren ebenfalls `Tournament` an – bereits mit `creator_id` |
| `backend/migrations/repair_tournament_creator_id_manual.sql` | Manuelle DB-Reparatur (Kommentar) |

### Frontend (nur wenn API korrekt ist, aber UI falsch)

| Pfad | Zweck |
|------|--------|
| `frontend/src/services/tournamentService.ts` | `create`, `getById`, `getAll` |
| `frontend/src/services/api.ts` | Bearer-Token für `/api/v1` |
| `frontend/src/pages/CreateTournament.tsx` | Payload beim Erstellen (kein `creator_id` nötig – kommt vom Server) |
| `frontend/src/pages/Tournaments.tsx` | Liste |

---

## Was der Agent **konkret** tun soll

### 1. Verifizieren (Code)

- In `create_tournament` (`POST ""`): Nach Erzeugen des `Tournament`-Objekts **`tournament.creator_id = current_user.id`** setzen (nicht nur Konstruktor), und **`creator_id` aus dem Client-Payload ignorieren** (`pop` vor `Tournament(**create_data)`).
- Gleiches für **`duplicate_tournament`**, falls Kopien ohne Ersteller landen.
- Sicherstellen, dass **`current_user.id`** bei `require_user_or_admin` nie fehlt (sonst 500 mit klarer Meldung oder Fix in Auth).

### 2. Verifizieren (Laufzeit)

- Nach `POST /api/v1/tournaments` muss die JSON-Antwort **`creator_id`** gesetzt haben (gleiche Zahl wie `users.id` des eingeloggten Users).
- `GET /api/v1/tournaments` muss das neue Turnier zeigen, wenn `visibility` private/shared und `creator_id` korrekt.

### 3. Datenbank-Reparatur für **bestehende** IDs 21–23 (einmalig)

Der Agent soll ein **SQL-Snippet** liefern oder ausführen:

```sql
-- 1) Eigene User-ID:
SELECT id, username, email FROM users;

-- 2) Turnier prüfen:
SELECT id, name, visibility, creator_id FROM tournaments WHERE id IN (21,22,23);

-- 3) Reparatur (PLATZHALTER user_id ersetzen):
UPDATE tournaments SET creator_id = <DEINE_USER_ID>
WHERE id IN (21,22,23) AND (creator_id IS NULL OR creator_id <> <DEINE_USER_ID>);
```

Nur ausführen, wenn der Nutzer wirklich Ersteller sein soll.

### 4. Deployment

- Nach Backend-Codeänderung: **Container/Prozess neu bauen und starten** (z. B. `docker compose build backend && docker compose up -d backend`), sonst läuft weiter **alter** Code ohne Fix.

---

## Akzeptanzkriterien

1. Neues Turnier anlegen → Response enthält **`creator_id`** = ID des eingeloggten Users.
2. `visibility` = `private` → Turnier in Liste sichtbar für Ersteller; `GET` by id funktioniert.
3. Alte Turniere 21–23: nach SQL-Update **oder** nach erneutem Setzen der Sichtbarkeit/Shares konsistent mit Produktregeln.

---

## Was **nicht** nötig ist

- Wizard/Formular neu erfinden: **`creator_id` gehört ausschließlich ins Backend** (aus JWT-Session-User).
- Weitere Test-Turniere 24–100000 anlegen, solange der laufende Code/Container nicht der geänderte Stand ist.

---

## Repo-Pfad

Alles relativ zu: `c:\Cursor\ibu_sw` (Windows) bzw. Klon-Pfad des Repos.
