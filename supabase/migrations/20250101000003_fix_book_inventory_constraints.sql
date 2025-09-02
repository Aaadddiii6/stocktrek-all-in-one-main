-- The issue is that book_inventory has a composite unique constraint (kit_name, user_id)
-- but we're trying to reference just kit_name. We need to create a unique constraint on kit_name alone.

-- First, let's add a unique constraint on kit_name in book_inventory
-- This will allow us to reference it from books_distribution
ALTER TABLE public.book_inventory 
ADD CONSTRAINT book_inventory_kit_name_unique UNIQUE (kit_name);

-- Now we can add the foreign key constraint
ALTER TABLE public.books_distribution 
ADD CONSTRAINT books_distribution_kit_name_fkey 
FOREIGN KEY (kit_name) REFERENCES public.book_inventory(kit_name) ON DELETE CASCADE;
