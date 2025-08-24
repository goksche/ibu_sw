# ibu\_sw – Dart Turnier Verwaltungs Tool (v0.8)

Windows‑Desktop-App zur Verwaltung von Dartturnieren inkl. Gruppen- und KO‑Phase, Bronze‑Spiel, Meisterschaften und Ranglisten. GUI mit **PyQt6**, lokale Datenhaltung in **SQLite** (`./data/ibu.sqlite`).

---

## Highlights v0.8

* **Meisterschafts‑Rangliste (MVP)**

  * Punkte‑Aggregation über alle einer Meisterschaft zugewiesenen Turniere.
  * Standard‑Schema: 1=30, 2=24, 3=18, 4=15, **ab Platz 5 = 5 Punkte** (Default auch ohne expliziten Schemaeintrag).
  * Tabelle: *Rang | Spieler | Punkte gesamt | Turniere | Beste Platzierung | Letztes Turnierdatum*.
  * **„Rangliste neu berechnen“** Button.
  * **Auto‑Recalc**, wenn:

    * ein **KO‑Finale** gespeichert wird oder
    * Meisterschafts‑Zuweisungen / Punkteschema geändert werden.
* **KO‑Phase: Bronze‑Spiel** (kleines Finale)

  * Wird automatisch angelegt, sobald beide **Halbfinals** entschieden sind.
  * Bronze‑Spiel ist intern `runde=99` und wird in der GUI als **„Bronze“** angezeigt.
  * Champion-Ermittlung **nur** aus dem Finalspiel (Bronze ignoriert).
* **Robuste DB‑Kompatibilität**

  * Funktioniert mit alten und neuen Datenbanken: Spalte `spieltag` **oder** historische `runde` in `spiele` wird automatisch erkannt.
  * Meisterschafts‑Flag akzeptiert alte Werte wie „Ja/Nein“ und speichert künftig konsistent `0/1`.

> **Sicherheit:** Alle Löschaktionen (Turniere, Teilnehmer, Meisterschaften, Pläne) sind mit dem Passwort **6460** geschützt.

---

## Projektstruktur

```
ibu_sw/
├─ data/                 # SQLite-DB (ibu.sqlite) – wird automatisch angelegt
├─ database/
│  └─ models.py          # gesamte Datenlogik/SQL
├─ utils/
│  ├─ exporter.py        # (Platzhalter für v0.9 Exporte)
│  └─ spielplan_generator.py
├─ views/
│  ├─ main_window.py
│  ├─ teilnehmer_view.py
│  ├─ turnier_view.py
│  ├─ turnier_start_view.py
│  ├─ gruppenphase_view.py
│  ├─ ko_phase_view.py
│  └─ meisterschaft_view.py
└─ main.py               # Einstiegspunkt
```

---

## Systemvoraussetzungen

* Windows 10/11
* Python **3.10+** (empfohlen 3.11/3.12)
* Pip‑Pakete: **PyQt6** (alles andere nur Stdlib)

### Installation

```bash
# im Projektverzeichnis
python -m venv .venv
.venv\\Scripts\\activate
pip install --upgrade pip
pip install PyQt6
```

### Start

```bash
# im aktivierten venv
python main.py
```

Beim ersten Start wird `./data/ibu.sqlite` automatisch erstellt.

---

## Bedienung (Tabs)

### 1) Turniere

* **CRUD**: Turniere anlegen/ändern/löschen (Löschen nur mit PW **6460**).
* Felder: *Name*, *Datum*, *Modus* (Gruppen, KO, Gruppen+KO), *Meisterschaftsrelevant*.

### 2) Teilnehmer

* **Globales CRUD** + **Zuweisung** zu einem Turnier.
* Zuweisung: Bestehende Turnierliste wird **ersetzt**.
* Löschen nur mit PW **6460**.

### 3) Turnier starten

* Teilnehmer dem Turnier zuweisen.
* **Gruppen anlegen** (z. B. A, B, …) und Spieler zuordnen.
* Speichern erzeugt die Gruppierung in der DB.

### 4) Gruppenphase

* **Round‑Robin** Spielplan generieren.
* Ergebnisse eintragen, Tabelle/Ranking pro Gruppe einsehen.
* **Überschreiben/Löschen** des Plans nur, wenn **keine** Ergebnisse erfasst wurden.

