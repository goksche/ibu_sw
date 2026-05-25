-- Add "wins" value to LeagueScoringSystem enum (PostgreSQL)
-- Run on server databases that use native ENUM type for tournaments.league_scoring_system

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'leaguescoringsystem'
          AND e.enumlabel = 'wins'
    ) THEN
        RAISE NOTICE 'Enum value "wins" already exists in leaguescoringsystem';
    ELSE
        ALTER TYPE leaguescoringsystem ADD VALUE 'wins';
    END IF;
END $$;
