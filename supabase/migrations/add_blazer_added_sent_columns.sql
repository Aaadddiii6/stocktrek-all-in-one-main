-- Add added and sent columns to blazer_inventory table
-- This migration adds the missing columns that the triggers expect

-- Add the added and sent columns
ALTER TABLE blazer_inventory 
ADD COLUMN IF NOT EXISTS added INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sent INTEGER NOT NULL DEFAULT 0;

-- Update existing records to set added/sent based on quantity
-- For now, we'll assume all existing records are "added" (received)
UPDATE blazer_inventory 
SET 
    added = CASE 
        WHEN quantity > 0 THEN quantity 
        ELSE 0 
    END,
    sent = CASE 
        WHEN quantity < 0 THEN ABS(quantity) 
        ELSE 0 
    END
WHERE added = 0 AND sent = 0;

-- Now we can drop the quantity column since we're using added/sent
-- But first, let's make sure the triggers work with the new columns
-- We'll keep quantity for now and remove it in a future migration

-- Update the triggers to work with the new columns
-- The existing triggers should already work with added/sent columns

-- Test the triggers by updating a record
-- This will trigger the calculation of in_office_stock and blazer_stock
UPDATE blazer_inventory 
SET updated_at = NOW() 
WHERE id IN (SELECT id FROM blazer_inventory LIMIT 1);

-- Show the updated data
SELECT 'Updated blazer_inventory' as status, gender, size, added, sent, in_office_stock, quantity
FROM blazer_inventory
ORDER BY created_at DESC
LIMIT 10;

SELECT 'Updated blazer_stock' as status, gender, size, current_stock, total_received, total_distributed
FROM blazer_stock
ORDER BY created_at DESC
LIMIT 10;
