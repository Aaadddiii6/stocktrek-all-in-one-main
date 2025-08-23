-- Fix the RLS delete policy for games_inventory table
-- The current policy is too restrictive and preventing inventory managers from deleting

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
WHERE tablename = 'games_inventory';

-- Drop the existing restrictive delete policy
DROP POLICY IF EXISTS "Admins can delete games inventory" ON public.games_inventory;

-- Create a new policy that allows inventory managers to delete
CREATE POLICY "Inventory managers and admins can delete games inventory"
ON public.games_inventory
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'inventory_manager')
);

-- Verify the new policy
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
WHERE tablename = 'games_inventory';
