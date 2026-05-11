# Test-Matrix: Turniermodus L / K / C

**Quelle/Referenz:** übernommen aus `E:\Projects\finalstage.ch\.claude\worktrees\mystifying-taussig-37f2a5\docs\turniermodus-matrix.md` und ab jetzt **im Repo** gepflegt, damit sie für weitere Schritte (und via `@`) verfügbar ist.

**L** = Liga (`round_robin`) | **K** = Knockout (`knockout`) | **C** = Combined (`combined`)  
✅ = gültig | ❌ = nicht anwendbar | ⚠️ = eingeschränkt

---

## Turniermodus-Grundkonfiguration

| Parameter                   | Wert / Enum                          | L  | K  | C  |
|-----------------------------|--------------------------------------|----|----|----|
| `mode`                      | `round_robin`                        | ✅ | ❌ | ❌ |
| `mode`                      | `knockout`                           | ❌ | ✅ | ❌ |
| `mode`                      | `combined`                           | ❌ | ❌ | ✅ |
| `has_group_phase`           | `true`                               | ✅ | ❌ | ✅ |
| `has_group_phase`           | `false`                              | ❌ | ✅ | ❌ |
| `has_ko_phase`              | `true`                               | ❌ | ✅ | ✅ |
| `has_ko_phase`              | `false`                              | ✅ | ❌ | ❌ |

---

## Liga-Variante (`league_variant`)

| Parameter                   | Wert                  | L  | K  | C  |
|-----------------------------|-----------------------|----|----|----|
| `league_variant`            | `classic`             | ✅ | ❌ | ✅ |
| `league_variant`            | `double`              | ✅ | ❌ | ⚠️ |
| `league_variant`            | `multiple`            | ✅ | ❌ | ⚠️ |
| `league_rounds_multiplier`  | `1`–`10`              | ✅ | ❌ | ⚠️ |

---

## Wertungssystem & Gleichstand

| Parameter                   | Wert                  | L  | K  | C  |
|-----------------------------|-----------------------|----|----|----|
| `league_scoring_system`     | `points`              | ✅ | ❌ | ✅ |
| `league_scoring_system`     | `difference`          | ✅ | ❌ | ✅ |
| `tie_breaking_rules`        | `wins`                | ✅ | ❌ | ✅ |
| `tie_breaking_rules`        | `diff`                | ✅ | ❌ | ✅ |
| `tie_breaking_rules`        | `goals_for`           | ✅ | ❌ | ✅ |

---

## Gruppenverteilung

| Parameter                   | Wert                  | L  | K  | C  |
|-----------------------------|-----------------------|----|----|----|
| `group_distribution`        | `random`              | ⚠️ | ❌ | ✅ |
| `group_distribution`        | `seeded`              | ⚠️ | ❌ | ✅ |
| `seeded_participant_ids`    | `[id, …]`             | ✅ | ✅ | ✅ |

---

## KO-Struktur (`ko_structure`)

| Parameter      | Wert                                | Beschreibung                            | L  | K  | C  |
|----------------|-------------------------------------|-----------------------------------------|----|----|----|
| `ko_structure` | `single_elimination`                | Einfach-KO                              | ❌ | ✅ | ✅ |
| `ko_structure` | `single_elimination_with_third`     | Einfach-KO + Spiel um Platz 3           | ❌ | ✅ | ✅ |
| `ko_structure` | `single_elimination_with_ranking`   | Einfach-KO + alle Platzierungsspiele    | ❌ | ✅ | ✅ |
| `ko_structure` | `consolation_bracket`               | Trostturnier nach Ausscheiden           | ❌ | ✅ | ✅ |
| `ko_structure` | `double_elimination`                | Doppel-KO (2 Niederlagen = Aus)         | ❌ | ✅ | ✅ |
| `ko_structure` | `triple_elimination`                | Triple-KO (3 Niederlagen = Aus)         | ❌ | ✅ | ✅ |
| `ko_structure` | `aggregate_ko`                      | KO mit Hin- und Rückspiel               | ❌ | ✅ | ✅ |
| `ko_structure` | `page_playoff`                      | Page-Playoff (4-Team-System)            | ❌ | ✅ | ✅ |
| `ko_structure` | `group_then_single_ko`              | Gruppen → Einfach-KO                    | ❌ | ❌ | ✅ |
| `ko_structure` | `group_then_double_ko`              | Gruppen → Doppel-KO                     | ❌ | ❌ | ✅ |
| `ko_structure` | `ko_with_group_winner_advantage`    | KO mit Vorteil für Gruppensieger        | ❌ | ❌ | ✅ |

---

## Auslosungsmethode (`ko_draw_method`)

