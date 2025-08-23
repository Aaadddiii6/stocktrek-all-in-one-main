-- Fix delete policy for kits_inventory to allow inventory managers to delete records
-- Currently only admins can delete, but inventory managers should also have this permission

-- Drop the existing restrictive delete policy
DROP POLICY IF EXISTS "Admins can delete kits inventory" ON public.kits_inventory;

-- Create a new policy that allows both admins and inventory managers to delete
CREATE POLICY "Inventory managers and admins can delete kits inventory" 
ON public.kits_inventory 
FOR DELETE 
TO authenticated 
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'inventory_manager')
);

-- Verify the new policy is created
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
WHERE tablename = 'kits_inventory' 
AND cmd = 'DELETE';
