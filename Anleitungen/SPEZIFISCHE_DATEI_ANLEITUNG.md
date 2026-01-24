# Spezifische Anleitung für ui_categories.html

## 📁 Datei
**Pfad:** `/app/app/templates/ui_categories.html`  
**Container:** `gsmartsol-app-4`

## 🎯 Ziel
Alle `fetch('/categories` Aufrufe durch `fetch(`${basePath}/categories` ersetzen.

## 📋 Schritt-für-Schritt

### Schritt 1: Datei öffnen

**Im Container:**
```bash
docker exec -it gsmartsol-app-4 vi /app/app/templates/ui_categories.html
```

**Oder Datei kopieren, ändern, zurückkopieren:**
```bash
# Datei vom Container kopieren
docker cp gsmartsol-app-4:/app/app/templates/ui_categories.html ./ui_categories.html

# Datei bearbeiten (mit Editor deiner Wahl)
# Dann zurückkopieren:
docker cp ./ui_categories.html gsmartsol-app-4:/app/app/templates/ui_categories.html

# Container neu starten (falls nötig)
docker restart gsmartsol-app-4
```

### Schritt 2: BASE_PATH Variable hinzufügen

**Suche nach:**
```javascript
window.BASE_PATH = getBasePath();
```

**Füge direkt danach hinzu:**
```javascript
window.BASE_PATH = getBasePath();
const basePath = window.BASE_PATH || '/App-4';  // ⭐ HINZUFÜGEN
```

### Schritt 3: Alle fetch-Aufrufe finden

**Suche nach diesen Patterns:**
- `fetch('/categories`
- `fetch("/categories`
- `fetch('/api/`
- Alle anderen `fetch('/` Aufrufe

**Typische Zeilen:**
```javascript
fetch('/categories/?page=1&page_size=100')
fetch('/categories', {method: 'POST', ...})
fetch('/categories/' + id, {method: 'DELETE'})
```

### Schritt 4: fetch-Aufrufe ersetzen

**Vorher:**
```javascript
fetch('/categories/?page=1&page_size=100')
```

**Nachher:**
```javascript
fetch(`${basePath}/categories/?page=1&page_size=100`)
```

**Alle Varianten:**

| Vorher | Nachher |
|--------|---------|
| `fetch('/categories/')` | `fetch(`${basePath}/categories/`)` |
| `fetch('/categories')` | `fetch(`${basePath}/categories`)` |
| `fetch('/categories/' + id)` | `fetch(`${basePath}/categories/` + id)` |
| `fetch('/categories', {...})` | `fetch(`${basePath}/categories`, {...})` |

### Schritt 5: Alle anderen API-Endpoints prüfen

**Suche auch nach:**
- `fetch('/products`
- `fetch('/customers`
- `fetch('/events`
- `fetch('/api/`
- `fetch('/auth/`
- `fetch('/settings/`
- `fetch('/reports/`
- `fetch('/export/`

**Alle ersetzen durch:**
- `fetch(`${basePath}/products`
- `fetch(`${basePath}/customers`
- etc.

## 🔍 Automatische Suche

**Im Container alle fetch-Aufrufe finden:**
```bash
docker exec gsmartsol-app-4 grep -n "fetch('/" /app/app/templates/ui_categories.html
```

**Alle Dateien prüfen:**
```bash
docker exec gsmartsol-app-4 grep -r "fetch('/" /app/app/templates/
```

## 📝 Beispiel: Komplette Änderung

### Vorher (Ausschnitt):
```javascript
<script>
    function getBasePath() {
        const parts = window.location.pathname.split('/');
        if (parts.length > 1 && parts[1].startsWith('App-')) {
            return '/' + parts[1];
        }
        return '';
    }
    window.BASE_PATH = getBasePath();

    function load() {
        fetch('/categories/?page=1&page_size=100')
            .then(function(r) {
                if (!r.ok) throw new Error('Failed');
                return r.json();
            })
            .then(function(data) {
                // ...
            });
    }

    document.getElementById('form').addEventListener('submit', function(e) {
        e.preventDefault();
        fetch('/categories', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({...})
        });
    });
</script>
```

### Nachher (mit Änderungen):
```javascript
<script>
    function getBasePath() {
        const parts = window.location.pathname.split('/');
        if (parts.length > 1 && parts[1].startsWith('App-')) {
            return '/' + parts[1];
        }
        return '';
    }
    window.BASE_PATH = getBasePath();
    const basePath = window.BASE_PATH || '/App-4';  // ⭐ HINZUGEFÜGT

    function load() {
        fetch(`${basePath}/categories/?page=1&page_size=100`)  // ⭐ GEÄNDERT
            .then(function(r) {
                if (!r.ok) throw new Error('Failed');
                return r.json();
            })
            .then(function(data) {
                // ...
            });
    }

    document.getElementById('form').addEventListener('submit', function(e) {
        e.preventDefault();
        fetch(`${basePath}/categories`, {  // ⭐ GEÄNDERT
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({...})
        });
    });
</script>
```

## ✅ Checkliste

- [ ] Datei `/app/app/templates/ui_categories.html` geöffnet
- [ ] `const basePath = window.BASE_PATH || '/App-4';` hinzugefügt
- [ ] Alle `fetch('/categories` durch `fetch(`${basePath}/categories` ersetzt
- [ ] Alle anderen `fetch('/` API-Requests angepasst
- [ ] Datei gespeichert
- [ ] Container neu gestartet (falls nötig)
- [ ] Browser-Seite neu geladen
- [ ] Getestet: Requests gehen zu `/App-4/categories/`

## 🧪 Test

**Nach Änderung:**

1. **Browser-Seite neu laden** (Strg+F5)
2. **Browser-Console öffnen** (F12)
3. **Prüfe BASE_PATH:**
   ```javascript
   console.log(window.BASE_PATH);  // Sollte '/App-4' sein
   console.log(basePath);  // Sollte '/App-4' sein
   ```
4. **Prüfe Network-Tab:**
   - Requests sollten zu `/App-4/categories/` gehen
   - Status sollte 200 sein (nicht 404)
   - Response sollte JSON sein

## 🔄 Container neu starten (falls nötig)

**Wenn die App die Datei nicht neu lädt:**
```bash
docker restart gsmartsol-app-4
```

## 📚 Weitere Dateien

**Auch diese Dateien sollten geprüft werden:**
- `/app/app/templates/ui_customers.html`
- `/app/app/templates/ui_events.html`
- `/app/app/templates/ui_products.html` (falls vorhanden)
- Alle anderen `ui_*.html` Dateien mit API-Requests

**Suche nach allen:**
```bash
docker exec gsmartsol-app-4 grep -r "fetch('/" /app/app/templates/
```

## ⚠️ Wichtig

**NICHT ändern:**
- Relative URLs: `fetch('./data.json')` ✅
- Externe URLs: `fetch('https://...')` ✅

**NUR ändern:**
- Absolute URLs: `fetch('/categories/')` → `fetch(`${basePath}/categories/`)` ✅

## 🎉 Fertig!

Nach diesen Änderungen sollten alle API-Requests funktionieren.
