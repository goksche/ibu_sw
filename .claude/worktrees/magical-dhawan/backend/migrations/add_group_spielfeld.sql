-- Add optional spielfeld_id to groups

ALTER TABLE groups
ADD COLUMN IF NOT EXISTS spielfeld_id INTEGER REFERENCES spielfelder(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_groups_spielfeld_id ON groups(spielfeld_id);
