-- ==========================================
-- Business Growth OS — PHASE 4 MIGRATION
-- Run this in Supabase SQL Editor AFTER schema_v_prod_final.sql
-- Adds: leads, deals, contacts, activities, revenue_events,
--        reputation_reviews, attribution_events, health_scores
-- ==========================================

-- ==========================================
-- 1. LEADS (CRM — Lead Management)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.leads (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id   TEXT NOT NULL,
    user_id       UUID,
    name          TEXT NOT NULL,
    email         TEXT,
    phone         TEXT,
    company       TEXT,
    source        TEXT DEFAULT 'manual',        -- 'manual', 'website', 'referral', 'social', 'ad', 'email'
    score         INTEGER DEFAULT 0,            -- 0-100 lead score
    stage         TEXT DEFAULT 'new',           -- 'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'
    tags          JSONB DEFAULT '[]',
    notes         TEXT,
    assigned_to   TEXT,
    last_contacted_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 2. CONTACTS (CRM — Contact Book)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.contacts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id   TEXT NOT NULL,
    user_id       UUID,
    name          TEXT NOT NULL,
    email         TEXT,
    phone         TEXT,
    company       TEXT,
    role          TEXT,                          -- 'customer', 'prospect', 'partner', 'vendor'
    tags          JSONB DEFAULT '[]',
    notes         TEXT,
    metadata      JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 3. DEALS (CRM — Pipeline Management)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.deals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     TEXT NOT NULL,
    user_id         UUID,
    lead_id         UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    contact_id      UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    amount          NUMERIC(12, 2) DEFAULT 0,
    currency        TEXT DEFAULT 'USD',
    stage           TEXT DEFAULT 'proposal',    -- 'discovery', 'proposal', 'negotiation', 'contract', 'won', 'lost'
    probability     INTEGER DEFAULT 50,         -- 0-100%
    expected_close  DATE,
    actual_close    DATE,
    loss_reason     TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 4. ACTIVITIES (CRM — Tasks & Follow-ups)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.activities (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id   TEXT NOT NULL,
    user_id       UUID,
    lead_id       UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    deal_id       UUID REFERENCES public.deals(id) ON DELETE CASCADE,
    contact_id    UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    type          TEXT DEFAULT 'note',          -- 'note', 'call', 'email', 'meeting', 'task', 'follow_up'
    title         TEXT,
    description   TEXT,
    due_at        TIMESTAMPTZ,
    completed     BOOLEAN DEFAULT false,
    completed_at  TIMESTAMPTZ,
    priority      TEXT DEFAULT 'medium',        -- 'low', 'medium', 'high', 'urgent'
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 5. REVENUE EVENTS (Revenue Intelligence)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.revenue_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id   TEXT NOT NULL,
    user_id       UUID,
    type          TEXT DEFAULT 'payment',       -- 'payment', 'refund', 'subscription', 'one_time', 'upsell', 'renewal'
    amount        NUMERIC(12, 2) NOT NULL,
    currency      TEXT DEFAULT 'USD',
    source        TEXT,                         -- 'stripe', 'manual', 'invoice', 'pos', 'online'
    customer_name TEXT,
    customer_email TEXT,
    contact_id    UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    deal_id       UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    is_recurring  BOOLEAN DEFAULT false,
    interval      TEXT,                         -- 'monthly', 'yearly', 'weekly'
    metadata      JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 6. REPUTATION REVIEWS (Reputation Management)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.reputation_reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     TEXT NOT NULL,
    platform        TEXT DEFAULT 'google',      -- 'google', 'facebook', 'yelp', 'trustpilot', 'g2', 'capterra', 'app_store', 'play_store'
    reviewer_name   TEXT,
    reviewer_avatar TEXT,
    rating          INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text     TEXT,
    sentiment       TEXT DEFAULT 'neutral',     -- 'positive', 'neutral', 'negative'
    sentiment_score NUMERIC(4, 2),              -- -1.0 to 1.0
    response_text   TEXT,
    responded_at    TIMESTAMPTZ,
    is_flagged      BOOLEAN DEFAULT false,
    external_id     TEXT,                       -- ID from the review platform
    review_date     TIMESTAMPTZ DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 7. ATTRIBUTION EVENTS (Attribution Engine)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.attribution_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id   TEXT NOT NULL,
    event_type    TEXT NOT NULL,                -- 'impression', 'click', 'visit', 'lead', 'appointment', 'customer', 'revenue'
    channel       TEXT,                         -- 'organic_social', 'paid_social', 'email', 'seo', 'referral', 'direct', 'paid_search'
    platform      TEXT,                         -- 'twitter', 'linkedin', 'instagram', 'google', 'facebook', 'tiktok'
    campaign_id   TEXT,
    content_id    TEXT,
    lead_id       UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    deal_id       UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    revenue       NUMERIC(12, 2) DEFAULT 0,
    session_id    TEXT,
    referrer      TEXT,
    metadata      JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 8. HEALTH SCORES (Business Health Tracking)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.health_scores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     TEXT NOT NULL,
    overall_score   INTEGER DEFAULT 0,          -- 0-100
    marketing_score INTEGER DEFAULT 0,
    sales_score     INTEGER DEFAULT 0,
    revenue_score   INTEGER DEFAULT 0,
    satisfaction_score INTEGER DEFAULT 0,
    growth_score    INTEGER DEFAULT 0,
    retention_score INTEGER DEFAULT 0,
    reputation_score INTEGER DEFAULT 0,
    advertising_score INTEGER DEFAULT 0,
    recommendations JSONB DEFAULT '[]',
    calculated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 9. INDUSTRY BENCHMARKS (Static Reference Data)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.industry_benchmarks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry        TEXT NOT NULL,              -- 'saas', 'dental', 'restaurant', 'ecommerce', 'agency', 'professional_services'
    metric_name     TEXT NOT NULL,              -- 'avg_conversion_rate', 'avg_cac', 'avg_ltv', 'avg_churn_rate', etc.
    metric_value    NUMERIC(12, 4),
    metric_unit     TEXT DEFAULT 'percent',
    source          TEXT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(industry, metric_name)
);

-- ==========================================
-- MATERIALIZED VIEW: Revenue Rollup
-- ==========================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_revenue_rollup AS
SELECT
    business_id,
    SUM(CASE WHEN type != 'refund' THEN amount ELSE 0 END) AS total_revenue,
    SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END) AS total_refunds,
    SUM(CASE WHEN is_recurring = true AND type != 'refund' THEN amount ELSE 0 END) AS mrr_estimate,
    COUNT(DISTINCT customer_email) AS unique_customers,
    COUNT(*) AS total_transactions,
    AVG(amount) AS avg_transaction_value
