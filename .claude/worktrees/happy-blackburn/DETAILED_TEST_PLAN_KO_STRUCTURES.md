# Detaillierter Testplan: KO-Strukturen

## Übersicht

Dieser Testplan deckt die Implementierung und den Test der neuen KO-Strukturen ab:
- Double Elimination
- Triple Elimination
- Aggregate KO

## Testumgebung

- **Backend**: FastAPI mit SQLAlchemy
- **Frontend**: React/TypeScript
- **Datenbank**: PostgreSQL
- **Testmodus**: Manuelle Tests + Automatisierte Unit-Tests (geplant)

## Testbereiche

### 1. Double Elimination

#### 1.1 Bracket-Generierung

**Test-ID**: DE-001  
**Beschreibung**: Double Elimination Bracket für KO-only Turnier generieren  
**Schritte**:
1. Neues Turnier erstellen (Mode: Knockout)
2. 8 Teilnehmer hinzufügen
3. KO-Struktur: `double_elimination` auswählen
4. Auslosungsmethode: `full_random`
5. KO-Bracket generieren
6. Bracket-Struktur prüfen

**Erwartetes Ergebnis**:
- Winners Bracket: Runden 1, 2, 3 (Finale)
- Losers Bracket: Runden -1001, -1002, -1003, -1004
- Grand Final: Runde 2000
- Zweites Grand Final: Runde 2001 (falls nötig)
- Alle Matches haben `bracket_type: 'winners'` oder `'losers'` oder `'grand_final'`

**Test-ID**: DE-002  
**Beschreibung**: Double Elimination Bracket für Combined Turnier generieren  
**Schritte**:
1. Neues Turnier erstellen (Mode: Combined)
2. 2 Gruppen mit je 4 Teilnehmern
3. Gruppenphase abschließen
4. KO-Struktur: `double_elimination` auswählen
5. KO-Bracket generieren
6. Bracket-Struktur prüfen

**Erwartetes Ergebnis**:
- Nur qualifizierte Teilnehmer aus Gruppenphase im Bracket
- Winners Bracket und Losers Bracket korrekt generiert

**Test-ID**: DE-003  
**Beschreibung**: Double Elimination mit verschiedenen Teilnehmeranzahlen  
**Schritte**:
1. Teste mit 4, 8, 16, 32 Teilnehmern
2. Prüfe Bracket-Größe (muss Potenz von 2 sein)
3. Prüfe Anzahl der Runden

**Erwartetes Ergebnis**:
- Bracket-Größe wird auf nächste Potenz von 2 aufgerundet
- Byes werden korrekt behandelt
- Anzahl der Runden ist korrekt

#### 1.2 Propagation (Ergebnis-Weiterleitung)

**Test-ID**: DE-004  
**Beschreibung**: Winner aus Winners Bracket propagiert  
**Schritte**:
1. Double Elimination Bracket generieren
2. Ergebnis in Winners Bracket Runde 1 eintragen
3. Prüfe, ob Winner in Runde 2 propagiert wurde
4. Prüfe, ob Loser in Losers Bracket propagiert wurde

**Erwartetes Ergebnis**:
- Winner erscheint in nächster Winners Bracket Runde
- Loser erscheint in entsprechender Losers Bracket Runde

**Test-ID**: DE-005  
**Beschreibung**: Losers Bracket Propagation  
**Schritte**:
1. Double Elimination Bracket generieren
2. Alle Matches der ersten Winners Bracket Runde abschließen
3. Prüfe, ob alle Loser in Losers Bracket zugewiesen wurden
4. Ergebnis in Losers Bracket eintragen
5. Prüfe Propagation in Losers Bracket

**Erwartetes Ergebnis**:
- Alle Loser aus Winners Bracket Runde 1 erscheinen in Losers Bracket
- Winner aus Losers Bracket wird in nächste Losers Bracket Runde propagiert

**Test-ID**: DE-006  
**Beschreibung**: Grand Final Propagation  
**Schritte**:
1. Double Elimination Bracket generieren
2. Winners Bracket bis zum Finale abschließen
3. Losers Bracket bis zum Finale abschließen
4. Prüfe, ob beide Finalisten im Grand Final (Runde 2000) erscheinen

**Erwartetes Ergebnis**:
- Winner aus Winners Bracket Finale erscheint im Grand Final
- Winner aus Losers Bracket Finale erscheint im Grand Final

