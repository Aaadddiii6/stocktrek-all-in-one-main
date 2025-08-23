-- Debug blazer_inventory table issues
-- Check for triggers, constraints, and functions that might cause type casting errors

-- Check for triggers on blazer_inventory
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'blazer_inventory';

-- Check for check constraints
SELECT 
    cc.constraint_name,
    cc.check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc ON cc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'blazer_inventory';

-- Check for any functions that might be called during delete
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition LIKE '%blazer_inventory%' 
AND routine_definition LIKE '%size%';

-- Check the exact data type of the size column
SELECT 
    column_name,
    data_type,
    udt_name,
    udt_schema
FROM information_schema.columns 
WHERE table_name = 'blazer_inventory' 
AND column_name = 'size';

-- Check if there are any foreign key constraints that might cause issues
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'blazer_inventory';
