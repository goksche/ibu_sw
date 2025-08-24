# IBU Turniere – Dart Turnier Verwaltungs Tool (v0.9.3)

Windows-Desktop-App zur Verwaltung von Dartturnieren inkl. Gruppen- und KO-Phase, **Bronze-Spiel**, **Meisterschaften** und **Ranglisten**. GUI mit **PyQt6**, lokale Datenhaltung in **SQLite** (`./data/ibu.sqlite`).

> **Sicherheit:** Alle **Loeschaktionen** (Turniere, Teilnehmer, Meisterschaften, Plaene) sind mit dem Passwort **6460** geschuetzt.

---

## Inhalt

* [Highlights v0.9.3](#highlights-v093)
* [Projektstruktur](#projektstruktur)
* [Systemvoraussetzungen](#systemvoraussetzungen)
* [Installation](#installation)
* [Start](#start)
* [Bedienung (Tabs)](#bedienung-tabs)
* [Datenbank](#datenbank)
* [Workflow – Kurz & knackig](#workflow--kurz--knackig)
* [Build – EXE & Installer](#build--exe--installer)
* [Release / Git-Cheatsheet](#release--git-cheatsheet)
* [Known Issues & Hinweise](#known-issues--hinweise)
* [Lizenz & Support](#lizenz--support)

## Highlights v0.9.3

* **Auto-Reload der Turnierlisten**

  * Tabs **Turnier starten**, **Gruppenphase** und **KO-Phase** laden Turniere **automatisch** neu, sobald der Tab angezeigt wird.
  * **Neu erstellte** oder geaenderte Turniere sind **sofort** sichtbar – kein manuelles „Neu laden“ mehr noetig.
* **Refresh behaelt Auswahl**

  * „Neu laden“ in den genannten Tabs behaelt die aktuelle Turnier-/Runden-Auswahl, kein Zurueckspringen.
* **KO-Phase Robustheit**

  * Bronze-Spiel (intern `runde=99`) bleibt automatisch, Siegeranzeige stabil aus dem **Finale**.

> Vorversionen: v0.9.2 (Backups & Einstellungen), v0.9.1 (PDF-Fix), v0.9.0 (Exporte), v0.8 (Meisterschafts-Rangliste & Bronze-Spiel).

---

## Projektstruktur

```
ibu_sw/
├─ data/                 # SQLite-DB (ibu.sqlite) – wird automatisch angelegt
├─ backups/              # Backups (v0.9.2+)
├─ exports/              # Exportziel (anpassbar in Einstellungen)
├─ build/
│  ├─ build_exe.bat      # PyInstaller Build-Skript (OneFile EXE)
│  └─ installer.iss      # Inno Setup Script (Installer)
├─ database/
│  └─ models.py          # gesamte Datenlogik/SQL
├─ utils/
│  ├─ exporter.py        # CSV/PDF Exporte (ohne externe Libs)
│  ├─ backup.py          # Backup/Restore
│  ├─ settings.py        # App-Settings (Export-Ordner)
│  └─ ui.py              # MessageBox-Helfer
├─ views/
│  ├─ main_window.py
│  ├─ teilnehmer_view.py
│  ├─ turnier_view.py
│  ├─ turnier_start_view.py
│  ├─ gruppenphase_view.py
│  ├─ ko_phase_view.py
│  ├─ export_view.py
│  └─ settings_view.py
└─ main.py               # Einstiegspunkt (setzt Pfade auch im EXE-Build)
```

---

## Systemvoraussetzungen

* Windows 10/11
* (Nur fuer Source-Run/Build) Python **3.10+**
* Pip-Pakete: **PyQt6** (alles andere nur Stdlib)

---

## Installation

### A) Mit Installer (empfohlen)

* `build/output/IBU_Turniere_v0.9.3_setup.exe` ausfuehren.
* Start ueber Startmenue/Shortcut **IBU Turniere**.

### B) Portable EXE

* `dist/IBU Turniere.exe` direkt starten (keine Installation noetig).

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

* **CRUD**: Turniere anlegen/aendern/loeschen (Loeschen mit PW **6460**).
* Felder: *Name*, *Datum*, *Modus* (Gruppen, KO, Gruppen+KO), *Meisterschaftsrelevant*.

### 2) Teilnehmer

* **Globales CRUD** + **Zuweisung** zu einem Turnier (ersetzt bestehende Liste).
* Loeschen mit PW **6460**.

### 3) Turnier starten

* Spieler einem Turnier zuweisen, Gruppen (A, B, …) anlegen/fuellen, speichern.
* **Neu**: Turnierliste aktualisiert sich **automatisch** beim Oeffnen des Tabs; „Neu laden“ behaelt die Auswahl.

### 4) Gruppenphase

* **Round-Robin** generieren, Ergebnisse eintragen.
* **Ueberschreiben/Loeschen** des Plans nur, wenn **keine** Ergebnisse vorliegen.
* **Neu**: Turnierliste aktualisiert sich **automatisch** beim Oeffnen des Tabs; „Neu laden“ behaelt die Auswahl.

### 5) KO-Phase

* Qualifikanten: 2/4/8/16/…
* **Seeding**: A1–B4, A2–B3, A3–B2, A4–B1 (mehr Gruppen analog).
* Ergebnisse speichern → **Sieger werden automatisch weitergetragen**.
* **Bronze-Spiel** erscheint automatisch, sobald **beide Halbfinals** entschieden sind (in der Runden-Auswahl als *„Bronze“*; intern `runde=99`).
* Button **„KO-Plan loeschen“** (PW 6460).
* **Champion** wird **nur** aus dem **Finale** ermittelt.
* **Neu**: Turnierliste aktualisiert sich **automatisch** beim Oeffnen des Tabs; „Neu laden“ behaelt die Auswahl.

### 6) Meisterschaften

* **CRUD** (Loeschen mit PW **6460**), Turniere per Checkbox zuweisen.
* Punkteschema bearbeiten oder **„Standard-Schema“** anwenden (1=30, 2=24, 3=18, 4=15, **ab 5=5**).
* **Rangliste**: *alle* Spieler aus allen zugewiesenen Turnieren, inkl. Spieler ausserhalb Top-4 (je 5 Punkte).
* **Neu berechnen**: per Button oder automatisch nach Final-Speicherung / Schema- bzw. Zuweisungsaenderungen.

### 7) Exporte

* Meisterschafts-Rangliste (CSV/PDF), Gruppen-Spielplan & -Tabellen (CSV/PDF), KO-Uebersicht (CSV/PDF), Gesamt-Uebersicht & Teilnehmerliste (CSV/PDF).
* Zielordner in **Einstellungen → Export-Ordner**.

### 8) Einstellungen

* **Backup erstellen / wiederherstellen** (`./backups/`).
* **Export-Ordner** aendern/zuruecksetzen.

---

## Datenbank

* Datei: `./data/ibu.sqlite` (automatisch angelegt).
* **Abwaertskompatibel**:

  * Aeltere DBs mit `runde` statt `spieltag` in `spiele` funktionieren ohne Migration.
  * Meisterschafts-Flag akzeptiert `Ja/Nein` und wird intern robust als `0/1` verarbeitet.

> **Backup-Tipp:** Fuer manuelle Backups genuegt das Kopieren von `data/ibu.sqlite`. Komfortabel ueber **Einstellungen → Backup**.

---

## Workflow – Kurz & knackig

1. **Teilnehmer** anlegen.
2. **Turnier** erstellen (Modus z. B. *Gruppen und KO*).
3. In **Turnier starten**: Spieler zuweisen, Gruppen anlegen, speichern.
4. **Gruppenphase**: Plan generieren, Ergebnisse eintragen.
5. **KO-Phase**: Qualifikanten waehlen, Plan erzeugen, Ergebnisse eintragen.

   * Nach den Halbfinals erscheint automatisch **„Bronze“**.
6. (Optional) **Meisterschaft**: Turniere zuweisen, Schema pruefen, Rangliste ansehen/neu berechnen.
7. **Exporte** oder **Backup** nutzen.

---

## Build – EXE & Installer

### Portable EXE erzeugen

```bat
build\build_exe.bat
```

* Ergebnis: `dist\IBU Turniere.exe` (Explorer oeffnet automatisch und markiert die Datei).

### Installer erzeugen (Inno Setup)

1. Inno Setup installieren.
2. `build/installer.iss` in Inno Setup oeffnen → **Compile**.
3. Ergebnis: `build/output/IBU_Turniere_v0.9.3_setup.exe`.

> Installer installiert nach `%LOCALAPPDATA%\ibu_sw` (kein Admin noetig).

---

## Release / Git-Cheatsheet

```bash
# Aenderungen sichern
git add -A
git commit -m "v0.9.3: Auto-Reload Turnierlisten, Refresh behaelt Auswahl, KO-Tab Robustheit"

# Upstream holen & lokalen main rebasen
git fetch origin
git rebase origin/main
# (Konflikte -> git add <files> ; git rebase --continue)

# Push
git push origin main

# Tag setzen (annotiert) & pushen
git tag -a v0.9.3 -m "Release v0.9.3 — Auto-Reload Turnierlisten, Refresh behaelt Auswahl, KO-Phase Robustheit"
git push origin v0.9.3
```

Weitere nuetzliche Befehle:

```bash
  git push --tags
  git tag -n --sort=-creatordate | head
  git tag -d vX.Y.Z
  git push origin :refs/tags/vX.Y.Z
```

---

## Known Issues & Hinweise

* **Bronze/Finale**: Siegeranzeige bezieht sich ausschliesslich auf das **Finale** – Bronze wird korrekt ignoriert.
* **EXE startet nicht / Qt-Plugin fehlt**: Immer `dist/IBU Turniere.exe` verwenden (PyInstaller sammelt PyQt6-Ressourcen ein).
* **PDF-Export**: Stabil seit v0.9.1. Bei Problemen sicherstellen, dass `utils/exporter.py` aktuell ist.
* **Loeschen**: Irreversibel (PW **6460** erforderlich).

---

## Lizenz & Support

Interne Anwendung – keine oeffentliche Lizenz.
Issues bitte mit **Fehlermeldung + Screenshot** und kurzer Repro-Beschreibung anlegen.
