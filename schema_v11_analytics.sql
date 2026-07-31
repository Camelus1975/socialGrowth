-- Schema v11: Social Analytics Metrics Cache
-- Used by the Social Analytics Dashboard to store fetched platform metrics

-- Social Metrics Cache Table
CREATE TABLE IF NOT EXISTS public.social_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    metric_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_social_metrics_app 
    ON social_metrics(app_id, platform, metric_type);
CREATE INDEX IF NOT EXISTS idx_social_metrics_period 
    ON social_metrics(app_id, period_start, period_end);

-- RLS
ALTER TABLE public.social_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view social metrics" ON public.social_metrics;
CREATE POLICY "Users can view social metrics" ON public.social_metrics
    FOR ALL USING (
        app_id IN (SELECT business_id FROM businesses WHERE user_id = auth.uid())
    );

-- Enable Realtime
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'social_metrics'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE social_metrics;
    END IF;
END $$;
