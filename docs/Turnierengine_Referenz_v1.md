# Turnierengine Referenz v1

## Status und Geltung

- Version: `v1`
- Geltung: lokale Umstellung der Turnierengine (Liga, KO, Kombi)
- Rolle: Single Source of Truth fuer Fachlogik, Feldprioritaeten, Validierung und Migrationsreihenfolge
- Hinweis Veranstalter: Es wird kein neues Feld eingefuehrt; `creator`/`creator_id` ist die technische Abbildung von "Veranstalter".

## 1. Zielbild

- Minimale, klare Eingaben fuer Nutzer.
- Maximal ableitbare Felder aus `mode_variant`.
- Vollstaendige Kompatibilitaet mit aktuellen Strukturkatalogen:
  - Liga
  - KO-Strukturen
  - KO-Paarungsarten `P1..P7`
  - KO-Auslosungsarten inkl. Legacy-Kompatibilitaet
- Kein Verlust bestehender Grunddaten (`name`, Datum, Sichtbarkeit, Spielort etc.).

## 2. Verbindliche Grunddaten (alle Modi)

Diese Felder gelten immer, unabhaengig von Liga/KO/Kombi:

- `name`
- `description` (optional)
- `start_date`
- `end_date` (optional)
- `creator_id` (Veranstalter technisch)
- `location_id` (Spielort)
- `spielfeld_assignment_mode` (wenn Spielort gesetzt)
- `visibility`
- `show_matches`, `show_tables`

Referenz im Bestand:
- Modell: [`backend/app/models/tournament.py`](../backend/app/models/tournament.py)
- API-Schema: [`backend/app/schemas/tournament.py`](../backend/app/schemas/tournament.py)

## 3. Globale Prioritaetsregeln

### 3.1 Modus-Prioritaet

1. `mode_variant` ist fachlich fuehrend.
2. Daraus werden normalisiert/abgeleitet:
   - `mode`
   - `has_group_phase`
   - `has_ko_phase`
   - `league_variant`
   - `ko_structure` (preset-basiert)

### 3.2 KO-Prioritaet

1. `ko_draw_method` ist fuehrend.
2. `ko_pairing_mode` mappt auf `ko_draw_method`.
3. `ko_distribution` bleibt Legacy-Kompatibilitaet (nicht fuehrend).

### 3.3 Kombi-Prioritaet

1. Qualifikation aus Gruppenphase ist fuehrend fuer KO-Teilnehmerpool.
2. `C1..C5` sind Presets, keine harte Restriktion.
3. Alle fachlich validen Liga+KO-Kombinationen bleiben erlaubt.

---

## 4. Liga-Modus (Referenz)

### 4.1 Sichtbare Einstellungen (minimal)

- `groups_count`
- `group_distribution` (`random`/`seeded`/`manual`)
- `rounds_multiplier` (`1` = Single RR, `>1` = Multi RR)
- `league_scoring_system` (`points`/`difference`/`wins`)
- `tie_breaking_rules`

### 4.2 Verbindliche Regeln

- `mode = round_robin`
- `has_group_phase = true`
- `has_ko_phase = false`
- Deterministische Gruppenverteilung bei Restteilnehmern.
- Bye/Freilos-Regel bei ungerader Gruppengroesse fair und reproduzierbar.
- Tie-Break-Reihenfolge exakt nach `tie_breaking_rules`.

### 4.3 Validierung

- `groups_count >= 1`
- `rounds_multiplier >= 1`
- `tie_breaking_rules` nicht leer, ohne Duplikate
- `decision_match` nur als letzte Regel (falls gesetzt)
- bei `seeded`: Seeds vorhanden, valide, ohne Duplikate
- bei `manual`: keine Auto-Verteilung; Match-Generierung erst nach vollstaendiger manueller Gruppenzuordnung

---

## 5. KO-Modus (Referenz)

### 5.1 Vollstaendig uebernommene KO-Strukturen

- `single_elimination`
- `single_elimination_with_third`
- `single_elimination_with_ranking`
- `consolation_bracket`
- `double_elimination`
- `triple_elimination`
- `aggregate_ko`
- `group_then_single_ko`
- `group_then_double_ko`
- `ko_with_group_winner_advantage`
- `page_playoff`

### 5.2 Vollstaendig uebernommene KO-Paarungsarten

