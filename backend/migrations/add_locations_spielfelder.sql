-- Locations (Spielorte) und Spielfelder
-- Migration: add_locations_spielfelder
-- Version: 1.4.0

-- Locations
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc') NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc') NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_locations_name ON locations(name);
CREATE INDEX IF NOT EXISTS ix_locations_id ON locations(id);

-- Spielfelder (gehören zu einer Location)
CREATE TABLE IF NOT EXISTS spielfelder (
    id SERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc') NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc') NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_spielfelder_location_id ON spielfelder(location_id);
CREATE INDEX IF NOT EXISTS ix_spielfelder_id ON spielfelder(id);

-- Tournament: eine Location pro Turnier
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL;

-- Group matches: optionales Spielfeld pro Spiel
ALTER TABLE group_matches
ADD COLUMN IF NOT EXISTS spielfeld_id INTEGER REFERENCES spielfelder(id) ON DELETE SET NULL;

-- Knockout matches: optionales Spielfeld pro Spiel
ALTER TABLE knockout_matches
ADD COLUMN IF NOT EXISTS spielfeld_id INTEGER REFERENCES spielfelder(id) ON DELETE SET NULL;
