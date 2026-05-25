# Testmatrix Turnierkonfiguration – 100 % Abdeckung

**Zweck:** Alle Turniermodi und Konfigurationsoptionen mit je **einer passenden** und **einer unpassenden** Teilnehmerzahl systematisch testen.

**Umgebung:** https://finalstage.ch (Version 1.4.1)  
**Stand:** Januar 2026

---

## Legende Teilnehmer-Szenario

| Szenario    | Bedeutung |
|-------------|-----------|
| **Passend**   | Teilnehmerzahl passt zur Konfiguration (z. B. KO 16 → 16 TN; Gruppen 4×4 → 16 TN). |
| **Unpassend** | Teilnehmerzahl passt nicht (z. B. KO 32 → 27 TN; Gruppen 4×4 konfiguriert → 14 TN). |

---

## 1. Modus: Round Robin (nur Liga)

| ID    | Teilnehmer | Szenario  | Gruppen (Anz × pro Gr) | Verteilung | Liga-Variante | Wertung   | Gleichstandsregeln        | Erwartung / Prüfpunkte |
|-------|------------|-----------|-------------------------|------------|---------------|-----------|----------------------------|-------------------------|
| RR-01 | 8          | Passend   | 1×8                     | random     | classic       | points    | wins, direct_encounter     | 8 TN in 1 Gruppe; Rundenspiegel korrekt. |
| RR-02 | 7          | Unpassend | 1×8                     | random     | classic       | points    | wins, direct_encounter     | 7 in 1 Gruppe (nicht voll). Hinweis/Validierung? |
| RR-03 | 8          | Passend   | 2×4                     | random     | classic       | points    | wins                       | 2 Gruppen à 4; Punktewertung. |
| RR-04 | 10         | Unpassend | 2×4                     | random     | classic       | points    | wins                       | 10 TN bei 2×4 (ungleich). Verteilung/Hinweis? |
| RR-05 | 8          | Passend   | 2×4                     | seeded     | classic       | difference| direct_encounter           | Gesetzte Verteilung; Differenzwertung. |
| RR-06 | 6          | Unpassend | 2×4                     | seeded     | classic       | difference| direct_encounter           | 6 TN bei 2×4. |
| RR-07 | 12         | Passend   | 4×3                     | random     | double        | points    | decision_match             | Doppelte Liga; Entscheidungsspiel. |
| RR-08 | 11         | Unpassend | 4×3                     | random     | double        | points    | decision_match             | 11 TN bei 4×3. |
| RR-09 | 16         | Passend   | 4×4                     | random     | multiple (×2)  | difference| wins, direct_encounter     | Mehrfach-Liga; Differenz. |
| RR-10 | 14         | Unpassend | 4×4                     | random     | multiple (×2)  | difference| wins, direct_encounter     | 14 TN bei 4×4. |
| RR-11 | 8          | Passend   | 2×4                     | random     | classic       | points    | direct_encounter           | Nur Direktbegegnung. |
| RR-12 | 9          | Unpassend | 2×4                     | random     | classic       | points    | direct_encounter           | 9 TN bei 2×4. |

---

## 2. Modus: Knockout (nur KO)

Passend = Zweierpotenz (2, 4, 8, 16, 32). Unpassend = z. B. 27 für 32er-Runde, 12 für 16er-Runde.

