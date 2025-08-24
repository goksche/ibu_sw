# IBU Turniere – Dart Turnier Verwaltungs Tool (v0.9.2)

Windows‑Desktop‑App zur Verwaltung von Dartturnieren inkl. Gruppen‑ und KO‑Phase, **Bronze‑Spiel**, **Meisterschaften** und **Ranglisten**. GUI mit **PyQt6**, lokale Datenhaltung in **SQLite** (`./data/ibu.sqlite`).

> **Sicherheit:** Alle **Löschaktionen** (Turniere, Teilnehmer, Meisterschaften, Pläne) sind mit dem Passwort **6460** geschützt.

---

## Highlights v0.9.2

* **Windows‑Installer** (Inno Setup)

  * Offizielles Setup: `build/output/IBU_Turniere_v0.9.2_setup.exe`.
  * Installiert nach `%LOCALAPPDATA%\ibu_sw` (keine Admin‑Rechte nötig), legt `data/`, `exports/`, `backups/` an.
  * App‑Name / EXE / Fenster: **IBU Turniere**.
* **Robuste EXE (PyInstaller)**

  * Build‐Skript `build/build_exe.bat` sammelt alle PyQt6‑Ressourcen ein, öffnet nach dem Build den Explorer und markiert die EXE.
  * Pfade & Ordner werden schon **vor GUI‑Start** initialisiert, auch im „frozen“ Modus.
* **Stabile Exporte** (CSV/PDF)

  * PDF über `QTextDocument` + korrektes `QPageLayout` (A4, mm‑Ränder).
  * Export‑Ziel über **Einstellungen → Export‑Ordner** konfigurierbar.

> Vorversionen: v0.9.2 (Backups & Einstellungen), v0.9.1 (PDF‑Fix), v0.9.0 (Exporte), v0.8 (Meisterschafts‑Rangliste & Bronze‑Spiel).

---

## Projektstruktur

```
ibu_sw/
├─ data/                 # SQLite‑DB (ibu.sqlite) – wird automatisch angelegt
├─ backups/              # Backups (v0.9.2+)
├─ exports/              # Exportziel (anpassbar in Einstellungen)
├─ build/
│  ├─ build_exe.bat      # PyInstaller Build‑Skript (OneFile EXE)
│  └─ installer.iss      # Inno Setup Script (Installer)
├─ database/
│  └─ models.py          # gesamte Datenlogik/SQL
├─ utils/
│  ├─ exporter.py        # CSV/PDF Exporte (ohne externe Libs)
│  ├─ backup.py          # Backup/Restore (v0.9.2)
│  ├─ settings.py        # App‑Settings (Export‑Ordner)
│  └─ ui.py              # MessageBox‑Helfer
├─ views/
│  ├─ main_window.py
│  ├─ teilnehmer_view.py
│  ├─ turnier_view.py
│  ├─ turnier_start_view.py
│  ├─ gruppenphase_view.py
│  ├─ ko_phase_view.py
│  ├─ export_view.py
│  └─ settings_view.py
└─ main.py               # Einstiegspunkt (setzt Pfade auch im EXE‑Build)
```

---

## Systemvoraussetzungen

* Windows 10/11
* (Nur für Source‑Run/Build) Python **3.10+**
* Pip‑Pakete: **PyQt6** (alles andere nur Stdlib)

---

## Installation

### A) Mit Installer (empfohlen)

* `build/output/IBU_Turniere_v0.9.2_setup.exe` ausführen.
* Start über Startmenü/Shortcut **IBU Turniere**.

### B) Portable EXE

* `dist/IBU Turniere.exe` direkt starten (keine Installation nötig).

### C) Aus dem Quellcode (Entwicklung)

```bash
python -m venv .venv
.venv\Scripts\activate
pip install --upgrade pip
pip install PyQt6
```

---

## Start

```bash
# im aktivierten venv (Quellcode-Modus)
python main.py
```

Beim ersten Start wird `./data/ibu.sqlite` automatisch erstellt.

---

## Bedienung (Tabs)

### 1) Turniere

* **CRUD**: Turniere anlegen/ändern/löschen (Löschen mit PW **6460**).
* Felder: *Name*, *Datum*, *Modus* (Gruppen, KO, Gruppen+KO), *Meisterschaftsrelevant*.

### 2) Teilnehmer

* **Globales CRUD** + **Zuweisung** zu einem Turnier (ersetzt bestehende Liste).
* Löschen mit PW **6460**.

### 3) Turnier starten

* Spieler einem Turnier zuweisen, Gruppen (A, B, …) anlegen/füllen, speichern.

### 4) Gruppenphase

* **Round‑Robin** generieren, Ergebnisse eintragen.
* **Überschreiben/Löschen** des Plans nur, wenn **keine** Ergebnisse vorliegen.

### 5) KO‑Phase

