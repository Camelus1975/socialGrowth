-- ====================================================================
-- App Founder Growth Suite - Consolidated Database Migration Script
-- ====================================================================
-- INSTRUCTIONS: 
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/tblpouffikbyqckazfyj
-- 2. Go to "SQL Editor" on the left navigation bar.
-- 3. Click "New Query" and paste this entire script.
-- 4. Click "Run" at the bottom right.
-- ====================================================================

-- WARNING: The following drops existing tables to ensure a clean run.
-- If you have existing production data, comment out these DROP statements.
DROP TABLE IF EXISTS historical_content CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS agent_tasks CASCADE;
DROP TABLE IF EXISTS analytics CASCADE;
DROP TABLE IF EXISTS app_store_reviews CASCADE;
DROP TABLE IF EXISTS competitors CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS approvals CASCADE;
DROP TABLE IF EXISTS media CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS social_accounts CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS post_status CASCADE;
DROP TYPE IF EXISTS platform_type CASCADE;
DROP TYPE IF EXISTS agent_type CASCADE;

-- Enable pgcrypto extension for UUIDs and token encryption helpers
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Custom Enums
CREATE TYPE user_role AS ENUM ('Owner', 'Admin', 'Manager', 'Editor', 'Viewer');
CREATE TYPE post_status AS ENUM ('draft', 'review', 'revision_requested', 'approved', 'scheduled', 'published', 'rejected');
CREATE TYPE platform_type AS ENUM ('facebook', 'instagram', 'threads', 'linkedin', 'twitter', 'tiktok', 'youtube', 'pinterest');
CREATE TYPE agent_type AS ENUM ('ASOAgent', 'GrowthAgent', 'MarketingAgent', 'ContentAgent', 'AnalyticsAgent', 'CompetitorAgent', 'CampaignAgent', 'SchedulerAgent');

-- 1. Organizations
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  stripe_customer_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 2. Team Members
CREATE TABLE members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, -- Links to auth.users in Supabase
  role user_role NOT NULL DEFAULT 'Viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(org_id, user_id)
);

-- 3. Projects
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  tagline text,
  category text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 4. Social Accounts (OAuth Token Vault)
CREATE TABLE social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform platform_type NOT NULL,
  account_name text NOT NULL,
  handle text,
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text,
  expires_at timestamptz,
  health_status text NOT NULL DEFAULT 'healthy',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(project_id, platform, handle)
);

-- 5. Campaigns
CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 6. Posts
CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  platform platform_type NOT NULL,
  content text NOT NULL,
  scheduled_at timestamptz,
  status post_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 7. Media Library (Note: altered file_size to bigint from start here)
CREATE TABLE media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  folder text NOT NULL DEFAULT 'General',
  tag text,
  description text,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 8. Approvals Logs
CREATE TABLE approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  approved_by uuid,
  status text NOT NULL DEFAULT 'pending',
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 9. Notifications
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 10. Competitor Tracking
CREATE TABLE competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  downloads int NOT NULL DEFAULT 0,
  rating numeric(3,2) CHECK (rating >= 1.0 AND rating <= 5.0),
  focus_keyword text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 11. App Reviews Imports
CREATE TABLE app_store_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author text NOT NULL,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  sentiment text NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  platform text NOT NULL,
  date date NOT NULL,
  country text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 12. Analytics
CREATE TABLE analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  recorded_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 13. Agent Tasks
CREATE TABLE agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent agent_type NOT NULL,
  status text NOT NULL,
  task_description text NOT NULL,
  task_output jsonb DEFAULT '{}'::jsonb,
  orchestration_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 14. Audit Logs
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity text NOT NULL,
  ip_address text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 15. Historical Content
