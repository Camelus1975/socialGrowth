-- ==========================================
-- SocialGrowth Suite - PRODUCTION DATABASE SCHEMA v1.0
-- Run this ONCE in Supabase SQL Editor to set up a clean production database.
-- This replaces ALL legacy migration files.
-- ==========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Enable vector extension for AI embeddings (if available on your Supabase plan)
-- CREATE EXTENSION IF NOT EXISTS "vector";


-- ==========================================
-- 1. BUSINESSES (Core Tenant Table)
-- Every piece of data in the app is scoped to a business.
-- The frontend generates a text-based `business_id` (e.g. "myapp_123").
-- ==========================================
CREATE TABLE IF NOT EXISTS public.businesses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT UNIQUE NOT NULL,                         -- Frontend-generated slug ID
    user_id     UUID NOT NULL,                                -- auth.uid() of the owner
    name        TEXT NOT NULL,
    tagline     TEXT,
    category    TEXT DEFAULT 'General',
    business_type TEXT DEFAULT 'saas',                        -- 'saas', 'ecommerce', 'agency', etc.
    logo_color  TEXT,                                         -- CSS gradient string
    metrics_history   JSONB DEFAULT '{}',                     -- Historical KPI snapshots
    discovery_profile JSONB DEFAULT '{}',                     -- Discovery engine results
    social_growth     NUMERIC DEFAULT 0,
    conversion_rate   NUMERIC DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 2. SCHEDULED POSTS (Calendar Module)