* Qualifikanten: 2/4/8/16/…
* **Seeding**: A1–B4, A2–B3, A3–B2, A4–B1 (mehr Gruppen analog).
* Ergebnisse speichern → **Sieger werden automatisch weitergetragen**.
* **Bronze‑Spiel** erscheint automatisch, sobald **beide Halbfinals** entschieden sind (in der Runden‑Auswahl als *„Bronze“*; intern `runde=99`).
* Button **„KO‑Plan löschen“** (PW 6460).
* **Champion** wird **nur** aus dem **Finale** ermittelt.

### 6) Meisterschaften

* **CRUD** (Löschen mit PW **6460**), Turniere per Checkbox zuweisen.
* Punkteschema bearbeiten oder **„Standard‑Schema“** anwenden (1=30, 2=24, 3=18, 4=15, **ab 5=5**).
* **Rangliste**: *alle* Spieler aus allen zugewiesenen Turnieren, inkl. Spieler außerhalb Top‑4 (je 5 Punkte).
* **Neu berechnen**: per Button oder automatisch nach Final‑Speicherung / Schema‑ bzw. Zuweisungsänderungen.

### 7) Exporte

* Meisterschafts‑Rangliste (CSV/PDF), Gruppen‑Spielplan & ‑Tabellen (CSV/PDF), KO‑Übersicht (CSV/PDF), Gesamt‑Übersicht & Teilnehmerliste (CSV/PDF).
* Zielordner in **Einstellungen → Export‑Ordner**.

### 8) Einstellungen

* **Backup erstellen / wiederherstellen** (`./backups/`).
* **Export‑Ordner** ändern/zurücksetzen.

---

## Datenbank

* Datei: `./data/ibu.sqlite` (automatisch angelegt).
* **Abwärtskompatibel**:

  * Alte DBs, die in `spiele` statt `spieltag` die Spalte `runde` nutzen, funktionieren ohne Migration.
  * Meisterschafts‑Flag akzeptiert `Ja/Nein` und wird intern robust als `0/1` verarbeitet.

> **Backup‑Tipp:** Für manuelle Backups genügt das Kopieren von `data/ibu.sqlite`. Komfortabel über **Einstellungen → Backup**.

---

## Workflow – Kurz & knackig

1. **Teilnehmer** anlegen.
2. **Turnier** erstellen (Modus z. B. *Gruppen und KO*).
3. In **Turnier starten**: Spieler zuweisen, Gruppen anlegen, speichern.
4. **Gruppenphase**: Plan generieren, Ergebnisse eintragen.
5. **KO‑Phase**: Qualifikanten wählen, Plan erzeugen, Ergebnisse eintragen.

   * Nach den Halbfinals erscheint automatisch **„Bronze“**.
6. (Optional) **Meisterschaft**: Turniere zuweisen, Schema prüfen, Rangliste ansehen/neu berechnen.
7. **Exporte** oder **Backup** nutzen.

---

## Build – EXE & Installer

### Portable EXE erzeugen

```bat
build\build_exe.bat
```

* Ergebnis: `dist\IBU Turniere.exe` (Explorer öffnet automatisch und markiert die Datei).

### Installer erzeugen (Inno Setup)

1. Inno Setup installieren.
2. `build/installer.iss` in Inno Setup öffnen → **Compile**.
3. Ergebnis: `build/output/IBU_Turniere_v0.9.2_setup.exe`.

> Installer installiert nach `%LOCALAPPDATA%\ibu_sw` (kein Admin nötig).

---

## Release / Git‑Cheatsheet

```bash
# Änderungen sichern
git add -A
git commit -m "WIP"

# Upstream holen & lokalen main rebasen
git fetch origin
git rebase origin/main
# (Konflikte -> git add <files> ; git rebase --continue)

# Push
git push origin main

# Tag setzen (annotiert) & pushen
git tag -a v0.9.2 -m "Release v0.9.2 – Windows-Installer (IBU Turniere)"
git push origin v0.9.2
```

Weitere nützliche Befehle:

```bash
git push --tags           # alle Tags pushen
git tag -d vX.Y.Z         # lokalen Tag löschen
git push origin :refs/tags/vX.Y.Z   # Remote-Tag löschen
```

---

## Known Issues & Hinweise

* **Bronze/Finale**: Siegeranzeige bezieht sich ausschließlich auf das **Finale** – Bronze wird korrekt ignoriert.
* **EXE startet nicht / Qt‑Plugin fehlt**: Immer `dist/IBU Turniere.exe` verwenden (PyInstaller sammelt PyQt6‑Ressourcen ein).
* **PDF‑Export**: Ab v0.9.1 stabil. Bei Problemen sicherstellen, dass `utils/exporter.py` aktuell ist.
* **Löschen**: Irreversibel (PW **6460** erforderlich).

---

## Lizenz & Support

Interne Anwendung – keine öffentliche Lizenz.
Issues bitte mit **Fehlermeldung + Screenshot** und kurzer Repro‑Beschreibung anlegen.
