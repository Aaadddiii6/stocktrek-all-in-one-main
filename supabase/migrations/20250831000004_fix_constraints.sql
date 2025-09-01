-- Fix the unique constraint issue for monthly_expenses_summary
-- The current constraint only allows one record per month, but we need one per user per month

-- 1. Drop the existing unique constraint
ALTER TABLE monthly_expenses_summary DROP CONSTRAINT IF EXISTS monthly_expenses_summary_month_year_key;

-- 2. Add a new unique constraint on (month_year, user_id)
ALTER TABLE monthly_expenses_summary ADD CONSTRAINT monthly_expenses_summary_month_year_user_id_key UNIQUE (month_year, user_id);

-- 3. Update the upsert function to use the correct constraint
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

-- 4. Update the initialize function
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

-- Migration completed successfully!
-- Now each user can have their own monthly summary for each month

