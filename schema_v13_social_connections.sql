-- ============================================================================
-- SCHEMA V13: UNIVERSAL SOCIAL PLATFORM CONNECTION & PUBLISHING SYSTEM
-- Enterprise-grade schema for OAuth accounts, encrypted tokens, multi-platform publishing queue,
-- unified comment streams, and performance analytics.
-- ============================================================================

-- 1. Connected Social Accounts
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id TEXT DEFAULT 'default',
  platform TEXT NOT NULL, -- 'instagram', 'facebook', 'linkedin', 'x', 'tiktok', 'pinterest', 'youtube', 'threads'
  account_id TEXT NOT NULL, -- Platform-specific ID (Page ID, Channel ID, Profile ID)
  account_name TEXT NOT NULL,
  username TEXT,
  avatar_url TEXT,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes JSONB DEFAULT '[]'::jsonb,
  permissions JSONB DEFAULT '{"publish": true, "analytics": true, "comments": true, "stories": true}'::jsonb,
  status TEXT NOT NULL DEFAULT 'connected', -- 'connected', 'expired', 'revoked', 'rate_limited', 'error'
  health_score INTEGER NOT NULL DEFAULT 100, -- 0 to 100
  follower_count INTEGER DEFAULT 0,
  connection_quality_percent INTEGER DEFAULT 100,
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  last_publish_at TIMESTAMPTZ,
  next_scheduled_post_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_platform_account UNIQUE (user_id, platform, account_id)
);

-- 2. Multi-Platform Publishing Queue
CREATE TABLE IF NOT EXISTS public.publishing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  adapted_content TEXT,
  media_urls JSONB DEFAULT '[]'::jsonb,
  media_type TEXT DEFAULT 'image', -- 'image', 'video', 'carousel', 'text_only'
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled', 'retrying'
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_log TEXT,
  platform_post_id TEXT,
  platform_post_url TEXT,
  validation_results JSONB DEFAULT '{"valid": true}'::jsonb,
  campaign_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Social Comments & Unified Stream
CREATE TABLE IF NOT EXISTS public.social_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_post_id TEXT NOT NULL,
  platform_comment_id TEXT NOT NULL UNIQUE,
  parent_comment_id TEXT,
  author_name TEXT NOT NULL,
  author_username TEXT,
  author_avatar TEXT,
  comment_text TEXT NOT NULL,
  sentiment TEXT DEFAULT 'neutral', -- 'positive', 'neutral', 'negative', 'urgent'
  priority TEXT DEFAULT 'normal', -- 'high', 'normal', 'low'
  ai_suggested_reply TEXT,
  reply_text TEXT,
  status TEXT NOT NULL DEFAULT 'unread', -- 'unread', 'needs_reply', 'replied', 'ignored'
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Social Analytics & Performance History
CREATE TABLE IF NOT EXISTS public.social_analytics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_post_id TEXT,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  video_views INTEGER DEFAULT 0,
  watch_time_seconds INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0.00,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Indexes for High-Throughput Queue and Analytics
CREATE INDEX IF NOT EXISTS idx_social_accounts_user ON public.social_accounts(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_publishing_queue_scheduled ON public.publishing_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_publishing_queue_user ON public.publishing_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_social_comments_account ON public.social_comments(social_account_id, status);
CREATE INDEX IF NOT EXISTS idx_social_analytics_account ON public.social_analytics_history(social_account_id, synced_at);

-- 6. Atomic Stored Procedure: Upsert Social Account
CREATE OR REPLACE FUNCTION public.upsert_social_account(
  p_user_id UUID,
  p_platform TEXT,
  p_account_id TEXT,
  p_account_name TEXT,
  p_username TEXT,
  p_avatar_url TEXT,
  p_access_token_encrypted TEXT,
  p_refresh_token_encrypted TEXT,
  p_expires_at TIMESTAMPTZ,
  p_scopes JSONB,
  p_permissions JSONB,
  p_follower_count INTEGER,
  p_metadata JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id UUID;
BEGIN
  INSERT INTO public.social_accounts (
    user_id,
    platform,
    account_id,
    account_name,
    username,
    avatar_url,
    access_token_encrypted,
    refresh_token_encrypted,
    token_expires_at,
    scopes,
    permissions,
    follower_count,
    metadata,
    status,
    health_score,
    connection_quality_percent,
    last_sync_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_platform,
    p_account_id,
    p_account_name,
    p_username,
    p_avatar_url,
    p_access_token_encrypted,
    p_refresh_token_encrypted,
    p_expires_at,
    COALESCE(p_scopes, '[]'::jsonb),
    COALESCE(p_permissions, '{"publish": true, "analytics": true, "comments": true, "stories": true}'::jsonb),
    COALESCE(p_follower_count, 0),
    COALESCE(p_metadata, '{}'::jsonb),
    'connected',
    100,
    100,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, platform, account_id)
  DO UPDATE SET
    account_name = EXCLUDED.account_name,
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url,
    access_token_encrypted = EXCLUDED.access_token_encrypted,
    refresh_token_encrypted = COALESCE(EXCLUDED.refresh_token_encrypted, social_accounts.refresh_token_encrypted),
    token_expires_at = COALESCE(EXCLUDED.token_expires_at, social_accounts.token_expires_at),
    scopes = COALESCE(EXCLUDED.scopes, social_accounts.scopes),
    permissions = COALESCE(EXCLUDED.permissions, social_accounts.permissions),
    follower_count = COALESCE(EXCLUDED.follower_count, social_accounts.follower_count),
    metadata = EXCLUDED.metadata,
    status = 'connected',
    health_score = 100,
    connection_quality_percent = 100,
    last_sync_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_account_id;

  RETURN v_account_id;
END;
$$;