CREATE TABLE historical_content (
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

-- Database Performance Indexes
CREATE INDEX idx_members_user ON members(user_id);
CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_posts_project ON posts(project_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_scheduled ON posts(scheduled_at);
CREATE INDEX idx_social_project ON social_accounts(project_id);
CREATE INDEX idx_reviews_project ON app_store_reviews(project_id);
CREATE INDEX idx_analytics_project ON analytics(project_id, metric_name, recorded_at);
CREATE INDEX idx_agent_tasks_project ON agent_tasks(project_id, orchestration_id);

-- Enable Row-Level Security (RLS) on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_store_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_content ENABLE ROW LEVEL SECURITY;

-- RLS Policy Definitions
CREATE POLICY org_members_read_org ON organizations
  FOR SELECT TO authenticated USING (
    id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY members_read_members ON members
  FOR SELECT TO authenticated USING (
    org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY members_modify_projects ON projects
  FOR ALL TO authenticated USING (
    org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY members_modify_posts ON posts
  FOR ALL TO authenticated USING (
    project_id IN (SELECT id FROM projects WHERE org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid()))
  );

CREATE POLICY members_read_social ON social_accounts
  FOR SELECT TO authenticated USING (
    project_id IN (SELECT id FROM projects WHERE org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid()))
  );

CREATE POLICY members_modify_media ON media
  FOR ALL TO authenticated USING (
    project_id IN (SELECT id FROM projects WHERE org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid()))
  );

CREATE POLICY members_modify_approvals ON approvals
  FOR ALL TO authenticated USING (
    post_id IN (SELECT id FROM posts WHERE project_id IN (SELECT id FROM projects WHERE org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())))
  );

CREATE POLICY members_read_notifications ON notifications
  FOR SELECT TO authenticated USING (
    project_id IN (SELECT id FROM projects WHERE org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid()))
  );

CREATE POLICY members_read_competitors ON competitors
  FOR SELECT TO authenticated USING (
    project_id IN (SELECT id FROM projects WHERE org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid()))
  );

CREATE POLICY members_read_reviews ON app_store_reviews
  FOR SELECT TO authenticated USING (
    project_id IN (SELECT id FROM projects WHERE org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid()))
  );

CREATE POLICY members_read_analytics ON analytics
  FOR SELECT TO authenticated USING (
    project_id IN (SELECT id FROM projects WHERE org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid()))
  );

CREATE POLICY members_read_tasks ON agent_tasks
  FOR SELECT TO authenticated USING (
    project_id IN (SELECT id FROM projects WHERE org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid()))
  );

CREATE POLICY members_read_audits ON audit_logs
  FOR SELECT TO authenticated USING (
    org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
  );

-- Admins can insert social accounts connections
CREATE POLICY "Admins can insert social accounts connections" ON social_accounts
  FOR INSERT TO authenticated WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p 
      JOIN members m ON m.org_id = p.org_id
      WHERE m.user_id = auth.uid() AND m.role IN ('Owner', 'Admin')
    )
  );

CREATE POLICY "Admins can update social accounts connections" ON social_accounts
  FOR UPDATE TO authenticated USING (
    project_id IN (
      SELECT p.id FROM projects p 
      JOIN members m ON m.org_id = p.org_id
      WHERE m.user_id = auth.uid() AND m.role IN ('Owner', 'Admin')
    )
  ) WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p 
      JOIN members m ON m.org_id = p.org_id
      WHERE m.user_id = auth.uid() AND m.role IN ('Owner', 'Admin')
    )
  );

CREATE POLICY "Admins can delete social accounts connections" ON social_accounts
  FOR DELETE TO authenticated USING (
    project_id IN (
      SELECT p.id FROM projects p 
      JOIN members m ON m.org_id = p.org_id
      WHERE m.user_id = auth.uid() AND m.role IN ('Owner', 'Admin')
    )
  );

-- Fix campaigns RLS Lockout
CREATE POLICY members_modify_campaigns ON campaigns
  FOR ALL TO authenticated USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
    )
  );

-- Fix members Invitation Insert Lockout
CREATE POLICY members_insert_members ON members
  FOR INSERT TO authenticated WITH CHECK (
    org_id IN (
      SELECT org_id FROM members 
      WHERE user_id = auth.uid() AND role IN ('Owner', 'Admin')
    )
  );

CREATE POLICY members_update_members ON members
  FOR UPDATE TO authenticated USING (
    org_id IN (
      SELECT org_id FROM members 
      WHERE user_id = auth.uid() AND role IN ('Owner', 'Admin')
    )
  );

-- Fix client audit logging write blocks
CREATE POLICY members_insert_audits ON audit_logs
  FOR INSERT TO authenticated WITH CHECK (
    org_id IN (
      SELECT org_id FROM members WHERE user_id = auth.uid()
    )
  );

-- Historical Content SELECT policy
CREATE POLICY "Users can view project historical content" ON historical_content
  FOR SELECT TO authenticated USING (
    project_id IN (
      SELECT p.id FROM projects p 
      JOIN members m ON m.org_id = p.org_id
      WHERE m.user_id = auth.uid()
    )
  );

-- Historical Content ALL manage policy
CREATE POLICY "Admins can manage historical content" ON historical_content
  FOR ALL TO authenticated USING (
    project_id IN (
      SELECT p.id FROM projects p 
      JOIN members m ON m.org_id = p.org_id
      WHERE m.user_id = auth.uid() AND m.role IN ('Owner', 'Admin')
    )
  );
