-- Fix the RLS delete policy for books_distribution table
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
WHERE tablename = 'books_distribution';

-- Drop the existing restrictive delete policy
DROP POLICY IF EXISTS "Admins can delete books distribution" ON public.books_distribution;

-- Create a new policy that allows inventory managers to delete
CREATE POLICY "Inventory managers and admins can delete books distribution"
ON public.books_distribution
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
WHERE tablename = 'books_distribution';