**Test-ID**: DE-007  
**Beschreibung**: Zweites Grand Final (falls nötig)  
**Schritte**:
1. Double Elimination Bracket generieren
2. Grand Final (Runde 2000) abschließen
3. Falls Losers Bracket Winner gewinnt, prüfe ob zweites Grand Final (Runde 2001) erstellt wird

**Erwartetes Ergebnis**:
- Wenn Losers Bracket Winner das erste Grand Final gewinnt, wird zweites Grand Final benötigt
- Beide Finalisten erscheinen im zweiten Grand Final

### 2. Triple Elimination

#### 2.1 Bracket-Generierung

**Test-ID**: TE-001  
**Beschreibung**: Triple Elimination Bracket für KO-only Turnier generieren  
**Schritte**:
1. Neues Turnier erstellen (Mode: Knockout)
2. 8 Teilnehmer hinzufügen
3. KO-Struktur: `triple_elimination` auswählen
4. Auslosungsmethode: `full_random`
5. KO-Bracket generieren
6. Bracket-Struktur prüfen

**Erwartetes Ergebnis**:
- Winners Bracket: Runden 1, 2, 3 (Finale)
- First Losers Bracket: Runden -2001, -2002, -2003
- Second Losers Bracket: Runden -3001, -3002
- Grand Final: Runde 4000
- Alle Matches haben korrekten `bracket_type`

**Test-ID**: TE-002  
**Beschreibung**: Triple Elimination mit verschiedenen Teilnehmeranzahlen  
**Schritte**:
1. Teste mit 4, 8, 16 Teilnehmern
2. Prüfe Bracket-Größe und Rundenanzahl

**Erwartetes Ergebnis**:
- Bracket-Größe wird korrekt aufgerundet
- Alle drei Brackets werden korrekt generiert

#### 2.2 Propagation

**Test-ID**: TE-003  
**Beschreibung**: Propagation durch alle drei Brackets  
**Schritte**:
1. Triple Elimination Bracket generieren
2. Ergebnis in Winners Bracket Runde 1 eintragen
3. Prüfe, ob Loser in First Losers Bracket propagiert wurde
4. Ergebnis in First Losers Bracket eintragen
5. Prüfe, ob Loser in Second Losers Bracket propagiert wurde

**Erwartetes Ergebnis**:
- Loser aus Winners Bracket → First Losers Bracket
- Loser aus First Losers Bracket → Second Losers Bracket
- Winner aus Second Losers Bracket → Grand Final

**Test-ID**: TE-004  
**Beschreibung**: Grand Final Propagation  
**Schritte**:
1. Triple Elimination Bracket generieren
2. Alle Brackets bis zum Finale abschließen
3. Prüfe, ob beide Finalisten im Grand Final (Runde 4000) erscheinen

**Erwartetes Ergebnis**:
- Winner aus Winners Bracket Finale erscheint im Grand Final
- Winner aus Second Losers Bracket Finale erscheint im Grand Final

### 3. Aggregate KO

#### 3.1 Bracket-Generierung

**Test-ID**: AG-001  
**Beschreibung**: Aggregate KO Bracket für KO-only Turnier generieren  
**Schritte**:
1. Neues Turnier erstellen (Mode: Knockout)
2. 8 Teilnehmer hinzufügen
3. KO-Struktur: `aggregate_ko` auswählen
4. Auslosungsmethode: `full_random`
5. KO-Bracket generieren
6. Bracket-Struktur prüfen

**Erwartetes Ergebnis**:
- Jede Runde hat zwei Matches pro Paarung (Leg 1 und Leg 2)
- Leg 1: player1_id vs player2_id
- Leg 2: player2_id vs player1_id (Home/Away getauscht)
- Alle Matches haben `leg: 1` oder `leg: 2`
- Alle Matches haben `bracket_type: 'aggregate'`

**Test-ID**: AG-002  
**Beschreibung**: Aggregate KO mit verschiedenen Teilnehmeranzahlen  
**Schritte**:
1. Teste mit 4, 8, 16 Teilnehmern
2. Prüfe, ob für jede Paarung zwei Matches existieren

**Erwartetes Ergebnis**:
- Für jede Paarung existieren genau zwei Matches (Leg 1 und Leg 2)
- Home/Away wird korrekt getauscht

#### 3.2 Propagation

**Test-ID**: AG-003  
**Beschreibung**: Aggregate Score Berechnung  
**Schritte**:
1. Aggregate KO Bracket generieren
2. Ergebnis für Leg 1 eintragen (z.B. 2:1)
3. Ergebnis für Leg 2 eintragen (z.B. 1:0)
4. Prüfe, ob Winner basierend auf Aggregate Score korrekt propagiert wird

