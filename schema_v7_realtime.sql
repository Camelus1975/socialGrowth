-- ==========================================
-- SocialGrowth Suite - Realtime Subscriptions
-- Run this ONCE in Supabase SQL Editor.
-- ==========================================

-- Turn on Realtime for agent operations so the Unified Dashboard instantly flashes
ALTER PUBLICATION supabase_realtime ADD TABLE agent_operations;