-- Used by calendarModule.js (frontend) and workers.js (auto-publisher).
-- Standardized on `app_id` as the FK column name (= businesses.business_id).
-- ==========================================
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID,                                     -- auth.uid() of the creator
    app_id          TEXT NOT NULL,                             -- FK to businesses.business_id
    platform        TEXT NOT NULL DEFAULT 'instagram',         -- 'instagram', 'twitter', 'linkedin', etc.
    content         TEXT,                                      -- Post copy text
    publish_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    media_url       TEXT,                                      -- Optional media attachment URL
    status          TEXT DEFAULT 'scheduled',                  -- 'scheduled', 'processing', 'published', 'failed'
    external_id     TEXT,                                      -- Meta Graph API Post ID
    error_log       TEXT,                                      -- API Rejection logs
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 3. MEDIA ASSETS (Media Library)
-- Used by mediaModule.js. Scoped to `app_id` instead of the old `project_id`.
-- ==========================================
CREATE TABLE IF NOT EXISTS public.media (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id        TEXT NOT NULL,                               -- FK to businesses.business_id
    name          TEXT NOT NULL,
    file_type     TEXT NOT NULL DEFAULT 'image/png',
    file_size     BIGINT DEFAULT 0,
    folder        TEXT DEFAULT 'Brand Assets',
    tag           TEXT,
    description   TEXT,
    storage_path  TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 4. DISCOVERY JOBS (Web Scraper / Onboarding)
-- Used by discoveryEngine.js. Links to businesses via UUID `business_id`.
-- ==========================================
CREATE TABLE IF NOT EXISTS public.discovery_jobs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id      UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    urls_to_scan     JSONB DEFAULT '[]',
    status           TEXT DEFAULT 'pending',                    -- 'pending', 'processing', 'completed', 'failed'
    progress_percent INTEGER DEFAULT 0,
    logs             JSONB DEFAULT '[]',
    error_message    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 5. SOCIAL ACCOUNTS (OAuth Connections for Auto-Publisher)
-- Used by workers.js to retrieve access tokens for posting.
-- ==========================================
CREATE TABLE IF NOT EXISTS public.social_accounts (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id                 TEXT NOT NULL,                      -- FK to businesses.business_id
    platform               TEXT NOT NULL,                      -- 'instagram', 'twitter', 'facebook', etc.
    account_name           TEXT,
    handle                 TEXT,
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    expires_at             TIMESTAMPTZ,
    health_status          TEXT DEFAULT 'healthy',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RPC function for inserting social accounts (used by server.js)
CREATE OR REPLACE FUNCTION public.insert_social_account(
    p_app_id TEXT,
    p_platform TEXT,
    p_account_name TEXT,
    p_handle TEXT,
    p_access_token_encrypted TEXT,
    p_user_id UUID DEFAULT NULL
) RETURNS void AS $$
BEGIN
    -- Verify the caller owns the business ID they are trying to attach an account to
    IF p_user_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE business_id = p_app_id AND user_id = p_user_id) THEN
            RAISE EXCEPTION 'Unauthorized: You do not own this business app_id.';
        END IF;
    ELSE
        -- Fallback to auth.uid() if no explicit user_id is provided
        IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE business_id = p_app_id AND user_id = auth.uid()) THEN
            RAISE EXCEPTION 'Unauthorized: You do not own this business app_id.';
        END IF;
    END IF;

    INSERT INTO public.social_accounts (app_id, platform, account_name, handle, access_token_encrypted)
    VALUES (p_app_id, p_platform, p_account_name, p_handle, p_access_token_encrypted);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 6. INBOX THREADS (Unified Social Inbox)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.inbox_threads (
    id          TEXT PRIMARY KEY,                               -- Composite key from platform + sender
    app_id      TEXT,                                          -- FK to businesses.business_id
    sender      TEXT NOT NULL,
    platform    TEXT NOT NULL,                                  -- 'instagram', 'whatsapp', 'email', etc.
    last_text   TEXT,
    last_date   TIMESTAMPTZ DEFAULT now(),
    read        BOOLEAN DEFAULT false,
    resolved    BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 7. INBOX MESSAGES (Individual Messages in a Thread)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.inbox_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id   TEXT NOT NULL REFERENCES public.inbox_threads(id) ON DELETE CASCADE,
    sender_role TEXT NOT NULL DEFAULT 'customer',               -- 'customer', 'agent', 'bot'
    text        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 8. AD CAMPAIGNS (Advertising Engine)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.ad_campaigns (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id           TEXT NOT NULL,                             -- FK to businesses.business_id
    name             TEXT NOT NULL,
    objective        TEXT NOT NULL DEFAULT 'installs',          -- 'installs', 'subscribers', 'mrr_growth', 'awareness'
    total_budget     NUMERIC(10, 2) NOT NULL DEFAULT 0,
    daily_budget     NUMERIC(10, 2),
    status           TEXT DEFAULT 'pending_approval',           -- 'pending_approval', 'active', 'paused', 'completed'
    start_date       TIMESTAMPTZ,
    end_date         TIMESTAMPTZ,
    strategy_context JSONB,                                    -- AI strategy blob
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 9. AD PERFORMANCE DAILY (Advertising Metrics)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.ad_performance_daily (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id  UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    date         DATE NOT NULL DEFAULT CURRENT_DATE,
    spend        NUMERIC(10, 2) DEFAULT 0,
    impressions  BIGINT DEFAULT 0,
    clicks       BIGINT DEFAULT 0,
    installs     BIGINT DEFAULT 0,
    conversions  BIGINT DEFAULT 0,
    revenue      NUMERIC(10, 2) DEFAULT 0,
    cpa          NUMERIC(10, 2),                               -- Cost per acquisition
    roas         NUMERIC(10, 2),                               -- Return on ad spend
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(campaign_id, date)
);

-- ==========================================
-- 10. AI CONTENT EMBEDDINGS (RAG Memory Engine)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.ai_content_embeddings (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID,
    app_id        TEXT,                                         -- FK to businesses.business_id
    content_type  TEXT NOT NULL DEFAULT 'post',                 -- 'post', 'memory', 'strategy'
    content_text  TEXT NOT NULL,
    embedding     TEXT,                                         -- Store as TEXT; upgrade to vector(1536) if pgvector is enabled
    metadata      JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RPC function for similarity search (used by aiGatewayRouter.js)
-- NOTE: This is a placeholder. For real vector search, enable pgvector and use vector ops.
CREATE OR REPLACE FUNCTION public.match_content_embeddings(
    query_embedding TEXT,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5,
    search_user_id UUID DEFAULT NULL
) RETURNS TABLE(id UUID, content_text TEXT, content_type TEXT, metadata JSONB) AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.content_text, e.content_type, e.metadata
    FROM public.ai_content_embeddings e
    WHERE (search_user_id IS NULL OR e.user_id = search_user_id)
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Alias for memoryEngine.js which uses a different RPC name
CREATE OR REPLACE FUNCTION public.match_embeddings(
    query_embedding TEXT,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5
) RETURNS TABLE(id UUID, content_text TEXT, content_type TEXT, metadata JSONB) AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.content_text, e.content_type, e.metadata
    FROM public.ai_content_embeddings e
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 11. BUSINESSES_POSTS (Content Intelligence View)
-- A denormalized table for the performance analytics dashboard.
-- ==========================================
CREATE TABLE IF NOT EXISTS public.businesses_posts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id   TEXT NOT NULL,                                -- FK to businesses.business_id
    platform      TEXT,
    content_type  TEXT DEFAULT 'image',                         -- 'image', 'video', 'carousel', 'text'
    content_text  TEXT,
    success_score NUMERIC DEFAULT 0,
    reach         BIGINT DEFAULT 0,
    likes         BIGINT DEFAULT 0,
    ctr           NUMERIC DEFAULT 0,
    conversions   BIGINT DEFAULT 0,
    revenue       NUMERIC(10, 2) DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 12. ANALYTICS ROLLUP (Materialized View for Executive War Room)
-- ==========================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_app_analytics_rollup AS
SELECT
    bp.business_id,
    AVG(bp.success_score) AS avg_success_score,
    SUM(bp.revenue)       AS total_revenue,
    SUM(bp.conversions)   AS total_conversions,
    SUM(bp.reach)         AS total_engagement
FROM public.businesses_posts bp
GROUP BY bp.business_id;

-- RPC to refresh the materialized view (used by workers.js)
CREATE OR REPLACE FUNCTION public.refresh_mv_app_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.mv_app_analytics_rollup;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 13. AUDIT LOGS (System Activity Tracking)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID,
    app_id     TEXT,                                            -- FK to businesses.business_id
    action     TEXT NOT NULL,
    entity     TEXT,
    ip_address TEXT,
    details    JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.businesses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_jobs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_threads       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaigns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_performance_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_content_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs          ENABLE ROW LEVEL SECURITY;

-- ==============================
-- Businesses: Users can only see/modify their own businesses
-- ==============================
DROP POLICY IF EXISTS "Users can manage their own businesses" ON public.businesses;
CREATE POLICY "Users can manage their own businesses" ON public.businesses
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ==============================
-- Scheduled Posts: Users can manage posts for their businesses
-- ==============================
DROP POLICY IF EXISTS "Users can manage their scheduled posts" ON public.scheduled_posts;
CREATE POLICY "Users can manage their scheduled posts" ON public.scheduled_posts
    FOR ALL TO authenticated
    USING (
        app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid())
    )
    WITH CHECK (
        app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid())
    );

-- ==============================
-- Media: Users can manage media for their businesses
-- ==============================
DROP POLICY IF EXISTS "Users can manage their media" ON public.media;
CREATE POLICY "Users can manage their media" ON public.media
    FOR ALL TO authenticated
    USING (
        app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid())
    )
    WITH CHECK (
        app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid())
    );

