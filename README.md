# IBU Turniere (ibu\_sw)

PyQt6 Desktop-App zur Verwaltung von Dartturnieren mit Gruppenphase, KO-Phase und Meisterschaften.
Speichert lokal in **SQLite** (`./data/ibu.sqlite`), läuft unter Windows (10/11).
Ziel: schnelles, stabiles Turnier-Handling inkl. Exporten (CSV/PDF) und Meisterschafts-Rangliste.

---

## Inhalt

* [Überblick](#überblick)
* [Features](#features)
* [Systemvoraussetzungen](#systemvoraussetzungen)
* [Quickstart (Entwicklung)](#quickstart-entwicklung)
* [Build & Release (Windows)](#build--release-windows)
* [Ordnerstruktur](#ordnerstruktur)
* [Datenbank, Backup & Restore](#datenbank-backup--restore)
* [Bedienung (Tabs)](#bedienung-tabs)
* [Exporte](#exporte)
* [Changelog](#changelog)
* [Git-Flow (Rebase & Tagging)](#git-flow-rebase--tagging)
* [Fehler melden / Support](#fehler-melden--support)

---

## Überblick

**IBU Turniere** ist ein leichtgewichtiges Turnier-Tool für Dart-Vereine und -Events.
Die App verwaltet Spieler, Turniere (Gruppenphase + KO), Punkteschemata für Meisterschaften und erstellt Exporte.

**Technik**

* **Python 3.10+**, **PyQt6**, **SQLite** (Datei: `./data/ibu.sqlite`)
* Portable EXE via **PyInstaller**, Windows-Installer via **Inno Setup**

---

## Features

* **Turniere**

  * Turnier anlegen, Teilnehmer zuweisen
  * **Gruppenphase**: Round-Robin-Spielplan erzeugen, Ergebnisse erfassen, Rangliste
  * **KO-Phase**: Baum aus Gruppenplatzierungen, Bronze-Spiel (Runde `99`), Final-Logik
* **Meisterschaften**

  * **Meisterschaften-Tab** mit **Neu/Bearbeiten/Löschen**
  * Turniere zuweisen, **Punkteschema** pflegen
  * Aggregierte **Rangliste** über zugewiesene Turniere
* **Teilnehmer**

  * Erfassung inkl. optionaler **Scolia ID**
* **Exporte**

  * CSV/PDF (u. a. Teilnehmer inkl. Scolia ID)
* **Einstellungen**

  * Backup/Restore, Export-Ordner konfigurieren
* **Qualität**

  * Ergebnisfelder (S1/S2) editierbar, Metadaten read-only
  * Auto-Refresh der Turnierlisten in **Turnier starten**, **Gruppenphase** und **KO-Phase**

---

## Systemvoraussetzungen

* Windows 10/11
* Python **3.10+** (für Entwicklung)
* Abhängigkeiten: siehe `requirements.txt`

---

## Quickstart (Entwicklung)

```bash
  # 1) Repository klonen
  git clone https://github.com/goksche/ibu_sw.git
  cd ibu_sw

  # 2) Python venv & Abhängigkeiten
  python -m venv .venv
  # Windows PowerShell:
  .\.venv\Scripts\Activate.ps1
  pip install -r requirements.txt

  # 3) Start der Anwendung
  python .\main.py
```

---

## Build & Release (Windows)

### Portable EXE (PyInstaller)

```bat
build\build_exe.bat
```

* erzeugt eine **onefile**-EXE für Tests/Verteilung

### Installer (Inno Setup)

1. `build\installer.iss` öffnen und Version auf **0.9.6.1** setzen (`AppVersion`, Ausgabename).
2. Im **Inno Setup Compiler**: **Compile**.
3. Ergebnis: `build\output\IBU_Turniere_v0.9.6.1_setup.exe`

**Hinweis:** Der App-Fenstertitel lautet **IBU Turniere**.

---

## Ordnerstruktur

```
ibu_sw/
├─ build/                 # Build-Skripte (PyInstaller, Inno Setup)
├─ data/
│  └─ ibu.sqlite          # SQLite-Datenbank (wird automatisch erstellt)
├─ database/
│  └─ models.py           # DB-Logik
├─ views/
│  ├─ main_window.py      # Hauptfenster
│  ├─ turnier_start_view.py
│  ├─ gruppenphase_view.py
│  ├─ ko_phase_view.py
│  └─ meisterschaft_view.py
├─ export/                # (konfigurierbar) Zielordner für CSV/PDF
├─ README.md
└─ main.py                # App-Start
```

---

## Datenbank, Backup & Restore

* **Pfad:** `./data/ibu.sqlite`
* **Backup:** Tab **Einstellungen** → Backup erstellen
* **Restore:** Tab **Einstellungen** → Backup einspielen
* **Wichtig:** Beim manuellen Kopieren die App vorher schließen.

---

## Bedienung (Tabs)

### Teilnehmer

* Teilnehmer anlegen/bearbeiten/löschen
* Optional **Scolia ID** erfassen

### Turniere

* **Turnier starten**

  * Turnier wählen (Liste aktualisiert sich beim Öffnen und alle 5s)
  * Teilnehmer zuweisen/entfernen, Liste speichern
  * Gruppen automatisch verteilen und **Gruppierung speichern**
  * Bestehende Gruppierung kann (mit Passwort **6460**) überschrieben werden
* **Gruppenphase**

  * Spielplan (Round-Robin) erzeugen/löschen
  * S1/S2 eintragen, Rangliste wird aktualisiert
  * Faire Board-Zuordnung je Gruppe verfügbar
* **KO-Phase**

  * Aus Gruppenplatzierungen generiert
  * S1/S2 eintragen, Sieger propagiert automatisch
  * **Bronze-Spiel** (Runde **99**) aus Halbfinals erzeugen
  * **Champion** aus dem Finale

### Meisterschaften

* **Neu**, **Bearbeiten**, **Löschen**, **Neu laden**
* Turniere zuweisen (Checkbox-Liste)
* Punkteschema pflegen (Platz → Punkte)
* **Rangliste** über alle zugewiesenen Turniere neu berechnen

### Exporte

* CSV/PDF, einheitliche Spalten (inkl. Scolia ID bei Teilnehmern)

### Einstellungen

* Backup/Restore
* Export-Ordner festlegen

---

## Exporte

* **Teilnehmer**: inkl. `Scolia ID`
* **Turniere/Ergebnisse**: CSV/PDF je nach Ansicht
* Export-Ordner unter **Einstellungen** konfigurierbar
* Sonderzeichen/Leerzeichen in Pfaden werden sauber behandelt

---

## Changelog

### v0.9.6.1 – Bugfix Release

**Kurz:** Meisterschaften-CRUD ergänzt, Listen aktualisieren sich automatisch, KO-Ansicht zeigt nur aktuelle Turniere.

**Fixes & Verbesserungen**

* **Meisterschaften**

  * Tab mit **Neu/Bearbeiten/Löschen/Neu laden**
  * Turnierzuweisung und Punkteschema-Editor überarbeitet
* **Turnier starten**

  * **Auto-Refresh** (alle 5s) und **Neu laden**
  * Auswahl bleibt beim Reload erhalten
* **Gruppenphase**

  * Auto-Refresh und Reload auf Tab-Anzeige
  * S1/S2 sind editierbar, Spieler/Metadaten read-only
* **KO-Phase**

  * Nur aktuelle Turniere sichtbar (gelöschte verschwinden)
  * Auto-Refresh und Reload auf Tab-Anzeige
  * Bronze (Runde 99) aus Halbfinals erzeugbar; Champion aus dem Finale
* **Teilnehmer**

  * **Scolia ID** optional, in Listen/Exporten sichtbar
* **Exporte**

  * Einheitliche Spalten, Umlaute/Sonderzeichen robuster
* **Datenbank**

  * Schema-Sanity-Checks beim Start (abwärtskompatibel)

### v0.9.6

* UI-Verbesserungen, Bronze-Spiel (Runde 99), Exporte, Einstellungen mit Backup/Restore, Export-Ordner konfigurierbar

### v0.9.2

* Stabiler Release-Stand mit Grundfunktionen (Tabs, SQLite, Exporte)

---

## Git-Flow (Rebase & Tagging)

Empfohlener Ablauf für Releases:

```bash
  # Änderungen committen
  git add -A
  git commit -m "v0.9.6.1: Bugfixes (Meisterschaften-CRUD, Auto-Refresh, KO-Filter, Exporte, Scolia ID)"

  # Upstream holen und rebasen
  git fetch origin
  git rebase origin/main
  # ggf. Konflikte lösen:
  # git add <file>
  # git rebase --continue

  # Push
  git push origin main

  # Release-Tag setzen (annotiert) und pushen
  git tag -a v0.9.6.1 -m "Release v0.9.6.1 – Meisterschaften-CRUD, Auto-Refresh, KO-Filter, Exporte, Scolia ID"
  git push origin v0.9.6.1
```

---

## Fehler melden / Support

* Bitte **klare Repro-Schritte** angeben (was, wo, welche Daten)
* Screenshots/Logs helfen (Fehlermeldungen aus der Konsole)
* Bei DB-Themen ggf. eine **Kopie von `data/ibu.sqlite`** (ohne personenbezogene Daten) bereitstellen

---

**Hinweis zur Sicherheit:**
Aktionen wie **Löschen/Überschreiben** geschützt (z. B. Gruppierung überschreiben: Passwort **6460**). Bitte nur autorisierten Personen zugänglich machen.
