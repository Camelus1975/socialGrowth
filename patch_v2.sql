-- Database Schema Patch - v2 Upgrades

-- 1. Alter media table file_size to bigint (using integer parsing)
ALTER TABLE media ALTER COLUMN file_size TYPE bigint USING (
  -- Remove non-digit chars (like ' MB', ' KB') and cast
  regexp_replace(file_size, '[^0-9]', '', 'g')::bigint
);

-- 2. Add cache invalidation and soft-delete timestamp columns to all tables
ALTER TABLE organizations ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE organizations ADD COLUMN deleted_at timestamptz;

ALTER TABLE members ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE members ADD COLUMN deleted_at timestamptz;

ALTER TABLE projects ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE projects ADD COLUMN deleted_at timestamptz;

ALTER TABLE social_accounts ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE social_accounts ADD COLUMN deleted_at timestamptz;

ALTER TABLE campaigns ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE campaigns ADD COLUMN deleted_at timestamptz;

ALTER TABLE posts ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE posts ADD COLUMN deleted_at timestamptz;

ALTER TABLE media ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE media ADD COLUMN deleted_at timestamptz;

ALTER TABLE approvals ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE approvals ADD COLUMN deleted_at timestamptz;

ALTER TABLE notifications ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE notifications ADD COLUMN deleted_at timestamptz;

ALTER TABLE competitors ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE competitors ADD COLUMN deleted_at timestamptz;

ALTER TABLE app_store_reviews ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE app_store_reviews ADD COLUMN deleted_at timestamptz;

ALTER TABLE analytics ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE analytics ADD COLUMN deleted_at timestamptz;

ALTER TABLE agent_tasks ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE agent_tasks ADD COLUMN deleted_at timestamptz;

ALTER TABLE audit_logs ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE audit_logs ADD COLUMN deleted_at timestamptz;


-- 3. Hardening RLS policies for social_accounts (Adding Owner/Admin write access)
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

-- 4. Fix campaigns RLS Lockout: Allow organization members to modify campaigns
CREATE POLICY members_modify_campaigns ON campaigns
  FOR ALL TO authenticated USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
    )
  );

-- 5. Fix members Invitation Insert Lockout: Allow Owners/Admins to insert/update organization memberships
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

-- 6. Fix client audit logging write blocks
CREATE POLICY members_insert_audits ON audit_logs
  FOR INSERT TO authenticated WITH CHECK (
    org_id IN (
      SELECT org_id FROM members WHERE user_id = auth.uid()
    )
  );