-- ==============================
-- Discovery Jobs: Users can manage discovery jobs for their businesses
-- ==============================
DROP POLICY IF EXISTS "Users can manage their discovery jobs" ON public.discovery_jobs;
CREATE POLICY "Users can manage their discovery jobs" ON public.discovery_jobs
    FOR ALL TO authenticated
    USING (
        business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
    WITH CHECK (
        business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    );

-- ==============================
-- Social Accounts: Users can manage social accounts for their businesses
-- ==============================
DROP POLICY IF EXISTS "Users can manage their social accounts" ON public.social_accounts;
CREATE POLICY "Users can manage their social accounts" ON public.social_accounts
    FOR ALL TO authenticated
    USING (
        app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid())
    )
    WITH CHECK (
        app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid())
    );

-- ==============================
-- Inbox: Users can manage inbox for their businesses
-- ==============================
DROP POLICY IF EXISTS "Users can manage their inbox threads" ON public.inbox_threads;
CREATE POLICY "Users can manage their inbox threads" ON public.inbox_threads
    FOR ALL TO authenticated
    USING (
        app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid())
    )
    WITH CHECK (
        app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can manage their inbox messages" ON public.inbox_messages;
CREATE POLICY "Users can manage their inbox messages" ON public.inbox_messages
    FOR ALL TO authenticated
    USING (
        thread_id IN (
            SELECT id FROM public.inbox_threads 
            WHERE app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid())
        )
    )
    WITH CHECK (
        thread_id IN (
            SELECT id FROM public.inbox_threads 
            WHERE app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid())
        )
    );

