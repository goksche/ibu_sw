# App-Umprogrammierung - Detaillierte Anleitung

## Ziel
Die App (Kassensystem) soll `BASE_PATH` für alle API-Requests verwenden, damit Requests zu `/App-4/categories/` statt `/categories/` gehen.

## Problem-Analyse

### Aktueller Zustand
```javascript
// ✅ BASE_PATH wird gesetzt:
window.BASE_PATH = getBasePath();  // = '/App-4'

// ❌ Aber API-Requests verwenden es nicht:
fetch('/categories/?page=1&page_size=100')  // Geht zu Django → 404
```

### Gewünschter Zustand
```javascript
// ✅ BASE_PATH wird gesetzt:
window.BASE_PATH = getBasePath();  // = '/App-4'

// ✅ API-Requests verwenden BASE_PATH:
const basePath = window.BASE_PATH || '/App-4';
fetch(`${basePath}/categories/?page=1&page_size=100`)  // Geht zur App ✅
```

## Schritt-für-Schritt Anleitung

### Schritt 1: App-Dateien identifizieren

**Suche nach JavaScript-Dateien, die API-Requests machen:**
- `categories.js` oder `categories.html` (für Kategorien-Seite)
- `main.js` oder `app.js` (Hauptdatei)
- `api.js` oder `api-client.js` (API-Client)
- Inline-Script in HTML-Dateien

**Typische Dateien:**
- `/app/ui/categories.html` oder `/app/ui/categories.js`
- `/app/static/js/*.js`
- `/app/templates/*.html` (mit inline JavaScript)

### Schritt 2: BASE_PATH Variable definieren

**Am Anfang jeder JavaScript-Datei, die API-Requests macht:**

```javascript
// BASE_PATH für Portal-Integration
const basePath = window.BASE_PATH || '/App-4';

// Oder als Fallback, falls BASE_PATH nicht gesetzt ist:
const basePath = (function() {
    // Prüfe ob BASE_PATH bereits gesetzt ist
    if (window.BASE_PATH) {
        return window.BASE_PATH;
    }
    // Fallback: Extrahiere aus URL
    const parts = window.location.pathname.split('/');
    if (parts.length > 1 && parts[1].startsWith('App-')) {
        return '/' + parts[1];
    }
    return '';  // Lokale Entwicklung ohne Prefix
})();
```

**Oder einfacher (wenn BASE_PATH bereits gesetzt ist):**
```javascript
const basePath = window.BASE_PATH || '';
```

### Schritt 3: API-Requests anpassen

**Suche nach allen API-Requests und ersetze sie:**

#### Pattern 1: fetch() Aufrufe

**Vorher:**
```javascript
fetch('/categories/?page=1&page_size=100')
fetch('/categories', {method: 'POST', body: ...})
fetch('/api/settings')
fetch('/products/')
fetch('/customers/')
```

**Nachher:**
```javascript
fetch(`${basePath}/categories/?page=1&page_size=100`)
fetch(`${basePath}/categories`, {method: 'POST', body: ...})
fetch(`${basePath}/api/settings`)
fetch(`${basePath}/products/`)
fetch(`${basePath}/customers/`)
```

#### Pattern 2: Relative URLs in fetch()

**Vorher:**
```javascript
fetch('/categories/')
fetch('./api/data')
fetch('../settings')
```

**Nachher:**
```javascript
fetch(`${basePath}/categories/`)
fetch(`${basePath}/api/data`)
fetch(`${basePath}/settings`)
```

#### Pattern 3: XMLHttpRequest

**Vorher:**
```javascript
const xhr = new XMLHttpRequest();
xhr.open('GET', '/categories/');
xhr.send();
```

**Nachher:**
```javascript
const xhr = new XMLHttpRequest();
xhr.open('GET', `${basePath}/categories/`);
xhr.send();
```

#### Pattern 4: axios oder andere HTTP-Libraries

**Vorher:**
```javascript
axios.get('/categories/')
axios.post('/categories', data)
fetch('/api/settings')
```

