-- V1.7 Phase 4: Sharing tables
CREATE TABLE IF NOT EXISTS tournament_shares (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    shared_with_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    shared_with_email VARCHAR(200),
    permission VARCHAR(10) NOT NULL DEFAULT 'view',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tournament_id, shared_with_user_id),
    UNIQUE(tournament_id, shared_with_email)
);

CREATE TABLE IF NOT EXISTS league_shares (
    id SERIAL PRIMARY KEY,
    league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    shared_with_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    shared_with_email VARCHAR(200),
    permission VARCHAR(10) NOT NULL DEFAULT 'view',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(league_id, shared_with_user_id),
    UNIQUE(league_id, shared_with_email)
);