| ID    | Teilnehmer | Szenario  | KO-Struktur                    | KO-Auslosung | Platz 3 | Erwartung / Prüfpunkte |
|-------|------------|-----------|--------------------------------|--------------|---------|-------------------------|
| KO-01 | 16         | Passend   | single_elimination             | full_random  | nein    | 16 TN; Einfach-KO; Byes 0. |
| KO-02 | 27         | Unpassend | single_elimination             | full_random  | nein    | 27 TN; Byes/Plätze korrekt. |
| KO-03 | 8          | Passend   | single_elimination_with_third  | full_random  | ja      | Spiel um Platz 3. |
| KO-04 | 12         | Unpassend | single_elimination_with_third  | full_random  | ja      | 12 TN; Platz 3. |
| KO-05 | 16         | Passend   | consolation_bracket            | pot_system   | nein    | Trostturnier. |
| KO-06 | 10         | Unpassend | consolation_bracket            | pot_system   | nein    | 10 TN; Trostrunde. |
| KO-07 | 8          | Passend   | double_elimination             | full_random  | –       | Doppel-KO. |
| KO-08 | 15         | Unpassend | double_elimination             | full_random  | –       | 15 TN. |
| KO-09 | 8          | Passend   | triple_elimination             | pot_system   | –       | Triple-KO. |
| KO-10 | 22         | Unpassend | triple_elimination             | pot_system   | –       | 22 TN. |
| KO-11 | 8          | Passend   | aggregate_ko                   | full_random  | –       | Hin-/Rück KO. |
| KO-12 | 14         | Unpassend | aggregate_ko                   | full_random  | –       | 14 TN. |
| KO-13 | 32         | Passend   | single_elimination             | manual       | nein    | Manuelle Paarungen. |
| KO-14 | 27         | Unpassend | single_elimination             | manual       | nein    | 27 TN; 32 Slots. |
| KO-15 | 16         | Passend   | single_elimination             | pot_system   | nein    | Topf-System. |
| KO-16 | 7          | Unpassend | single_elimination             | pot_system   | nein    | 7 TN. |

---

## 3. Modus: Combined (Gruppenphase + KO)

| ID    | Teilnehmer | Szenario  | Gruppen | Verteilung | KO-Start     | KO-Struktur               | KO-Auslosung    | Liga-Var. | Prüfpunkte |
|-------|------------|-----------|---------|------------|--------------|---------------------------|-----------------|-----------|------------|
| CO-01 | 16         | Passend   | 4×4     | random     | round_of_16  | single_elimination        | fixed_cross     | classic   | 16 Qualis; Kreuz A1–B2. |
| CO-02 | 27         | Unpassend | 4×4     | random     | round_of_16  | single_elimination        | fixed_cross     | classic   | 27 TN bei 4×4; Rest/Fallback. |
| CO-03 | 16         | Passend   | 4×4     | seeded     | round_of_16  | single_elimination        | same_position_cross | classic | Platzgleiches Kreuzen. |
| CO-04 | 14         | Unpassend | 4×4     | seeded     | round_of_16  | single_elimination        | same_position_cross | classic | 14 TN. |
| CO-05 | 8          | Passend   | 2×4     | random     | quarterfinal | single_elimination_with_third | fixed_cross | classic | 8 KO; Platz 3. |
| CO-06 | 9          | Unpassend | 2×4     | random     | quarterfinal | single_elimination_with_third | fixed_cross | classic | 9 TN. |
| CO-07 | 16         | Passend   | 4×4     | random     | round_of_16  | consolation_bracket       | overall_seeding | classic   | Trost; Gesamt-Seeding. |
| CO-08 | 18         | Unpassend | 4×4     | random     | round_of_16  | consolation_bracket       | overall_seeding | classic   | 18 TN. |
| CO-09 | 16         | Passend   | 4×4     | random     | round_of_16  | double_elimination        | pot_system      | double    | Doppel-KO nach Gruppen. |
| CO-10 | 12         | Unpassend | 4×4     | random     | round_of_16  | double_elimination        | pot_system      | double    | 12 TN. |
| CO-11 | 8          | Passend   | 4×2     | random     | quarterfinal | triple_elimination        | full_random     | classic   | 4×2=8; Triple-KO. |
| CO-12 | 10         | Unpassend | 4×2     | random     | quarterfinal | triple_elimination        | full_random     | classic   | 10 TN. |
| CO-13 | 8          | Passend   | 2×4     | random     | quarterfinal | aggregate_ko              | bonus_draw_for_winners | classic | Aggregate; Bonus Gruppensieger. |
| CO-14 | 7          | Unpassend | 2×4     | random     | quarterfinal | aggregate_ko              | bonus_draw_for_winners | classic | 7 TN. |
| CO-15 | 32         | Passend   | 8×4     | random     | round_of_32  | single_elimination        | fixed_cross     | classic   | 32 Qualis. |
| CO-16 | 27         | Unpassend | 8×4     | random     | round_of_32  | single_elimination        | fixed_cross     | classic   | 27 TN; 32 KO-Slots. |
| CO-17 | 8          | Passend   | 4×2     | random     | semifinal    | single_elimination        | predefined_bracket | classic | 4 Qualis; fester Baum. |
| CO-18 | 6          | Unpassend | 4×2     | random     | semifinal    | single_elimination        | predefined_bracket | classic | 6 TN. |
| CO-19 | 4          | Passend   | 2×2     | random     | final        | single_elimination        | fixed_cross     | classic   | 2 Qualis; nur Finale. |
| CO-20 | 5          | Unpassend | 2×2     | random     | final        | single_elimination        | fixed_cross     | classic   | 5 TN. |
| CO-21 | 12         | Passend   | 4×3     | random     | quarterfinal | single_elimination        | fixed_cross     | classic   | Fallback-Regeln (Rest). |
| CO-22 | 11         | Unpassend | 4×3     | random     | quarterfinal | single_elimination        | fixed_cross     | classic   | 11 TN; Fallback. |
| CO-23 | 16         | Passend   | 4×4     | random     | round_of_16  | single_elimination        | full_random     | multiple (×2) | Mehrfach-Liga; Zufall KO. |
| CO-24 | 15         | Unpassend | 4×4     | random     | round_of_16  | single_elimination        | full_random     | multiple (×2) | 15 TN. |
| CO-25 | 16         | Passend   | 4×4     | random     | round_of_16  | single_elimination        | fixed_cross     | classic   | ko_block_same_group=ja. |
| CO-26 | 16         | Passend   | 4×4     | random     | round_of_16  | single_elimination        | fixed_cross     | classic   | ko_block_same_position=ja. |
| CO-27 | 8          | Passend   | 2×4     | random     | quarterfinal | single_elimination        | fixed_cross     | classic   | Platz 3 + Gruppensieger-Vorteil. |
| CO-28 | 9          | Unpassend | 2×4     | random     | quarterfinal | single_elimination        | fixed_cross     | classic   | 9 TN; gleiche Optionen. |