**Nachher:**
```javascript
axios.get(`${basePath}/categories/`)
axios.post(`${basePath}/categories`, data)
fetch(`${basePath}/api/settings`)
```

### Schritt 4: Spezifische Dateien anpassen

#### categories.js (oder categories.html)

**Suche nach:**
```javascript
// Alle fetch-Aufrufe zu /categories/
fetch('/categories/')
fetch('/categories', {method: 'POST'})
```

**Ersetze durch:**
```javascript
// Am Anfang der Datei:
const basePath = window.BASE_PATH || '/App-4';

// Dann alle Requests:
fetch(`${basePath}/categories/`)
fetch(`${basePath}/categories`, {method: 'POST'})
```

#### load() Funktion (falls vorhanden)

**Vorher:**
```javascript
function load() {
    fetch('/categories/?page=1&page_size=100')
        .then(r => r.json())
        .then(data => {
            // ...
        });
}
```

**Nachher:**
```javascript
const basePath = window.BASE_PATH || '/App-4';

function load() {
    fetch(`${basePath}/categories/?page=1&page_size=100`)
        .then(r => r.json())
        .then(data => {
            // ...
        });
}
```

### Schritt 5: Alle API-Endpoints identifizieren

**Typische Endpoints, die angepasst werden müssen:**
- `/categories/` → `${basePath}/categories/`
- `/categories` → `${basePath}/categories`
- `/products/` → `${basePath}/products/`
- `/customers/` → `${basePath}/customers/`
- `/events/` → `${basePath}/events/`
- `/api/` → `${basePath}/api/`
- `/auth/` → `${basePath}/auth/`
- `/settings/` → `${basePath}/settings/`
- `/reports/` → `${basePath}/reports/`
- `/export/` → `${basePath}/export/`
- `/health/` → `${basePath}/health/`

### Schritt 6: Helper-Funktion erstellen (Optional, aber empfohlen)

**Erstelle eine Helper-Funktion für API-Requests:**

```javascript
// Am Anfang der Datei oder in einer gemeinsamen utils.js
const basePath = window.BASE_PATH || '/App-4';

// Helper-Funktion für API-Requests
function apiRequest(path, options = {}) {
    // Entferne führenden Slash, falls vorhanden
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const url = `${basePath}/${cleanPath}`;
    
    return fetch(url, options);
}

// Oder für GET-Requests:
function apiGet(path) {
    return apiRequest(path, {method: 'GET'});
}

// Oder für POST-Requests:
function apiPost(path, data) {
    return apiRequest(path, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
}
```

**Dann verwende:**
```javascript
// Statt:
fetch('/categories/')

// Verwende:
apiRequest('/categories/')
// Oder:
apiGet('categories/')
```

## Konkrete Code-Beispiele

### Beispiel 1: Kategorien laden

**Vorher:**
```javascript
async function loadCategories() {
    const response = await fetch('/categories/?page=1&page_size=100');
    const data = await response.json();
    return data;
}
```

**Nachher:**
```javascript
const basePath = window.BASE_PATH || '/App-4';

async function loadCategories() {
    const response = await fetch(`${basePath}/categories/?page=1&page_size=100`);
    const data = await response.json();
    return data;
}
```

### Beispiel 2: Kategorie erstellen

**Vorher:**
```javascript
async function createCategory(name) {
    const response = await fetch('/categories', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: name})
    });
    return response.json();
}
```

**Nachher:**
```javascript
const basePath = window.BASE_PATH || '/App-4';

async function createCategory(name) {
    const response = await fetch(`${basePath}/categories`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: name})
    });
    return response.json();
}
```

### Beispiel 3: Event Handler

**Vorher:**
```javascript
document.getElementById('form').addEventListener('submit', function(e) {
    e.preventDefault();
    fetch('/categories', {
        method: 'POST',
        body: new FormData(this)
    });
});
```

