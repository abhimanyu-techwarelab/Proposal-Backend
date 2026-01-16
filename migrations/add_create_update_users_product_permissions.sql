-- Migration: Add create_users_product and update_users_product permissions
-- This migration adds permissions required for user management in the Product App

-- Insert the create_users_product permission
INSERT INTO permissions (id, name, description, resource, action, created_at, updated_at)
SELECT
    gen_random_uuid(),
    'create_users_product',
    'Permission to create new users in the organization',
    'users',
    'create',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE name = 'create_users_product'
);

-- Insert the update_users_product permission
INSERT INTO permissions (id, name, description, resource, action, created_at, updated_at)
SELECT
    gen_random_uuid(),
    'update_users_product',
    'Permission to update existing users in the organization',
    'users',
    'update',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE name = 'update_users_product'
);

-- Insert the delete_users_product permission (for future use)
INSERT INTO permissions (id, name, description, resource, action, created_at, updated_at)
SELECT
    gen_random_uuid(),
    'delete_users_product',
    'Permission to delete users in the organization',
    'users',
    'delete',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE name = 'delete_users_product'
);
