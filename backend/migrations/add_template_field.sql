-- Migration: Add is_template field to tournaments table
-- Date: 2025-02-01
-- Version: 1.4.1

-- Add is_template column to tournaments table
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE NOT NULL;


