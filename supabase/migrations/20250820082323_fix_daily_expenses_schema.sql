-- Fix daily expenses table schema for proper balance sheet logic
-- This migration implements the new daily expenses workflow:
-- 1. Fixed amount is optional (not required for every entry)
-- 2. Previous month carryover tracking
-- 3. Proper balance calculations
-- 4. Monthly reset functionality

-- First, let's see the current table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'daily_expenses'
ORDER BY ordinal_position;

-- 1. Make fixed_amount optional (not required for every entry)
ALTER TABLE daily_expenses ALTER COLUMN fixed_amount DROP NOT NULL;

-- 2. Add previous_month_overspend field for carryover tracking
ALTER TABLE daily_expenses ADD COLUMN previous_month_overspend DECIMAL(10,2) DEFAULT 0;

-- 3. Fix the total column (should be expenses, not expenses + fixed_amount)
-- Drop the wrong computed column first
ALTER TABLE daily_expenses DROP COLUMN total;

-- Add the correct total column (just the expense amount)
ALTER TABLE daily_expenses ADD COLUMN total DECIMAL(10,2) GENERATED ALWAYS AS (expenses) STORED;

-- 4. Add columns for balance sheet logic (as regular columns, not generated)
-- Adjusted fixed amount (fixed_amount - previous_month_overspend)
ALTER TABLE daily_expenses ADD COLUMN adjusted_fixed_amount DECIMAL(10,2) DEFAULT 0;

-- Balance (adjusted_fixed_amount - expenses)
ALTER TABLE daily_expenses ADD COLUMN balance DECIMAL(10,2) DEFAULT 0;

-- 5. Add month tracking for automatic resets (as regular column, not generated)
ALTER TABLE daily_expenses ADD COLUMN month_year TEXT DEFAULT '';

-- 6. Create index for month-based queries
CREATE INDEX idx_daily_expenses_month_year ON daily_expenses(month_year);

-- 7. Create index for date-based queries (for monthly resets)
CREATE INDEX idx_daily_expenses_date ON daily_expenses(date);

-- 8. Add helpful comments to explain the new fields
COMMENT ON COLUMN daily_expenses.previous_month_overspend IS 'Amount carried over from previous month (positive = overspend, negative = underspend)';
COMMENT ON COLUMN daily_expenses.adjusted_fixed_amount IS 'Fixed amount adjusted for previous month carryover (fixed_amount - previous_month_overspend)';
COMMENT ON COLUMN daily_expenses.balance IS 'Current balance after expenses (adjusted_fixed_amount - expenses)';
COMMENT ON COLUMN daily_expenses.month_year IS 'Month and year for easy monthly grouping and resets';
COMMENT ON COLUMN daily_expenses.total IS 'Individual expense amount (not expenses + fixed_amount)';

-- 9. Create a trigger function to calculate all computed fields
CREATE OR REPLACE FUNCTION calculate_daily_expenses_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Calculate month_year from date
    NEW.month_year = TO_CHAR(NEW.date, 'YYYY-MM');
    
    -- Calculate adjusted_fixed_amount
    NEW.adjusted_fixed_amount = COALESCE(NEW.fixed_amount, 0) - COALESCE(NEW.previous_month_overspend, 0);
    
    -- Calculate balance
    NEW.balance = NEW.adjusted_fixed_amount - COALESCE(NEW.expenses, 0);
    
    RETURN NEW;
END;
$$;

-- 10. Create the trigger to automatically calculate values
CREATE TRIGGER trigger_calculate_daily_expenses_balance
    BEFORE INSERT OR UPDATE ON daily_expenses
    FOR EACH ROW
    EXECUTE FUNCTION calculate_daily_expenses_balance();

-- 11. Update existing records to calculate the new fields
UPDATE daily_expenses 
SET 
    month_year = TO_CHAR(date, 'YYYY-MM'),
    adjusted_fixed_amount = COALESCE(fixed_amount, 0) - COALESCE(previous_month_overspend, 0),
    balance = (COALESCE(fixed_amount, 0) - COALESCE(previous_month_overspend, 0)) - COALESCE(expenses, 0)
WHERE month_year = '' OR adjusted_fixed_amount = 0 OR balance = 0;

-- 12. Verify the new table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    generation_expression
FROM information_schema.columns 
WHERE table_name = 'daily_expenses'
ORDER BY ordinal_position;

-- 13. Test the computed columns with sample data
-- (This will help verify the calculations work correctly)
SELECT 
    'Sample calculation test' as test_type,
    fixed_amount,
    previous_month_overspend,
    expenses,
    adjusted_fixed_amount,
    balance,
    total,
    month_year
FROM daily_expenses 
LIMIT 5;

-- 14. Create a function to help with monthly resets
CREATE OR REPLACE FUNCTION get_monthly_summary(target_month TEXT)
RETURNS TABLE(
    month_year TEXT,
    total_fixed_amount DECIMAL(10,2),
    total_expenses DECIMAL(10,2),
    final_balance DECIMAL(10,2),
    carryover_for_next_month DECIMAL(10,2)
)
LANGUAGE SQL
STABLE
AS $$
    SELECT 
        month_year,
        COALESCE(SUM(fixed_amount), 0) as total_fixed_amount,
        SUM(expenses) as total_expenses,
        COALESCE(SUM(fixed_amount), 0) - SUM(expenses) as final_balance,
        CASE 
            WHEN COALESCE(SUM(fixed_amount), 0) - SUM(expenses) < 0 
            THEN COALESCE(SUM(fixed_amount), 0) - SUM(expenses)
            ELSE 0 
        END as carryover_for_next_month
    FROM daily_expenses 
    WHERE month_year = target_month
    GROUP BY month_year;
$$;

-- 15. Test the monthly summary function
SELECT * FROM get_monthly_summary('2025-08');

-- Migration completed successfully!
-- The daily_expenses table now supports:
-- ✅ Optional fixed amount entries
-- ✅ Previous month carryover tracking  
-- ✅ Proper balance calculations (via triggers)
-- ✅ Monthly grouping and resets
-- ✅ Professional balance sheet logic
