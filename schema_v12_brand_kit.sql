-- Schema v12: Brand Kit & Voice Directives
-- Stores visual identity, brand voice, and prompt rules per business

CREATE TABLE IF NOT EXISTS public.brand_kits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT UNIQUE NOT NULL,
    primary_color TEXT DEFAULT '#6366f1',
    secondary_color TEXT DEFAULT '#8b5cf6',
    accent_color TEXT DEFAULT '#ec4899',
    font_family TEXT DEFAULT 'Inter',
    logo_url TEXT,
    tone_of_voice TEXT DEFAULT 'Professional',
    target_persona TEXT,
    key_phrases TEXT[] DEFAULT '{}',
    forbidden_words TEXT[] DEFAULT '{}',
    visual_style TEXT DEFAULT 'Modern Minimalist',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_kits_app ON brand_kits(app_id);

-- RLS
ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage brand kits" ON public.brand_kits;
CREATE POLICY "Users can manage brand kits" ON public.brand_kits
    FOR ALL USING (
        app_id IN (SELECT business_id FROM businesses WHERE user_id = auth.uid())
    );

-- Enable Realtime
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'brand_kits'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE brand_kits;
    END IF;
END $$;
