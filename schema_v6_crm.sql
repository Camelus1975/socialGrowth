-- ==========================================
-- SocialGrowth Suite - CRM Module Schema Migration
-- Run this ONCE in Supabase SQL Editor.
-- ==========================================

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT NOT NULL,
    name TEXT NOT NULL,
    detail TEXT,
    stage TEXT NOT NULL DEFAULT 'Lead',
    value NUMERIC DEFAULT 0,
    email TEXT,
    phone TEXT,
    last_contact TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (app_id) REFERENCES public.businesses(business_id) ON DELETE CASCADE
);
