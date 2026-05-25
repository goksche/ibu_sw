-- V1.7 Phase 3: Participant-User-Verknüpfung
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'participants' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE participants ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_user_id
    ON participants(user_id) WHERE user_id IS NOT NULL;
