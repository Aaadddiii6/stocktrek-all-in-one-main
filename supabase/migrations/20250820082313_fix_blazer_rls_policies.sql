-- Fix RLS policies for blazer_inventory to handle blazer_size enum type properly
-- The current policies are causing type casting errors when comparing enum with text

-- First, let's see what policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'blazer_inventory';

-- Drop all existing policies to recreate them properly
DROP POLICY IF EXISTS "Authenticated users can view blazer inventory" ON public.blazer_inventory;
DROP POLICY IF EXISTS "Inventory managers and admins can insert blazer inventory" ON public.blazer_inventory;
DROP POLICY IF EXISTS "Inventory managers and admins can update blazer inventory" ON public.blazer_inventory;
DROP POLICY IF EXISTS "Inventory managers and admins can delete blazer inventory" ON public.blazer_inventory;

-- Recreate policies with proper type handling
CREATE POLICY "Authenticated users can view blazer inventory" 
ON public.blazer_inventory 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Inventory managers and admins can insert blazer inventory" 
ON public.blazer_inventory 
FOR INSERT 
TO authenticated 
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'inventory_manager')
);

CREATE POLICY "Inventory managers and admins can update blazer inventory" 
ON public.blazer_inventory 
FOR UPDATE 
TO authenticated 
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'inventory_manager')
);

CREATE POLICY "Inventory managers and admins can delete blazer inventory" 
ON public.blazer_inventory 
FOR DELETE 
TO authenticated 
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'inventory_manager')
);

-- Verify the new policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'blazer_inventory';
