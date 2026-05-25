-- Add locations and match venue labels

CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS venues (
    id SERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE tournaments
    ADD COLUMN IF NOT EXISTS use_match_locations BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS location_mode VARCHAR(20) DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS location_count INTEGER,
    ADD COLUMN IF NOT EXISTS location_group_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS location_assignment VARCHAR(20) DEFAULT 'random';

ALTER TABLE group_matches
    ADD COLUMN IF NOT EXISTS venue_label VARCHAR(200);

ALTER TABLE knockout_matches
    ADD COLUMN IF NOT EXISTS venue_label VARCHAR(200);