-- ==============================
-- Ad Campaigns: Users can manage ads for their businesses
-- ==============================
DROP POLICY IF EXISTS "Users can manage their ad campaigns" ON public.ad_campaigns;
CREATE POLICY "Users can manage their ad campaigns" ON public.ad_campaigns
    FOR ALL TO authenticated
    USING (
        app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid())
    )
    WITH CHECK (
        app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can read their ad performance" ON public.ad_performance_daily;
CREATE POLICY "Users can read their ad performance" ON public.ad_performance_daily
    FOR ALL TO authenticated
    USING (
        campaign_id IN (
            SELECT id FROM public.ad_campaigns
            WHERE app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid())
        )
    );

-- ==============================
-- AI Embeddings: Users can manage their own embeddings
-- ==============================
DROP POLICY IF EXISTS "Users can manage their embeddings" ON public.ai_content_embeddings;
CREATE POLICY "Users can manage their embeddings" ON public.ai_content_embeddings
    FOR ALL TO authenticated
    USING (user_id = auth.uid() OR user_id IS NULL)
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- ==============================
-- Business Posts & Audit Logs: Read access for business owners
-- ==============================
DROP POLICY IF EXISTS "Users can read their business posts" ON public.businesses_posts;
CREATE POLICY "Users can read their business posts" ON public.businesses_posts
    FOR ALL TO authenticated
    USING (
        business_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can manage audit logs" ON public.audit_logs;
CREATE POLICY "Users can manage audit logs" ON public.audit_logs
    FOR ALL TO authenticated
    USING (
        app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid())
        OR app_id IS NULL
    );


