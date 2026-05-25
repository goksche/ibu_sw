-- Add League Scoring System and Tie Breaking Rules columns
-- Migration: add_league_scoring_fields
-- Date: 2025-01-04
-- Version: 1.4.0

-- Create ENUM type for League Scoring System
DO $$ BEGIN
    CREATE TYPE leaguescoringsystem AS ENUM (
        'points',
        'difference'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to tournaments table
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS league_scoring_system leaguescoringsystem,
ADD COLUMN IF NOT EXISTS tie_breaking_rules JSONB;

