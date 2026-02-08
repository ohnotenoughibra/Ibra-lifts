-- Subscription system tables
-- Run this after the initial auth tables are set up

-- Subscriptions table — one row per user
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  source TEXT NOT NULL DEFAULT 'paypal' CHECK (source IN ('paypal', 'sepa', 'gym', 'trial')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'grace', 'expired', 'cancelled')),
  paypal_subscription_id TEXT,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  grace_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gyms table — for gym bundle subscriptions
CREATE TABLE IF NOT EXISTS gyms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_user_id TEXT REFERENCES auth_users(id),
  max_seats INTEGER NOT NULL DEFAULT 50,
  active_seats INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gym members — links users to gyms
CREATE TABLE IF NOT EXISTS gym_members (
  gym_id TEXT NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  added_by TEXT REFERENCES auth_users(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removed_at TIMESTAMPTZ,
  PRIMARY KEY (gym_id, user_id)
);

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_gym_members_user ON gym_members(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
