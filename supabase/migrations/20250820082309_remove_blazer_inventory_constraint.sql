-- Remove the unique constraint from blazer_inventory
-- The business logic requires multiple records per size/gender combination for tracking inventory transactions

-- Drop the unique constraint
ALTER TABLE public.blazer_inventory 
DROP CONSTRAINT IF EXISTS blazer_inventory_size_gender_user_id_key;

-- Verify the constraint is removed
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name
FROM information_schema.table_constraints tc
WHERE tc.table_name = 'blazer_inventory' 
AND tc.constraint_type = 'UNIQUE';

-- Should return no rows if constraint is successfully removed

