-- database/migrations/001_add_fk_constraints.sql
-- Foreign Key Constraints für IBU Turniere v1.1.0-alpha.2
-- 
-- Diese Migration fügt Foreign Key Constraints zu allen Tabellen hinzu,
-- um die Datenintegrität zu gewährleisten.

-- Foreign Key Constraints aktivieren
PRAGMA foreign_keys = ON;

-- Turnier-Teilnehmer Beziehungen
-- turnier_teilnehmer.turnier_id -> turniere.id
-- turnier_teilnehmer.teilnehmer_id -> teilnehmer.id

-- Gruppen-Turnier Beziehungen  
-- gruppen.turnier_id -> turniere.id

-- Gruppen-Teilnehmer Beziehungen
-- gruppen_teilnehmer.gruppe_id -> gruppen.id
-- gruppen_teilnehmer.teilnehmer_id -> teilnehmer.id

-- Spiele-Turnier/Gruppe Beziehungen
-- spiele.turnier_id -> turniere.id
-- spiele.gruppe_id -> gruppen.id

-- KO-Spiele-Turnier Beziehungen
-- ko_spiele.turnier_id -> turniere.id

-- Turnier-Platzierungen Beziehungen
-- turnier_platzierungen.turnier_id -> turniere.id
-- turnier_platzierungen.teilnehmer_id -> teilnehmer.id

-- Meisterschaft-Turnier Beziehungen
-- meisterschaft_turniere.meisterschaft_id -> meisterschaften.id
-- meisterschaft_turniere.turnier_id -> turniere.id

-- Meisterschaft-Punkteschema Beziehungen
-- meisterschaft_punkteschema.meisterschaft_id -> meisterschaften.id

-- Hinweis: SQLite unterstützt keine ALTER TABLE ADD CONSTRAINT,
-- daher müssen die Constraints bei der Tabellenerstellung definiert werden.
-- Diese Datei dient als Dokumentation der gewünschten Constraints.

-- Beispiel für neue Tabellen mit FK Constraints:
/*
CREATE TABLE IF NOT EXISTS turnier_teilnehmer_new(
    turnier_id INTEGER NOT NULL,
    teilnehmer_id INTEGER NOT NULL,
    FOREIGN KEY (turnier_id) REFERENCES turniere(id) ON DELETE CASCADE,
    FOREIGN KEY (teilnehmer_id) REFERENCES teilnehmer(id) ON DELETE CASCADE,
    UNIQUE(turnier_id, teilnehmer_id)
);

CREATE TABLE IF NOT EXISTS gruppen_new(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    turnier_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY (turnier_id) REFERENCES turniere(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gruppen_teilnehmer_new(
    gruppe_id INTEGER NOT NULL,
    teilnehmer_id INTEGER NOT NULL,
    FOREIGN KEY (gruppe_id) REFERENCES gruppen(id) ON DELETE CASCADE,
    FOREIGN KEY (teilnehmer_id) REFERENCES teilnehmer(id) ON DELETE CASCADE,
    UNIQUE(gruppe_id, teilnehmer_id)
);

CREATE TABLE IF NOT EXISTS spiele_new(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    turnier_id INTEGER NOT NULL,
    gruppe_id INTEGER NOT NULL,
    spieltag INTEGER,
    runde INTEGER,
    match_no INTEGER,
    p1_id INTEGER,
    p2_id INTEGER,
    s1 INTEGER,
    s2 INTEGER,
    FOREIGN KEY (turnier_id) REFERENCES turniere(id) ON DELETE CASCADE,
    FOREIGN KEY (gruppe_id) REFERENCES gruppen(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ko_spiele_new(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    turnier_id INTEGER NOT NULL,
    runde INTEGER,
    match_no INTEGER,
    p1_id INTEGER,
    p2_id INTEGER,
    s1 INTEGER,
    s2 INTEGER,
    FOREIGN KEY (turnier_id) REFERENCES turniere(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS turnier_platzierungen_new(
    turnier_id INTEGER NOT NULL,
    teilnehmer_id INTEGER NOT NULL,
    platz INTEGER NOT NULL,
    FOREIGN KEY (turnier_id) REFERENCES turniere(id) ON DELETE CASCADE,
    FOREIGN KEY (teilnehmer_id) REFERENCES teilnehmer(id) ON DELETE CASCADE,
    UNIQUE(turnier_id, teilnehmer_id)
);

CREATE TABLE IF NOT EXISTS meisterschaft_turniere_new(
    meisterschaft_id INTEGER NOT NULL,
    turnier_id INTEGER NOT NULL,
    FOREIGN KEY (meisterschaft_id) REFERENCES meisterschaften(id) ON DELETE CASCADE,
    FOREIGN KEY (turnier_id) REFERENCES turniere(id) ON DELETE CASCADE,
    UNIQUE(meisterschaft_id, turnier_id)
);

CREATE TABLE IF NOT EXISTS meisterschaft_punkteschema_new(
    meisterschaft_id INTEGER NOT NULL,
    platz INTEGER NOT NULL,
    punkte INTEGER NOT NULL,
    FOREIGN KEY (meisterschaft_id) REFERENCES meisterschaften(id) ON DELETE CASCADE,
    UNIQUE(meisterschaft_id, platz)
);
*/