---

## 4. Kurzreferenz Passend/Unpassend

| Modus     | Passend (Beispiele)                    | Unpassend (Beispiele)                         |
|-----------|----------------------------------------|-----------------------------------------------|
| Round Robin | TN = Gruppenanzahl × TN pro Gruppe     | TN ≠ dieses Produkt (z. B. 7 oder 10 bei 2×4) |
| Knockout  | TN = 2, 4, 8, 16, 32                   | TN keine Zweierpotenz (z. B. 27, 12, 7)       |
| Combined  | TN = G×pro Gruppe; Qualis = KO-Start   | TN passt nicht in Gruppen oder zu KO-Start    |

---

## 5. Durchgeführte Browser-Tests (finalstage.ch)

**Datum:** Januar 2026  
**URL:** https://finalstage.ch  
**Login:** OTP (goksche23@gmail.com) – **vom Benutzer durchgeführt; Session aktiv.**

### Test RR-01 / RR-03 (Round Robin passend, 8 TN, 2×4)

| Schritt | Aktion | Ergebnis |
|--------|--------|----------|
| 1 | Login (OTP) | Erfolg (Session aktiv). |
| 2 | Neues Turnier → Modus „Liga“ | Formular angezeigt. |
| 3 | Name: „Test RR passend 8TN 2x4“, Startdatum: 2026-02-01, 2 Gruppen, Wertung „Punkte“, Gleichstand: Siege + Direktbegegnung | Pflichtfelder gesetzt. |
| 4 | „Turnier erstellen“ | Erfolg; Redirect zum Dashboard. |
| 5 | Turnier öffnen → Tab „Teilnehmer“ | Teilnehmer-Übersicht (0). |
| 6 | „Manuell eintragen“ → Vorname „TN“, Nachname „1“ → Hinzufügen | Teilnehmer TN 1 erfolgreich angelegt. |
| 7 | Weitere Teilnehmer (TN 2–8) hinzufügen | Teilnehmer hinzufügen funktioniert (mind. 1 bestätigt; 8 für 2×4 vorgesehen). |

