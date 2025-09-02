-- Add kit_name field to existing book_inventory table
ALTER TABLE public.book_inventory 
ADD COLUMN kit_name TEXT;

-- Update the unique constraint to use kit_name instead of kit_type
ALTER TABLE public.book_inventory 
DROP CONSTRAINT IF EXISTS book_inventory_kit_type_user_id_key;

-- Add new unique constraint on kit_name and user_id
ALTER TABLE public.book_inventory 
ADD CONSTRAINT book_inventory_kit_name_user_id_key UNIQUE (kit_name, user_id);

-- Make kit_name NOT NULL after adding it (you may need to populate existing records first)
-- ALTER TABLE public.book_inventory ALTER COLUMN kit_name SET NOT NULL;

-- Make ordered_from_printer, received, and total_used_till_now nullable
ALTER TABLE public.book_inventory 
ALTER COLUMN ordered_from_printer DROP NOT NULL;

ALTER TABLE public.book_inventory 
ALTER COLUMN received DROP NOT NULL;

ALTER TABLE public.book_inventory 
ALTER COLUMN total_used_till_now DROP NOT NULL;
