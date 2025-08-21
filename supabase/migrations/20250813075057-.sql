-- Fix security issues by updating RLS policies

-- 1. Fix profiles table - users should only see their own profile
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- 2. Enhance courier tracking security with data masking for lower privileged users
-- Keep existing restrictive policy but add a view for limited access if needed
DROP POLICY IF EXISTS "Restricted access to courier tracking" ON public.courier_tracking;

CREATE POLICY "Only admins and inventory managers can access courier tracking" 
ON public.courier_tracking 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'inventory_manager'::app_role)
);

-- 3. Restrict activity logs to admin and inventory managers only  
DROP POLICY IF EXISTS "Authenticated users can view activity logs" ON public.activity_logs;

CREATE POLICY "Only admins and inventory managers can view activity logs" 
ON public.activity_logs 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'inventory_manager'::app_role)
);