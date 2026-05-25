-- V1.7 Phase 0: Power Admin Rolle hinzufügen
-- Erweitert den PostgreSQL ENUM-Typ userrole um 'POWER_ADMIN'
-- Idempotent: prüft ob der Wert bereits existiert

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'POWER_ADMIN'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'userrole')
    ) THEN
        ALTER TYPE userrole ADD VALUE 'POWER_ADMIN' BEFORE 'ADMIN';
    END IF;
END
$$;

-- Power Admin zuweisen (goksche23@gmail.com)
UPDATE users
SET role = 'POWER_ADMIN'
WHERE email = 'goksche23@gmail.com';