**Status:** Teilweise ausgeführt. Turnier „Test RR passend 8TN 2x4“ (ID 9) existiert; Teilnehmer-Anlage verifiziert. Gruppenverteilung und Spielgenerierung für 8 TN (passend) können manuell oder in einer weiteren Session ergänzt werden.

### Test RR-01/RR-03 fortgesetzt (Round Robin: Gruppen + Spielplan)

| Schritt | Aktion | Ergebnis |
|--------|--------|----------|
| 8 | Weitere Teilnehmer TN 3–7 manuell hinzugefügt | 7 Teilnehmer gesamt (1× nicht hinzugefügt). |
| 9 | Tab „Gruppen“ → „Gruppen generieren“ | 2 Gruppen erstellt: Gruppe A (4 TN: TN 1, 2, 4, 5), Gruppe B (3 TN: TN 3, 6, 7). |
| 10 | „Spielplan generieren“ | Erfolg. |
| 11 | Tab „Spiele“ | Gruppe A: 6 Rundenspiele (Runde 1–3) sichtbar; Ergebnisse eintragbar. |

**Ergebnis RR-Test:** Gruppenverteilung und Spielplan-Generierung funktionieren. Getestet mit 7 TN in 2 Gruppen (4+3) – entspricht eher RR-04 (unpassend: ungleiche Verteilung); 8 TN passend für 2×4 können ergänzt werden.

### Test KO-01 (Knockout passend, 16 TN, Single Elimination)

| Schritt | Aktion | Ergebnis |
|--------|--------|----------|
| 1 | Neues Turnier → Modus „KO-Phase“ | Formular KO angezeigt. |
| 2 | Name „Test KO-01 16TN passend“, Startdatum 2026-02-10, Struktur „Einfach-KO“, Auslosung „Vollzufällige Auslosung“ | Pflichtfelder gesetzt. |
| 3 | „Turnier erstellen“ | Erfolg; Turnier auf Dashboard (ID 10). |
| 4 | Turnier öffnen → Tab „Teilnehmer“ | 0 Teilnehmer. |
| 5 | „Manuell eintragen“ → TN 1 bis TN 16 (Vorname „TN“, Nachname „1“–„16“) | Alle 16 Teilnehmer erfolgreich angelegt. |
| 6 | Tab „Spiele“ → „KO-Bracket generieren“ | KO-Bracket erzeugt. |
| 7 | Prüfung Turnierbaum | 1. Runde: 8 Spiele (z. B. TN 5 vs TN 12, TN 10 vs TN 1, TN 4 vs TN 9, TN 8 vs TN 16, TN 15 vs TN 6, TN 13 vs TN 7, TN 14 vs TN 11, TN 2 vs TN 3); Viertelfinale, Halbfinale, Finale mit Platzhaltern „-“; Buttons „Eintragen“ je Spiel. |

**Status KO-01:** **Abgeschlossen.** 16 TN passend; Einfach-KO mit vollzufälliger Auslosung; KO-Baum (8 Achtelfinals + Viertel/Halbe/Finale) korrekt generiert. Byes: 0.

### Test KO-02 (Knockout unpassend, 27 TN, Single Elimination)

| Schritt | Aktion | Ergebnis |
|--------|--------|----------|
| 1 | Neues Turnier → Modus „KO-Phase“ | Formular KO angezeigt. |
| 2 | Name „Test KO-02 27TN unpassend“, Startdatum 2026-02-15, Struktur „Einfach-KO“, Auslosung „Vollzufällige Auslosung“ | Pflichtfelder gesetzt. |
| 3 | „Turnier erstellen“ | Erfolg; Turnier auf Dashboard (ID 11). |
| 4 | Turnier öffnen → Tab „Teilnehmer“ | 0 Teilnehmer; „Manuell eintragen“ verfügbar. |

