# Modi-Testmatrix — Server B (test.finalstage.ch)

**Ziel:** Turnier-Modi **L** (Liga), **K** (KO), **C** (Kombi) sowie ausgewählte Varianten **manuell end-to-end** prüfen: Wizard durchklicken, speichern, Turnier öffnen, ohne Blocker (422/500).

**Referenz (Detailregeln / ⚠️):** [`turniermodus-matrix.md`](turniermodus-matrix.md)

**Vor jedem Lauf:** `./scripts/run_modes_matrix_gate_server_b.sh` (Contract + QA-Gate) · eingeloggt auf `https://test.finalstage.ch`

**Minimal-Setup pro Turnier:** wenige echte Teilnehmer (z. B. 4–8), passend zur gewählten Gruppen-/KO-Logik.

---

## Ergebnis / Bugs

| ID | Datum | Modus | Kurzbeschreibung | Ergebnis | Ticket/Notiz |
|----|-------|-------|------------------|----------|--------------|
|    |       |       |                  |          |              |

*(Leere Zeilen kopieren. „Fixes definieren“ = Eintrag in nächstem Release oder separates Bug-Ticket.)*

---

## Stufe A — Pflichtminimum (ca. 30–45 Min.)

Jede Zeile: Wizard **Schritt 1–5** durchlaufen → Speichern → Turnierliste → Turnier öffnen → Kurz prüfen (Tabs Gruppen/KO je nach Modus).

| ☐ | Modus | Kurzsetup | Erwartung |
|---|--------|-----------|-----------|
| ☐ | **L** Liga | `round_robin`, Gruppenphase an, keine KO · z. B. 2 Gruppen à 4 · Verteilung zufällig · Punkte/Differenz wie Standard | Turnier angelegt; Gruppenspiele/Plan erzeugbar; keine roten API-Fehler |
| ☐ | **K** KO | `knockout`, keine Gruppenphase · Einfach-KO · eine übliche Auslosung (z. B. `full_random` oder `pot_system`) · Teilnehmerzahl Potenz-von-2 oder mit Freilosen akzeptiert | KO-Runden / Bracket sichtbar; Ergebnis eintragbar |
| ☐ | **C** Kombi | `combined`, Gruppen + KO · z. B. `group_then_single_ko` oder `single_elimination` · eine Cross-Auslosung (`fixed_cross` / `same_position_cross`) mit 2 Gruppen | Qualifikation + KO nachvollziehbar; keine inkonsistente Anzeige |

---

## Stufe B — Varianten-Stichprobe (Matrix)

Nicht jede Zelle einzeln nötig; **repräsentative** Kombinationen aus [`turniermodus-matrix.md`](turniermodus-matrix.md).

### Liga (`league_variant`) — nur wo `mode` Liga oder Kombi Gruppenphase

| ☐ | `league_variant` | Kontext | Kurzcheck |
|---|------------------|---------|-----------|
| ☐ | `classic` | L oder C | Normale Rundentabelle |
| ☐ | `double` | nur L oder C | ⚠️ Matrix: bei C ggf. lang — nur speichern + Hinweis notieren |
| ☐ | `multiple` | nur L oder C | ⚠️ wie oben |

### Wertung (`league_scoring_system` / Tie-Break)

| ☐ | Setting | Kontext | Kurzcheck |
|---|---------|---------|-----------|
| ☐ | `points` | L/C | Tabelle zeigt Punkte |
| ☐ | `difference` | L/C | Tabelle berücksichtigt Diff |
| ☐ | `wins` (Tie-Break-Pfad) | L/C | Speichern + Tabellenkopf konsistent |

### Gruppenverteilung (`group_distribution`)

| ☐ | Wert | Kontext | Kurzcheck |
|---|------|---------|-----------|
| ☐ | `random` | L/C mit ≥2 Gruppen | Gruppen gefüllt |
| ☐ | `seeded` | L/C mit ≥2 Gruppen + Gesetzte markiert | ⚠️ Matrix: ohne Gesetzte darf Backend 400 liefern — erwartetes Verhalten dokumentieren |
| ☐ | `manual` | L/C | Leere Gruppen / manuelle Zuweisung wie UI vorsieht |

### KO-Struktur (`ko_structure`) — Stichprobe K und C

*(Wizard zeigt je nach Modus unterschiedliche Optionen — nur gültige Kombinationen laut Matrix testen.)*

| ☐ | `ko_structure` | Modus | Kurzcheck |
|---|------------------|-------|-----------|
| ☐ | `single_elimination` | K, C | Basis-KO |
| ☐ | `single_elimination_with_third` | K, C | Bronze-Hinweis / Platz 3 |
| ☐ | `single_elimination_with_ranking` | K, C | Neu im UI — speichern + laden |
| ☐ | `double_elimination` | K, C | zwei Schienen / mehr Spiele |
| ☐ | `group_then_single_ko` | nur C | nach Gruppen → KO |
| ☐ | `group_then_double_ko` | nur C | wie UI/API erlauben |

---

## Stufe C — Regression nach Releases

Nach Deploy auf Server B mindestens **Stufe A** wiederholen; bei Änderungen an Engine/Wizard zusätzlich betroffene Zeilen aus Stufe B.

---

## Definition of Done (dieses Todo)

- [ ] Stufe **A** durchgeführt und Tabelle „Ergebnis / Bugs“ befüllt oder „keine Abweichungen“.
- [ ] Offene Abweichungen priorisiert (Fix im nächsten Schritt / separates Arbeitspaket).
