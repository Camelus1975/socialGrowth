-- ===========================================================================
-- BUSINESS GROWTH OS: PHASE 5 - GROWTH INTELLIGENCE EXPANSION
-- Supabase Schema Migration
-- ===========================================================================

-- 1. GROWTH MEMORY ENGINE
-- Permanent institutional memory of the business (successes, failures, experiments)

CREATE TYPE memory_category AS ENUM ('success_pattern', 'failure_pattern', 'experiment', 'revenue_event', 'churn_event');

CREATE TABLE IF NOT EXISTS public.growth_memory_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT NOT NULL,
    category memory_category NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    revenue_impact DECIMAL(12,2) DEFAULT 0.00,
    metrics JSONB DEFAULT '{}'::jsonb, -- Store dynamic data like { conversion_rate: 0.12, clicks: 5000 }
    tags TEXT[] DEFAULT '{}', -- E.g., ['Email Marketing', 'Urgency', 'Q3']
    detected_by_agent TEXT, -- Which agent identified this pattern
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (app_id) REFERENCES public.businesses(business_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_growth_memory_app ON public.growth_memory_events(app_id);
CREATE INDEX IF NOT EXISTS idx_growth_memory_cat ON public.growth_memory_events(category);


-- 2. COMPETITOR INTELLIGENCE CENTER
-- Tables for tracking rivals and their historical timeline

CREATE TABLE IF NOT EXISTS public.competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT NOT NULL,
    name TEXT NOT NULL,
    website_url TEXT,
    current_pricing JSONB DEFAULT '{}'::jsonb,
    market_position TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_scanned_at TIMESTAMP WITH TIME ZONE,
    
    FOREIGN KEY (app_id) REFERENCES public.businesses(business_id) ON DELETE CASCADE
);

CREATE TYPE competitor_event_type AS ENUM ('feature_launch', 'pricing_change', 'ad_strategy', 'content_strategy', 'general_news');
CREATE TYPE threat_level AS ENUM ('low', 'medium', 'high', 'opportunity');

CREATE TABLE IF NOT EXISTS public.competitor_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_id UUID NOT NULL,
    event_type competitor_event_type NOT NULL,
    details TEXT NOT NULL,
    threat threat_level DEFAULT 'low',
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (competitor_id) REFERENCES public.competitors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comp_events_competitor ON public.competitor_events(competitor_id);


-- 3. AGENT PERFORMANCE CENTER
-- Track the effectiveness and decisions of Autonomous Growth Agents

CREATE TABLE IF NOT EXISTS public.agent_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT NOT NULL,
    agent_name TEXT NOT NULL, -- e.g., 'CMO Agent', 'Advertising Agent'
    task_goal TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, executing, completed, failed
    recommendation TEXT,
    predicted_outcome JSONB DEFAULT '{}'::jsonb,
    actual_outcome JSONB DEFAULT '{}'::jsonb,
    accuracy_score INTEGER, -- 0-100 score of how accurate the prediction was
    requires_approval BOOLEAN DEFAULT false,
    approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    FOREIGN KEY (app_id) REFERENCES public.businesses(business_id) ON DELETE CASCADE
);


-- 4. VIDEO FACTORY ANALYTICS
-- Specialized tracking for scalable video production

CREATE TABLE IF NOT EXISTS public.video_factory_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT NOT NULL,
    title TEXT NOT NULL,
    platform TEXT NOT NULL, -- TikTok, Reels, Shorts
    hook_type TEXT,
    video_url TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    views INTEGER DEFAULT 0,
    watch_time_seconds INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0.00,
    conversions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (app_id) REFERENCES public.businesses(business_id) ON DELETE CASCADE
);

-- RLS POLICIES (Row Level Security)
-- Assuming users can only see data for their own businesses

-- Growth Memory RLS
ALTER TABLE public.growth_memory_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view memory of their businesses"
ON public.growth_memory_events FOR SELECT
USING (app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()));

-- Competitors RLS
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view competitors of their businesses"
ON public.competitors FOR SELECT
USING (app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()));

-- Agent Operations RLS
ALTER TABLE public.agent_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view agent ops of their businesses"
ON public.agent_operations FOR SELECT
USING (app_id IN (SELECT business_id FROM public.businesses WHERE user_id = auth.uid()));
