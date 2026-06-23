-- Schema Update: Content Publishing Pipeline (Timezone Fix)

-- Clear existing dummy data to allow structural changes
TRUNCATE TABLE public.scheduled_posts;

-- Modify scheduled_posts table
ALTER TABLE public.scheduled_posts
DROP COLUMN IF EXISTS scheduled_date,
DROP COLUMN IF EXISTS scheduled_time,
ADD COLUMN publish_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN external_id TEXT,
ADD COLUMN error_log TEXT;
