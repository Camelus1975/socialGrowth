-- ==========================================
-- App Founder Growth Suite - Advertising Engine Schema
-- Contains tables for tracking ad accounts, campaigns, audiences, and performance
-- ==========================================

-- 1. Advertising Accounts (OAuth connections)
CREATE TABLE IF NOT EXISTS public.ad_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID REFERENCES public.apps(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'meta', 'google', 'linkedin', 'tiktok'
    account_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'disconnected'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ad Campaigns
CREATE TABLE IF NOT EXISTS public.ad_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID REFERENCES public.apps(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    objective VARCHAR(100) NOT NULL, -- 'installs', 'subscribers', 'mrr_growth', 'awareness'
    total_budget NUMERIC(10, 2) NOT NULL,
    daily_budget NUMERIC(10, 2),
    status VARCHAR(50) DEFAULT 'pending_approval', -- 'pending_approval', 'active', 'paused', 'completed'
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    strategy_context JSONB, -- Stored strategy from the Ad Strategist Agent
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ad Audiences
CREATE TABLE IF NOT EXISTS public.ad_audiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    targeting_criteria JSONB NOT NULL, -- e.g., { "interests": ["fitness"], "age": [18, 35], "lookalike": true }
    estimated_size BIGINT,
    confidence_score NUMERIC(3, 2), -- AI generated confidence
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Ad Creatives
CREATE TABLE IF NOT EXISTS public.ad_creatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    audience_id UUID REFERENCES public.ad_audiences(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'video', 'image', 'carousel', 'text'
    media_url TEXT, -- Link to Media Library or Video Factory asset
    headline TEXT NOT NULL,
    primary_text TEXT,
    call_to_action VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Ad Performance (Daily Aggregations)
CREATE TABLE IF NOT EXISTS public.ad_performance_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    creative_id UUID REFERENCES public.ad_creatives(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    spend NUMERIC(10, 2) DEFAULT 0,
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    installs BIGINT DEFAULT 0,
    conversions BIGINT DEFAULT 0,
    revenue NUMERIC(10, 2) DEFAULT 0,
    cpa NUMERIC(10, 2), -- Cost per acquisition
    roas NUMERIC(10, 2), -- Return on ad spend
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, creative_id, date)
);

-- RLS Policies
ALTER TABLE public.ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_performance_daily ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own ad data based on app ownership
CREATE POLICY "Users can manage ad accounts for their apps" ON public.ad_accounts
    FOR ALL USING (app_id IN (SELECT id FROM public.apps WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage ad campaigns for their apps" ON public.ad_campaigns
    FOR ALL USING (app_id IN (SELECT id FROM public.apps WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage ad audiences for their campaigns" ON public.ad_audiences
    FOR ALL USING (campaign_id IN (SELECT id FROM public.ad_campaigns WHERE app_id IN (SELECT id FROM public.apps WHERE user_id = auth.uid())));

CREATE POLICY "Users can manage ad creatives for their campaigns" ON public.ad_creatives
    FOR ALL USING (campaign_id IN (SELECT id FROM public.ad_campaigns WHERE app_id IN (SELECT id FROM public.apps WHERE user_id = auth.uid())));

CREATE POLICY "Users can read ad performance for their campaigns" ON public.ad_performance_daily
    FOR SELECT USING (campaign_id IN (SELECT id FROM public.ad_campaigns WHERE app_id IN (SELECT id FROM public.apps WHERE user_id = auth.uid())));
