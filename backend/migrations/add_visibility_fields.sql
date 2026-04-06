-- V1.7 Phase 4: Visibility fields for tournaments and leagues
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tournaments' AND column_name = 'visibility'
    ) THEN
        ALTER TABLE tournaments ADD COLUMN visibility VARCHAR(10) NOT NULL DEFAULT 'public';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'leagues' AND column_name = 'visibility'
    ) THEN
        ALTER TABLE leagues ADD COLUMN visibility VARCHAR(10) NOT NULL DEFAULT 'public';
    END IF;
END
$$;
