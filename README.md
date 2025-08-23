# Dart Turnier Verwaltungs Tool (ibu_sw)

Desktop-Tool (Windows, Python/PyQt6) für die Verwaltung von Dart-Turnieren:
- Turniere, Teilnehmer und Meisterschaften verwalten
- Gruppenphase (Auslosung & Spielplan) und KO-Phase
- Speicherung lokal mit SQLite

> **Aktuelle Version:** v0.6

---

## Inhalte

- [Features](#features)
- [Schnellstart](#schnellstart)
- [Ordnerstruktur](#ordnerstruktur)
- [Wichtig: Löschschutz](#wichtig-löschschutz)
- [Gruppenphase & KO-Phase](#gruppenphase--ko-phase)
- [Roadmap](#roadmap)
- [Changelog](#changelog)

---

## Features

- **Turniere**
  - Anlegen/Bearbeiten/Anzeige
  - Modus: *Gruppenphase*, *KO*, *Gruppenphase+KO*
  - Flag „meisterschaftsrelevant“ (für spätere Saisonwertung)
- **Teilnehmer**
  - Anlegen/Bearbeiten/Löschen
- **Meisterschaften**
  - Anlegen/Bearbeiten/Löschen
  - (Punkteschema folgt in Roadmap)
- **Gruppenphase**
  - Gruppen bilden (automatische/halbautomatische Zuteilung möglich)
  - Round-Robin-Spielplan je Gruppe (generieren, Ergebnisse erfassen)
  - Tabellen mit Punkte/Legs/Diff
- **KO-Phase**
  - Seeding aus Gruppen nach Schema:
    - Bei benachbarten Gruppenpaaren (A–B, C–D, …):
      - A1 vs Bq, A2 vs B(q-1), …, Aq vs B1 (q = Top-N pro Gruppe)
  - **Dynamische Rundennamen**:  
    - 16 → Achtel • 8 → Viertel • 4 → Halb • 2 → Finale
  - Ergebnisse erfassen, Sieger propagieren bis Finale
- **Datenhaltung**
  - SQLite unter `data/ibu.sqlite` (wird automatisch angelegt)

---

## Schnellstart

### Voraussetzungen
- **Python 3.11+** (Windows)
- Abhängigkeiten:
  - `PyQt6` (SQLite ist in der Standardbibliothek enthalten)

```bash
# (optional) venv
python -m venv .venv
.\.venv\Scripts\activate

# Dependencies
pip install PyQt6
