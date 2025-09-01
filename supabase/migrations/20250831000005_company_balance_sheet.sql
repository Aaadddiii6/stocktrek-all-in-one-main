-- Update functions for company balance sheet (no user filtering)

-- STEP 1: Update the calculate function for company-wide calculations
CREATE OR REPLACE FUNCTION calculate_monthly_summary(target_month TEXT, target_user_id UUID DEFAULT NULL)
RETURNS TABLE(
    month_year TEXT,
    total_fixed_amount DECIMAL(10,2),
    total_expenses DECIMAL(10,2),
    previous_month_carryover DECIMAL(10,2),
    current_balance DECIMAL(10,2),
    entry_count INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    prev_month TEXT;
    prev_balance DECIMAL(10,2) := 0;
BEGIN
    -- Calculate previous month
    prev_month := TO_CHAR(TO_DATE(target_month || '-01', 'YYYY-MM-DD') - INTERVAL '1 month', 'YYYY-MM');
    
    -- Get previous month's balance if it exists (company-wide)
    SELECT monthly_expenses_summary.current_balance INTO prev_balance
    FROM monthly_expenses_summary
    WHERE monthly_expenses_summary.month_year = prev_month 
    AND monthly_expenses_summary.user_id IS NULL;
    
    -- If no previous month data, check if there's a carryover in the first record of current month
    IF prev_balance IS NULL THEN
        SELECT COALESCE(daily_expenses.previous_month_overspend, 0) INTO prev_balance
        FROM daily_expenses
        WHERE daily_expenses.month_year = target_month
        ORDER BY daily_expenses.date ASC
        LIMIT 1;
    END IF;
    
    -- Calculate current month summary (company-wide)
    RETURN QUERY
    SELECT 
        target_month as month_year,
        COALESCE(SUM(daily_expenses.fixed_amount), 0) as total_fixed_amount,
        COALESCE(SUM(daily_expenses.expenses), 0) as total_expenses,
        COALESCE(prev_balance, 0) as previous_month_carryover,
        (COALESCE(SUM(daily_expenses.fixed_amount), 0) + COALESCE(prev_balance, 0)) - COALESCE(SUM(daily_expenses.expenses), 0) as current_balance,
        COUNT(*)::INTEGER as entry_count
    FROM daily_expenses
    WHERE daily_expenses.month_year = target_month;
END;
$$;

-- STEP 2: Update the upsert function for company-wide data
CREATE OR REPLACE FUNCTION upsert_monthly_summary(target_month TEXT, target_user_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    summary_data RECORD;
BEGIN
    -- Calculate the monthly summary
    SELECT * INTO summary_data
    FROM calculate_monthly_summary(target_month, target_user_id);
    
    -- Upsert the summary (company-wide, user_id = NULL)
    INSERT INTO monthly_expenses_summary (
        month_year,
        total_fixed_amount,
        total_expenses,
        previous_month_carryover,
        current_balance,
        entry_count,
        user_id
    ) VALUES (
        summary_data.month_year,
        summary_data.total_fixed_amount,
        summary_data.total_expenses,
        summary_data.previous_month_carryover,
        summary_data.current_balance,
        summary_data.entry_count,
        NULL -- Company balance sheet
    )
    ON CONFLICT (month_year, user_id) 
    DO UPDATE SET
        total_fixed_amount = EXCLUDED.total_fixed_amount,
        total_expenses = EXCLUDED.total_expenses,
        previous_month_carryover = EXCLUDED.previous_month_carryover,
        current_balance = EXCLUDED.current_balance,
        entry_count = EXCLUDED.entry_count,
        updated_at = now();
END;
$$;

-- STEP 3: Update the get available months function for company-wide data
CREATE OR REPLACE FUNCTION get_available_months(target_user_id UUID DEFAULT NULL)
RETURNS TABLE(month_year TEXT, display_name TEXT)
LANGUAGE SQL
STABLE
AS $$
    SELECT DISTINCT 
        daily_expenses.month_year,
        TO_CHAR(TO_DATE(daily_expenses.month_year || '-01', 'YYYY-MM-DD'), 'Mon YYYY') as display_name
    FROM daily_expenses
    ORDER BY daily_expenses.month_year DESC;
$$;

-- STEP 4: Update the initialize function for company-wide data
CREATE OR REPLACE FUNCTION initialize_current_month(target_user_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    current_month TEXT;
BEGIN
    current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    
    -- Initialize current month summary if it doesn't exist (company-wide)
    INSERT INTO monthly_expenses_summary (
        month_year,
        total_fixed_amount,
        total_expenses,
        previous_month_carryover,
        current_balance,
        entry_count,
        user_id
    ) VALUES (
        current_month,
        0,
        0,
        0,
        0,
        0,
        NULL -- Company balance sheet
    )
    ON CONFLICT (month_year, user_id) DO NOTHING;
END;
$$;

-- STEP 5: Clear existing user-specific data and populate company-wide data
-- First, delete existing user-specific records
DELETE FROM monthly_expenses_summary WHERE user_id IS NOT NULL;

-- Then populate company-wide data for all existing months
DO $$
DECLARE
    month_record RECORD;
BEGIN
    -- For each month that has data, calculate company-wide summary
    FOR month_record IN 
        SELECT DISTINCT month_year 
        FROM daily_expenses
        ORDER BY month_year
    LOOP
        PERFORM upsert_monthly_summary(month_record.month_year, NULL);
    END LOOP;
END $$;

-- STEP 6: Verify the data was populated
SELECT 
    month_year,
    total_fixed_amount,
    total_expenses,
    previous_month_carryover,
    current_balance,
    entry_count,
    user_id
FROM monthly_expenses_summary 
ORDER BY month_year DESC;

-- All done! Your company balance sheet should now work correctly.

