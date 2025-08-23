-- Fix the blazer_stock trigger function that's causing type casting errors
-- The function is trying to compare blazer_size enum with text values

-- First, let's see what triggers exist
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'blazer_inventory';

-- Drop the problematic function with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS update_blazer_stock() CASCADE;

-- Recreate the function with proper type handling
CREATE OR REPLACE FUNCTION update_blazer_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.blazer_stock (gender, size, current_stock, total_received, updated_at)
    VALUES (NEW.gender, NEW.size::text, NEW.quantity, NEW.quantity, now())
    ON CONFLICT (gender, size) 
    DO UPDATE SET
      current_stock = blazer_stock.current_stock + NEW.quantity,
      total_received = blazer_stock.total_received + NEW.quantity,
      updated_at = now();
    RETURN NEW;
  END IF;

  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    UPDATE public.blazer_stock 
    SET 
      current_stock = current_stock + (NEW.quantity - OLD.quantity),
      total_received = total_received + GREATEST(0, NEW.quantity - OLD.quantity),
      updated_at = now()
    WHERE gender = NEW.gender AND size::text = NEW.size::text;
    RETURN NEW;
  END IF;

  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    UPDATE public.blazer_stock 
    SET 
      current_stock = current_stock - OLD.quantity,
      total_distributed = total_distributed + OLD.quantity,
      updated_at = now()
    WHERE gender = OLD.gender AND size::text = OLD.size::text;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_blazer_stock
  AFTER INSERT OR UPDATE OR DELETE ON public.blazer_inventory
  FOR EACH ROW EXECUTE FUNCTION update_blazer_stock();

-- Also recreate the updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop the existing updated_at trigger before recreating
DROP TRIGGER IF EXISTS update_blazer_inventory_updated_at ON public.blazer_inventory;

CREATE TRIGGER update_blazer_inventory_updated_at 
    BEFORE UPDATE ON public.blazer_inventory 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify the triggers are created
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'blazer_inventory';
