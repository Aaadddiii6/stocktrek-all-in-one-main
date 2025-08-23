-- Fix blazer_inventory unique constraint to include gender
-- This allows multiple records for the same size/gender combination per user

-- Step 1: Drop the existing constraint
ALTER TABLE public.blazer_inventory 
DROP CONSTRAINT IF EXISTS blazer_inventory_size_user_id_key;

-- Step 2: Add the new constraint that includes gender
ALTER TABLE public.blazer_inventory 
ADD CONSTRAINT blazer_inventory_size_gender_user_id_key 
UNIQUE(size, gender, user_id);

-- Step 3: Verify the change
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'blazer_inventory' 
AND constraint_type = 'UNIQUE';
