# Warum geht es nicht? - Erklärung

## Das Problem

Die App macht Requests zu:
- ❌ `https://gsmartsol.ch/categories/` → Geht zu Django → 404
- ✅ Sollte sein: `https://gsmartsol.ch/App-4/categories/` → Geht zur App

## Warum passiert das?

### 1. Die App setzt BASE_PATH, verwendet es aber nicht

**Was die App macht:**
```javascript
window.BASE_PATH = getBasePath();  // Setzt '/App-4'
```

**Aber dann:**
```javascript
fetch('/categories/')  // ❌ Verwendet BASE_PATH NICHT!
```

**Sollte sein:**
```javascript
fetch(`${window.BASE_PATH}/categories/`)  // ✅ Mit BASE_PATH
```

### 2. nginx Routing

**nginx hat:**
```nginx
location /App-4/ {
    proxy_pass http://app_4/;  # Weiterleitung zur App
}

location / {
    proxy_pass http://django;  # Weiterleitung zu Django
}
```

**Was passiert:**
1. Request zu `/categories/` → Matcht nicht `/App-4/`
2. Geht zu `location /` → Weiterleitung zu Django
3. Django hat keine `/categories/` Route → 404

## Lösung 1: nginx erweitern (OHNE App-Änderung) ⭐

Ich habe nginx so erweitert, dass es auch `/categories/` Requests an die App weiterleitet, wenn sie von der App-Seite kommen (Referer-Check).

**Was wurde gemacht:**
- Zusätzliche Location-Blocks für API-Pfade (`/categories/`, `/api/`, etc.)
- Prüft Referer, ob Request von `/App-4/` kommt
- Wenn ja, leitet an App weiter (mit `/App-4/` Prefix)

**Status**: ✅ Implementiert, wird getestet

## Lösung 2: App anpassen (Sauberste Lösung)

Die App sollte BASE_PATH verwenden:
```javascript
const basePath = window.BASE_PATH || '/App-4';
fetch(`${basePath}/categories/`)
```

**Aufwand**: 5-10 Zeilen Code ändern

## Warum geht es jetzt nicht?

**Mögliche Gründe:**

1. **nginx Config noch nicht neu geladen**
   - Lösung: `docker exec gsmartsol-nginx nginx -s reload`

2. **Referer wird nicht gesendet**
   - Manche Browser/Requests senden keinen Referer
   - Lösung: App muss BASE_PATH verwenden

3. **Location-Block-Reihenfolge**
   - nginx prüft Location-Blocks in bestimmter Reihenfolge
   - Lösung: Location-Blocks müssen VOR `location /` stehen

## Test

Nach dem nginx Reload:
1. **Lade App-Seite neu** im Browser
2. **Mache einen API-Request** (z.B. Kategorien laden)
3. **Prüfe Browser-Console**: Sollte jetzt funktionieren

## Falls es immer noch nicht geht

**Dann muss die App angepasst werden:**
- Finde alle `fetch('/` Aufrufe
- Ersetze durch `fetch(`${window.BASE_PATH}/`
- Das sind meist nur 5-10 Zeilen!

## Zusammenfassung

| Problem | Ursache | Lösung |
|---------|---------|--------|
| 404 auf `/categories/` | App verwendet BASE_PATH nicht | nginx erweitert (getestet) ODER App anpassen |
| Requests gehen zu Django | nginx location / matched zuerst | Location-Blocks vor location / |

**Die nginx-Lösung sollte funktionieren, wenn Referer gesendet wird. Falls nicht, muss die App angepasst werden (nur 5-10 Zeilen).**
