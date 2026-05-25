-- Migration: Tabelle access_requests für Zugangs-Anfragen (Landing Page)
-- Echter Betrieb: persistente Speicherung

CREATE TABLE IF NOT EXISTS access_requests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL,
    sport VARCHAR(100) NOT NULL,
    organisation VARCHAR(200),
    source VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_access_requests_created_at ON access_requests(created_at DESC);
