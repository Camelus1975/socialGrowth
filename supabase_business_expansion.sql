-- ========================================================================================
-- AI BUSINESS GROWTH OS EXPANSION SCHEMA
-- Phase: Universal Business Transformation
-- ========================================================================================

-- 1. Rename table `apps` to `businesses`
-- PostgreSQL will automatically update foreign key constraints!
ALTER TABLE IF EXISTS public.apps RENAME TO businesses;

-- 2. Expand columns on the new `businesses` table to handle any industry
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'saas',
ADD COLUMN IF NOT EXISTS primary_metric TEXT DEFAULT 'revenue',
ADD COLUMN IF NOT EXISTS metrics_history JSONB DEFAULT '{}'::jsonb;

-- 3. We also need to rename referencing foreign key columns in other tables for clarity.
-- (This step is optional for functionality since the foreign key relation is preserved,
-- but standardizing `app_id` to `business_id` is crucial for long-term maintainability).

DO $$ 
BEGIN
  -- discovery_jobs
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='discovery_jobs' AND column_name='app_id') THEN
    ALTER TABLE public.discovery_jobs RENAME COLUMN app_id TO business_id;
  END IF;

  -- posts
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='app_id') THEN
    ALTER TABLE public.posts RENAME COLUMN app_id TO business_id;
  END IF;

  -- media_assets
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='media_assets' AND column_name='app_id') THEN
    ALTER TABLE public.media_assets RENAME COLUMN app_id TO business_id;
  END IF;

  -- marketing_campaigns
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='marketing_campaigns' AND column_name='app_id') THEN
    ALTER TABLE public.marketing_campaigns RENAME COLUMN app_id TO business_id;
  END IF;

  -- distribution_channels
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribution_channels' AND column_name='app_id') THEN
    ALTER TABLE public.distribution_channels RENAME COLUMN app_id TO business_id;
  END IF;

  -- growth_memory
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='growth_memory' AND column_name='app_id') THEN
    ALTER TABLE public.growth_memory RENAME COLUMN app_id TO business_id;
  END IF;

  -- video_jobs
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='video_jobs' AND column_name='app_id') THEN
    ALTER TABLE public.video_jobs RENAME COLUMN app_id TO business_id;
  END IF;

  -- agent_activities
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agent_activities' AND column_name='app_id') THEN
    ALTER TABLE public.agent_activities RENAME COLUMN app_id TO business_id;
  END IF;
END $$;


-- 4. Create the Universal CRM Leads / Deals Table
CREATE TABLE IF NOT EXISTS public.crm_deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    contact_name TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    deal_value NUMERIC DEFAULT 0,
    stage TEXT NOT NULL DEFAULT 'Lead', -- Lead, Contacted, Won
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on crm_deals
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view crm deals for their businesses" 
    ON public.crm_deals FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses 
            WHERE businesses.id = crm_deals.business_id 
            AND businesses.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert crm deals for their businesses" 
    ON public.crm_deals FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.businesses 
            WHERE businesses.id = crm_deals.business_id 
            AND businesses.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update crm deals for their businesses" 
    ON public.crm_deals FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses 
            WHERE businesses.id = crm_deals.business_id 
            AND businesses.user_id = auth.uid()
        )
    );
