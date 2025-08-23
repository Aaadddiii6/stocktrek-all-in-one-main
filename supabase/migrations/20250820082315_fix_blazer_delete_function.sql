-- Create a custom function to handle blazer inventory deletions
-- This will bypass any type casting issues with the blazer_size enum

CREATE OR REPLACE FUNCTION delete_blazer_record_safe(record_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete the record directly without triggering type casting issues
  DELETE FROM public.blazer_inventory 
  WHERE id = record_id;
  
  -- Check if any rows were affected
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record with ID % not found', record_id;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_blazer_record_safe(uuid) TO authenticated;

-- Test the function
-- SELECT delete_blazer_record_safe('00000000-0000-0000-0000-000000000000');
