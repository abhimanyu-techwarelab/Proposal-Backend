-- Migration: Add approve_proposals_product permission
-- This migration adds the permission required for the approval workflow

-- Insert the approve_proposals_product permission
-- Note: This assumes a permissions table exists with name, resource, action columns
-- Adjust the table name and columns based on your actual schema

-- Check if the permission already exists before inserting
INSERT INTO permissions (id, name, description, resource, action, created_at, updated_at)
SELECT
    gen_random_uuid(),
    'approve_proposals_product',
    'Permission to approve or reject proposals',
    'proposals',
    'approve',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE name = 'approve_proposals_product'
);

-- Associate this permission with roles that should have approval rights
-- Typically: super_admin, admin, manager roles
-- You may need to adjust the role names/ids based on your data

-- For product_roles table (if using product-specific roles)
-- INSERT INTO product_role_permissions (product_role_id, permission_id)
-- SELECT pr.id, p.id
-- FROM product_roles pr, permissions p
-- WHERE pr.name IN ('super_admin', 'admin', 'manager')
-- AND p.name = 'approve_proposals_product'
-- AND NOT EXISTS (
--     SELECT 1 FROM product_role_permissions
--     WHERE product_role_id = pr.id AND permission_id = p.id
-- );