**Erwartetes Ergebnis**:
- Aggregate Score wird korrekt berechnet (Leg 1 + Leg 2)
- Winner wird in nächste Runde propagiert
- Bei Gleichstand: Away Goals Rule (falls implementiert)

**Test-ID**: AG-004  
**Beschreibung**: Propagation in nächste Runde  
**Schritte**:
1. Aggregate KO Bracket generieren
2. Alle Matches der ersten Runde (beide Legs) abschließen
3. Prüfe, ob Winner in nächste Runde propagiert wird
4. Prüfe, ob beide Legs der nächsten Runde erstellt wurden

**Erwartetes Ergebnis**:
- Winner erscheint in beiden Legs der nächsten Runde
- Home/Away wird korrekt zugewiesen

### 4. UI/UX Tests

#### 4.1 Bracket-Anzeige

**Test-ID**: UI-001  
**Beschreibung**: Double Elimination Bracket in UI anzeigen  
**Schritte**:
1. Double Elimination Turnier erstellen
2. Bracket generieren
3. Bracket-Ansicht öffnen
4. Prüfe, ob Winners Bracket und Losers Bracket getrennt angezeigt werden

**Erwartetes Ergebnis**:
- Winners Bracket und Losers Bracket sind klar getrennt
- Register/Tabs für verschiedene Ansichten (falls implementiert)
- Grand Final ist deutlich markiert

**Test-ID**: UI-002  
**Beschreibung**: Triple Elimination Bracket in UI anzeigen  
**Schritte**:
1. Triple Elimination Turnier erstellen
2. Bracket generieren
3. Bracket-Ansicht öffnen
4. Prüfe, ob alle drei Brackets angezeigt werden

**Erwartetes Ergebnis**:
- Alle drei Brackets sind klar getrennt
- Navigation zwischen Brackets funktioniert
- Grand Final ist deutlich markiert

**Test-ID**: UI-003  
**Beschreibung**: Aggregate KO Bracket in UI anzeigen  
**Schritte**:
1. Aggregate KO Turnier erstellen
2. Bracket generieren
3. Bracket-Ansicht öffnen
4. Prüfe, ob beide Legs pro Paarung angezeigt werden

**Erwartetes Ergebnis**:
- Beide Legs werden klar als "Hinspiel" und "Rückspiel" markiert
- Aggregate Score wird angezeigt (falls implementiert)
- Navigation zwischen Runden funktioniert

#### 4.2 Ergebnis-Eingabe

**Test-ID**: UI-004  
**Beschreibung**: Ergebnis-Eingabe für Double Elimination  
**Schritte**:
1. Double Elimination Turnier erstellen
2. Bracket generieren
3. Ergebnis in Winners Bracket eintragen
4. Prüfe, ob Propagation in UI sichtbar ist

**Erwartetes Ergebnis**:
- Ergebnis kann eingegeben werden
- Propagation ist sofort sichtbar
- Loser erscheint automatisch im Losers Bracket

**Test-ID**: UI-005  
**Beschreibung**: Ergebnis-Eingabe für Aggregate KO  
**Schritte**:
1. Aggregate KO Turnier erstellen
2. Bracket generieren
3. Ergebnis für Leg 1 eintragen
4. Ergebnis für Leg 2 eintragen
5. Prüfe, ob Aggregate Score angezeigt wird

**Erwartetes Ergebnis**:
- Beide Legs können unabhängig eingegeben werden
- Aggregate Score wird automatisch berechnet und angezeigt
- Winner wird basierend auf Aggregate Score bestimmt

### 5. Edge Cases und Fehlerbehandlung

#### 5.1 Ungültige Konfigurationen

**Test-ID**: EC-001  
**Beschreibung**: Double Elimination mit zu wenigen Teilnehmern  
**Schritte**:
1. Neues Turnier erstellen
2. Nur 1 Teilnehmer hinzufügen
3. KO-Struktur: `double_elimination` auswählen
4. Versuche Bracket zu generieren

**Erwartetes Ergebnis**:
- Fehlermeldung: "Mindestens 2 Teilnehmer benötigt"

**Test-ID**: EC-002  
**Beschreibung**: Aggregate KO mit ungerader Teilnehmeranzahl  
**Schritte**:
1. Neues Turnier erstellen
2. 5 Teilnehmer hinzufügen
3. KO-Struktur: `aggregate_ko` auswählen
4. Bracket generieren
5. Prüfe, ob Bye korrekt behandelt wird

