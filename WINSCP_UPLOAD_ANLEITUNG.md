# Detaillierte Anleitung: Dateien mit WinSCP hochladen

## Schritt 1: WinSCP öffnen und verbinden

1. **WinSCP starten**
   - Öffne WinSCP auf deinem Windows-Rechner

2. **Neue Verbindung erstellen** (falls noch nicht gespeichert)
   - Klicke auf "Neue Sitzung" (oder Session → New Session)
   - Oder verwende die Schnellverbindung

3. **Verbindungsdaten eingeben:**
   ```
   Dateiprotokoll: SFTP
   Host-Name: 46.62.173.242
   Port: 22
   Benutzername: root
   Passwort: Fcb@fcb@9959
   ```
   - Klicke auf "Anmelden" (Login)

4. **Bei der ersten Verbindung:**
   - Es erscheint eine Warnung über den Server-Fingerprint
   - Klicke auf "Ja" oder "Hinzufügen" um den Fingerprint zu speichern

---

## Schritt 2: Navigation zu den Zielverzeichnissen

Nach erfolgreicher Verbindung siehst du zwei Bereiche:

**Links (Lokal):** Dein Windows-Computer
- Navigiere zu: `C:\Cursor\ibu_sw\frontend\src\pages\`
- Du solltest die Dateien sehen:
  - `CreateTournament.tsx`
  - `EditTournament.tsx`
  - `TournamentGroups.tsx`
  - `TournamentMatches.tsx`

**Rechts (Server):** Der Linux-Server
- Navigiere zu: `/root/ibu_sw/frontend/src/pages/`
- Tipp: Du kannst den Pfad direkt in die Adressleiste eingeben
- Oder navigiere manuell:
  - Doppelklick auf `/root`
  - Doppelklick auf `ibu_sw`
  - Doppelklick auf `frontend`
  - Doppelklick auf `src`
  - Doppelklick auf `pages`

---

## Schritt 3: Dateien hochladen - Pages Verzeichnis

### 3.1 CreateTournament.tsx hochladen

1. **Im linken Bereich (lokal):**
   - Stelle sicher, dass du in `C:\Cursor\ibu_sw\frontend\src\pages\` bist
   - Finde die Datei `CreateTournament.tsx`

2. **Im rechten Bereich (Server):**
   - Stelle sicher, dass du in `/root/ibu_sw/frontend/src/pages/` bist

3. **Datei hochladen:**
   - **Methode 1 (Drag & Drop):**
     - Klicke auf `CreateTournament.tsx` im linken Bereich
     - Halte die Maustaste gedrückt
     - Ziehe die Datei in den rechten Bereich
     - Lasse die Maustaste los
   
   - **Methode 2 (Rechtsklick):**
     - Rechtsklick auf `CreateTournament.tsx` im linken Bereich
     - Wähle "Hochladen" (Upload)
   
   - **Methode 3 (Kopieren/Einfügen):**
     - Markiere `CreateTournament.tsx` im linken Bereich (Strg+C oder Rechtsklick → Kopieren)
     - Rechtsklick im rechten Bereich
     - Wähle "Einfügen" (Paste)

4. **Überschreiben bestätigen:**
   - Ein Dialog erscheint: "Datei existiert bereits. Überschreiben?"
   - Klicke auf "Ja" oder "Überschreiben" (Overwrite)

### 3.2 EditTournament.tsx hochladen

- Wiederhole Schritt 3.1 für `EditTournament.tsx`

### 3.3 TournamentGroups.tsx hochladen

- Wiederhole Schritt 3.1 für `TournamentGroups.tsx`

### 3.4 TournamentMatches.tsx hochladen

- Wiederhole Schritt 3.1 für `TournamentMatches.tsx`

---

## Schritt 4: Components Verzeichnis

### 4.1 Zu Components navigieren

**Lokal (links):**
- Navigiere zu: `C:\Cursor\ibu_sw\frontend\src\components\tournament\`
- Gehe zurück: Klicke auf `←` oder navigiere manuell:
  - Klicke auf `pages` → Gehe zurück
  - Klicke auf `src`
  - Klicke auf `components`
  - Klicke auf `tournament`

**Server (rechts):**
- Navigiere zu: `/root/ibu_sw/frontend/src/components/tournament/`
- Doppelklick auf `components`
- Doppelklick auf `tournament`

### 4.2 TournamentGroupsContent.tsx hochladen

1. Finde `TournamentGroupsContent.tsx` im linken Bereich
2. Ziehe die Datei in den rechten Bereich (oder verwende Rechtsklick → Upload)
3. Bestätige Überschreiben mit "Ja"

### 4.3 TournamentMatchesContent.tsx hochladen

1. Finde `TournamentMatchesContent.tsx` im linken Bereich
2. Ziehe die Datei in den rechten Bereich (oder verwende Rechtsklick → Upload)
3. Bestätige Überschreiben mit "Ja"

---

## Schritt 5: Überprüfung

### 5.1 Dateien auf dem Server prüfen

1. **Im rechten Bereich (Server):**
   - Navigiere zu `/root/ibu_sw/frontend/src/pages/`
   - Prüfe, ob die Dateien vorhanden sind:
     - ✓ `CreateTournament.tsx`
     - ✓ `EditTournament.tsx`
     - ✓ `TournamentGroups.tsx`
     - ✓ `TournamentMatches.tsx`

2. **Navigiere zu `/root/ibu_sw/frontend/src/components/tournament/`:**
   - Prüfe, ob die Dateien vorhanden sind:
     - ✓ `TournamentGroupsContent.tsx`
     - ✓ `TournamentMatchesContent.tsx`

### 5.2 Dateigrößen vergleichen (optional)

- Die aktualisierten Dateien sollten ähnliche Größen haben wie lokal
- Rechtsklick auf eine Datei → "Eigenschaften" zeigt die Dateigröße

---

## Schritt 6: WinSCP schließen

- Du kannst WinSCP jetzt schließen
- Oder die Verbindung offen lassen für weitere Dateien

---

## Checkliste - Übersicht der hochzuladenden Dateien

### Pages Verzeichnis (`/root/ibu_sw/frontend/src/pages/`)

- [ ] `CreateTournament.tsx`
  - Lokaler Pfad: `C:\Cursor\ibu_sw\frontend\src\pages\CreateTournament.tsx`
  - Server-Pfad: `/root/ibu_sw/frontend/src/pages/CreateTournament.tsx`

- [ ] `EditTournament.tsx`
  - Lokaler Pfad: `C:\Cursor\ibu_sw\frontend\src\pages\EditTournament.tsx`
  - Server-Pfad: `/root/ibu_sw/frontend/src/pages/EditTournament.tsx`

- [ ] `TournamentGroups.tsx`
  - Lokaler Pfad: `C:\Cursor\ibu_sw\frontend\src\pages\TournamentGroups.tsx`
  - Server-Pfad: `/root/ibu_sw/frontend/src/pages/TournamentGroups.tsx`

- [ ] `TournamentMatches.tsx`
  - Lokaler Pfad: `C:\Cursor\ibu_sw\frontend\src\pages\TournamentMatches.tsx`
  - Server-Pfad: `/root/ibu_sw/frontend/src/pages/TournamentMatches.tsx`

### Components Verzeichnis (`/root/ibu_sw/frontend/src/components/tournament/`)

- [ ] `TournamentGroupsContent.tsx`
  - Lokaler Pfad: `C:\Cursor\ibu_sw\frontend\src\components\tournament\TournamentGroupsContent.tsx`
  - Server-Pfad: `/root/ibu_sw/frontend/src/components/tournament/TournamentGroupsContent.tsx`

- [ ] `TournamentMatchesContent.tsx`
  - Lokaler Pfad: `C:\Cursor\ibu_sw\frontend\src\components\tournament\TournamentMatchesContent.tsx`
  - Server-Pfad: `/root/ibu_sw/frontend/src/components/tournament/TournamentMatchesContent.tsx`

---

## Tipps und Tricks

### Schnellere Navigation
- **Adressleiste nutzen:**
  - Du kannst den Pfad direkt in die Adressleiste eingeben
  - Drücke `Ctrl+L` um die Adressleiste zu fokussieren
  - Tippe den Pfad ein und drücke Enter

### Mehrere Dateien auf einmal
- **Mehrfachauswahl:**
  - Halte `Ctrl` gedrückt und klicke auf mehrere Dateien
  - Ziehe alle markierten Dateien auf einmal in den rechten Bereich

### Drag & Drop Tipp
- Du kannst Dateien auch vom Windows Explorer direkt in WinSCP ziehen
- Öffne den Windows Explorer parallel zu WinSCP
- Ziehe die Dateien direkt vom Explorer in den rechten WinSCP-Bereich

---

## Nach dem Upload

Sobald alle Dateien hochgeladen sind, sag einfach "Dateien sind hochgeladen" oder "fertig", dann führe ich automatisch den nächsten Schritt aus:

1. ✅ Frontend neu bauen
2. ✅ Container starten
3. ✅ Prüfen ob alles funktioniert

---

## Hilfe bei Problemen

### Problem: "Zugriff verweigert" oder "Permission denied"
- **Lösung:** Stelle sicher, dass du als `root` verbunden bist
- Prüfe die Benutzerrechte im rechten Bereich (sollte "root" sein)

### Problem: "Datei kann nicht überschrieben werden"
- **Lösung:** Prüfe ob die Datei auf dem Server schreibgeschützt ist
- Rechtsklick auf Datei → "Eigenschaften" → Prüfe Berechtigungen
- Falls nötig: Über Terminal die Berechtigungen ändern (ich kann helfen)

### Problem: Datei wird nicht gefunden
- **Lösung:** Prüfe ob du im richtigen Verzeichnis bist
- Links und rechts sollten die richtigen Pfade zeigen
- Verwende die Adressleiste um direkt zum Pfad zu navigieren

### Problem: WinSCP zeigt keine Dateien
- **Lösung:** Aktualisiere die Ansicht mit `F5` (Aktualisieren)
- Oder navigiere nochmal in das Verzeichnis

---

## Zusammenfassung - Kurzanleitung

1. WinSCP öffnen → Verbinden mit `root@46.62.173.242`
2. Links: Navigiere zu `C:\Cursor\ibu_sw\frontend\src\pages\`
3. Rechts: Navigiere zu `/root/ibu_sw/frontend/src/pages/`
4. Dateien hochladen (Drag & Drop):
   - `CreateTournament.tsx`
   - `EditTournament.tsx`
   - `TournamentGroups.tsx`
   - `TournamentMatches.tsx`
5. Rechts: Navigiere zu `/root/ibu_sw/frontend/src/components/tournament/`
6. Links: Navigiere zu `C:\Cursor\ibu_sw\frontend\src\components\tournament\`
7. Dateien hochladen:
   - `TournamentGroupsContent.tsx`
   - `TournamentMatchesContent.tsx`
8. Fertig! Sag mir Bescheid wenn alle Dateien hochgeladen sind.


