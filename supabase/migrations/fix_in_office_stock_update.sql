-- Fix in_office_stock not updating when sent column changes
-- This migration will ensure in_office_stock is updated in blazer_inventory table

-- Drop the existing trigger
DROP TRIGGER IF EXISTS trigger_update_blazer_stock_only ON blazer_inventory;
DROP TRIGGER IF EXISTS trigger_update_blazer_inventory_and_stock ON blazer_inventory;

-- Create a function that updates both in_office_stock and blazer_stock
CREATE OR REPLACE FUNCTION update_blazer_inventory_and_stock()
RETURNS TRIGGER AS $$
DECLARE
    gender_text TEXT;
    size_text TEXT;
    calculated_current_stock INTEGER;
    calculated_total_received INTEGER;
    calculated_total_distributed INTEGER;
    calculated_in_office_stock INTEGER;
BEGIN
    -- Determine gender and size based on operation
    IF TG_OP = 'DELETE' THEN
        gender_text := OLD.gender;
        size_text := OLD.size::TEXT;
    ELSE
        gender_text := NEW.gender;
        size_text := NEW.size::TEXT;
    END IF;

    -- Calculate totals for this gender/size combination
    SELECT
        SUM(COALESCE(added, 0) - COALESCE(sent, 0)) as current_stock,
        SUM(COALESCE(added, 0)) as total_received,
        SUM(COALESCE(sent, 0)) as total_distributed
    INTO calculated_current_stock, calculated_total_received, calculated_total_distributed
    FROM blazer_inventory
    WHERE gender = gender_text AND size::TEXT = size_text;

    -- Update in_office_stock for ALL records of this gender/size combination
    -- This includes the current record being modified
    UPDATE blazer_inventory
    SET 
        in_office_stock = COALESCE(calculated_current_stock, 0),
        closing_balance = COALESCE(calculated_current_stock, 0)
    WHERE gender = gender_text AND size::TEXT = size_text;

    -- Update or insert into blazer_stock
    INSERT INTO blazer_stock (gender, size, opening_stock, current_stock, total_received, total_distributed)
    VALUES (
        gender_text,
        size_text,
        0,
        COALESCE(calculated_current_stock, 0),
        COALESCE(calculated_total_received, 0),
        COALESCE(calculated_total_distributed, 0)
    )
    ON CONFLICT (gender, size)
    DO UPDATE SET
        current_stock = EXCLUDED.current_stock,
        total_received = EXCLUDED.total_received,
        total_distributed = EXCLUDED.total_distributed,
        updated_at = NOW();

    -- For UPDATE operations, return the NEW record with updated in_office_stock
    IF TG_OP = 'UPDATE' THEN
        NEW.in_office_stock := COALESCE(calculated_current_stock, 0);
        NEW.closing_balance := COALESCE(calculated_current_stock, 0);
        RETURN NEW;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_update_blazer_inventory_and_stock
    AFTER INSERT OR UPDATE OR DELETE ON blazer_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_blazer_inventory_and_stock();

-- Fix all existing data
UPDATE blazer_inventory
SET in_office_stock = (
    SELECT SUM(COALESCE(added, 0) - COALESCE(sent, 0))
    FROM blazer_inventory bi2
    WHERE bi2.gender = blazer_inventory.gender
    AND bi2.size::TEXT = blazer_inventory.size::TEXT
),
closing_balance = (
    SELECT SUM(COALESCE(added, 0) - COALESCE(sent, 0))
    FROM blazer_inventory bi2
    WHERE bi2.gender = blazer_inventory.gender
    AND bi2.size::TEXT = blazer_inventory.size::TEXT
);

-- Update blazer_stock table
DELETE FROM blazer_stock;

INSERT INTO blazer_stock (gender, size, opening_stock, current_stock, total_received, total_distributed)
SELECT
    gender,
    size::TEXT,
    0 as opening_stock,
    SUM(COALESCE(added, 0) - COALESCE(sent, 0)) as current_stock,
    SUM(COALESCE(added, 0)) as total_received,
    SUM(COALESCE(sent, 0)) as total_distributed
FROM blazer_inventory
WHERE gender IS NOT NULL AND size IS NOT NULL
GROUP BY gender, size::TEXT;

-- Show final results
SELECT 'Updated blazer_inventory' as status, gender, size, added, sent, in_office_stock
FROM blazer_inventory
ORDER BY created_at DESC;

SELECT 'Updated blazer_stock' as status, gender, size, current_stock
FROM blazer_stock
ORDER BY gender, size;
