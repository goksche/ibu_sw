# Spielfeld-Zuweisung beim Spielplan (Spezifikation)

## Ziele

- Beim Generieren des Spielplans sollen Spielfelder der Turnier-Location automatisch zugewiesen werden.
- Drei Modi für die **Gruppenphase**; **KO-Phase** grundsätzlich random + manuelle Anpassung.

---

## 1. Modi für Gruppenphase (nur relevant wenn Turnier einen Spielort hat)

| Modus | Beschreibung | Umsetzung |
|-------|--------------|-----------|
| **Random** | Rein zufällig: Jedes Gruppenspiel erhält zufällig ein Spielfeld. | Pro erzeugtes GroupMatch ein zufälliges Spielfeld aus der Location wählen. |
| **Gruppen Zuweisung Fix** | Direkte Zuweisung Gruppe → Spielfeld: Alle Gruppenspiele einer Gruppe finden auf dem zugewiesenen Spielfeld statt. | Pro **Gruppe** wird ein Spielfeld gewählt (UI: z.B. im Gruppen-Tab "Spielfeld" pro Gruppe). Beim Generieren der Spiele: `match.spielfeld_id = group.spielfeld_id`. |
| **Gruppe Zufällig** | Zufällige Zuweisung von Spielfeldern an Gruppen: Jede Gruppe bekommt genau ein Spielfeld (zufällig), alle Spiele der Gruppe dort. | Beim Generieren: Erst jeder Gruppe zufällig ein Spielfeld zuweisen (z.B. `group.spielfeld_id` setzen), dann wie bei Fix: alle Matches der Gruppe bekommen dieses Spielfeld. |

---

## 2. KO-Phase

- **Beim Generieren:** Zufällige Zuweisung – jedes KO-Spiel erhält zufällig ein Spielfeld (aus der Turnier-Location), falls Spielort gesetzt.
- **Manuelle Anpassung:** In der Spiele-Ansicht (KO-Tabelle/Bracket) soll pro KO-Spiel das Spielfeld änderbar sein (Dropdown pro Match).

---

## 3. Technische Umsetzung (Kurz)

### Backend

- **Tournament:** Neues Feld `spielfeld_assignment_mode`: `'random' | 'group_fixed' | 'group_random'` (optional, nur sinnvoll wenn `location_id` gesetzt).
- **Group:** Neues Feld `spielfeld_id` (optional, FK auf `spielfelder.id`) für Modi "Gruppen Fix" und "Gruppe Zufällig".
- **generate-round-robin / generate-groups:** Wenn `tournament.location_id` gesetzt:
  - Spielfelder der Location laden.
  - **random:** Pro GroupMatch zufälliges Spielfeld zuweisen.
  - **group_fixed:** Pro GroupMatch `spielfeld_id = group.spielfeld_id` (muss vorher in UI gesetzt sein).
  - **group_random:** Erst alle Gruppen zufällig auf Spielfelder verteilen (group.spielfeld_id setzen), dann wie group_fixed.
- **generate-ko-bracket:** Wenn `tournament.location_id` gesetzt: Pro KnockoutMatch zufälliges Spielfeld zuweisen.
- **KO-Match Update:** Bereits möglich (`spielfeld_id` in GroupMatchUpdate/KnockoutMatchUpdate) – Frontend muss nur Dropdown zum Ändern anzeigen.

### Frontend

- **Turnier bearbeiten:** Dropdown "Spielfeld-Zuweisung (Gruppenphase)" (nur sichtbar wenn Spielort gewählt): Random / Gruppen Fix / Gruppe Zufällig.
- **Gruppen-Tab:** Bei Modus "Gruppen Fix" pro Gruppe ein Feld "Spielfeld" mit Dropdown (Spielfelder der Turnier-Location); speichern auf Group (neuer Backend-Endpoint oder PATCH Group).
- **Spiele-Tab KO (Tabelle):** Pro KO-Spiel Spielfeld-Dropdown (bearbeitbar), Speichern per bestehendem Match-Update mit `spielfeld_id`.

---

## 4. Reihenfolge Implementierung

1. Backend: Migration (Tournament.spielfeld_assignment_mode, Group.spielfeld_id), Schema + API (Group update spielfeld_id).
2. Backend: Round-Robin-Generierung um Spielfeld-Logik erweitern (random / group_fixed / group_random).
3. Backend: KO-Bracket-Generierung um zufällige Spielfeld-Zuweisung erweitern.
4. Frontend: Turnier bearbeiten – Dropdown Spielfeld-Zuweisung.
5. Frontend: Gruppen – Spielfeld pro Gruppe (bei group_fixed).
6. Frontend: KO-Spiele – Spielfeld pro Match editierbar (Dropdown).
