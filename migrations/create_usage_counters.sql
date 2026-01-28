-- Usage Counters table for tracking feature usage per subscription
-- NOTE: This migration has already been applied by the user manually.
-- Kept here for documentation and reference purposes.

CREATE TABLE IF NOT EXISTS usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  current_usage INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(subscription_id, feature_id)
);

CREATE INDEX IF NOT EXISTS idx_usage_counters_sub_feature
  ON usage_counters(subscription_id, feature_id);