- `P1`, `P2`, `P3`, `P4`, `P5`, `P6`, `P7`

### 5.3 Vollstaendig uebernommene KO-Auslosungsarten

- `fixed_cross`
- `same_position_cross`
- `overall_seeding`
- `pot_system`
- `full_random`
- `bonus_draw_for_winners`
- `predefined_bracket`
- `manual`

### 5.4 Legacy-Kompatibilitaet (`ko_distribution`)

- `cross`
- `draw`
- `random_first_round`
- `random_each_round`
- `predefined_slots`

### 5.5 P1..P7 Mapping (aktuelle Produktlogik)

- `P1` -> `full_random`
- `P2` -> `overall_seeding`
- `P3` -> `fixed_cross`
- `P4` -> `full_random` + Sperrregeln
- `P5` -> `pot_system`
- `P6` -> `manual`
- `P7` -> `full_random` (mit Bye-Logik)

### 5.6 KO-Regeln

- `mode = knockout`
- `has_group_phase = false`
- `has_ko_phase = true`
- Runde-1-Erstellung muss immer robust funktionieren (auch bei `manual`).
- Bracket/Byes deterministisch erzeugen.
- Propagation strukturabhaengig (Siegerpfad immer, Verliererpfade je Struktur).

---

## 6. Kombi-Modus (Referenz)

### 6.1 Grundprinzip

- Kombi ist echte Verbindung aus Liga- und KO-Bausteinen.
- `mode = combined`, `has_group_phase = true`, `has_ko_phase = true`.
- `C1..C5` sind nur Startprofile.

### 6.2 Wichtige Kombi-Regeln

- Gruppenphase finalisiert Qualifikanten fuer KO.
- Qualifikationsplan aus `groups_count` + `ko_start_round`.
- Fallback-Qualifikation regelbasiert, bei Cutoff-Gleichstand optional manuell.
- KO-Teil erlaubt andere valide Varianteneinstellungen (sofern kompatibel).

### 6.3 Kombi-Kompatibilitaetsmatrix (E/B/V)

Legende: `E = erlaubt`, `B = bedingt`, `V = verboten`.

| Bereich | Wert | Status | Bedingung |
|---|---|---|---|
| Draw | `full_random` | E | keine |
| Draw | `pot_system` | E | Seed-/Topfregel vorhanden |
| Draw | `overall_seeding` | E | Ranking vorhanden |
| Draw | `fixed_cross` | B | Gruppenpositionslogik vorhanden |
| Draw | `same_position_cross` | B | positionsgleiche Kandidaten vorhanden |
| Draw | `bonus_draw_for_winners` | B | Gruppensieger identifizierbar |
| Draw | `predefined_bracket` | B | Slot-Mapping vorhanden |
| Draw | `manual` | B | manueller Ablauf und Validierung vorhanden |
| Pairing | `P1..P7` | E/B | gemaess KO-Mapping und Kontext |
| Struktur | alle vorhandenen | E/B | nur bei echten Inkompatibilitaeten blocken |

### 6.4 Harte Blocker in Kombi

- `fixed_cross`/`same_position_cross` ohne Gruppenpositionsdaten
- `predefined_bracket` ohne Slot-Zuordnung
- `manual` ohne definierten manuellen Prozess
- Start-Runde ohne plausible Teilnehmerbasis ohne Bye-Strategie

---

## 7. Ist/Soll-Mapping (Code zu Referenz)

### 7.1 Bereits konform

- Modus-Normalisierung ueber zentrale Matrix:
  - [`backend/app/core/mode_matrix.py`](../backend/app/core/mode_matrix.py)
- API-Normalisierung in Create/Update:
  - [`backend/app/api/v1/tournaments.py`](../backend/app/api/v1/tournaments.py)
- Modus-/Variantendarstellung in Overview:
  - [`frontend/src/components/tournament/TournamentOverview.tsx`](../frontend/src/components/tournament/TournamentOverview.tsx)
- Spielort in Create/Edit vorhanden:
  - [`frontend/src/pages/CreateTournament.tsx`](../frontend/src/pages/CreateTournament.tsx)
  - [`frontend/src/pages/EditTournament.tsx`](../frontend/src/pages/EditTournament.tsx)

### 7.2 Soll-Anpassungen (lokal)

