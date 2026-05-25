-- Add modern KO draw strategy: random_each_round
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'kodrawmethod'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'kodrawmethod'
          AND e.enumlabel = 'random_each_round'
    ) THEN
        ALTER TYPE kodrawmethod ADD VALUE 'random_each_round';
    END IF;
END
$$;
