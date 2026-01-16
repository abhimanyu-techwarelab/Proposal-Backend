-- Debug Script: Check Permission Configuration
-- Run this to verify the "read_user" permission exists and is properly configured

-- 1. Check if "read_user" permission exists
SELECT
    p.id,
    p.key,
    p.name,
    p.description,
    p.is_saas_admin,
    p.created_at
FROM permissions p
WHERE p.key = 'read_user';

-- 2. Check all permissions (to see if there's a typo like "read_users" plural)
SELECT
    p.id,
    p.key,
    p.name
FROM permissions p
WHERE p.key LIKE '%user%'
ORDER BY p.key;

-- 3. Check a specific user's role and permissions
-- Replace 'USER_EMAIL_HERE' with the actual user email
WITH user_info AS (
    SELECT
        u.id as user_id,
        u.email,
        u.role_id,
        r.name as role_name
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.email = 'USER_EMAIL_HERE' -- CHANGE THIS
)
SELECT
    ui.user_id,
    ui.email,
    ui.role_id,
    ui.role_name,
    p.key as permission_key,
    p.name as permission_name,
    rp.is_active as permission_active
FROM user_info ui
LEFT JOIN role_permissions rp ON ui.role_id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
ORDER BY p.key;

-- 4. Check all active permissions for a role
-- Replace 'ROLE_ID_HERE' with the actual role UUID
SELECT
    r.id as role_id,
    r.name as role_name,
    p.key as permission_key,
    p.name as permission_name,
    rp.is_active
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE r.id = 'ROLE_ID_HERE' -- CHANGE THIS
  AND rp.is_active = true
ORDER BY p.key;

-- 5. Find users with "read_user" permission
SELECT
    u.id,
    u.email,
    r.name as role_name,
    p.key as permission_key
FROM users u
INNER JOIN roles r ON u.role_id = r.id
INNER JOIN role_permissions rp ON r.id = rp.role_id
INNER JOIN permissions p ON rp.permission_id = p.id
WHERE p.key = 'read_user'
  AND rp.is_active = true
  AND u.is_deleted = false;

-- 6. Check if user has a role assigned
-- Replace 'USER_EMAIL_HERE' with the actual user email
SELECT
    u.id,
    u.email,
    u.role_id,
    CASE
        WHEN u.role_id IS NULL THEN 'NO ROLE ASSIGNED!'
        ELSE 'Role assigned'
    END as status
FROM users u
WHERE u.email = 'USER_EMAIL_HERE'; -- CHANGE THIS