### 5) KO‑Phase

* Anzahl **Gesamt‑Qualifikanten** (2/4/8/16/…) wählen.
* **Seeding**: A1–B4, A2–B3, A3–B2, A4–B1 (automatisch, mehr Gruppen werden analog gepaart).
* Ergebnisse speichern → **Sieger werden automatisch weitergetragen**.
* **Bronze‑Spiel**: Wird angelegt, sobald *beide Halbfinals* entschieden sind. In der Runden‑Auswahl als **„Bronze“** sichtbar.
* Button **„KO‑Plan löschen“** (PW 6460) leert die KO‑Spiele.
* **Champion** wird aus dem **Finale** ermittelt.

### 6) Meisterschaften

* **CRUD** (Löschen mit PW **6460**).
* Turniere per Checkbox zuweisen.
* Punkteschema bearbeiten oder **„Standard‑Schema anwenden“** (1=30, 2=24, 3=18, 4=15, **ab 5=5**).
* **Rangliste**: zeigt *alle* Spieler aus allen zugewiesenen Turnieren, inkl. Spieler außerhalb Top‑4 (je 5 Punkte).
* **Neu berechnen**: per Button oder automatisch nach Final‑Speicherung / Schema‑ bzw. Zuweisungsänderungen.

---

## Datenbank

* Datei liegt unter `./data/ibu.sqlite` und wird automatisch angelegt.
* **Abwärtskompatibel**: Alte DBs, die in `spiele` statt `spieltag` die Spalte `runde` nutzen, funktionieren ohne Migration.
* Meisterschafts‑Flag akzeptiert Werte wie `Ja/Nein` und wandelt sie intern robust nach `0/1`.

> Tipp: Für Backups einfach die Datei `data/ibu.sqlite` kopieren.

---

## Workflow – Kurz & knackig

1. **Teilnehmer** anlegen.
2. **Turnier** erstellen (Modus z. B. *Gruppen und KO*).
3. In **Turnier starten**: Spieler zuweisen, Gruppen anlegen, speichern.
4. **Gruppenphase**: Plan generieren, Ergebnisse eintragen.
5. **KO‑Phase**: Qualifikanten wählen, Plan erzeugen, Ergebnisse eintragen.

   * Nach den Halbfinals erscheint automatisch **„Bronze“**.
6. (Optional) **Meisterschaft**: Turniere zuweisen, Schema prüfen, Rangliste ansehen/neu berechnen.

---

## Known Issues & Hinweise

* **Bronze/Finale**: Der Sieger rechts neben der Rundenwahl zeigt den **Final‑Sieger** – Bronze wird korrekt ignoriert.
* **DB‑Schemata** ändern sich nicht automatisch. Falls eigene Tools auf die DB zugreifen, unbedingt auf Kompatibilität achten.
* **Löschen** ist irreversibel (PW **6460** erforderlich).

---

## Release / Git‑Cheatsheet

Deine Schritte (Rebase‑Flow) sind korrekt; hier das kompakte Rezept:

```bash
# Änderungen sichern
git add -A && git commit -m "WIP"

# Upstream holen und lokalen main rebasen
git fetch origin
git rebase origin/main
# (Konflikte lösen -> git add <files> ; git rebase --continue)

# Push
git push origin main

# Tag setzen & pushen
git tag -a v0.8 -m "Release v0.8"
git push origin v0.8
```

Weitere nützliche Befehle:

```bash
# alle Tags pushen
git push --tags

# neuen Hotfix-Tag v0.8.1
git tag -a v0.8.1 -m "Hotfix"
git push origin v0.8.1
```

---

## Roadmap

* **v0.9**: Exporte (CSV/PDF) für Ranglisten/Statistiken (`utils/exporter.py`).
* **v1.0**: Feinschliff (Rollen/Backups/UX), kleinere Komfortfunktionen.

---

## Support & Mitarbeit

Interne Anwendung; Pull Requests nach Absprache. Issues bitte mit **Fehlermeldung + Screenshot** und kurzer Repro‑Beschreibung anlegen.

---

## Lizenz

Projektintern – keine öffentliche Lizenz. Verwendung innerhalb des Teams.
