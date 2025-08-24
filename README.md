# IBU Turniere – Dart Turnier Verwaltungs Tool (v0.9.6)

Windows‑Desktop‑App zur Verwaltung von Dartturnieren inkl. Gruppen‑ und KO‑Phase, **Bronze‑Spiel**, **Meisterschaften** und **Ranglisten**. GUI mit **PyQt6**, lokale Datenhaltung in **SQLite** (`./data/ibu.sqlite`).

> **Sicherheit:** Alle **Löschaktionen** (Turniere, Teilnehmer, Meisterschaften, Pläne, Dartscheiben) sind mit dem Passwort **6460** geschützt. In Spielplänen sind **nur Ergebnisse (S1/S2)** editierbar – Spielerfelder sind gesperrt.

---

## Inhalt

* [Highlights v0.9.6](#highlights-v096)
* [Projektstruktur](#projektstruktur)
* [Systemvoraussetzungen](#systemvoraussetzungen)
* [Installation](#installation)
* [Start](#start)
* [Bedienung (Tabs)](#bedienung-tabs)
* [Datenbank](#datenbank)
* [Workflow – Kurz & knackig](#workflow--kurz--knackig)
* [Build – EXE & Installer](#build--exe--installer)
* [Release / Git‑Cheatsheet](#release--git-cheatsheet)
* [Known Issues & Hinweise](#known-issues--hinweise)
* [Lizenz & Support](#lizenz--support)

## Highlights v0.9.6

**Teilnehmer – Scolia‑ID**

* **Neues Feld „Scolia‑ID“** in der Teilnehmer‑Erfassung und ‑Bearbeitung.
* Anzeige der Scolia‑ID in der Teilnehmer‑Tabelle.
* **DB‑Erweiterung automatisch** beim Öffnen der Teilnehmer‑Ansicht (Spalte `scolia_id` wird angelegt, falls nicht vorhanden).

**Gruppen & KO – Nur Resultat‑Felder editierbar (aus v0.9.5)**

* In **Gruppenphase** und **KO‑Phase** sind **ausschließlich** die Felder **S1/S2** editierbar.
* **Spieler**, **Runde** und **Dartscheibe** sind **read‑only**.
* **Validierung:** Unentschieden sind nicht erlaubt (Speichern wird verhindert).

> Vorversionen: v0.9.5 (Nur Resultat‑Felder), v0.9.4 (Ranglisten‑Modi, Dartscheiben‑Verwaltung & faire Zuweisung, KO‑Fixes inkl. Halbfinale bei 4 Qualifikanten), v0.9.3 (Bugfixes Turnier/KO‑Register & Initial‑Ladeverhalten), v0.9.2 (Backups & Einstellungen), v0.9.1 (PDF‑Fix), v0.9.0 (Exporte), v0.8 (Meisterschafts‑Rangliste & Bronze‑Spiel).

---

## Projektstruktur

```
ibu_sw/
├─ data/                 # SQLite‑DB (ibu.sqlite) – wird automatisch angelegt
├─ backups/              # Backups
├─ exports/              # Exportziel (anpassbar in Einstellungen)
├─ build/
│  ├─ build_exe.bat      # PyInstaller Build‑Skript (OneFile EXE)
│  └─ installer.iss      # Inno Setup Script (Installer)
├─ database/
│  ├─ models.py          # gesamte Datenlogik/SQL
│  └─ scolia_support.py  # NEU (v0.9.6): Scolia‑ID Schema & Helper
├─ utils/
│  ├─ exporter.py        # CSV/PDF Exporte (ohne externe Libs)
│  ├─ backup.py          # Backup/Restore
│  ├─ settings.py        # App‑Settings (Export‑Ordner)
│  └─ ui.py              # MessageBox‑Helfer
├─ views/
│  ├─ main_window.py
│  ├─ teilnehmer_view.py # v0.9.6: mit Feld „Scolia‑ID“
│  ├─ turnier_view.py
│  ├─ turnier_start_view.py
│  ├─ gruppenphase_view.py
│  ├─ ko_phase_view.py
│  ├─ export_view.py
│  ├─ settings_view.py
│  └─ settings_boards.py # Dartscheiben‑Verwaltung (Einstellungen)
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

* `build/output/IBU_Turniere_v0.9.6_setup.exe` ausführen.
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

* **CRUD** + **Zuweisung** zu einem Turnier (ersetzt bestehende Liste).
* **Scolia‑ID**: optionales Feld in Erfassung/Änderung; Anzeige in der Tabelle.
* Löschen mit PW **6460**.

### 3) Turnier starten

* Spieler einem Turnier zuweisen, Gruppen (A, B, …) anlegen/füllen, speichern.

### 4) Gruppenphase

* **Round‑Robin** generieren, Ergebnisse eintragen (**nur S1/S2 editierbar**).
* **Ranglisten‑Modus**: Punkte / Differenz / Siege wählbar.
* **Tie‑Breaks** je Modus (inkl. **3er‑Tabelle**), **Fallback Stichmatch**. Hinweis **erst nach Speichern**.
* **Scheiben neu verteilen**: faire, turnierweite Board‑Verteilung.
* **Plan löschen/überschreiben** nur ohne Ergebnisse; **Löschen mit PW 6460**.

### 5) KO‑Phase

* Start abhängig von Qualifikanten: 4 ⇒ **Halbfinale**, 8 ⇒ **Viertelfinale**, … (Anzeige **dynamisch**).
* **6 Teilnehmer**: 8er‑Baum + **2 BYEs** (zufällig) im Viertelfinale.
* Ergebnisse speichern → **Sieger werden automatisch weitergetragen**.
* **Bronze‑Spiel** erscheint automatisch (Runde *„Bronze“* / `99`).
* Button **„KO‑Plan löschen“** (PW 6460).
* **Champion** wird **nur** aus dem **Finale** ermittelt.
* **Scheiben zuweisen**: faire Zuweisung pro Runde.

### 6) Meisterschaften

* **CRUD** (Löschen mit PW **6460**), Turniere per Checkbox zuweisen.
* Punkteschema bearbeiten oder **„Standard‑Schema“** anwenden (1=30, 2=24, 3=18, 4=15, **ab 5=5**).
* **Rangliste**: *alle* Spieler aus allen zugewiesenen Turnieren, inkl. Spieler außerhalb Top‑4 (je 5 Punkte).
* **Neu berechnen**: per Button oder automatisch nach Final‑Speicherung / Schema‑ bzw. Zuweisungsänderungen.

### 7) Exporte

* Meisterschafts‑Rangliste (CSV/PDF), Gruppen‑Spielplan & ‑Tabellen (CSV/PDF), KO‑Übersicht (CSV/PDF), Gesamt‑Übersicht & Teilnehmerliste (CSV/PDF).
* **Dartscheiben** sind in den Spielplan‑Exporten enthalten.
* Zielordner in **Einstellungen → Export‑Ordner**.

### 8) Einstellungen

* **Dartscheiben verwalten**: Nummer, Name, Aktiv (Löschen mit PW **6460**).
* **Backup erstellen / wiederherstellen** (`./backups/`).
* **Export‑Ordner** ändern/zurücksetzen.

---

## Datenbank

* Datei: `./data/ibu.sqlite` (automatisch angelegt).
* **Neue/erweiterte Felder (v0.9.6)**:

  * Tabelle `teilnehmer`: **Spalte `scolia_id` (TEXT)**.
* **Bestehende Felder (seit v0.9.4)**:

  * Tabelle `dartscheiben` (id, nummer, name, aktiv).
  * Spalte `board_id` in `spiele` **und** `ko_spiele`.
  * Spalte `group_rank_mode` in `turniere` (`punkte` | `differenz` | `siege`).
* **Abwärtskompatibel**:

  * Alte DBs mit `spiele.runde` statt `spieltag` funktionieren ohne Migration.
  * Ergebnisse sowohl über `sets1/sets2` als auch `s1/s2` werden unterstützt.
  * Meisterschafts‑Flag akzeptiert `Ja/Nein` (intern robust als `0/1`).

> **Backup‑Tipp:** Für manuelle Backups genügt das Kopieren von `data/ibu.sqlite`. Komfortabel über **Einstellungen → Backup**.

---

## Workflow – Kurz & knackig

1. **Einstellungen → Dartscheiben**: Boards anlegen/aktivieren.
2. **Teilnehmer** anlegen (optional **Scolia‑ID** mitgeben).
3. **Turnier** erstellen (Modus z. B. *Gruppen und KO*).
4. In **Turnier starten**: Spieler zuweisen, Gruppen anlegen, speichern.
5. **Gruppenphase**: Plan generieren, **Scheiben neu verteilen**, Ergebnisse eintragen.
6. **KO‑Phase**: Qualifikanten wählen, Plan erzeugen (4 ⇒ Halbfinale; 6 ⇒ BYEs), **Runde mit Scheiben** belegen, Ergebnisse eintragen.
7. (Optional) **Meisterschaft**: Turniere zuweisen, Schema prüfen, Rangliste ansehen/neu berechnen.
8. **Exporte** oder **Backup** nutzen.

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
3. Ergebnis: `build/output/IBU_Turniere_v0.9.6_setup.exe`.

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
  # (Konflikte -> git add <Dateien> ; git rebase --continue)

  # Push
  git push origin main

  # Tag setzen (annotiert) & pushen
  git tag -a v0.9.6 -m "Release v0.9.6 – Teilnehmer mit Scolia-ID"
  git push origin v0.9.6
```

Weitere nützliche Befehle:

```bash
  git push --tags           # alle Tags pushen
  git tag -d vX.Y.Z         # lokalen Tag löschen
  git push origin :refs/tags/vX.Y.Z   # Remote-Tag löschen
```

---

## Known Issues & Hinweise

* **Stichmatch-Hinweis** erscheint nur nach **Ergebnisse speichern**; beim Start bleibt der Tab still.
* **Bronze/Finale**: Siegeranzeige bezieht sich ausschließlich auf das **Finale** – Bronze wird korrekt ignoriert.
* **PDF‑Export**: Stabil; bei Layoutproblemen sicherstellen, dass `utils/exporter.py` aktuell ist.
* **Löschen**: Irreversibel (PW **6460** erforderlich).

---

## Lizenz & Support

Interne Anwendung – keine öffentliche Lizenz.
Issues bitte mit **Fehlermeldung + Screenshot** und kurzer Repro‑Beschreibung anlegen.