- `league_variant` in UI nicht mehr als primaere manuelle Auswahl; aus `mode_variant` ableiten.
- `rounds_multiplier` nur bedingt anzeigen (wenn Liga-Multi relevant).
- KO-Konfiguration konsequent auf `ko_draw_method` fokussieren; `ko_distribution` nur Legacy.
- Kombi-Presets offen halten (kein unnoetiges Hard-Locking auf C-Defaults).

### 7.3 Betroffene Hauptdateien

- Backend:
  - [`backend/app/core/mode_matrix.py`](../backend/app/core/mode_matrix.py)
  - [`backend/app/api/v1/tournaments.py`](../backend/app/api/v1/tournaments.py)
  - [`backend/app/services/decision_matches.py`](../backend/app/services/decision_matches.py)
  - [`backend/app/services/ko_bracket.py`](../backend/app/services/ko_bracket.py)
- Frontend:
  - [`frontend/src/pages/CreateTournament.tsx`](../frontend/src/pages/CreateTournament.tsx)
  - [`frontend/src/pages/EditTournament.tsx`](../frontend/src/pages/EditTournament.tsx)
  - [`frontend/src/components/tournament/TournamentOverview.tsx`](../frontend/src/components/tournament/TournamentOverview.tsx)

---

## 8. Lokale Umstellungswellen (A-D)

### Welle A - UI-Reduktion und Klarheit

- Nur notwendige Eingaben sichtbar.
- `mode_variant` als primaere Auswahl ueberall.
- Erweiterte Optionen kontextbasiert einklappbar.

Ergebnis:
- weniger Doppelkonfiguration
- weniger Fehlbedienung

### Welle B - API-Normalisierung und Feldprioritaeten

- Prioritaetsregeln serverseitig hart erzwingen.
- Konfliktfelder normalisieren statt stillschweigend uebernehmen.
- Verstaendliche Validierungsfehler statt generische 500er.

Ergebnis:
- reproduzierbares Verhalten unabhaengig von Frontend-Stand

### Welle C - Engine-Konsistenz Liga/KO/Kombi

- Liga-Regeln (Verteilung, Byes, Tie-Break) strikt nach Referenz.
- KO-Source-of-Truth (`ko_draw_method`) in allen Pfaden.
- Kombi-Qualifikation und KO-Uebergang robust vereinheitlichen.

Ergebnis:
- konsistente Turniererstellung und Simulation in allen Modi

### Welle D - Regression und Abnahme

- Testmatrix fuer Liga/KO/Kombi und Negativfaelle.
- Seed-basierte Reproduzierbarkeit testen.
- Altbestand/Legacy-Inputs gegenpruefen.

Ergebnis:
- risikoarme Freigabe der Umstellung

---

## 9. Abnahme- und Regressionkriterien

### 9.1 Abnahmekriterien (funktional)

- Jede Referenzregel ist mindestens einer Code-Stelle zugeordnet.
- Keine konkurrierenden Source-of-Truth-Pfade mehr.
- `mode_variant` steuert sichtbares und serverseitiges Verhalten nachvollziehbar.
- Spielort bleibt in allen Modi verfuegbar und funktionsfaehig.
- Kombi erlaubt valide Mischungen ueber Presets hinaus.

### 9.2 Regression (Pflichtfaelle)

- Liga:
  - Single RR (`rounds_multiplier=1`)
  - Multi RR (`rounds_multiplier>1`)
  - Tie-Break-Reihenfolge
- KO:
  - jede zentrale Struktur mind. 1 Happy Path
  - `manual` Runde-1 speichern + Folgeverhalten
  - Bye-Faelle
- Kombi:
  - Basisqualifikation + Fallback-Regeln
  - bedingte Draw-Methoden (E/B/V)
  - Preset + freie gueltige Abweichung
- Legacy:
  - bestehende `ko_distribution` Inputs ohne Bruch

### 9.3 Technische Qualitaetskriterien

- Keine neuen Lint-/Type-/Schema-Fehler.
- API-Fehlertexte sind fachlich verstaendlich.
- Keine 500er bei validen Nutzereingaben.

---

## 10. Aenderungsprotokoll (Template)

Bei jeder Regelanpassung:

- Datum
- Aenderung
- Begruendung
- Impact (UI/API/DB/Bestand)
- Migrationshinweis
- Abnahme-Status

