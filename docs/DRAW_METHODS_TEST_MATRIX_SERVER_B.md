# KO-Auslosungsarten — Testmatrix Server B (test.finalstage.ch)

**Ziel:** Jede relevante **`ko_draw_method`** im **richtigen Modus** (L/K/C laut Matrix) einmal **end-to-end** prüfen: Wizard → Speichern → KO-Phase / Spiele → mindestens ein Ergebnis oder erwartbare Auslosung ohne **422/500**.

**Referenz:** [`turniermodus-matrix.md`](turniermodus-matrix.md) (Abschnitte *Auslosungsmethode*, *KO-Startrunde*, *KO-Optionen & Sperrregeln*).

**Voraussetzung:** Smoke grün (`scripts/smoke_server_b.ps1` / `.sh`), eingeloggt.

---

## Aktueller Stand (Technik)

| Aspekt | Stand |
|--------|--------|
| Gate v1.8.4 | `./scripts/run_draw_methods_matrix_gate_server_b.sh` (Contract + `verify_draw_methods_matrix.py` + QA-Gate) |
| Smoke (öffentlich) | `/` und `/api/v1/info/version` **200**; `diagnostics` ggf. **404** (Skript erlaubt beides). |
| Wizard Create | Alle matrix-konformen `ko_draw_method` im Dropdown „Auslosungsmethode“ (neben P1–P7) |
| **Stufe C** (nach KO-/Backend-Deploy) | Mindestens die Auslosungs-Flows, die von Backend-Änderungen berührt werden, in **Stufe A** kurz gegenprüfen. |

---

## Nächster Schritt (jetzt ausführen)

**Stufe B — Session 1 (läuft):** B1 → B2 → B3. Basis: Duplikat von Turnier **70** (`full_random`, Modus C). Feedback: **ok / gut / ⚠️ / ❌** pro Block.

## Stufe B — Ergebnisse

| ID | Thema | Turnier | Ergebnis | Notiz |
|----|--------|---------|----------|--------|
| B1a | `ko_block_same_group` **an** | 75 | ok | 4 VF: je A vs B (`same_group=false` in DB) |
| B1b | `ko_block_same_group` **aus** | 77 | ok | Neu von 75; DB `ko_block_same_group=false`, `QUARTERFINAL`; 4+2+1 KO; VF alle Kreuz (Zufall, Sperre aus) |
| B2a | `ko_block_same_position` **an** | | | |
| B2b | `ko_block_same_position` **aus** | | | |
| B3a | Seed **42** (1. Bracket) | | | |
| B3b | Seed **42** (Duplikat, gleiches Bracket?) | | | |
| B3c | Seed **99** (anderes Bracket?) | | | |

---

## Ergebnis / Bugs

| ID | Datum | Turnier | `ko_draw_method` | Modus (K/C) | Ergebnis | Notiz |
|----|-------|---------|-------------------|---------------|----------|--------|
| A1 | 2026-05-17 | 64 | `fixed_cross` | C | ok | |
| A2 | 2026-05-17 | 65 | `same_position_cross` | C | gut | Doppelte TN bereinigt |
| A3 | 2026-05-17 | 67 | `bonus_draw_for_winners` | C | ok | |
| A4 | 2026-05-17 | 68 | `overall_seeding` | C | ok | |
| A5 | 2026-05-17 | 69 | `pot_system` | C | gut | VF4 Team 3 statt Team 5 akzeptiert |
| A6 | 2026-05-17 | 70 | `full_random` | C | ok | |
| A7 | 2026-05-20 | 72 | `random_each_round` | C | ok | DB: `kodrawmethod` + `RANDOM_EACH_ROUND` auf Server B; Speichern nach Fix ok |
| A8 | 2026-05-17 | 73 | `predefined_bracket` | C | ok | |
| A9 | 2026-05-17 | 74 | `manual` | C | gut | E2E inkl. manuelles VF-Bracket |

---

## Gültigkeit L/K/C (Kurz)

