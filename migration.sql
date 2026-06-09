-- App Founder Growth Suite - Production Database Migration

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
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Team Members
CREATE TABLE members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, -- Links to auth.users in Supabase
  role user_role NOT NULL DEFAULT 'Viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
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
  created_at timestamptz NOT NULL DEFAULT now()
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
  UNIQUE(project_id, platform, handle)
);

-- 5. Campaigns
CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
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
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Media Library
CREATE TABLE media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_type text NOT NULL,
  file_size text NOT NULL,
  folder text NOT NULL DEFAULT 'General',
  tag text,
  description text,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Approvals Logs
CREATE TABLE approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  approved_by uuid,
  status text NOT NULL DEFAULT 'pending',
  comments text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Notifications
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Competitor Tracking
CREATE TABLE competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  downloads int NOT NULL DEFAULT 0,
  rating numeric(3,2) CHECK (rating >= 1.0 AND rating <= 5.0),
  focus_keyword text,
  created_at timestamptz NOT NULL DEFAULT now()
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
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 12. Analytics
CREATE TABLE analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  recorded_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
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
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 14. Audit Logs
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity text NOT NULL,
  ip_address text,
  timestamp timestamptz NOT NULL DEFAULT now()
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
