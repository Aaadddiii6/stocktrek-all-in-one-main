-- Debug: Check existing blazer_inventory records
-- Run this in your Supabase SQL Editor to see what's causing the constraint violation

-- Check all records
SELECT 
    id,
    size,
    gender,
    user_id,
    quantity,
    in_office_stock,
    created_at
FROM blazer_inventory 
ORDER BY created_at DESC;

-- Check for potential duplicates
SELECT 
    size,
    gender,
    user_id,
    COUNT(*) as record_count
FROM blazer_inventory 
GROUP BY size, gender, user_id
HAVING COUNT(*) > 1;

-- Check the specific constraint
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name
FROM information_schema.table_constraints tc
WHERE tc.table_name = 'blazer_inventory' 
AND tc.constraint_name = 'blazer_inventory_size_gender_user_id_key';

-- Check constraint columns
SELECT 
    kcu.column_name,
    kcu.ordinal_position
FROM information_schema.key_column_usage kcu
JOIN information_schema.table_constraints tc 
    ON kcu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'blazer_inventory' 
AND tc.constraint_name = 'blazer_inventory_size_gender_user_id_key'
ORDER BY kcu.ordinal_position;
