-- Final fix for in_office_stock updates without infinite loops
-- This migration uses a BEFORE trigger to calculate in_office_stock

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS trigger_update_blazer_stock_only ON blazer_inventory;
DROP TRIGGER IF EXISTS trigger_update_blazer_inventory_and_stock ON blazer_inventory;
DROP TRIGGER IF EXISTS trigger_set_in_office_stock_before ON blazer_inventory;
DROP TRIGGER IF EXISTS trigger_update_blazer_stock_after ON blazer_inventory;
DROP FUNCTION IF EXISTS update_blazer_stock_only();
DROP FUNCTION IF EXISTS update_blazer_inventory_and_stock();
DROP FUNCTION IF EXISTS update_all_in_office_stock();
DROP FUNCTION IF EXISTS calculate_in_office_stock(TEXT, TEXT);
DROP FUNCTION IF EXISTS set_in_office_stock_before_update();
DROP FUNCTION IF EXISTS update_blazer_stock_table();

-- Create a function that calculates in_office_stock for a specific record
CREATE OR REPLACE FUNCTION calculate_in_office_stock(p_gender TEXT, p_size TEXT)
RETURNS INTEGER AS $$
DECLARE
    result INTEGER;
BEGIN
    SELECT SUM(COALESCE(added, 0) - COALESCE(sent, 0))
    INTO result
    FROM blazer_inventory
    WHERE gender = p_gender AND size::TEXT = p_size;
    
    RETURN COALESCE(result, 0);
END;
$$ LANGUAGE plpgsql;

-- Create a BEFORE trigger that sets in_office_stock before the record is saved
CREATE OR REPLACE FUNCTION set_in_office_stock_before_update()
RETURNS TRIGGER AS $$
DECLARE
    calculated_stock INTEGER;
BEGIN
    -- Calculate the in_office_stock for this gender/size combination
    calculated_stock := calculate_in_office_stock(NEW.gender, NEW.size::TEXT);
    
    -- Set the in_office_stock and closing_balance for the current record
    NEW.in_office_stock := calculated_stock;
    NEW.closing_balance := calculated_stock;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function that updates blazer_stock table
CREATE OR REPLACE FUNCTION update_blazer_stock_table()
RETURNS TRIGGER AS $$
DECLARE
    gender_text TEXT;
    size_text TEXT;
    calculated_current_stock INTEGER;
    calculated_total_received INTEGER;
    calculated_total_distributed INTEGER;
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

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create BEFORE trigger for in_office_stock calculation
CREATE TRIGGER trigger_set_in_office_stock_before
    BEFORE INSERT OR UPDATE ON blazer_inventory
    FOR EACH ROW
    EXECUTE FUNCTION set_in_office_stock_before_update();

-- Create AFTER trigger for blazer_stock updates
CREATE TRIGGER trigger_update_blazer_stock_after
    AFTER INSERT OR UPDATE OR DELETE ON blazer_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_blazer_stock_table();

-- Update all existing data
UPDATE blazer_inventory
SET 
    in_office_stock = calculate_in_office_stock(gender, size::TEXT),
    closing_balance = calculate_in_office_stock(gender, size::TEXT);

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
ORDER BY created_at DESC
LIMIT 10;

SELECT 'Updated blazer_stock' as status, gender, size, current_stock
FROM blazer_stock
ORDER BY gender, size;