FROM public.revenue_events
WHERE type != 'refund'
GROUP BY business_id;

-- RPC to refresh revenue rollup
CREATE OR REPLACE FUNCTION public.refresh_mv_revenue_rollup()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.mv_revenue_rollup;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- MATERIALIZED VIEW: Lead Pipeline Rollup
-- ==========================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_lead_pipeline_rollup AS
SELECT
    business_id,
    stage,
    COUNT(*) AS lead_count,
    AVG(score) AS avg_score
FROM public.leads
GROUP BY business_id, stage;

CREATE OR REPLACE FUNCTION public.refresh_mv_lead_pipeline()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.mv_lead_pipeline_rollup;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE public.leads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_reviews  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribution_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_scores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_benchmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Scoped to business ownership
CREATE POLICY "Users can manage their leads" ON public.leads
    FOR ALL TO authenticated
    USING (business_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()))
    WITH CHECK (business_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their contacts" ON public.contacts
    FOR ALL TO authenticated
    USING (business_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()))
    WITH CHECK (business_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their deals" ON public.deals
    FOR ALL TO authenticated
    USING (business_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()))
    WITH CHECK (business_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their activities" ON public.activities
    FOR ALL TO authenticated
    USING (business_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()))
    WITH CHECK (business_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their revenue events" ON public.revenue_events
    FOR ALL TO authenticated
    USING (business_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()))
    WITH CHECK (business_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their reputation reviews" ON public.reputation_reviews
    FOR ALL TO authenticated
    USING (business_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()))
    WITH CHECK (business_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their attribution events" ON public.attribution_events
    FOR ALL TO authenticated
    USING (business_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()))
    WITH CHECK (business_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can read their health scores" ON public.health_scores
    FOR ALL TO authenticated
    USING (business_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()))
    WITH CHECK (business_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can read industry benchmarks" ON public.industry_benchmarks
    FOR SELECT TO authenticated
    USING (true);

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_leads_business_id ON public.leads(business_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON public.leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_score ON public.leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_business_id ON public.contacts(business_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
CREATE INDEX IF NOT EXISTS idx_deals_business_id ON public.deals(business_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_lead_id ON public.deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_business_id ON public.activities(business_id);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON public.activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_due_at ON public.activities(due_at);
CREATE INDEX IF NOT EXISTS idx_revenue_events_business_id ON public.revenue_events(business_id);
CREATE INDEX IF NOT EXISTS idx_revenue_events_created_at ON public.revenue_events(created_at);
CREATE INDEX IF NOT EXISTS idx_revenue_events_type ON public.revenue_events(type);
CREATE INDEX IF NOT EXISTS idx_reputation_reviews_business_id ON public.reputation_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reputation_reviews_platform ON public.reputation_reviews(platform);
CREATE INDEX IF NOT EXISTS idx_reputation_reviews_sentiment ON public.reputation_reviews(sentiment);
CREATE INDEX IF NOT EXISTS idx_attribution_events_business_id ON public.attribution_events(business_id);
CREATE INDEX IF NOT EXISTS idx_attribution_events_type ON public.attribution_events(event_type);
CREATE INDEX IF NOT EXISTS idx_attribution_events_channel ON public.attribution_events(channel);
CREATE INDEX IF NOT EXISTS idx_health_scores_business_id ON public.health_scores(business_id);
CREATE INDEX IF NOT EXISTS idx_health_scores_calculated_at ON public.health_scores(calculated_at DESC);


-- ==========================================
-- SEED: Industry Benchmark Reference Data
-- ==========================================
INSERT INTO public.industry_benchmarks (industry, metric_name, metric_value, metric_unit, source) VALUES
    ('saas', 'avg_conversion_rate', 3.50, 'percent', 'Industry Average 2025'),
    ('saas', 'avg_cac', 150.00, 'usd', 'Industry Average 2025'),
    ('saas', 'avg_ltv', 1200.00, 'usd', 'Industry Average 2025'),
    ('saas', 'avg_churn_rate', 5.00, 'percent_monthly', 'Industry Average 2025'),
    ('saas', 'avg_email_open_rate', 21.50, 'percent', 'Industry Average 2025'),
    ('saas', 'avg_social_engagement', 2.80, 'percent', 'Industry Average 2025'),
    ('dental', 'avg_conversion_rate', 8.20, 'percent', 'Industry Average 2025'),
    ('dental', 'avg_cac', 250.00, 'usd', 'Industry Average 2025'),
    ('dental', 'avg_ltv', 3500.00, 'usd', 'Industry Average 2025'),
    ('dental', 'avg_review_rating', 4.30, 'stars', 'Industry Average 2025'),
    ('dental', 'avg_email_open_rate', 23.40, 'percent', 'Industry Average 2025'),
    ('dental', 'avg_social_engagement', 1.90, 'percent', 'Industry Average 2025'),
    ('restaurant', 'avg_conversion_rate', 5.80, 'percent', 'Industry Average 2025'),
    ('restaurant', 'avg_cac', 45.00, 'usd', 'Industry Average 2025'),
    ('restaurant', 'avg_ltv', 720.00, 'usd', 'Industry Average 2025'),
    ('restaurant', 'avg_review_rating', 4.10, 'stars', 'Industry Average 2025'),
    ('restaurant', 'avg_email_open_rate', 19.80, 'percent', 'Industry Average 2025'),
    ('restaurant', 'avg_social_engagement', 3.50, 'percent', 'Industry Average 2025'),
    ('ecommerce', 'avg_conversion_rate', 2.10, 'percent', 'Industry Average 2025'),
    ('ecommerce', 'avg_cac', 35.00, 'usd', 'Industry Average 2025'),
    ('ecommerce', 'avg_ltv', 280.00, 'usd', 'Industry Average 2025'),
    ('ecommerce', 'avg_cart_abandonment', 69.80, 'percent', 'Industry Average 2025'),
    ('ecommerce', 'avg_email_open_rate', 15.70, 'percent', 'Industry Average 2025'),
    ('ecommerce', 'avg_social_engagement', 1.60, 'percent', 'Industry Average 2025'),
    ('agency', 'avg_conversion_rate', 4.50, 'percent', 'Industry Average 2025'),
    ('agency', 'avg_cac', 800.00, 'usd', 'Industry Average 2025'),
    ('agency', 'avg_ltv', 12000.00, 'usd', 'Industry Average 2025'),
    ('agency', 'avg_churn_rate', 8.00, 'percent_monthly', 'Industry Average 2025'),
    ('agency', 'avg_email_open_rate', 22.10, 'percent', 'Industry Average 2025'),
    ('agency', 'avg_social_engagement', 2.20, 'percent', 'Industry Average 2025'),
    ('professional_services', 'avg_conversion_rate', 6.00, 'percent', 'Industry Average 2025'),
    ('professional_services', 'avg_cac', 500.00, 'usd', 'Industry Average 2025'),
    ('professional_services', 'avg_ltv', 8000.00, 'usd', 'Industry Average 2025'),
    ('professional_services', 'avg_referral_rate', 35.00, 'percent', 'Industry Average 2025'),
    ('professional_services', 'avg_email_open_rate', 24.20, 'percent', 'Industry Average 2025'),
    ('professional_services', 'avg_social_engagement', 1.80, 'percent', 'Industry Average 2025')
ON CONFLICT (industry, metric_name) DO NOTHING;


-- ==========================================
-- DONE! Phase 4 database migration complete.
-- Now refresh materialized views:
--   SELECT refresh_mv_revenue_rollup();
--   SELECT refresh_mv_lead_pipeline();
-- ==========================================