| Methode | Nur Kombi **C** | **K** und **C** |
|---------|-----------------|-----------------|
| `fixed_cross` | ✅ | ❌ |
| `same_position_cross` | ✅ | ❌ |
| `bonus_draw_for_winners` | ✅ | ❌ |
| `overall_seeding` | ✅ | ✅ |
| `pot_system` | ✅ | ✅ |
| `full_random` | ✅ | ✅ |
| `random_each_round` | ✅ | ✅ |
| `predefined_bracket` | ✅ | ✅ |
| `manual` | ✅ | ✅ |

---

## Stufe A — Jede Methode einmal (Pflicht)

Pro Zeile: passende Teilnehmerzahl / Gruppen (z. B. Kombi: **2 Gruppen à 4** → 8 Qualifikanten wo nötig). Nach Speichern: **KO-Baum oder Spielplan** öffnen und Plausibilität prüfen.

| ☐ | `ko_draw_method` | Modus | Minimalsetup (Beispiel) | Erwartung |
|---|-------------------|-------|--------------------------|-----------|
| ☑ | `fixed_cross` | **C** | 2 Gruppen, qualifizierte Plätze für Kreuz | Paarungen gruppenübergreit plausibel |
| ☑ | `same_position_cross` | **C** | 2+ Gruppen, gleiche Platzierung | Kreuz gemäß UI |
| ☑ | `bonus_draw_for_winners` | **C** | Gruppensieger erkennbar | Auslosung ohne Crash |
| ☑ | `overall_seeding` | **K** oder **C** | Ranking/Teilnehmerliste | Seeding nachvollziehbar |
| ☑ | `pot_system` | **K** oder **C** | Genügend Teilnehmer für Töpfe | Auslosung ok |
| ☑ | `full_random` | **K** oder **C** | Optional Sperrregeln (s. Stufe B) | Zufalls-KO ok |
| ☑ | `random_each_round` | **K** oder **C** | Mind. 2 Runden KO; nach Runde 1: Button „nächste Runde auslosen“ (falls UI) | Kein Auto-Advance ohne Aktion; kein Crash |
| ☑ | `predefined_bracket` | **K** oder **C** | Platzhalterbaum wie UI | Struktur ladbar |
| ☑ | `manual` | **K** oder **C** | KO-Runde 1 in UI setzen | Speichern + nächste Runde |

---

## Stufe B — Regeln & Randfälle

| ☐ | Thema | Vorgehen | Erwartung |
|---|--------|----------|-----------|
| ☐ | **`ko_block_same_group`** | Kombi, `full_random` oder Cross, an/aus | Bei „an“: keine verbotene Paarung (oder dokumentiertes ⚠️-Verhalten) |
| ☐ | **`ko_block_same_position`** | wie oben | wie oben |
| ☐ | **`ko_random_seed`** | zweimal gleiche Einstellung vs. andere Seed | Reproduzierbarkeit oder dokumentierte Abweichung |
| ☐ | **`ko_third_place_match`** | Struktur mit Bronze (z. B. `single_elimination_with_third`) | Platz-3-Spiel vorhanden / Logik ok |
| ☐ | **Byes / ungerade Teilnehmerzahl** | K mit 5, 6, 7 Teilnehmern je einmal | Freilos oder Hinweis; **kein stiller 500** |
| ☐ | **`ko_start_round`** | von `round_of_16` bis `final` je ein repräsentativer Fall | Start-Runde passt zur Teilnehmerzahl |

---

## Stufe C — Nach Backend-/KO-Deploy

Stufe **A** mindestens für die geänderten Auslosungsarten wiederholen.

---

## Definition of Done

- [x] Alle Methoden aus **Stufe A** mit ☐ abgearbeitet oder Explizit „nicht anwendbar“ mit Grund.
- [ ] **Stufe B** mindestens für aktuell genutzte Sperrregeln und einen Seed-Test.
- [x] Tabelle „Ergebnis / Bugs“ geführt; Fixes für nächste Iteration notiert.
