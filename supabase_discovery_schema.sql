-- ========================================================================================
-- AI BUSINESS DISCOVERY & BRAND INTELLIGENCE ENGINE SCHEMA
-- Phase: App Foundation Upgrade
-- ========================================================================================

-- 1. Add the discovery_profile JSONB column to the existing apps table
-- This stores the entirety of the Brand Kit, Audits, Personas, and Voice Profile
ALTER TABLE public.apps 
ADD COLUMN IF NOT EXISTS discovery_profile JSONB DEFAULT '{}'::jsonb;

-- 2. Create the discovery_jobs table to track background scraping/generation tasks
CREATE TABLE IF NOT EXISTS public.discovery_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID REFERENCES public.apps(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, scanning, analyzing, complete, failed
    progress_percent INTEGER DEFAULT 0,
    urls_to_scan JSONB DEFAULT '{}'::jsonb,
    logs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on discovery_jobs
ALTER TABLE public.discovery_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for discovery_jobs (Users can read/write their own app's jobs)
CREATE POLICY "Users can view discovery jobs for their apps" 
    ON public.discovery_jobs FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.apps 
            WHERE apps.id = discovery_jobs.app_id 
            AND apps.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert discovery jobs for their apps" 
    ON public.discovery_jobs FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.apps 
            WHERE apps.id = discovery_jobs.app_id 
            AND apps.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update discovery jobs for their apps" 
    ON public.discovery_jobs FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.apps 
            WHERE apps.id = discovery_jobs.app_id 
            AND apps.user_id = auth.uid()
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_discovery_jobs_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_discovery_jobs_updated ON public.discovery_jobs;
CREATE TRIGGER trg_discovery_jobs_updated
BEFORE UPDATE ON public.discovery_jobs
FOR EACH ROW
EXECUTE FUNCTION update_discovery_jobs_modtime();
