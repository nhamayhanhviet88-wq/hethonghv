-- Tạo hàm generate UID server-side (cho backfill)
CREATE OR REPLACE FUNCTION generate_customer_uid() RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    result TEXT := 'K';
    i INTEGER;
BEGIN
    FOR i IN 1..19 LOOP
        result := result || substr(chars, floor(random() * 62 + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Backfill UID cho tất cả KH hiện tại chưa có UID
DO $$ 
DECLARE
    r RECORD;
    new_uid TEXT;
    retry_count INTEGER;
BEGIN
    FOR r IN SELECT id FROM customers WHERE customer_uid IS NULL LOOP
        retry_count := 0;
        LOOP
            new_uid := generate_customer_uid();
            BEGIN
                UPDATE customers SET customer_uid = new_uid WHERE id = r.id;
                EXIT;
            EXCEPTION WHEN unique_violation THEN
                retry_count := retry_count + 1;
                IF retry_count > 5 THEN RAISE EXCEPTION 'Too many UID collisions'; END IF;
            END;
        END LOOP;
    END LOOP;
END $$;

-- Set NOT NULL nếu không còn row NULL
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM customers WHERE customer_uid IS NULL) OR
       NOT EXISTS (SELECT 1 FROM customers) THEN
        ALTER TABLE customers ALTER COLUMN customer_uid SET NOT NULL;
    END IF;
END $$;

-- UNIQUE index
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_uid ON customers(customer_uid);

-- Phone index (non-unique, for search)
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
