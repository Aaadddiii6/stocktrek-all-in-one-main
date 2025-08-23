-- Fix the games_stock trigger function that might be causing type casting errors
-- Similar to the blazer inventory issue we just resolved

-- First, let's see what the current function looks like
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'update_games_stock' 
AND routine_schema = 'public';

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_update_games_stock ON public.games_inventory;
DROP FUNCTION IF EXISTS update_games_stock() CASCADE;

-- Recreate the function with proper type handling
CREATE OR REPLACE FUNCTION update_games_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.games_stock (game_details, current_stock, total_received, updated_at)
    VALUES (NEW.game_details, NEW.in_stock, NEW.adding, now())
    ON CONFLICT (game_details) 
    DO UPDATE SET
      current_stock = games_stock.current_stock + NEW.adding,
      total_received = games_stock.total_received + NEW.adding,
      updated_at = now();
    RETURN NEW;
  END IF;

  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    UPDATE public.games_stock 
    SET 
      current_stock = current_stock + (NEW.in_stock - OLD.in_stock),
      total_received = total_received + GREATEST(0, NEW.adding - OLD.adding),
      updated_at = now()
    WHERE game_details = NEW.game_details;
    RETURN NEW;
  END IF;

  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    UPDATE public.games_stock 
    SET 
      current_stock = current_stock - OLD.in_stock,
      total_distributed = total_distributed + OLD.sent,
      updated_at = now()
    WHERE game_details = OLD.game_details;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_update_games_stock
  AFTER INSERT OR UPDATE OR DELETE ON public.games_inventory
  FOR EACH ROW EXECUTE FUNCTION update_games_stock();

-- Verify the trigger is created
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'games_inventory';
