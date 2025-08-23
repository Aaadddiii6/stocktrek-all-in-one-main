-- Fix blazer_size enum to use letter-based sizes instead of numbers
-- This will resolve the type casting issues during delete operations

-- First, let's see what the current enum values are
SELECT unnest(enum_range(NULL::blazer_size)) as current_sizes;

-- Create a new enum type with the correct letter-based sizes
CREATE TYPE blazer_size_new AS ENUM (
  'XS', 'S', 'M', 'L', 'XL', 'XXL'
);

-- Add a new size column with the new type
ALTER TABLE public.blazer_inventory 
ADD COLUMN size_new blazer_size_new;

-- Update the new column with converted values
UPDATE public.blazer_inventory 
SET size_new = 
  CASE 
    WHEN size::text LIKE 'M-%' THEN 
      CASE 
        WHEN size::text = 'M-36' THEN 'XS'::blazer_size_new
        WHEN size::text = 'M-38' THEN 'S'::blazer_size_new
        WHEN size::text = 'M-40' THEN 'M'::blazer_size_new
        WHEN size::text = 'M-42' THEN 'L'::blazer_size_new
        WHEN size::text = 'M-44' THEN 'XL'::blazer_size_new
        WHEN size::text = 'M-46' THEN 'XXL'::blazer_size_new
        ELSE 'M'::blazer_size_new
      END
    WHEN size::text LIKE 'F-%' THEN 
      CASE 
        WHEN size::text = 'F-XS' THEN 'XS'::blazer_size_new
        WHEN size::text = 'F-S' THEN 'S'::blazer_size_new
        WHEN size::text = 'F-M' THEN 'M'::blazer_size_new
        WHEN size::text = 'F-L' THEN 'L'::blazer_size_new
        WHEN size::text = 'F-XL' THEN 'XL'::blazer_size_new
        WHEN size::text = 'F-XXL' THEN 'XXL'::blazer_size_new
        ELSE 'M'::blazer_size_new
      END
    ELSE 'M'::blazer_size_new
  END;

-- Drop the old size column
ALTER TABLE public.blazer_inventory DROP COLUMN size;

-- Rename the new column to size
ALTER TABLE public.blazer_inventory RENAME COLUMN size_new TO size;

-- Drop the old enum type
DROP TYPE blazer_size;

-- Rename the new enum type
ALTER TYPE blazer_size_new RENAME TO blazer_size;

-- Verify the conversion
SELECT 
    gender,
    size,
    quantity,
    in_office_stock
FROM public.blazer_inventory 
LIMIT 10;
