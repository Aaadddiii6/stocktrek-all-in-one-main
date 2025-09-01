-- Quick script to populate monthly_expenses_summary with your existing data
-- Run this in your Supabase SQL Editor after applying the migration

-- First, let's see what data we have
SELECT 
    month_year,
    user_id,
    COUNT(*) as entry_count,
    SUM(expenses) as total_expenses,
    SUM(fixed_amount) as total_fixed_amount,
    MIN(previous_month_overspend) as carryover
FROM daily_expenses 
GROUP BY month_year, user_id
ORDER BY month_year DESC;

-- Now populate the monthly summary table
INSERT INTO monthly_expenses_summary (
    month_year,
    total_fixed_amount,
    total_expenses,
    previous_month_carryover,
    current_balance,
    entry_count,
    user_id
)
SELECT 
    month_year,
    SUM(fixed_amount) as total_fixed_amount,
    SUM(expenses) as total_expenses,
    COALESCE(MIN(previous_month_overspend), 0) as previous_month_carryover,
    (SUM(fixed_amount) + COALESCE(MIN(previous_month_overspend), 0)) - SUM(expenses) as current_balance,
    COUNT(*) as entry_count,
    user_id
FROM daily_expenses 
GROUP BY month_year, user_id
ON CONFLICT (month_year, user_id) 
DO UPDATE SET
    total_fixed_amount = EXCLUDED.total_fixed_amount,
    total_expenses = EXCLUDED.total_expenses,
    previous_month_carryover = EXCLUDED.previous_month_carryover,
    current_balance = EXCLUDED.current_balance,
    entry_count = EXCLUDED.entry_count,
    updated_at = now();

-- Verify the data was populated correctly
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

