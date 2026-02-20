-- League module extension: status, league_mode, placement_points, masters, auto-generation
-- Run against ibu_turniere database

ALTER TABLE leagues ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'geplant';
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS league_mode VARCHAR(20) NOT NULL DEFAULT 'liga';
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS placement_points JSON;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS masters_ko_count INTEGER DEFAULT 8;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS auto_tournament_count INTEGER DEFAULT 0;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS auto_tournament_mode VARCHAR(20);
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS auto_tournament_settings JSON;
