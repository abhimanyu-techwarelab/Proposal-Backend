-- Migration: Add approval fields to proposals table
-- This migration adds fields needed for the approval workflow

-- Step 1: Add approved_by field (UUID of user who approved/rejected)
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS approved_by UUID;

-- Step 2: Add approved_at field (timestamp when approval action was taken)
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- Step 3: Add rejection_reason field (reason for rejection)
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Step 4: Add approval_comments field (optional comments during approval)
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS approval_comments TEXT;

-- Step 5: Add index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);

-- Step 6: Add index on approved_by for audit queries
CREATE INDEX IF NOT EXISTS idx_proposals_approved_by ON proposals(approved_by);
