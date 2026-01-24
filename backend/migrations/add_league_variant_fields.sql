-- Add League Variant and League Rounds Multiplier columns
-- Migration: add_league_variant_fields
-- Date: 2025-01-24
-- Version: 1.3.0

-- Create ENUM type for League Variant
DO $$ BEGIN
    CREATE TYPE leaguevariant AS ENUM (
        'classic',
        'double',
        'multiple'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to tournaments table
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS league_variant leaguevariant DEFAULT 'classic' NOT NULL,
ADD COLUMN IF NOT EXISTS league_rounds_multiplier INTEGER DEFAULT 1;

-- Update existing tournaments to use 'classic' variant
UPDATE tournaments
SET league_variant = 'classic'::leaguevariant
WHERE mode::text = 'round_robin' AND league_variant IS NULL;

-- Set default multiplier for existing tournaments
UPDATE tournaments
SET league_rounds_multiplier = 1
WHERE mode::text = 'round_robin' AND league_rounds_multiplier IS NULL;

