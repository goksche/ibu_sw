-- Migration: Add detailed KO-Phase settings to tournaments table
-- Date: 2025-01-27
-- Version: 1.4.0

-- Add new ENUM types for KO structure and draw method
DO $$ BEGIN
    CREATE TYPE kostructure AS ENUM (
        'single_elimination',
        'single_elimination_with_third',
        'double_elimination',
        'group_then_single_ko',
        'group_then_double_ko',
        'ko_with_group_winner_advantage',
        'page_playoff'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE kodrawmethod AS ENUM (
        'fixed_cross',
        'same_position_cross',
        'overall_seeding',
        'pot_system',
        'full_random',
        'bonus_draw_for_winners',
        'predefined_bracket'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to tournaments table
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS ko_structure kostructure,
ADD COLUMN IF NOT EXISTS ko_draw_method kodrawmethod,
ADD COLUMN IF NOT EXISTS ko_third_place_match BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ko_group_winner_advantage BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ko_block_same_group BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS ko_block_same_position BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ko_random_seed INTEGER;


