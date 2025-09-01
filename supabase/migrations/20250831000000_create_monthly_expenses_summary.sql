-- Create monthly expenses summary table for tracking monthly data with carryover
-- This table will store monthly summaries and handle carryover logic

-- 1. Create the monthly_expenses_summary table
CREATE TABLE public.monthly_expenses_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month_year TEXT NOT NULL UNIQUE, -- Format: YYYY-MM
    total_fixed_amount DECIMAL(10,2) DEFAULT 0,
    total_expenses DECIMAL(10,2) DEFAULT 0,
    previous_month_carryover DECIMAL(10,2) DEFAULT 0,
    current_balance DECIMAL(10,2) DEFAULT 0,
    entry_count INTEGER DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.monthly_expenses_summary ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies
CREATE POLICY "Authenticated users can view monthly expenses summary" 
ON public.monthly_expenses_summary 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Inventory managers and admins can insert monthly expenses summary" 
ON public.monthly_expenses_summary 
FOR INSERT TO authenticated 
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'inventory_manager')
);

CREATE POLICY "Inventory managers and admins can update monthly expenses summary" 
ON public.monthly_expenses_summary 
FOR UPDATE TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'inventory_manager')
);

CREATE POLICY "Admins can delete monthly expenses summary" 
ON public.monthly_expenses_summary 
FOR DELETE TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Create indexes for performance
CREATE INDEX idx_monthly_expenses_summary_month_year ON public.monthly_expenses_summary(month_year);
CREATE INDEX idx_monthly_expenses_summary_user_id ON public.monthly_expenses_summary(user_id);

-- 5. Add updated_at trigger
CREATE TRIGGER update_monthly_expenses_summary_updated_at 
BEFORE UPDATE ON public.monthly_expenses_summary 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Create function to calculate monthly summary from daily expenses
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
    SELECT current_balance INTO prev_balance
    FROM monthly_expenses_summary
    WHERE month_year = prev_month AND user_id = target_user_id;
    
    -- If no previous month data, check if there's a carryover in the first record of current month
    IF prev_balance IS NULL THEN
        SELECT COALESCE(previous_month_overspend, 0) INTO prev_balance
        FROM daily_expenses
        WHERE month_year = target_month AND user_id = target_user_id
        ORDER BY date ASC
        LIMIT 1;
    END IF;
    
    -- Calculate current month summary
    RETURN QUERY
    SELECT 
        target_month as month_year,
        COALESCE(SUM(fixed_amount), 0) as total_fixed_amount,
        COALESCE(SUM(expenses), 0) as total_expenses,
        COALESCE(prev_balance, 0) as previous_month_carryover,
        (COALESCE(SUM(fixed_amount), 0) + COALESCE(prev_balance, 0)) - COALESCE(SUM(expenses), 0) as current_balance,
        COUNT(*)::INTEGER as entry_count
    FROM daily_expenses
    WHERE month_year = target_month AND user_id = target_user_id;
END;
$$;

-- 7. Create function to upsert monthly summary
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

-- 8. Create trigger to automatically update monthly summary when daily expenses change
CREATE OR REPLACE FUNCTION trigger_update_monthly_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update monthly summary for the affected month
    PERFORM upsert_monthly_summary(NEW.month_year, NEW.user_id);
    
    -- If this is a new month, also update the previous month's summary to ensure carryover is correct
    IF TG_OP = 'INSERT' THEN
        PERFORM upsert_monthly_summary(
            TO_CHAR(TO_DATE(NEW.month_year || '-01', 'YYYY-MM-DD') - INTERVAL '1 month', 'YYYY-MM'),
            NEW.user_id
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 9. Create the trigger
CREATE TRIGGER trigger_daily_expenses_update_monthly_summary
    AFTER INSERT OR UPDATE OR DELETE ON daily_expenses
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_monthly_summary();

-- 10. Create function to get available months for dropdown
CREATE OR REPLACE FUNCTION get_available_months(target_user_id UUID)
RETURNS TABLE(month_year TEXT, display_name TEXT)
LANGUAGE SQL
STABLE
AS $$
    SELECT DISTINCT 
        month_year,
        TO_CHAR(TO_DATE(month_year || '-01', 'YYYY-MM-DD'), 'Mon YYYY') as display_name
    FROM daily_expenses
    WHERE user_id = target_user_id
    ORDER BY month_year DESC;
$$;

-- 11. Create function to initialize current month if it doesn't exist
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
-- The monthly_expenses_summary table now supports:
-- ✅ Monthly data storage with carryover
-- ✅ Automatic calculation from daily expenses
-- ✅ Real-time updates via triggers
-- ✅ Month selection functionality
-- ✅ Proper balance calculations with carryover

