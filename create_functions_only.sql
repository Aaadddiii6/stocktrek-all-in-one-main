-- Create only the functions needed for monthly tracking
-- Skip constraint modifications since they already exist

-- STEP 1: Create the calculate function
CREATE OR REPLACE FUNCTION calculate_monthly_summary(target_month TEXT, target_user_id UUID)
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
    
    -- Get previous month's balance if it exists
    SELECT monthly_expenses_summary.current_balance INTO prev_balance
    FROM monthly_expenses_summary
    WHERE monthly_expenses_summary.month_year = prev_month AND monthly_expenses_summary.user_id = target_user_id;
    
    -- If no previous month data, check if there's a carryover in the first record of current month
    IF prev_balance IS NULL THEN
        SELECT COALESCE(daily_expenses.previous_month_overspend, 0) INTO prev_balance
        FROM daily_expenses
        WHERE daily_expenses.month_year = target_month AND daily_expenses.user_id = target_user_id
        ORDER BY daily_expenses.date ASC
        LIMIT 1;
    END IF;
    
    -- Calculate current month summary
    RETURN QUERY
    SELECT 
        target_month as month_year,
        COALESCE(SUM(daily_expenses.fixed_amount), 0) as total_fixed_amount,
        COALESCE(SUM(daily_expenses.expenses), 0) as total_expenses,
        COALESCE(prev_balance, 0) as previous_month_carryover,
        (COALESCE(SUM(daily_expenses.fixed_amount), 0) + COALESCE(prev_balance, 0)) - COALESCE(SUM(daily_expenses.expenses), 0) as current_balance,
        COUNT(*)::INTEGER as entry_count
    FROM daily_expenses
    WHERE daily_expenses.month_year = target_month AND daily_expenses.user_id = target_user_id;
END;
$$;

-- STEP 2: Create the upsert function
CREATE OR REPLACE FUNCTION upsert_monthly_summary(target_month TEXT, target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    summary_data RECORD;
BEGIN
    -- Calculate the monthly summary
    SELECT * INTO summary_data
    FROM calculate_monthly_summary(target_month, target_user_id);
    
    -- Upsert the summary
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
        target_user_id
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

-- STEP 3: Create the get available months function
CREATE OR REPLACE FUNCTION get_available_months(target_user_id UUID)
RETURNS TABLE(month_year TEXT, display_name TEXT)
LANGUAGE SQL
STABLE
AS $$
    SELECT DISTINCT 
        daily_expenses.month_year,
        TO_CHAR(TO_DATE(daily_expenses.month_year || '-01', 'YYYY-MM-DD'), 'Mon YYYY') as display_name
    FROM daily_expenses
    WHERE daily_expenses.user_id = target_user_id
    ORDER BY daily_expenses.month_year DESC;
$$;

-- STEP 4: Create the initialize function
CREATE OR REPLACE FUNCTION initialize_current_month(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    current_month TEXT;
BEGIN
    current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    
    -- Initialize current month summary if it doesn't exist
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
        target_user_id
    )
    ON CONFLICT (month_year, user_id) DO NOTHING;
END;
$$;

-- STEP 5: Populate existing data
DO $$
DECLARE
    user_record RECORD;
    month_record RECORD;
BEGIN
    -- For each user, calculate monthly summaries
    FOR user_record IN SELECT DISTINCT user_id FROM daily_expenses LOOP
        -- For each month that user has data
        FOR month_record IN 
            SELECT DISTINCT month_year 
            FROM daily_expenses 
            WHERE user_id = user_record.user_id
        LOOP
            PERFORM upsert_monthly_summary(month_record.month_year, user_record.user_id);
        END LOOP;
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
ORDER BY month_year DESC, user_id;

-- All done! Your monthly tracking system should now work.

