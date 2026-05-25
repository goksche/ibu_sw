-- Verteilerliste gsmartsol.ch „Notify me“ (PostgreSQL auf Server C)
CREATE TABLE IF NOT EXISTS gsmartsol_notify_subscribers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_gsmartsol_notify_subscribers_created_at
    ON gsmartsol_notify_subscribers (created_at);
