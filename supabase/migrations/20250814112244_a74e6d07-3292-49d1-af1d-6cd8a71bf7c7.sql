-- Fix the size field configuration for blazer_inventory to use dependent options
-- The size field should dynamically load options based on the selected gender

-- First, let's check if there are existing option set relationships for size field
-- If not, we'll set up the dependent option system properly

-- Add the size field relationships to both male and female size option sets
-- This will allow the DynamicField component to use the useDependentOptions hook

INSERT INTO field_option_sets (field_id, option_set_id)
SELECT 
    mf.id as field_id,
    os.id as option_set_id
FROM module_fields mf
CROSS JOIN option_sets os
WHERE mf.field_name = 'size' 
  AND mf.module_id = (SELECT id FROM module_definitions WHERE name = 'blazer_inventory')
  AND os.name IN ('male_blazer_sizes', 'female_blazer_sizes')
  AND NOT EXISTS (
    SELECT 1 FROM field_option_sets fos 
    WHERE fos.field_id = mf.id AND fos.option_set_id = os.id
  );