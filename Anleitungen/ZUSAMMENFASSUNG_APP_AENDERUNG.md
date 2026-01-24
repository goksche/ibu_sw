# Zusammenfassung: App-Umprogrammierung

## 🎯 Problem
App macht Requests zu `/categories/` statt `/App-4/categories/` → 404 Fehler

## ✅ Lösung
**Nur 1 Zeile ändern!**

## 📁 Datei
`/app/app/templates/ui_categories.html` (im Container `gsmartsol-app-4`)

## 🔧 Änderung

**Zeile 28:**

**VORHER:**
```javascript
const BASE_PATH = window.BASE_PATH || '';
```

**NACHHER:**
```javascript
const BASE_PATH = window.BASE_PATH || '/App-4';
```

## 🚀 Schnell-Anleitung

### Option 1: Mit sed (automatisch)
```bash
docker exec gsmartsol-app-4 sed -i "s/const BASE_PATH = window.BASE_PATH || '';/const BASE_PATH = window.BASE_PATH || '\/App-4';/" /app/app/templates/ui_categories.html
docker restart gsmartsol-app-4
```

### Option 2: Manuell
```bash
# Datei öffnen
docker exec -it gsmartsol-app-4 nano /app/app/templates/ui_categories.html

# Zeile 28 ändern:
# VON: const BASE_PATH = window.BASE_PATH || '';
# ZU:   const BASE_PATH = window.BASE_PATH || '/App-4';

# Speichern (Strg+O, Enter) und beenden (Strg+X)
docker restart gsmartsol-app-4
```

## ✅ Test

1. Browser-Seite neu laden (Strg+F5)
2. Browser-Console (F12): `console.log(BASE_PATH)` sollte `/App-4` zeigen
3. Network-Tab: Requests sollten zu `/App-4/categories/` gehen
4. Status sollte 200 sein (nicht 404)

## 📚 Weitere Dateien

**Auch prüfen:**
- `ui_customers.html`
- `ui_events.html`
- Alle anderen `ui_*.html` Dateien

**Suche nach:**
```bash
docker exec gsmartsol-app-4 grep -r "BASE_PATH.*|| ''" /app/app/templates/
```

**Alle ändern zu:**
```javascript
const BASE_PATH = window.BASE_PATH || '/App-4';
```

## 🎉 Fertig!

**Aufwand:** 1 Zeile ändern, 2 Minuten  
**Schwierigkeit:** ⭐ Sehr einfach
