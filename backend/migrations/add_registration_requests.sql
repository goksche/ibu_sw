-- V1.7 Phase 1: Registrierungsanfragen-Tabelle
-- Idempotent: CREATE IF NOT EXISTS

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registrationstatus') THEN
        CREATE TYPE registrationstatus AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS registration_requests (
    id SERIAL PRIMARY KEY,
    email VARCHAR(200) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    status registrationstatus NOT NULL DEFAULT 'PENDING',
    otp_verified BOOLEAN NOT NULL DEFAULT FALSE,
    invitation_tournament_id INTEGER REFERENCES tournaments(id) ON DELETE SET NULL,
    invitation_league_id INTEGER REFERENCES leagues(id) ON DELETE SET NULL,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    reject_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_registration_requests_email ON registration_requests(email);
CREATE INDEX IF NOT EXISTS ix_registration_requests_status ON registration_requests(status);
