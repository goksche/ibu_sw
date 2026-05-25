# Migration Guide: v1.0.0 → v1.1.0

Dieser Guide erklärt, wie Sie von IBU Turniere v1.0.0 auf v1.1.0 migrieren.

## Überblick

**v1.1.0** bringt erhebliche Verbesserungen in Stabilität, Sicherheit und Wartbarkeit bei vollständiger Rückwärtskompatibilität zu v1.0.0.

### Wichtige Änderungen
- **Datenintegrität**: Foreign Key Constraints verhindern Waisen-Datensätze
- **Fehlerbehandlung**: Robuste Exception-Behandlung für alle Szenarien
- **Input Validation**: Alle Eingaben werden validiert und bereinigt
- **Memory Management**: Automatische Ressourcenbereinigung
- **Logging**: Strukturierte Logs für besseres Debugging

## Vorbereitung

### 1. Backup erstellen

**WICHTIG**: Erstellen Sie vor der Migration ein vollständiges Backup!

```bat
:: 1) App beenden
:: IBU Turniere v1.0.0 vollständig schließen

:: 2) Datenbank sichern
copy "data\ibu.sqlite" "data\ibu_v1.0.0_backup.sqlite"

:: 3) Gesamten data-Ordner sichern
xcopy "data" "backup_v1.0.0" /E /I
```

### 2. Aktuelle Version prüfen

```bat
:: In der v1.0.0 App: Einstellungen → Über
:: Version sollte "1.0.0" anzeigen
```

## Migration durchführen

### 1. v1.1.0 installieren

```bat
:: 1) v1.1.0 herunterladen und installieren
:: IBU_Turniere_v1.1.0_setup.exe ausführen

:: 2) Oder aus Quellcode:
git clone https://github.com/goksche/ibu_sw.git
cd ibu_sw
git checkout v1.1.0
```

### 2. Ersten Start durchführen

```bat
:: 1) v1.1.0 starten
python main.py
# oder
IBU_Turniere.exe
```

**Was passiert automatisch:**
1. **Backup**: Automatisches Backup wird erstellt (`data/backups/ibu_backup_YYYYMMDD_HHMMSS.sqlite`)
2. **Migration**: Datenbank wird auf v1.1.0 Schema migriert
3. **Foreign Keys**: Constraints werden aktiviert
4. **Validierung**: Datenintegrität wird geprüft

### 3. Migration bestätigen

Nach dem ersten Start sollten Sie sehen:
- **Log-Meldung**: "Database migration completed successfully!"
- **Alle Daten**: Turniere, Teilnehmer, Ergebnisse sind verfügbar
- **Neue Features**: Strukturiertes Logging, bessere Fehlerbehandlung

## Nach der Migration

### 1. Daten prüfen

```bat
:: 1) Alle Turniere öffnen und prüfen
:: 2) Teilnehmer-Listen kontrollieren
:: 3) Ergebnisse in Gruppenphase und KO-Phase prüfen
:: 4) Exporte testen (CSV/PDF)
```

### 2. Logs prüfen

```bat
:: Log-Datei öffnen
notepad "data\ibu_turniere.log"

:: Sollte enthalten:
:: - "Database migration completed successfully!"
:: - "Foreign Key Constraints enabled"
:: - Keine ERROR-Meldungen
```

### 3. Neue Features testen

- **Input Validation**: Versuchen Sie ungültige Eingaben (leere Namen, negative Scores)
- **Fehlerbehandlung**: Prüfen Sie, ob Fehlermeldungen benutzerfreundlich sind
- **Performance**: App sollte stabiler und schneller laufen

## Rollback (falls nötig)

Falls Probleme auftreten, können Sie zu v1.0.0 zurückkehren:

### 1. v1.1.0 beenden

```bat
:: IBU Turniere v1.1.0 vollständig schließen
```

### 2. Backup wiederherstellen

```bat
:: 1) Aktuelle Datenbank sichern (falls nötig)
copy "data\ibu.sqlite" "data\ibu_v1.1.0_problem.sqlite"

:: 2) v1.0.0 Backup wiederherstellen
copy "data\ibu_v1.0.0_backup.sqlite" "data\ibu.sqlite"

:: 3) Log-Datei löschen (optional)
del "data\ibu_turniere.log"
```

### 3. v1.0.0 starten

```bat
:: v1.0.0 App starten
:: Alle Daten sollten wie vorher verfügbar sein
```

## Häufige Probleme

### Problem: "Migration failed"

**Lösung:**
1. Prüfen Sie, ob die Datenbank nicht von einer anderen App geöffnet ist
2. Stellen Sie sicher, dass Sie Schreibrechte im `data/` Ordner haben
3. Prüfen Sie die Log-Datei für detaillierte Fehlermeldungen

### Problem: "Foreign Key constraint failed"

**Lösung:**
1. Dies deutet auf Datenintegritätsprobleme in der v1.0.0 Datenbank hin
2. Prüfen Sie die Datenbank auf Waisen-Datensätze
3. Kontaktieren Sie den Support mit der Log-Datei

### Problem: "Validation Error"

**Lösung:**
1. v1.1.0 hat strengere Input-Validierung
2. Prüfen Sie Ihre Eingaben (keine leeren Namen, gültige Scores)
3. Die App zeigt jetzt spezifische Fehlermeldungen

## Support

Bei Problemen:

1. **Log-Datei prüfen**: `data/ibu_turniere.log`
2. **Backup verwenden**: Falls nötig, v1.0.0 Backup wiederherstellen
3. **Support kontaktieren**: Mit Log-Datei und Beschreibung des Problems

## Vorteile von v1.1.0

Nach erfolgreicher Migration profitieren Sie von:

- **🔒 Stabilität**: Keine unbehandelten Exceptions mehr
- **📊 Debugging**: Detaillierte Logs für Problemdiagnose
- **🔗 Datenintegrität**: Foreign Keys verhindern Datenverlust
- **✅ Validierung**: Automatische Eingabevalidierung
- **🧠 Performance**: Optimierte Speicherverwaltung
- **🔄 Migration**: Nahtlose Aktualisierung ohne Datenverlust

## Nächste Schritte

Nach erfolgreicher Migration zu v1.1.0:

1. **v1.2.0 planen**: Web-Interface für Raspberry Pi
2. **Feedback geben**: Berichten Sie über Ihre Erfahrungen
3. **Features nutzen**: Profitieren Sie von den neuen Sicherheits- und Stabilitätsfeatures

---

**Hinweis**: Die Migration ist **einmalig** und **irreversibel**. Erstellen Sie immer ein Backup vor der Migration!
