-- V1.7 Welle 3.0 / Hotfix v1.8.3
-- Manuelle Liga-Punkte + Officials auf Turnier-Ebene (idempotent)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tournaments' AND column_name = 'league_points_win'
    ) THEN
        ALTER TABLE tournaments ADD COLUMN league_points_win INTEGER NOT NULL DEFAULT 3;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tournaments' AND column_name = 'league_points_draw'
    ) THEN
        ALTER TABLE tournaments ADD COLUMN league_points_draw INTEGER NOT NULL DEFAULT 1;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tournaments' AND column_name = 'league_points_loss'
    ) THEN
        ALTER TABLE tournaments ADD COLUMN league_points_loss INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tournaments' AND column_name = 'head_referee'
    ) THEN
        ALTER TABLE tournaments ADD COLUMN head_referee VARCHAR(120);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tournaments' AND column_name = 'scorekeeper'
    ) THEN
        ALTER TABLE tournaments ADD COLUMN scorekeeper VARCHAR(120);
    END IF;
END $$;
