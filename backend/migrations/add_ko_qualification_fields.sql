-- Migration: Add KO Qualification Fields
-- Date: 2024-12-XX
-- Description: Adds ko_start_round and ko_fallback_qualifiers fields to tournaments table

ALTER TABLE tournaments 
ADD COLUMN ko_start_round VARCHAR(20),
ADD COLUMN ko_fallback_qualifiers JSON;

-- Migriere bestehende Daten: ko_first_round_size -> ko_start_round
UPDATE tournaments 
SET ko_start_round = CASE
    WHEN ko_first_round_size = 32 THEN 'round_of_32'
    WHEN ko_first_round_size = 16 THEN 'round_of_16'
    WHEN ko_first_round_size = 8 THEN 'quarterfinal'
    WHEN ko_first_round_size = 4 THEN 'semifinal'
    WHEN ko_first_round_size = 2 THEN 'final'
    ELSE NULL
END
WHERE has_ko_phase = true AND ko_first_round_size IS NOT NULL;
