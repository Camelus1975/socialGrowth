-- Phase 4: Business Growth OS - Unified Database Schema Migration

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: crm_leads
CREATE TABLE IF NOT EXISTS crm_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL, -- References the business/workspace
    contact_name VARCHAR(255) NOT NULL,
    stage VARCHAR(50) NOT NULL,
    value NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on crm_leads
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;

-- Table: crm_deals
CREATE TABLE IF NOT EXISTS crm_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    probability INTEGER DEFAULT 50,
    expected_close DATE
);

-- Enable Row Level Security (RLS) on crm_deals
ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;

-- Table: roi_attribution
CREATE TABLE IF NOT EXISTS roi_attribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL,
    revenue_generated NUMERIC DEFAULT 0,
    roas NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on roi_attribution
ALTER TABLE roi_attribution ENABLE ROW LEVEL SECURITY;

-- Table: workflow_executions
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    logs JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on workflow_executions
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;


-- Example Policy for crm_leads (assuming you use Supabase auth.uid() mapping to workspace)
-- CREATE POLICY "Users can only view leads for their workspace" 
-- ON crm_leads FOR SELECT 
-- USING ( workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()) );

-- Example Policy for crm_deals
-- CREATE POLICY "Users can only view deals for their workspace" 
-- ON crm_deals FOR SELECT 
-- USING ( lead_id IN (SELECT id FROM crm_leads WHERE workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid())) );
