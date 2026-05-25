# IBU Turniere (ibu_sw)

PyQt6 Desktop-App zur Verwaltung von **Dartturnieren** mit Gruppenphase, KO-Phase und Meisterschaften.  
Speichert lokal in **SQLite** (`./data/ibu.sqlite`) und läuft unter **Windows 10/11**. Ziel: **schnelles, stabiles Turnier-Handling** inkl. Exporten (CSV/PDF) und Meisterschafts-Rangliste.

---

## Inhalt
- [Überblick](#überblick)
- [Highlights in dieser Version](#highlights-in-dieser-version)
- [Features](#features)
- [Systemvoraussetzungen](#systemvoraussetzungen)
- [Quickstart (Entwicklung)](#quickstart-entwicklung)
- [Build & Release (Windows)](#build--release-windows)
- [Ordnerstruktur](#ordnerstruktur)
- [Datenbank, Backup & Restore](#datenbank-backup--restore)
- [Bedienung (Tabs)](#bedienung-tabs)
- [KO-Setzlogik (Cross & Auslosung)](#ko-setzlogik-cross--auslosung)
- [Changelog](#changelog)
- [Git-Flow & Release auf GitHub](#git-flow--release-auf-github)
- [Fehler melden / Support](#fehler-melden--support)

---

## Überblick

**IBU Turniere** ist ein leichtgewichtiges Turnier-Tool für Dart-Vereine und -Events.  
Die App verwaltet **Spieler**, **Turniere** (Gruppenphase + KO), **Punkteschemata** für Meisterschaften und erstellt **Exporte**.

**Technik**
- **Python 3.10+**, **PyQt6**, **SQLite** (Datei: `./data/ibu.sqlite`)
- Portable EXE via **PyInstaller**, Windows-Installer via **Inno Setup**

---

## Highlights in dieser Version

### v1.1.0 - Stabilität & Sicherheit
- **🔒 Robuste Fehlerbehandlung**: Spezifische Exceptions für alle Fehlerszenarien
- **📊 Strukturiertes Logging**: Detaillierte Logs für besseres Debugging
- **🔗 Datenintegrität**: Foreign Key Constraints verhindern Waisen-Datensätze
- **✅ Input Validation**: Alle Eingaben werden validiert und bereinigt
- **🧠 Memory Management**: Automatische Ressourcenbereinigung, keine Memory Leaks
- **🔄 Automatische Migration**: Nahtlose Aktualisierung von v1.0.0 Datenbanken

### v1.0.0 - Turnier-Features
- **KO-Phase – neue Cross-Setzlogik** gemäss Schema:
  - **2 Gruppen**
    - *Top 4*: `A1–B2`, `B1–A2`
    - *Top 8*: `A1–B4`, `A2–B3`, `A3–B2`, `A4–B1`
  - **4 Gruppen** (Paarung **A↔D**, **B↔C**)
    - *Top 4*: `A1–D1`, `B1–C1`
    - *Top 8*: `A1–D2`, `B1–C2`, `C1–B2`, `D1–A2`
    - *Top 16*: `A1–D4`, `B1–C4`, `A2–D3`, `B2–C3`, `A3–D2`, `B3–C2`, `A4–D1`, `B4–C1`
  - **8 Gruppen**
    - *Top 8*: Paarungen `A–H`, `B–G`, `C–F`, `D–E` – jeweils **1. vs 1.**
    - *Top 16*: je Paar **1. vs 2.** (gespiegelt)
- **Rangliste**: ausschliesslich nach **Differenz**; Tie-Breaker: Direktduell (2 Spieler) bzw. Mini-Tabelle (≥3 Spieler).
- **Gruppenphase**: Alle Gruppen **gleichzeitig** sichtbar (Tabelle links, Spielplan rechts je Gruppe).
- **Eingaben bleiben sichtbar**; **automatisches Speichern beim Registerwechsel** (kein extra Popup).

---

## Features

- **Turniere**
  - Turnier anlegen, Teilnehmer zuweisen
  - **Gruppenphase**: Round-Robin-Spielplan erzeugen, Ergebnisse erfassen, Rangliste (Diff-basiert)
  - **KO-Phase**: Baum aus Gruppenplatzierungen, Bronze-Spiel (Runde `99`), Final-Logik, automatische Sieger-Propagation
- **Meisterschaften**
  - Meisterschaften verwalten
  - Turniere zuweisen, **Punkteschema** pflegen
  - Aggregierte **Rangliste** der gewerteten Turniere
- **Teilnehmer**
  - Verwaltung inkl. optionaler IDs (z. B. Scolia)
- **Exporte**
  - CSV/PDF je nach Ansicht
- **Qualität**
  - Ergebnisfelder editierbar, Metadaten read-only
  - Robuste DB-Initialisierung & Migration (kompatibel zu älteren Datenbanken)

---

## Systemvoraussetzungen

- Windows 10/11
- Python **3.10+** (nur für Entwicklung)
- Abhängigkeiten: `requirements.txt`

---

## Quickstart (Entwicklung)

```bat
:: 1) Repository klonen
git clone https://github.com/goksche/ibu_sw.git
cd ibu_sw

:: 2) Virtuelle Umgebung & Dependencies
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

:: 3) App starten
python .\main.py
```

---

## Build & Release (Windows)

### Portable EXE (PyInstaller)

```bat
builduild_exe.bat
```

Erzeugt eine **Onefile-EXE** in `dist\`.  
Die App setzt automatisch ihr Arbeitsverzeichnis (`./data`, `./exports`, `./backups`) relativ zur EXE.

### Installer (Inno Setup)

1. `build\installer.iss` öffnen und **Version/Dateinamen** anpassen (`AppVersion`, `OutputBaseFilename`).  
2. Im **Inno Setup Compiler** auf **Compile**.  
3. Ergebnis: `build\output\IBU_Turniere_vX.Y.Z_setup.exe`

**Tipp:** Installer mit **Admin-Rechten** ausführen, damit Desktop-Links etc. sicher gespeichert werden.

---

## Ordnerstruktur

```
ibu_sw/
├─ build/                 # Build-Skripte (PyInstaller, Inno Setup)
├─ data/                  # SQLite-DB (wird bei Start automatisch erzeugt)
│  └─ ibu.sqlite
├─ database/
│  └─ models.py           # DB- und Regel-Logik (Gruppen/KO/Meisterschaft)
├─ views/                 # PyQt6-Views (Tabs)
│  ├─ main_window.py
│  ├─ gruppenphase_view.py
│  ├─ ko_phase_view.py
│  └─ ...
├─ exports/               # Exporte (CSV/PDF)
├─ backups/               # Backups der DB
├─ main.py                # App-Start, Pfad-Bootstrap
├─ requirements.txt
└─ README.md
```

---

## Datenbank, Backup & Restore

- **Pfad:** `./data/ibu.sqlite` (wird automatisch erstellt/migriert)
- **Backup:** Tab **Einstellungen** → *Backup erstellen*
- **Restore:** Tab **Einstellungen** → *Backup einspielen*
- Vor manuellem Kopieren die App immer **beenden**.

---

## Bedienung (Tabs)

### Teilnehmer
- Anlegen, Bearbeiten, Löschen

### Turniere → *Turnier starten*
- Turnier wählen, Teilnehmer zuweisen
- Gruppen automatisch verteilen und **Gruppierung speichern**

### Gruppenphase
- Round-Robin-Spielplan erzeugen/löschen
- Ergebnisse (S1/S2) eintragen, Tabelle aktualisiert sich sofort

### KO-Phase
- **Erzeugen** per Cross-Logik oder **Auslosung** (Top 4/8/16)
- Eingaben propagieren automatisch in die nächste Runde
- **Bronze-Spiel** (Runde `99`) aus den Halbfinal-Verlierern

### Exporte / Einstellungen
- CSV/PDF-Exporte, Backup/Restore, Export-Ordner festlegen

---

## KO-Setzlogik (Cross & Auslosung)

**Cross** (stark gegen schwach, gemäss Schema):  
- **2 Gruppen**
  - *Top 4*: `A1–B2`, `B1–A2`
  - *Top 8*: `A1–B4`, `A2–B3`, `A3–B2`, `A4–B1`
- **4 Gruppen** (A↔D, B↔C)
  - *Top 4*: `A1–D1`, `B1–C1`
  - *Top 8*: `A1–D2`, `B1–C2`, `C1–B2`, `D1–A2`
  - *Top 16*: `A1–D4`, `B1–C4`, `A2–D3`, `B2–C3`, `A3–D2`, `B3–C2`, `A4–D1`, `B4–C1`
- **8 Gruppen**
  - *Top 8*: `A–H`, `B–G`, `C–F`, `D–E` (jeweils **1. vs 1.**)
  - *Top 16*: je Paar **1. vs 2.** (gespiegelt)

**Auslosung**: zufälliger Spielplan (optional Seed).  
**Rematch-Sperre** für erste KO-Runde kann projektweit ergänzt werden.

---

## Changelog

### v1.0.0
- Neue **Cross-Setzlogik** (2/4/8 Gruppen; Top 4/8/16) gemäss Schema
- Rangliste nur nach **Differenz**; Tie-Breaker: Direktduell / Mini-Tabelle
- Gruppenphase: **alle Gruppen sichtbar**, Tabellen/Spalten fester Breiten
- Speichern beim **Registerwechsel**, Änderungen bleiben bis zum Speichern sichtbar
- Diverse UI-/Stabilitätsverbesserungen

*Ältere Einträge siehe Git-Historie/Tags.*

---

## Git-Flow & Release auf GitHub

```bat
:: 1) Änderungen committen
git add -A
git commit -m "v1.0.0: Cross-Setzlogik (2/4/8 Gruppen), Diff-Rangliste, UI-Verbesserungen"

:: 2) Rebase auf origin/main (saubere Historie)
git fetch origin
git rebase origin/main

:: 3) Push
git push origin main

:: 4) Tag für Release setzen
git tag -a v1.0.0 -m "IBU Turniere v1.0.0"
git push origin v1.0.0
```

**Release anlegen (GitHub UI):**
1. Auf der Projektseite `Releases` → **Draft a new release**.  
2. Tag `v1.0.0` auswählen, Titel/Notes aus Changelog übernehmen.  
3. Optional: Installer (`build\output\...setup.exe`) hochladen.

---

## Fehler melden / Support

- Repro-Schritte, Screenshots/Logs helfen bei der Analyse
- Bei DB-Problemen ggf. eine **Kopie von `data/ibu.sqlite`** (ohne sensible Daten) bereitstellen

---

**Hinweis:** Aktionen wie Überschreiben/Löschen sind bewusst eingeschränkt. Nur autorisierten Personen Zugriff geben.
