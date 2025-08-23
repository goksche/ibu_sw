# ibu_sw – Dart Turnier Verwaltungs Tool (Windows-Desktop)

**Sprache:** Deutsch  
**GUI:** PyQt6 · **Datenbank:** SQLite (`./data/ibu.sqlite`)

`ibu_sw` ist eine Windows-Desktop-App zur Verwaltung von Dart-Turnieren inkl. Gruppenphase, KO-Phase (mit **Kleinem Finale / Bronze**), Teilnehmerverwaltung und **Meisterschaften** mit Rangliste nach Punkteschema.

> Aktueller Stand: **v07.2** (inkl. v0.8-Features: Meisterschafts-Rangliste, automatisches Bronze-Spiel in der KO-Phase).

---

## Inhalt

- [Funktionen](#funktionen)
- [Projektstruktur](#projektstruktur)
- [Installation](#installation)
- [Start](#start)
- [Bedienhinweise](#bedienhinweis)
  - [Turniere](#turniere)
  - [Teilnehmer](#teilnehmer)
  - [Gruppenphase](#gruppenphase)
  - [KO-Phase (inkl. Bronze)](#ko-phase-inkl-bronze)
  - [Meisterschaften & Rangliste](#meisterschaften--rangliste)
- [Passwortschutz bei Löschaktionen](#passwortschutz-bei-löschaktionen)
- [Datenbank](#datenbank)
- [Roadmap](#roadmap)
- [Git / Release-Workflow](#git--release-workflow)
- [Troubleshooting](#troubleshooting)
- [Lizenz](#lizenz)

---

## Funktionen

- **Turniere**: Anlegen, Bearbeiten, Löschen, Turniermodus (Gruppen, KO, Gruppen+KO), „Meisterschaftsrelevant“.
- **Teilnehmer**: Globale Verwaltung, Turnierzuweisung.
- **Gruppenphase**:
  - Gruppen anlegen & füllen.
  - Round-Robin-Spielpläne generieren.
  - Ergebnisse erfassen, Tabellen & Rankings berechnen.
  - Schutz: Überschreiben/Löschen nur, solange **keine** Ergebnisse existieren.
- **KO-Phase**:
  - Qualifikanten: 2/4/8/16/…; Seeding A1-B4, A2-B3, A3-B2, A4-B1 (skalierbar).
  - Ergebnisse speichern mit automatischer Sieger-Propagation (außer Finale/Bronze).
  - **Kleines Finale (Bronze / Platz 3):** wird automatisch angelegt, sobald die **beiden Halbfinal-Verlierer** feststehen; in der Runden-Auswahl erscheint **„Bronze“** (interne Rundennummer 99 ist **nicht sichtbar**).
  - **Siegeranzeige** zeigt **ausschließlich den Final-Sieger** (Bronze wird ignoriert).
- **Meisterschaften**:
  - Anlegen/Bearbeiten/Löschen, Turniere zuweisen (Checkboxen).
  - Punkteschema definieren (Standard: **1=30, 2=24, 3=18, 4=15, ab Platz 5 → 5 Punkte**).
  - **Rangliste**: Aggregation über zugewiesene Turniere & gespeicherte Turnier-Platzierungen.
  - **Auto-Neuberechnung**: bei gespeichertem KO-Finale oder Schema/Zuweisungs-Änderungen.
  - Spalten: **Rang | Spieler | Punkte gesamt | Turniere | Beste Platzierung | Letztes Turnierdatum**.
  - **Alle Teilnehmer** werden gelistet; außerhalb Top-4 gibt’s **5 Punkte** pro Teilnahme.
- **Export (geplant v0.9)**: CSV/PDF.

---

## Projektstruktur

ibu_sw/
├─ data/ # SQLite-Datei ibu.sqlite (wird automatisch angelegt)
├─ database/
│ └─ models.py
├─ utils/
│ ├─ exporter.py
│ └─ spielplan_generator.py
├─ views/
│ ├─ main_window.py
│ ├─ teilnehmer_view.py
│ ├─ turnier_view.py
│ ├─ turnier_start_view.py
│ ├─ gruppenphase_view.py
│ ├─ ko_phase_view.py # v0.7-Layout, Bronze automatisch (intern Runde=99, UI=„Bronze“)
│ └─ meisterschaft_view.py
└─ main.py


---

## Installation

1. **Python 3.10+** installieren (unter Windows empfohlen: 3.11/3.12).
2. Optionales virtuelles Environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
    
## Abhängigkeiten

1. PyQt6 installieren in cmd
   ```bash
   pip install PyQt6
## Start

1. Programm Starten
   ```bash
   python main.py   
## Bedienhinweis

Modus: Gruppen, KO oder Gruppen+KO.

„Meisterschaftsrelevant“ aktivieren, wenn Turnier in die Rangliste einfließen soll.

Teilnehmer

Global pflegen (Name, Spitzname).

In Turnier-Ansicht Teilnehmerliste eines Turniers ersetzen.

Gruppenphase

Gruppen anlegen/füllen, Spielplan generieren, Ergebnisse eintragen.

Überschreiben/Löschen nur möglich, solange keine Ergebnisse vorliegen.

KO-Phase (inkl. Bronze)

KO-Plan erstellen: Gesamt-Qualifikanten 2/4/8/16/…; Seeding automatisch.

Ergebnisse:

Finale & Bronze werden ohne Propagation gespeichert.

Viertel/Halb etc. propagieren Sieger automatisch.

Bronze wird nur als „Bronze“ angezeigt (kein „Runde 99“).

Sieger-Label zeigt immer den Final-Sieger.

Meisterschaften & Rangliste

Meisterschaft anlegen, Turniere zuweisen.

Punkteschema definieren (oder Standard anwenden).

Rangliste:

Automatisch neu berechnet bei Finale-Speicherung oder Schema/Zuweisungs-Änderungen.

Alle Teilnehmer werden berücksichtigt; ab Platz 5 → 5 Punkte.

Manuell: Button „Rangliste neu berechnen“.

Passwortschutz bei Löschaktionen

Passwort: 6460

Geschützt: Turnier/Teilnehmer/Meisterschaft löschen, KO-Plan löschen.

Datenbank (Auszug)

ko_spiele(id, turnier_id, runde, match_no, p1_id, p2_id, s1, s2)
Bronze: runde = 99 (nur intern)

turnier_platzierungen(turnier_id, teilnehmer_id, platz)

meisterschaft_punkteschema(meisterschaft_id, platz, punkte) u. a.

Roadmap

v0.8 – Meisterschafts-Rangliste ✅

v0.9 – Exporte (CSV/PDF)

v1.0 – Feinschliff (Rollen/Backups/UX)

## Troubleshooting

Push abgelehnt (non-fast-forward) → git fetch origin && git rebase origin/main, dann git push.

„Runde 99“ sichtbar / Bronze doppelt → aktualisierte views/ko_phase_view.py nutzen.

Finale speichern wirft Fehler → aktuelle ko_phase_view.py nutzen (Finale/Bronze ohne Propagation).
save_ko_result_and_propagate(match_id, s1, s2, turnier_id) muss vorhanden sein.

## Git / Release-Workflow Rebase-Push (empfohlen)
    
```bash
  git add -A
  git commit -m "WIP"
  git fetch origin
  git rebase origin/main
  git push origin main
```

Tag für Release v07.2
```bash
  git tag -a v07.2 -m "Release v07.2"
  git push origin v07.2
```

Bei „non-fast-forward“:
```bash
  git fetch origin
  git rebase origin/main
  git push origin main
```