**Erwartetes Ergebnis**:
- Bracket wird auf 8 Teilnehmer aufgerundet
- Bye wird korrekt behandelt

#### 5.2 Unvollständige Matches

**Test-ID**: EC-003  
**Beschreibung**: Propagation bei unvollständigem Aggregate KO Match  
**Schritte**:
1. Aggregate KO Bracket generieren
2. Nur Leg 1 abschließen
3. Prüfe, ob Propagation verhindert wird

**Erwartetes Ergebnis**:
- Propagation erfolgt erst, wenn beide Legs abgeschlossen sind
- Fehlermeldung, falls versucht wird, mit nur einem Leg zu propagieren

### 6. Integrationstests

#### 6.1 Kombinierte Turniere

**Test-ID**: INT-001  
**Beschreibung**: Double Elimination nach Gruppenphase  
**Schritte**:
1. Combined Turnier erstellen
2. Gruppenphase abschließen
3. KO-Struktur: `double_elimination` auswählen
4. Bracket generieren
5. Prüfe, ob nur qualifizierte Teilnehmer im Bracket sind

**Erwartetes Ergebnis**:
- Nur qualifizierte Teilnehmer erscheinen im Bracket
- Bracket-Struktur ist korrekt
- Propagation funktioniert

#### 6.2 Verschiedene Auslosungsmethoden

**Test-ID**: INT-002  
**Beschreibung**: Double Elimination mit verschiedenen Auslosungsmethoden  
**Schritte**:
1. Teste mit `full_random`, `pot_system`, `overall_seeding`
2. Prüfe, ob Auslosung korrekt funktioniert

**Erwartetes Ergebnis**:
- Alle Auslosungsmethoden funktionieren korrekt
- Seed wird korrekt verwendet (wenn gesetzt)

### 7. Performance-Tests

#### 7.1 Große Turniere

**Test-ID**: PERF-001  
**Beschreibung**: Double Elimination mit 32 Teilnehmern  
**Schritte**:
1. Turnier mit 32 Teilnehmern erstellen
2. Double Elimination Bracket generieren
3. Prüfe Generierungszeit
4. Prüfe Bracket-Größe

**Erwartetes Ergebnis**:
- Generierung erfolgt in < 1 Sekunde
- Alle Matches werden korrekt erstellt
- UI bleibt responsiv

### 8. Regressionstests

#### 8.1 Bestehende Funktionalität

**Test-ID**: REG-001  
**Beschreibung**: Consolation Bracket funktioniert weiterhin  
**Schritte**:
1. Turnier mit `consolation_bracket` erstellen
2. Bracket generieren
3. Prüfe, ob alles wie zuvor funktioniert

**Erwartetes Ergebnis**:
- Consolation Bracket funktioniert wie zuvor
- Keine Regressionen

**Test-ID**: REG-002  
**Beschreibung**: Single Elimination funktioniert weiterhin  
**Schritte**:
1. Turnier ohne spezielle KO-Struktur erstellen
2. Bracket generieren
3. Prüfe, ob Single Elimination wie zuvor funktioniert

**Erwartetes Ergebnis**:
- Single Elimination funktioniert wie zuvor
- Keine Regressionen

## Testdurchführung

### Priorisierung

1. **Kritisch**: DE-001, DE-004, AG-001, AG-003, UI-001, UI-003
2. **Hoch**: DE-002, TE-001, TE-003, UI-002, UI-004, UI-005
3. **Mittel**: DE-003, TE-002, AG-002, EC-001, EC-002, INT-001
4. **Niedrig**: DE-005, DE-006, DE-007, TE-004, EC-003, INT-002, PERF-001, REG-001, REG-002

### Testdokumentation

- Jeder Test wird in einem Test-Ticket dokumentiert
- Ergebnisse werden in Test-Report gesammelt
- Fehler werden als Issues erfasst

### Automatisierung (Zukunft)

- Unit-Tests für Bracket-Generierung
- Integrationstests für Propagation
- E2E-Tests für UI-Flows

## Erfolgskriterien

- Alle kritischen Tests bestehen
- Mindestens 90% der Tests bestehen
- Keine kritischen Bugs
- Performance ist akzeptabel (< 1s für Bracket-Generierung)

## Offene Punkte

- Away Goals Rule für Aggregate KO (noch nicht implementiert)
- UI-Register/Tabs für Double/Triple Elimination (noch nicht implementiert)
- Aggregate Score Anzeige in UI (noch nicht implementiert)
- Automatisierte Tests (geplant)
