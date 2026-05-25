-- Migration: Add is_decision_match field to group_matches table
-- v1.4.1

ALTER TABLE group_matches 
ADD COLUMN IF NOT EXISTS is_decision_match BOOLEAN DEFAULT FALSE NOT NULL;

