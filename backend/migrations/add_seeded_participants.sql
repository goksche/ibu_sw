-- Migration: Add seeded_participant_ids field to tournaments table
-- Date: 2025-02-01
-- Version: 1.4.1

-- Add seeded_participant_ids column to tournaments table (JSON array of participant IDs)
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS seeded_participant_ids JSONB;