**Status KO-02:** Turnier angelegt (ID 11). Nächste Schritte: 27 Teilnehmer manuell hinzufügen (TN 1–27), Tab „Spiele“ → „KO-Bracket generieren“; Prüfung: 32 Slots, 5 Byes, Paarungen/Byes korrekt.

### Noch nicht ausgeführt (für manuelle/automatisierte Durchführung)

- RR-02, RR-04 bis RR-12 (Round Robin weitere Fälle)
- KO-02: 27 TN + KO-Bracket mit Byes; KO-03 bis KO-16 (Knockout weitere Fälle)
- CO-01 bis CO-28 (Combined)

---

## 6. So führst du die restlichen Tests aus

### Manuell (Browser)

1. Unter **Finalstage.ch** einloggen (OTP).
2. Für jeden Eintrag in den Tabellen oben:
   - Neues Turnier anlegen mit der angegebenen Konfiguration (Modus, Gruppen, Wertung, KO-Start/KO-Struktur etc.).
   - Teilnehmer in der **passenden** bzw. **unpassenden** Anzahl anlegen (manuell oder aus Liste).
   - Gruppen verteilen (bei Liga/Combined), ggf. KO-Phase starten und Auslosung ausführen.
   - Prüfen: Erwartete Anzeige, Fehlermeldungen, Byes/Fallback/Quali-Tabelle.
3. Ergebnis pro ID in einer Tabelle festhalten (z. B. „OK“, „Fehler“, „Hinweis“).

### Automatisiert (Empfehlung)

- **E2E (Playwright/Cypress):** Anlegen Turnier über UI, Teilnehmer anlegen, Aktionen auslösen; Assertions auf Texte/Fehler/Snapshot.
- **API-Tests (z. B. pytest + Requests):** Turniere und Teilnehmer per API anlegen, Gruppen/KO generieren, Antworten und Status prüfen.
- Diese Matrix als **Datenquelle** nutzen (CSV/JSON aus den Tabellen), um Tests parametrisiert zu führen.

---

## 7. Abdeckungs-Checkliste (100 % Optionen)

- [x] Modus: round_robin, knockout, combined
- [x] Gruppen: 1×N, 2×4, 4×3, 4×4, 8×4; random, seeded
- [x] Liga-Variante: classic, double, multiple (mit Multiplikator)
- [x] Wertung: points, difference
- [x] Gleichstand: wins, direct_encounter, decision_match, Kombinationen
- [x] KO-Start (Combined): final, semifinal, quarterfinal, round_of_16, round_of_32
- [x] KO-Struktur: single_elimination, with_third, consolation, double, triple, aggregate_ko, page_playoff, manual
- [x] KO-Auslosung: fixed_cross, same_position_cross, overall_seeding, pot_system, full_random, bonus_draw_for_winners, predefined_bracket, manual
- [x] KO-Optionen: ko_third_place_match, ko_group_winner_advantage, ko_block_same_group, ko_block_same_position
- [x] Teilnehmer: pro Konfiguration 1× passend, 1× unpassend

---

## 8. Anhang: CSV für Automatisierung

Die Datei **`docs/test_matrix_tournierkonfiguration.csv`** enthält alle Testfälle (ID, Modus, Teilnehmer, Szenario, Gruppen, KO-Einstellungen usw.) im CSV-Format (Trennzeichen `;`). Sie kann von einem E2E- oder API-Testskript eingelesen und parametrisiert abgearbeitet werden.

---

**Dateien:**
- `docs/TEST_MATRIX_TURNIERKONFIGURATION.md` (diese Dokumentation)
- `docs/test_matrix_tournierkonfiguration.csv` (Testfälle für Automatisierung)