-- ==========================================
-- INDEXES for Performance
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON public.businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_business_id ON public.businesses(business_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_app_id ON public.scheduled_posts(app_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_date ON public.scheduled_posts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON public.scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_media_app_id ON public.media(app_id);
CREATE INDEX IF NOT EXISTS idx_discovery_jobs_business_id ON public.discovery_jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_app_id ON public.social_accounts(app_id);
CREATE INDEX IF NOT EXISTS idx_inbox_threads_last_date ON public.inbox_threads(last_date);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_app_id ON public.ad_campaigns(app_id);
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_user_id ON public.ai_content_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_app_id ON public.ai_content_embeddings(app_id);
CREATE INDEX IF NOT EXISTS idx_businesses_posts_business_id ON public.businesses_posts(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_app_id ON public.audit_logs(app_id);


-- ==========================================
-- DONE! Your production database is ready.
-- ==========================================

-- ==========================================
-- 13. CUSTOMERS (CRM Module)
-- Used for storing leads, customers, and pipeline stages.
-- ==========================================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT NOT NULL,
    name TEXT NOT NULL,
    detail TEXT,
    stage TEXT NOT NULL DEFAULT 'Lead',
    value NUMERIC DEFAULT 0,
    email TEXT,
    phone TEXT,
    last_contact TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (app_id) REFERENCES public.businesses(business_id) ON DELETE CASCADE
);

-- RLS for CUSTOMERS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their customers" ON public.customers;
CREATE POLICY "Users can manage their customers" ON public.customers
    FOR ALL TO authenticated
    USING (
        app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid())
    );

-- ==========================================
-- INDEXES FOR CUSTOMERS
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_customers_app_id ON public.customers(app_id);

-- ==========================================
-- 14. GROWTH INTELLIGENCE EXPANSION (Phase 5 Tables)
-- ==========================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'memory_category') THEN
        CREATE TYPE public.memory_category AS ENUM ('success_pattern', 'failure_pattern', 'experiment', 'revenue_event', 'churn_event');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.growth_memory_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT NOT NULL,
    category public.memory_category NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    revenue_impact DECIMAL(12,2) DEFAULT 0.00,
    metrics JSONB DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT '{}',
    detected_by_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (app_id) REFERENCES public.businesses(business_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_growth_memory_app ON public.growth_memory_events(app_id);

CREATE TABLE IF NOT EXISTS public.competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT NOT NULL,
    name TEXT NOT NULL,
    website_url TEXT,
    current_pricing JSONB DEFAULT '{}'::jsonb,
    market_position TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_scanned_at TIMESTAMPTZ,
    FOREIGN KEY (app_id) REFERENCES public.businesses(business_id) ON DELETE CASCADE
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'competitor_event_type') THEN
        CREATE TYPE public.competitor_event_type AS ENUM ('feature_launch', 'pricing_change', 'ad_strategy', 'content_strategy', 'general_news');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'threat_level') THEN
        CREATE TYPE public.threat_level AS ENUM ('low', 'medium', 'high', 'opportunity');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.competitor_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_id UUID NOT NULL,
    event_type public.competitor_event_type NOT NULL,
    details TEXT NOT NULL,
    threat public.threat_level DEFAULT 'low',
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (competitor_id) REFERENCES public.competitors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.agent_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    task_goal TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    recommendation TEXT,
    predicted_outcome JSONB DEFAULT '{}'::jsonb,
    actual_outcome JSONB DEFAULT '{}'::jsonb,
    accuracy_score INTEGER,
    requires_approval BOOLEAN DEFAULT false,
    approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    FOREIGN KEY (app_id) REFERENCES public.businesses(business_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.video_factory_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT NOT NULL,
    title TEXT NOT NULL,
    platform TEXT NOT NULL,
    hook_type TEXT,
    video_url TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    views INTEGER DEFAULT 0,
    watch_time_seconds INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0.00,
    conversions INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (app_id) REFERENCES public.businesses(business_id) ON DELETE CASCADE
);

