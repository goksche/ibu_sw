# Schnellstart-Anleitung: App anpassen

## 🎯 Ziel
App so anpassen, dass alle API-Requests `BASE_PATH` verwenden.

## ⚡ Schnell-Anleitung (5 Minuten)

### Schritt 1: Datei finden
```bash
# Im Container nach Dateien suchen, die 'categories' enthalten:
docker exec gsmartsol-app-4 find /app -name "*categor*" -o -name "*.html" | grep -i ui
```

### Schritt 2: Datei öffnen
Die Datei ist wahrscheinlich:
- `/app/app/ui/categories.html` oder
- `/app/app/static/js/categories.js` oder
- Eine HTML-Datei mit inline JavaScript

### Schritt 3: Code ändern

**Am Anfang der Datei (nach `window.BASE_PATH = getBasePath();`):**
```javascript
// ⭐ HINZUFÜGEN:
const basePath = window.BASE_PATH || '/App-4';
```

**Dann alle `fetch('/` ersetzen:**

**Vorher:**
```javascript
fetch('/categories/?page=1&page_size=100')
fetch('/categories', {method: 'POST', ...})
fetch('/categories/' + id, {method: 'DELETE'})
```

**Nachher:**
```javascript
fetch(`${basePath}/categories/?page=1&page_size=100`)
fetch(`${basePath}/categories`, {method: 'POST', ...})
fetch(`${basePath}/categories/` + id, {method: 'DELETE'})
```

### Schritt 4: Testen
1. Browser-Seite neu laden (Strg+F5)
2. Browser-Console öffnen (F12)
3. Prüfe Network-Tab: Requests sollten zu `/App-4/categories/` gehen
4. Status sollte 200 sein (nicht 404)

## 📋 Checkliste

- [ ] Datei gefunden, die `fetch('/categories` enthält
- [ ] `const basePath = window.BASE_PATH || '/App-4';` hinzugefügt
- [ ] Alle `fetch('/categories` durch `fetch(`${basePath}/categories` ersetzt
- [ ] Alle anderen `fetch('/` API-Requests angepasst
- [ ] Getestet: Requests gehen zu `/App-4/...` statt `/...`

## 🔍 Suche nach allen zu ändernden Stellen

**Suche nach:**
```bash
# Im Container:
docker exec gsmartsol-app-4 grep -r "fetch('/" /app/app
```

**Typische Patterns:**
- `fetch('/categories`
- `fetch('/products`
- `fetch('/api/`
- `fetch('/customers`
- `fetch('/events`

**Alle ersetzen durch:**
- `fetch(`${basePath}/categories`
- `fetch(`${basePath}/products`
- `fetch(`${basePath}/api/`
- etc.

## ⚠️ Wichtig

**NICHT ändern:**
- Relative URLs: `fetch('./data.json')` ✅ OK
- Relative URLs: `fetch('../api/data')` ✅ OK
- Externe URLs: `fetch('https://...')` ✅ OK

**ÄNDERN:**
- Absolute URLs: `fetch('/categories/')` → `fetch(`${basePath}/categories/`)` ✅

## 📝 Beispiel-Code

### Komplettes Beispiel (Vorher/Nachher):

**VORHER:**
```javascript
<script>
    window.BASE_PATH = getBasePath();  // = '/App-4'
    
    function load() {
        fetch('/categories/?page=1&page_size=100')
            .then(r => r.json())
            .then(data => { /* ... */ });
    }
    
    document.getElementById('form').addEventListener('submit', function(e) {
        e.preventDefault();
        fetch('/categories', {
            method: 'POST',
            body: JSON.stringify({...})
        });
    });
</script>
```

**NACHHER:**
```javascript
<script>
    window.BASE_PATH = getBasePath();  // = '/App-4'
    const basePath = window.BASE_PATH || '/App-4';  // ⭐ HINZUGEFÜGT
    
    function load() {
        fetch(`${basePath}/categories/?page=1&page_size=100`)  // ⭐ GEÄNDERT
            .then(r => r.json())
            .then(data => { /* ... */ });
    }
    
    document.getElementById('form').addEventListener('submit', function(e) {
        e.preventDefault();
        fetch(`${basePath}/categories`, {  // ⭐ GEÄNDERT
            method: 'POST',
            body: JSON.stringify({...})
        });
    });
</script>
```

## 🎉 Fertig!

Nach diesen Änderungen sollten alle API-Requests zu `/App-4/...` gehen und funktionieren.

**Detaillierte Anleitung:** Siehe `APP_UMPROGRAMMIERUNG_ANLEITUNG.md` und `KONKRETE_CODE_AENDERUNGEN.md`
