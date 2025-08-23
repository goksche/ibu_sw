# Dart Turnier Verwaltungs Tool (PyQt6)

Desktop-Tool zur Verwaltung von Dart-Turnieren inkl. Gruppen- & KO-Phase sowie **Meisterschaftsmodus** (Saison mit Punktezählung über mehrere Turniere).  
Technologie: **Python 3.11+**, **PyQt6**, **SQLite** (lokale Datei).

---

## Aktueller Stand (v0.7)

### Fertig
- **Turniere**
  - Anlegen, Bearbeiten, Löschen (Löschen nur mit Passwort `6460`)
  - Modus: *Gruppenphase*, *KO*, *Gruppenphase & KO*
- **Teilnehmer**
  - Anlegen, Bearbeiten, Löschen (Löschen nur mit Passwort `6460`)
  - Turnier-Teilnehmer zuweisen/ersetzen
- **Gruppenphase**
  - Gruppen automatisch befüllen (GUI)
  - Spielplan Round-Robin je Gruppe generieren
  - Ergebnisse erfassen, Tabellen berechnen
  - Sicherheitslogik: Überschreiben/Löschen nur ohne erfasste Ergebnisse
- **KO-Phase**
  - Aus Gruppentabellen qualifizieren (2/4/8/16 …)
  - Setzlogik: A1–B4, A2–B3, A3–B2, A4–B1 (erweiterbar bei mehr Gruppen)
  - Ergebnisse speichern; Sieger wird automatisch in die nächste Runde übertragen
  - Champion ermittelbar
- **Meisterschaften (Saison)**
  - Meisterschaft anlegen/umbenennen/löschen (Löschen mit Passwort `6460`)
  - **Turniere per Checkbox zuweisen**
  - **Punkteschema definieren** und speichern  
    - **Standard-Schema**: *1=30, 2=24, 3=18, 4=15, ab Platz 5 = 5 Punkte* (per Button „Standard-Schema anwenden“)

> CSV-Export & Ranglisten-Ansicht kommen später (nicht Teil des MVP).

---

## Installation

### 1) Umgebung
```bash
# (Windows PowerShell oder Bash)
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install --upgrade pip
pip install PyQt6
