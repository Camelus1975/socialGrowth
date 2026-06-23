-- ==========================================
-- schema_v9_orchestration.sql
-- ==========================================

-- 1. Create orchestration_jobs table
CREATE TABLE IF NOT EXISTS public.orchestration_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    goal TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'executing', 'complete', 'failed'
    logs JSONB DEFAULT '[]'::jsonb, -- Array of terminal log objects: { agent: string, log: string, timestamp: string }
    results JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (app_id) REFERENCES public.businesses(business_id) ON DELETE CASCADE
);

-- 2. Row Level Security
ALTER TABLE public.orchestration_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage orchestration_jobs" ON public.orchestration_jobs;
CREATE POLICY "Users can manage orchestration_jobs" ON public.orchestration_jobs
    FOR ALL TO authenticated USING (
        user_id = auth.uid()
    );

-- 3. Enable Realtime for streaming terminal logs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'orchestration_jobs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE orchestration_jobs;
    END IF;
END $$;