| Parameter        | Wert                      | Beschreibung                               | L  | K  | C  |
|-----------------|---------------------------|--------------------------------------------|----|----|----|
| `ko_draw_method` | `fixed_cross`            | Feste Kreuzpaarung (Gr.1 vs Gr.2 etc.)     | ❌ | ❌ | ✅ |
| `ko_draw_method` | `same_position_cross`    | Platzgleiches Kreuzen                      | ❌ | ❌ | ✅ |
| `ko_draw_method` | `bonus_draw_for_winners` | Bonus-Auslosung für Gruppensieger          | ❌ | ❌ | ✅ |
| `ko_draw_method` | `overall_seeding`        | Gesamt-Seeding (ranglistenbasiert)         | ❌ | ✅ | ✅ |
| `ko_draw_method` | `pot_system`             | Topf-System (teilweise Zufall)             | ❌ | ✅ | ✅ |
| `ko_draw_method` | `full_random`            | Vollzufällige Auslosung (mit Sperrregeln)  | ❌ | ✅ | ✅ |
| `ko_draw_method` | `predefined_bracket`     | Vorgegebener Turnierbaum                   | ❌ | ✅ | ✅ |
| `ko_draw_method` | `manual`                 | Manuelle Paarungen durch Admin             | ❌ | ✅ | ✅ |

---

## KO-Startrunde (`ko_start_round`)

| Parameter         | Wert            | Teilnehmer | L  | K  | C  |
|------------------|-----------------|:----------:|----|----|----|
| `ko_start_round` | `round_of_32`   | 32         | ❌ | ✅ | ✅ |
| `ko_start_round` | `round_of_16`   | 16         | ❌ | ✅ | ✅ |
| `ko_start_round` | `quarterfinal`  | 8          | ❌ | ✅ | ✅ |
| `ko_start_round` | `semifinal`     | 4          | ❌ | ✅ | ✅ |
| `ko_start_round` | `final`         | 2          | ❌ | ✅ | ✅ |

---

## KO-Optionen & Sperrregeln

| Parameter                   | Wert      | Beschreibung                          | L  | K  | C  |
|----------------------------|-----------|---------------------------------------|----|----|----|
| `ko_third_place_match`     | `true`    | Spiel um Platz 3                      | ❌ | ✅ | ✅ |
| `ko_third_place_match`     | `false`   | Kein Spiel um Platz 3                 | ❌ | ✅ | ✅ |
| `ko_block_same_group`      | `true`    | Sperrregel: keine gleiche Gruppe      | ❌ | ❌ | ✅ |
| `ko_block_same_group`      | `false`   | Gleiche Gruppe erlaubt                | ❌ | ❌ | ✅ |
| `ko_block_same_position`   | `true`    | Sperrregel: keine gleiche Platzierung | ❌ | ❌ | ✅ |
| `ko_block_same_position`   | `false`   | Gleiche Platzierung erlaubt           | ❌ | ❌ | ✅ |
| `ko_group_winner_advantage`| `true`    | Vorteil für Gruppensieger             | ❌ | ❌ | ✅ |
| `ko_group_winner_advantage`| `false`   | Kein Vorteil                          | ❌ | ❌ | ✅ |
| `ko_random_seed`           | `integer` | Seed für reproduzierbare Auslosung    | ❌ | ✅ | ✅ |
| `ko_fallback_qualifiers`   | `[…]`     | Regeln für Rest-Qualifikanten         | ❌ | ❌ | ✅ |

---

## Einschränkungen ⚠️ – Analyse & Lösungen (Diskussionsbasis)

**Umsetzung (Backend):** Für die Fälle ⚠️ 1–3 liefert die API bei Verstoß **HTTP 422** mit deutschsprachiger Fehlermeldung (kein stiller Auto-Fix).

### ⚠️ 1 — `league_variant: double` / `multiple` im Modus C (Combined)

- **Einschränkung**: multipliziert Gruppenspiele; danach folgt noch vollständige KO-Phase → Turnierdauer wird unrealistisch und Qualifikationsvergleich wird schwieriger.\n+- **Problem**: Frontend versteckt Felder, Backend akzeptiert trotzdem per API.\n+- **Lösung**: Backend-Validierung (HTTP 422) **oder** Frontend-Warnung mit geschätzter Spielanzahl.

### ⚠️ 2 — `league_rounds_multiplier` im Modus C

- **Ursache**: an `league_variant: multiple` gebunden; in Combined ohne definierten Effekt.\n+- **Lösung**: wie ⚠️ 1 (Validierung oder Warnung/Normalisierung).

### ⚠️ 3 — `group_distribution: seeded` / `random` im Modus L bei `groups_count ≤ 1`

- **Einschränkung**: bei einer Gruppe gibt es nichts zu verteilen; „seeded“ (gesetzte Spieler auf mehrere Gruppen) ist nicht anwendbar.\n+- **Problem**: Frontend versteckt korrekt, Backend akzeptiert per API ohne Effekt.\n+- **Lösung**: Backend-Validierung (`seeded` nur bei `groups_count > 1`) **oder** automatische Normalisierung auf `random`.

