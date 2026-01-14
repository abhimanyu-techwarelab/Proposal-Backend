-- Migration: Rename is_active to is_deleted in templates table
-- This migration renames the column and inverts the logic
-- is_active: TRUE (active) -> is_deleted: FALSE (not deleted)
-- is_active: FALSE (inactive) -> is_deleted: TRUE (deleted)

-- Step 1: Rename the column from is_active to is_deleted
ALTER TABLE templates 
RENAME COLUMN is_active TO is_deleted;

-- Step 2: Invert the existing values (since the logic is inverted)
-- TRUE (was active) becomes FALSE (not deleted)
-- FALSE (was inactive) becomes TRUE (deleted)
UPDATE templates 
SET is_deleted = NOT is_deleted
WHERE is_deleted IS NOT NULL;

-- Step 3: Set the default value to FALSE for new records
ALTER TABLE templates 
ALTER COLUMN is_deleted SET DEFAULT FALSE;

-- Step 4: Ensure NULL values are set to FALSE (not deleted) if any exist
UPDATE templates 
SET is_deleted = FALSE
WHERE is_deleted IS NULL;

-- Step 5: Make the column NOT NULL to ensure data integrity (optional, uncomment if desired)
-- ALTER TABLE templates 
-- ALTER COLUMN is_deleted SET NOT NULL;
