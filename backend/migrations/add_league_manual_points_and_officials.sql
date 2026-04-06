-- V1.7 Welle 3.0
-- Manuelle Liga-Punkte + Officials auf Turnier-Ebene

ALTER TABLE tournaments ADD COLUMN league_points_win INTEGER NOT NULL DEFAULT 3;
ALTER TABLE tournaments ADD COLUMN league_points_draw INTEGER NOT NULL DEFAULT 1;
ALTER TABLE tournaments ADD COLUMN league_points_loss INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN head_referee VARCHAR(120);
ALTER TABLE tournaments ADD COLUMN scorekeeper VARCHAR(120);
