-- Database Schema Patch - v3 Content Intelligence & Performance Analyzer

CREATE TABLE IF NOT EXISTS historical_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform varchar(50) NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  campaign varchar(100),
  content_type varchar(50) NOT NULL,
  caption text,
  media_assets jsonb DEFAULT '[]'::jsonb,
  published_at timestamptz NOT NULL,
  hashtags varchar(100)[] DEFAULT '{}'::varchar(100)[],
  keywords varchar(100)[] DEFAULT '{}'::varchar(100)[],
  audience_segment varchar(100),
  
  -- Performance Metrics
  impressions bigint DEFAULT 0,
  reach bigint DEFAULT 0,
  likes bigint DEFAULT 0,
  comments bigint DEFAULT 0,
  shares bigint DEFAULT 0,
  saves bigint DEFAULT 0,
  watch_time_sec bigint DEFAULT 0,
  ctr numeric(5,2) DEFAULT 0.00,
  downloads bigint DEFAULT 0,
  revenue numeric(12,2) DEFAULT 0.00,
  subscribers bigint DEFAULT 0,
  leads bigint DEFAULT 0,
  
  -- AI computed metrics
  success_score numeric(5,2) DEFAULT 0.00,
  categories varchar(100)[] DEFAULT '{}'::varchar(100)[],
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Enable Row-Level Security
ALTER TABLE historical_content ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists
DROP POLICY IF EXISTS "Users can view project historical content" ON historical_content;
DROP POLICY IF EXISTS "Admins can manage historical content" ON historical_content;

-- Select policy
CREATE POLICY "Users can view project historical content" ON historical_content
  FOR SELECT TO authenticated USING (
    project_id IN (
      SELECT p.id FROM projects p 
      JOIN members m ON m.org_id = p.org_id
      WHERE m.user_id = auth.uid()
    )
  );

-- Manage policy
CREATE POLICY "Admins can manage historical content" ON historical_content
  FOR ALL TO authenticated USING (
    project_id IN (
      SELECT p.id FROM projects p 
      JOIN members m ON m.org_id = p.org_id
      WHERE m.user_id = auth.uid() AND m.role IN ('Owner', 'Admin')
    )
  );
