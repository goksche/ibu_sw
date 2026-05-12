# KO-Auslosungsarten — Testmatrix Server B (test.finalstage.ch)

**Ziel:** Jede relevante **`ko_draw_method`** im **richtigen Modus** (L/K/C laut Matrix) einmal **end-to-end** prüfen: Wizard → Speichern → KO-Phase / Spiele → mindestens ein Ergebnis oder erwartbare Auslosung ohne **422/500**.

**Referenz:** [`turniermodus-matrix.md`](turniermodus-matrix.md) (Abschnitte *Auslosungsmethode*, *KO-Startrunde*, *KO-Optionen & Sperrregeln*).

**Voraussetzung:** Smoke grün (`scripts/smoke_server_b.ps1` / `.sh`), eingeloggt.

---

## Aktueller Stand (Technik)

| Aspekt | Stand |
|--------|--------|
| Smoke (öffentlich) | `/` und `/api/v1/info/version` **200**; `diagnostics` ggf. **404** (Skript erlaubt beides). |
| Backend Server B | Container **healthy** (Stand nach Fixes u. a. `generate_swiss_like_rounds`, `append_third_place_placeholder_if_needed` auf `main`). |
| **Stufe C** (nach KO-/Backend-Deploy) | Mindestens die Auslosungs-Flows, die von Backend-Änderungen berührt werden, in **Stufe A** kurz gegenprüfen. |

---

## Nächster Schritt (jetzt ausführen)

1. **https://test.finalstage.ch** öffnen, anmelden.
2. **Stufe A – erste Zeile:** Kombi-Turnier (**C**), `ko_draw_method = fixed_cross`, Minimalsetup wie Tabelle → Wizard durchlaufen, speichern.
3. **KO-Baum / Spielplan** öffnen: Paarungen plausibel, **kein 422/500**.
4. Ergebnis in der Tabelle **„Ergebnis / Bugs“** eintragen; Checkbox in Stufe A setzen.
5. Danach zeilenweise die übrigen Methoden der Stufe A (oder gesammelt in einer Session).

---

## Ergebnis / Bugs

| ID | Datum | `ko_draw_method` | Modus (K/C) | Ergebnis | Notiz |
|----|-------|-------------------|---------------|----------|--------|
|    |       |                   |               |          |        |

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
| ☐ | `fixed_cross` | **C** | 2 Gruppen, qualifizierte Plätze für Kreuz | Paarungen gruppenübergreit plausibel |
| ☐ | `same_position_cross` | **C** | 2+ Gruppen, gleiche Platzierung | Kreuz gemäß UI |
| ☐ | `bonus_draw_for_winners` | **C** | Gruppensieger erkennbar | Auslosung ohne Crash |
| ☐ | `overall_seeding` | **K** oder **C** | Ranking/Teilnehmerliste | Seeding nachvollziehbar |
| ☐ | `pot_system` | **K** oder **C** | Genügend Teilnehmer für Töpfe | Auslosung ok |
| ☐ | `full_random` | **K** oder **C** | Optional Sperrregeln (s. Stufe B) | Zufalls-KO ok |
| ☐ | `random_each_round` | **K** oder **C** | Mind. 2 Runden KO; nach Runde 1: Button „nächste Runde auslosen“ (falls UI) | Kein Auto-Advance ohne Aktion; kein Crash |
| ☐ | `predefined_bracket` | **K** oder **C** | Platzhalterbaum wie UI | Struktur ladbar |
| ☐ | `manual` | **K** oder **C** | KO-Runde 1 in UI setzen | Speichern + nächste Runde |

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

- [ ] Alle Methoden aus **Stufe A** mit ☐ abgearbeitet oder Explizit „nicht anwendbar“ mit Grund.
- [ ] **Stufe B** mindestens für aktuell genutzte Sperrregeln und einen Seed-Test.
- [ ] Tabelle „Ergebnis / Bugs“ geführt; Fixes für nächste Iteration notiert.
