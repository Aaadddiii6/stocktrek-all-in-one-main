-- Fix blazer_inventory table schema issues
-- This migration fixes the gender field and ensures proper constraints

-- 1. Make gender field NOT NULL (since it's required in the UI)
ALTER TABLE public.blazer_inventory ALTER COLUMN gender SET NOT NULL;

-- 2. Add the missing unique constraint for size + gender + user_id
-- This prevents duplicate records for the same size/gender combination per user
ALTER TABLE public.blazer_inventory 
ADD CONSTRAINT blazer_inventory_size_gender_user_id_key 
UNIQUE(size, gender, user_id);

-- 3. Ensure the size field uses the proper enum type
-- First, let's check if the blazer_size enum exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blazer_size') THEN
        -- Create the enum if it doesn't exist
        CREATE TYPE public.blazer_size AS ENUM (
            'F-XS', 'F-S', 'F-M', 'F-L', 'F-XL', 'F-XXL',
            'M-36', 'M-38', 'M-40', 'M-42', 'M-44', 'M-46', 'M-48', 'M-50'
        );
    END IF;
END
$$;

-- 4. Update the size column to use the proper enum type
-- This will ensure type safety
ALTER TABLE public.blazer_inventory 
ALTER COLUMN size TYPE public.blazer_size 
USING size::text::public.blazer_size;

-- 5. Add a default value for gender to handle existing records
-- Set any NULL gender values to 'Male' as a safe default
UPDATE public.blazer_inventory 
SET gender = 'Male' 
WHERE gender IS NULL;

-- 6. Verify the changes
-- This will show the current table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'blazer_inventory' 
AND table_schema = 'public'
ORDER BY ordinal_position;
