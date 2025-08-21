-- Enhance security for courier_tracking table
-- 1. Tighten INSERT policy to ensure user_id is always set to current user
-- 2. Add audit trigger for tracking access to sensitive data

-- Drop existing INSERT policy and create a more restrictive one
DROP POLICY IF EXISTS "Inventory managers and admins can insert courier tracking" ON public.courier_tracking;

-- Create more restrictive INSERT policy that ensures user_id is properly set
CREATE POLICY "Inventory managers and admins can insert courier tracking" 
ON public.courier_tracking 
FOR INSERT 
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'inventory_manager'::app_role)) 
  AND user_id = auth.uid()
);

-- Add a security trigger to log access to sensitive courier data
CREATE OR REPLACE FUNCTION public.log_courier_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to courier tracking data for security audit
  INSERT INTO public.activity_logs (module_type, data, user_id)
  VALUES (
    'courier_tracking_access',
    jsonb_build_object(
      'action', TG_OP,
      'record_id', COALESCE(NEW.id, OLD.id),
      'timestamp', now()
    ),
    auth.uid()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS courier_tracking_audit_trigger ON public.courier_tracking;
CREATE TRIGGER courier_tracking_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.courier_tracking
  FOR EACH ROW EXECUTE FUNCTION public.log_courier_access();