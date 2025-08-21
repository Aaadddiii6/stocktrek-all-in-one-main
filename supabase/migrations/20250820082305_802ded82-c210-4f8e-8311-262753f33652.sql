-- Grant inventory_manager role to current user for testing
INSERT INTO public.user_roles (user_id, role) 
VALUES ('8d22b35e-b48d-4cd0-a76a-ab1611399863', 'inventory_manager'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;

-- Fix blazer_inventory table schema to match UI expectations
-- Add gender field and update size enum

-- First, create a new enum with the expected values
CREATE TYPE public.blazer_size_new AS ENUM (
  'F-XS', 'F-S', 'F-M', 'F-L', 'F-XL', 'F-XXL',
  'M-36', 'M-38', 'M-40', 'M-42', 'M-44', 'M-46', 'M-48', 'M-50'
);

-- Add gender column to blazer_inventory
ALTER TABLE public.blazer_inventory ADD COLUMN gender TEXT CHECK (gender IN ('Male', 'Female'));

-- Update existing records to have a default gender (you may want to review these)
UPDATE public.blazer_inventory SET gender = 'Male' WHERE gender IS NULL;

-- Make gender required
ALTER TABLE public.blazer_inventory ALTER COLUMN gender SET NOT NULL;

-- Update the unique constraint to include gender
ALTER TABLE public.blazer_inventory DROP CONSTRAINT IF EXISTS blazer_inventory_size_user_id_key;
ALTER TABLE public.blazer_inventory ADD CONSTRAINT blazer_inventory_size_gender_user_id_key UNIQUE(size, gender, user_id);

-- Update the size column to use the new enum
ALTER TABLE public.blazer_inventory ALTER COLUMN size TYPE public.blazer_size_new USING size::text::public.blazer_size_new;

-- Drop the old enum and rename the new one
DROP TYPE public.blazer_size;
ALTER TYPE public.blazer_size_new RENAME TO blazer_size;