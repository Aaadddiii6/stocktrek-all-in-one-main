-- Update blazer_size enum to use letter-based sizes for male blazers
-- This migration preserves existing data while updating the enum definition

-- Step 1: Temporarily change the size column to TEXT to avoid enum constraints
ALTER TABLE public.blazer_inventory ALTER COLUMN size TYPE TEXT;

-- Step 2: Update existing male blazer sizes from numbers to letters
UPDATE public.blazer_inventory 
SET size = CASE 
  WHEN size = 'M-36' THEN 'M-XS'
  WHEN size = 'M-38' THEN 'M-S'
  WHEN size = 'M-40' THEN 'M-M'
  WHEN size = 'M-42' THEN 'M-L'
  WHEN size = 'M-44' THEN 'M-XL'
  WHEN size = 'M-46' THEN 'M-XXL'
  WHEN size = 'M-48' THEN 'M-XXL'  -- Map to largest available size
  WHEN size = 'M-50' THEN 'M-XXL'  -- Map to largest available size
  ELSE size  -- Keep female sizes and any other values unchanged
END
WHERE size IN ('M-36', 'M-38', 'M-40', 'M-42', 'M-44', 'M-46', 'M-48', 'M-50');

-- Step 3: Create a new enum with the updated values
CREATE TYPE public.blazer_size_new AS ENUM (
  'F-XS', 'F-S', 'F-M', 'F-L', 'F-XL', 'F-XXL',
  'M-XS', 'M-S', 'M-M', 'M-L', 'M-XL', 'M-XXL'
);

-- Step 4: Update the size column to use the new enum
ALTER TABLE public.blazer_inventory 
ALTER COLUMN size TYPE public.blazer_size_new 
USING size::public.blazer_size_new;

-- Step 5: Drop the old enum and rename the new one
DROP TYPE public.blazer_size;
ALTER TYPE public.blazer_size_new RENAME TO blazer_size;

-- Step 6: Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'blazer_inventory' 
AND table_schema = 'public'
ORDER BY ordinal_position;