**Nachher:**
```javascript
const basePath = window.BASE_PATH || '/App-4';

document.getElementById('form').addEventListener('submit', function(e) {
    e.preventDefault();
    fetch(`${basePath}/categories`, {
        method: 'POST',
        body: new FormData(this)
    });
});
```

## Automatische Suche und Ersetzung

### Mit grep/sed (Linux/Mac)

```bash
# Finde alle fetch-Aufrufe
grep -r "fetch('/" /app/ui/

# Ersetze alle fetch('/ mit fetch(`${basePath}/`
# (Vorsicht: Prüfe vorher!)
```

### Mit PowerShell (Windows)

```powershell
# Finde alle fetch-Aufrufe
Select-String -Path "*.js" -Pattern "fetch\('/"

# Ersetze (Vorsicht: Backup erstellen!)
(Get-Content file.js) -replace "fetch\('/", "fetch(`${basePath}/" | Set-Content file.js
```

## Checkliste

### Vor der Änderung
- [ ] Backup der App-Dateien erstellen
- [ ] Alle JavaScript-Dateien identifizieren
- [ ] Alle API-Requests finden (grep nach `fetch('/`, `axios.get('/`, etc.)

### Während der Änderung
- [ ] `basePath` Variable am Anfang jeder Datei definieren
- [ ] Alle `fetch('/` durch `fetch(`${basePath}/` ersetzen
- [ ] Alle `axios.get('/` durch `axios.get(`${basePath}/` ersetzen
- [ ] Alle anderen HTTP-Requests anpassen
- [ ] **WICHTIG:** Relative URLs wie `./` oder `../` NICHT ändern (nur absolute `/`)

### Nach der Änderung
- [ ] App testen: Seite neu laden
- [ ] Browser-Console prüfen (F12)
- [ ] Network-Tab prüfen: Requests sollten zu `/App-4/categories/` gehen
- [ ] Funktionalität testen: Kategorien laden, erstellen, etc.

## Häufige Fehler vermeiden

### ❌ Falsch: Relative URLs ändern
```javascript
// ❌ NICHT ändern:
fetch('./data.json')  // Relativ zur aktuellen URL
fetch('../api/data')  // Relativ zur aktuellen URL
```

### ✅ Richtig: Nur absolute URLs ändern
```javascript
// ✅ Ändern:
fetch('/categories/')  // Absolut, muss BASE_PATH haben
fetch('/api/data')     // Absolut, muss BASE_PATH haben
```

### ❌ Falsch: BASE_PATH doppelt verwenden
```javascript
// ❌ Falsch:
fetch(`${basePath}/App-4/categories/`)  // BASE_PATH enthält bereits /App-4
```

### ✅ Richtig: BASE_PATH nur einmal
```javascript
// ✅ Richtig:
fetch(`${basePath}/categories/`)  // BASE_PATH = '/App-4'
```

## Test-Anleitung

### 1. Browser-Console öffnen (F12)

### 2. Prüfe BASE_PATH
```javascript
console.log(window.BASE_PATH);  // Sollte '/App-4' sein
```

### 3. Teste API-Request
```javascript
const basePath = window.BASE_PATH || '/App-4';
fetch(`${basePath}/categories/`)
    .then(r => r.json())
    .then(data => console.log('Success:', data))
    .catch(err => console.error('Error:', err));
```

### 4. Prüfe Network-Tab
- Öffne Network-Tab in Browser DevTools
- Lade Seite neu
- Prüfe Requests: Sollten zu `/App-4/categories/` gehen
- Status sollte 200 sein (nicht 404)

## Zusammenfassung

**Was muss geändert werden:**
1. `basePath` Variable definieren (1 Zeile)
2. Alle `fetch('/` durch `fetch(`${basePath}/` ersetzen (5-10 Zeilen)
3. Alle anderen HTTP-Requests anpassen

**Aufwand:**
- Zeit: 10-15 Minuten
- Zeilen: 5-15 Zeilen Code
- Schwierigkeit: ⭐ Einfach

**Keine komplette Umschreibung nötig!**