-- RLS FOR PHASE 5 TABLES
ALTER TABLE public.growth_memory_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_factory_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage growth_memory_events" ON public.growth_memory_events;
CREATE POLICY "Users can manage growth_memory_events" ON public.growth_memory_events
    FOR ALL TO authenticated USING (app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage competitors" ON public.competitors;
CREATE POLICY "Users can manage competitors" ON public.competitors
    FOR ALL TO authenticated USING (app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage competitor_events" ON public.competitor_events;
CREATE POLICY "Users can manage competitor_events" ON public.competitor_events
    FOR ALL TO authenticated USING (
        competitor_id IN (SELECT id FROM public.competitors WHERE app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()))
    );

DROP POLICY IF EXISTS "Users can manage agent_operations" ON public.agent_operations;
CREATE POLICY "Users can manage agent_operations" ON public.agent_operations
    FOR ALL TO authenticated USING (app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage video_factory_assets" ON public.video_factory_assets;
CREATE POLICY "Users can manage video_factory_assets" ON public.video_factory_assets
    FOR ALL TO authenticated USING (app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()));

-- ==========================================
-- 15. REALTIME CONFIGURATION
-- Enable Realtime for the unified dashboard to instantly flash.
-- ==========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'agent_operations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE agent_operations;
    END IF;
END $$;

-- ==========================================
-- 16. BILLING, SUBSCRIPTIONS & GROWTH CREDITS
-- ==========================================

-- 1. USER SUBSCRIPTIONS
-- Tracks the user's active plan, Stripe mapping, and current available Growth Credits.
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE, -- 1:1 mapping with auth.uid()
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan_id TEXT NOT NULL DEFAULT 'free', -- 'free', 'starter', 'growth', 'pro', 'agency', 'enterprise'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'past_due', 'canceled', 'trialing'
    credit_balance INTEGER NOT NULL DEFAULT 20, -- Free tier gets 20 credits/mo
    billing_period_start TIMESTAMPTZ DEFAULT NOW(),
    billing_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CREDIT LEDGER
-- Immutable log of every credit added (purchase/reset) or spent (AI generation).
CREATE TABLE IF NOT EXISTS public.credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_subscriptions(user_id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- positive for add, negative for spend
    transaction_type TEXT NOT NULL, -- 'monthly_reset', 'purchase', 'usage', 'admin_adjustment'
    details JSONB DEFAULT '{}'::jsonb, -- e.g. { feature: 'video_generation', cost: 50, prompt: '...' }
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer_id ON public.user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_id ON public.credit_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_type ON public.credit_ledger(transaction_type);

-- 3. RPC: ATOMIC CREDIT SPENDING
-- Safely spends credits to prevent race conditions when generating rapidly.
CREATE OR REPLACE FUNCTION public.spend_credits(
    p_user_id UUID,
    p_amount INTEGER, -- MUST be a positive number representing the cost
    p_details JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance INTEGER;
BEGIN
    -- Get current balance with a row lock to prevent race conditions
    SELECT credit_balance INTO v_current_balance
    FROM public.user_subscriptions
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- Check if user exists and has enough credits
    IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
        RETURN FALSE; -- Insufficient funds
    END IF;

    -- Deduct balance
    UPDATE public.user_subscriptions
    SET credit_balance = credit_balance - p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Insert into immutable ledger
    INSERT INTO public.credit_ledger (user_id, amount, transaction_type, details)
    VALUES (p_user_id, -p_amount, 'usage', p_details);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. RPC: ATOMIC CREDIT ADDITION (Purchases / Resets)
CREATE OR REPLACE FUNCTION public.add_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_transaction_type TEXT,
    p_details JSONB,
    p_reset_balance BOOLEAN DEFAULT false
) RETURNS VOID AS $$
BEGIN
    -- Ensure user subscription record exists
    IF NOT EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id = p_user_id) THEN
        INSERT INTO public.user_subscriptions (user_id, credit_balance) VALUES (p_user_id, 0);
    END IF;

    -- Reset or Add
    IF p_reset_balance THEN
        -- Use-it-or-lose-it: overwrite existing balance
        UPDATE public.user_subscriptions
        SET credit_balance = p_amount, updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSE
        -- Top-up pack: add to existing
        UPDATE public.user_subscriptions
        SET credit_balance = credit_balance + p_amount, updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;

    -- Insert into immutable ledger
    INSERT INTO public.credit_ledger (user_id, amount, transaction_type, details)
    VALUES (p_user_id, p_amount, p_transaction_type, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. TRIGGER: AUTO-CREATE SUBSCRIPTION FOR NEW USERS
-- Whenever a user signs up, automatically grant them the Free plan
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, plan_id, credit_balance)
  VALUES (new.id, 'free', 20); -- 20 free credits
  
  INSERT INTO public.credit_ledger (user_id, amount, transaction_type, details)
  VALUES (new.id, 20, 'monthly_reset', '{"note": "Initial free tier allocation"}');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: In a real system, you would attach this trigger to auth.users.
-- Since auth.users is in a different schema, we'll run this manually on the backend
-- on user creation if the trigger fails to attach due to permissions.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();


-- 6. RLS POLICIES
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
DROP POLICY IF EXISTS "Users can view their subscription" ON public.user_subscriptions;
CREATE POLICY "Users can view their subscription" ON public.user_subscriptions
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Users can read their own ledger
DROP POLICY IF EXISTS "Users can view their credit ledger" ON public.credit_ledger;
CREATE POLICY "Users can view their credit ledger" ON public.credit_ledger
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Note: All inserts/updates are handled via SECURITY DEFINER RPCs or Backend Service Keys
-- so we DO NOT grant INSERT/UPDATE policies to the public to prevent credit manipulation.
