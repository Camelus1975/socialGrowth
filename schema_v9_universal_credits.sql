-- ==============================================================================
-- UNIVERSAL AI CREDITS SYSTEM — DATABASE SCHEMA (V9)
-- Complete schema for Wallets, Ledger, Pricing Rules, Provider Mappings,
-- Reservations, Purchases, Gamification, and Atomic Stored Procedures
-- ==============================================================================

-- 1. WALLETS TABLE (One wallet per user/workspace)
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    app_id UUID,
    balance NUMERIC NOT NULL DEFAULT 100,
    monthly_allowance NUMERIC NOT NULL DEFAULT 100,
    purchased_credits NUMERIC NOT NULL DEFAULT 0,
    bonus_credits NUMERIC NOT NULL DEFAULT 0,
    reserved_credits NUMERIC NOT NULL DEFAULT 0,
    lifetime_used NUMERIC NOT NULL DEFAULT 0,
    refunded_credits NUMERIC NOT NULL DEFAULT 0,
    subscription_tier TEXT NOT NULL DEFAULT 'free', -- 'free', 'starter', 'pro', 'business', 'enterprise'
    billing_cycle_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    billing_cycle_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    low_credit_notified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_tier ON public.wallets(subscription_tier);

-- 2. DYNAMIC PRICING RULES TABLE (Configurable from Admin Panel)
CREATE TABLE IF NOT EXISTS public.credit_pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_code TEXT UNIQUE NOT NULL, -- e.g. 'caption', 'post', 'image_generation', 'video_5s'
    display_name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'text', 'image', 'video', 'voice', 'agent', 'analytics', 'seo', 'automation'
    base_credits NUMERIC NOT NULL DEFAULT 1,
    fast_multiplier NUMERIC NOT NULL DEFAULT 0.75,
    standard_multiplier NUMERIC NOT NULL DEFAULT 1.0,
    premium_multiplier NUMERIC NOT NULL DEFAULT 2.0,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_pricing_category ON public.credit_pricing_rules(category);
CREATE INDEX IF NOT EXISTS idx_credit_pricing_action ON public.credit_pricing_rules(action_code);

-- Seed Default Pricing Rules
INSERT INTO public.credit_pricing_rules (action_code, display_name, category, base_credits, fast_multiplier, standard_multiplier, premium_multiplier, description)
VALUES 
    ('caption', 'Generate Caption', 'text', 1, 0.75, 1.0, 2.0, 'Short text caption or hook variation'),
    ('post', 'Generate Social Post', 'text', 2, 0.75, 1.0, 2.0, 'Complete multi-platform social post copy'),
    ('hashtags', 'Generate Hashtags', 'text', 1, 0.75, 1.0, 1.5, 'Hashtag discovery and engagement tag cluster'),
    ('copilot_query', 'AI Copilot Query', 'text', 3, 0.75, 1.0, 2.0, 'Conversational Copilot strategic query'),
    ('strategy', 'Marketing Strategy', 'analytics', 5, 0.8, 1.0, 2.0, 'High-level campaign and marketing strategy roadmap'),
    ('competitor_analysis', 'Competitor Intelligence Audit', 'analytics', 8, 0.8, 1.0, 2.0, 'Deep competitor website and pricing analysis'),
    ('seo_audit', 'SEO & ASO Audit', 'seo', 10, 0.8, 1.0, 2.0, 'Keyword ranking and search visibility audit'),
    ('business_report', 'Executive Growth Report', 'analytics', 12, 0.8, 1.0, 2.0, 'Comprehensive business intelligence performance summary'),
    ('image_generation', 'Generate Image (FLUX / DALL-E)', 'image', 15, 0.75, 1.0, 2.0, 'Ultra high-definition photorealistic marketing graphic'),
    ('image_upscale', 'Image Upscaling & Enhance', 'image', 8, 0.8, 1.0, 2.0, 'Super-resolution 4K asset enhancement'),
    ('video_5s', '5-Second AI Video (Luma / Kling)', 'video', 30, 0.8, 1.0, 2.0, 'High-frame rate motion video clip'),
    ('video_10s', '10-Second AI Video', 'video', 60, 0.8, 1.0, 2.0, 'Full-length story video with camera choreography'),
    ('video_premium', 'Premium Cinematic Video (Seedance / Wan)', 'video', 120, 0.8, 1.0, 2.0, 'Cinematic 4K multi-scene video campaign'),
    ('voice_over', 'AI Voice Over (ElevenLabs)', 'voice', 10, 0.8, 1.0, 2.0, 'Natural speech audio rendering'),
    ('agent_workflow', 'AI Sub-Agent Orchestration', 'agent', 20, 0.8, 1.0, 2.0, 'Autonomous multi-agent task execution'),
    ('campaign_orchestration', 'Complete Campaign Hub Launch', 'automation', 50, 0.8, 1.0, 2.0, 'End-to-end 7-day multi-channel campaign generation')
ON CONFLICT (action_code) DO UPDATE SET
    base_credits = EXCLUDED.base_credits,
    display_name = EXCLUDED.display_name,
    category = EXCLUDED.category,
    updated_at = NOW();

-- 3. AI PROVIDER ROUTER MAPPINGS TABLE
CREATE TABLE IF NOT EXISTS public.ai_provider_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL, -- 'text', 'image', 'video', 'voice', 'agent', 'analytics'
    quality_tier TEXT NOT NULL, -- 'fast', 'standard', 'premium'
    provider TEXT NOT NULL, -- 'openai', 'anthropic', 'google', 'replicate', 'elevenlabs', 'kling', 'luma'
    model_name TEXT NOT NULL, -- e.g. 'gpt-4o-mini', 'claude-3-5-sonnet', 'flux-schnell', 'kling-v1-5'
    estimated_cost_usd NUMERIC NOT NULL DEFAULT 0.001,
    priority INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_mappings_lookup ON public.ai_provider_mappings(category, quality_tier, is_active);

-- Seed Default Provider Mappings
INSERT INTO public.ai_provider_mappings (category, quality_tier, provider, model_name, estimated_cost_usd, priority)
VALUES
    ('text', 'fast', 'openai', 'gpt-4o-mini', 0.0003, 1),
    ('text', 'standard', 'openai', 'gpt-4o', 0.003, 1),
    ('text', 'premium', 'anthropic', 'claude-3-5-sonnet-20241022', 0.015, 1),
    ('image', 'fast', 'replicate', 'black-forest-labs/flux-schnell', 0.003, 1),
    ('image', 'standard', 'replicate', 'black-forest-labs/flux-dev', 0.025, 1),
    ('image', 'premium', 'openai', 'dall-e-3', 0.040, 1),
    ('video', 'fast', 'replicate', 'wan-video/wan-2.1-1.3b', 0.080, 1),
    ('video', 'standard', 'replicate', 'kling-ai/kling-v1.5', 0.200, 1),
    ('video', 'premium', 'replicate', 'luma/ray-2', 0.500, 1),
    ('voice', 'fast', 'openai', 'tts-1', 0.015, 1),
    ('voice', 'standard', 'elevenlabs', 'eleven_multilingual_v2', 0.030, 1),
    ('voice', 'premium', 'elevenlabs', 'eleven_turbo_v2_5', 0.050, 1)
ON CONFLICT DO NOTHING;

-- 4. DOUBLE-ENTRY TRANSACTION LEDGER TABLE
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    app_id UUID,
    amount NUMERIC NOT NULL, -- Negative for deductions, positive for purchases/rewards/refunds
    balance_after NUMERIC NOT NULL,
    action_type TEXT NOT NULL, -- 'generate_post', 'generate_image', 'generate_video', 'monthly_subscription', 'purchase_pack', 'refund', 'gamification_reward', 'admin_adjustment'
    feature_category TEXT NOT NULL DEFAULT 'text',
    quality_tier TEXT NOT NULL DEFAULT 'standard', -- 'fast', 'standard', 'premium'
    provider TEXT,
    model TEXT,
    cost_usd NUMERIC DEFAULT 0,
    latency_ms INTEGER,
    status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'reserved', 'refunded', 'failed'
    reservation_id UUID,
    idempotency_key TEXT,
    error_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_action ON public.credit_transactions(action_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_idempotency ON public.credit_transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 5. ATOMIC CREDIT RESERVATIONS TABLE (For long-running AI workflows)
CREATE TABLE IF NOT EXISTS public.credit_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action_type TEXT NOT NULL,
    reserved_amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'committed', 'refunded', 'expired'
    idempotency_key TEXT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_reservations_user_id ON public.credit_reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_reservations_status ON public.credit_reservations(status);

-- 6. CREDIT PURCHASE PACKS TABLE
CREATE TABLE IF NOT EXISTS public.credit_purchase_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_code TEXT UNIQUE NOT NULL,
    credits NUMERIC NOT NULL,
    price_usd NUMERIC NOT NULL,
    discount_percent INTEGER NOT NULL DEFAULT 0,
    badge_label TEXT,
    is_popular BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Purchase Packs
INSERT INTO public.credit_purchase_packs (pack_code, credits, price_usd, discount_percent, badge_label, is_popular)
VALUES
    ('pack_100', 100, 9.99, 0, 'Starter Booster', FALSE),
    ('pack_250', 250, 19.99, 20, 'Popular Choice', TRUE),
    ('pack_500', 500, 34.99, 30, 'Creator Growth', FALSE),
    ('pack_1000', 1000, 59.99, 40, 'Best Value 🔥', FALSE),
    ('pack_2500', 2500, 129.99, 48, 'Pro Scale', FALSE),
    ('pack_5000', 5000, 219.99, 56, 'Agency Mega Pack', FALSE)
ON CONFLICT (pack_code) DO UPDATE SET
    credits = EXCLUDED.credits,
    price_usd = EXCLUDED.price_usd,
    discount_percent = EXCLUDED.discount_percent,
    badge_label = EXCLUDED.badge_label;

-- 7. GAMIFICATION REWARDS LOG TABLE
CREATE TABLE IF NOT EXISTS public.gamification_rewards_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    reward_type TEXT NOT NULL, -- 'daily_login', 'weekly_streak', 'monthly_streak', 'referral', 'profile_completion', 'social_connect', 'onboarding_complete', 'invite_business'
    credits_awarded NUMERIC NOT NULL,
    reward_key TEXT NOT NULL, -- e.g. 'daily_login_2026-08-08' for daily uniqueness
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_reward_key UNIQUE (user_id, reward_key)
);

CREATE INDEX IF NOT EXISTS idx_gamification_user_id ON public.gamification_rewards_log(user_id);

-- ==============================================================================
-- ATOMIC STORED PROCEDURES (RPCs)
-- ==============================================================================

-- Procedure 1: Atomically Reserve Credits before running long AI tasks
CREATE OR REPLACE FUNCTION public.reserve_credits(
    p_user_id UUID,
    p_action_code TEXT,
    p_quality_tier TEXT DEFAULT 'standard',
    p_idempotency_key TEXT DEFAULT NULL,
    p_custom_amount NUMERIC DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_wallet RECORD;
    v_rule RECORD;
    v_cost NUMERIC;
    v_res_id UUID;
BEGIN
    -- Idempotency Check
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, reserved_amount, status INTO v_res_id, v_cost, v_wallet.subscription_tier
        FROM public.credit_reservations
        WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key AND status = 'active';
        
        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', TRUE,
                'reservation_id', v_res_id,
                'reserved_amount', v_cost,
                'is_idempotent', TRUE
            );
        END IF;
    END IF;

    -- Fetch or initialize wallet
    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        INSERT INTO public.wallets (user_id, balance, monthly_allowance)
        VALUES (p_user_id, 100, 100)
        RETURNING * INTO v_wallet;
    END IF;

    -- Calculate Cost
    IF p_custom_amount IS NOT NULL AND p_custom_amount > 0 THEN
        v_cost := p_custom_amount;
    ELSE
        SELECT * INTO v_rule FROM public.credit_pricing_rules WHERE action_code = p_action_code AND is_active = TRUE;
        IF NOT FOUND THEN
            v_cost := 5; -- Fallback default
        ELSE
            IF p_quality_tier = 'fast' THEN
                v_cost := CEIL(v_rule.base_credits * v_rule.fast_multiplier);
            ELSIF p_quality_tier = 'premium' THEN
                v_cost := CEIL(v_rule.base_credits * v_rule.premium_multiplier);
            ELSE
                v_cost := CEIL(v_rule.base_credits * v_rule.standard_multiplier);
            END IF;
        END IF;
    END IF;

    -- Check if user has sufficient available credits
    IF v_wallet.balance < v_cost THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'INSUFFICIENT_CREDITS',
            'required', v_cost,
            'current_balance', v_wallet.balance
        );
    END IF;

    -- Deduct from balance and add to reserved_credits atomically
    UPDATE public.wallets
    SET 
        balance = balance - v_cost,
        reserved_credits = reserved_credits + v_cost,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Create reservation record
    INSERT INTO public.credit_reservations (user_id, action_type, reserved_amount, idempotency_key, expires_at)
    VALUES (p_user_id, p_action_code, v_cost, p_idempotency_key, NOW() + INTERVAL '10 minutes')
    RETURNING id INTO v_res_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'reservation_id', v_res_id,
        'reserved_amount', v_cost,
        'remaining_balance', v_wallet.balance - v_cost
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procedure 2: Commit Reserved Credits after AI task completes successfully
CREATE OR REPLACE FUNCTION public.commit_reserved_credits(
    p_reservation_id UUID,
    p_provider TEXT DEFAULT NULL,
    p_model TEXT DEFAULT NULL,
    p_cost_usd NUMERIC DEFAULT 0,
    p_latency_ms INTEGER DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_res RECORD;
    v_wallet RECORD;
    v_new_balance NUMERIC;
BEGIN
    SELECT * INTO v_res FROM public.credit_reservations WHERE id = p_reservation_id FOR UPDATE;
    IF NOT FOUND OR v_res.status != 'active' THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_RESERVATION');
    END IF;

    -- Update reservation status
    UPDATE public.credit_reservations
    SET status = 'committed', updated_at = NOW()
    WHERE id = p_reservation_id;

    -- Decrement reserved_credits and increment lifetime_used in wallet
    UPDATE public.wallets
    SET 
        reserved_credits = GREATEST(0, reserved_credits - v_res.reserved_amount),
        lifetime_used = lifetime_used + v_res.reserved_amount,
        updated_at = NOW()
    WHERE user_id = v_res.user_id
    RETURNING balance INTO v_new_balance;

    -- Write immutable ledger record
    INSERT INTO public.credit_transactions (
        user_id, amount, balance_after, action_type, feature_category,
        provider, model, cost_usd, latency_ms, status, reservation_id, metadata
    ) VALUES (
        v_res.user_id,
        -v_res.reserved_amount,
        v_new_balance,
        v_res.action_type,
        COALESCE(p_metadata->>'category', 'general'),
        p_provider,
        p_model,
        p_cost_usd,
        p_latency_ms,
        'completed',
        p_reservation_id,
        p_metadata
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'committed_amount', v_res.reserved_amount,
        'current_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procedure 3: Refund Reserved Credits when AI provider fails or times out
CREATE OR REPLACE FUNCTION public.refund_reserved_credits(
    p_reservation_id UUID,
    p_error_reason TEXT DEFAULT 'AI_PROVIDER_ERROR'
)
RETURNS JSONB AS $$
DECLARE
    v_res RECORD;
    v_new_balance NUMERIC;
BEGIN
    SELECT * INTO v_res FROM public.credit_reservations WHERE id = p_reservation_id FOR UPDATE;
    IF NOT FOUND OR v_res.status != 'active' THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_RESERVATION');
    END IF;

    -- Mark reservation refunded
    UPDATE public.credit_reservations
    SET status = 'refunded', updated_at = NOW()
    WHERE id = p_reservation_id;

    -- Restore balance and clear reservation in wallet
    UPDATE public.wallets
    SET 
        balance = balance + v_res.reserved_amount,
        reserved_credits = GREATEST(0, reserved_credits - v_res.reserved_amount),
        refunded_credits = refunded_credits + v_res.reserved_amount,
        updated_at = NOW()
    WHERE user_id = v_res.user_id
    RETURNING balance INTO v_new_balance;

    -- Write refund record to immutable ledger
    INSERT INTO public.credit_transactions (
        user_id, amount, balance_after, action_type, feature_category,
        status, reservation_id, error_reason
    ) VALUES (
        v_res.user_id,
        v_res.reserved_amount,
        v_new_balance,
        'refund',
        'refund',
        'refunded',
        p_reservation_id,
        p_error_reason
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'refunded_amount', v_res.reserved_amount,
        'current_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procedure 4: Direct Credit Deduction for Instant Tasks
CREATE OR REPLACE FUNCTION public.deduct_credits_direct(
    p_user_id UUID,
    p_action_code TEXT,
    p_quality_tier TEXT DEFAULT 'standard',
    p_custom_amount NUMERIC DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_wallet RECORD;
    v_rule RECORD;
    v_cost NUMERIC;
    v_new_balance NUMERIC;
BEGIN
    -- Idempotency Check
    IF p_idempotency_key IS NOT NULL THEN
        SELECT balance_after INTO v_new_balance
        FROM public.credit_transactions
        WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
        
        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', TRUE,
                'is_idempotent', TRUE,
                'current_balance', v_new_balance
            );
        END IF;
    END IF;

    -- Fetch or create wallet
    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        INSERT INTO public.wallets (user_id, balance, monthly_allowance)
        VALUES (p_user_id, 100, 100)
        RETURNING * INTO v_wallet;
    END IF;

    -- Calculate Cost
    IF p_custom_amount IS NOT NULL AND p_custom_amount > 0 THEN
        v_cost := p_custom_amount;
    ELSE
        SELECT * INTO v_rule FROM public.credit_pricing_rules WHERE action_code = p_action_code AND is_active = TRUE;
        IF NOT FOUND THEN
            v_cost := 2;
        ELSE
            IF p_quality_tier = 'fast' THEN
                v_cost := CEIL(v_rule.base_credits * v_rule.fast_multiplier);
            ELSIF p_quality_tier = 'premium' THEN
                v_cost := CEIL(v_rule.base_credits * v_rule.premium_multiplier);
            ELSE
                v_cost := CEIL(v_rule.base_credits * v_rule.standard_multiplier);
            END IF;
        END IF;
    END IF;

    IF v_wallet.balance < v_cost THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'INSUFFICIENT_CREDITS',
            'required', v_cost,
            'current_balance', v_wallet.balance
        );
    END IF;

    -- Deduct credits
    UPDATE public.wallets
    SET 
        balance = balance - v_cost,
        lifetime_used = lifetime_used + v_cost,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING balance INTO v_new_balance;

    -- Ledger record
    INSERT INTO public.credit_transactions (
        user_id, amount, balance_after, action_type, feature_category,
        quality_tier, status, idempotency_key, metadata
    ) VALUES (
        p_user_id,
        -v_cost,
        v_new_balance,
        p_action_code,
        COALESCE(p_metadata->>'category', 'text'),
        p_quality_tier,
        'completed',
        p_idempotency_key,
        p_metadata
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'deducted_amount', v_cost,
        'current_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procedure 5: Add Credits to Wallet (Purchases, Subscriptions, Admin Adjustments)
CREATE OR REPLACE FUNCTION public.add_credits_to_wallet(
    p_user_id UUID,
    p_amount NUMERIC,
    p_source TEXT, -- 'purchase_pack', 'monthly_subscription', 'admin_bonus', 'gamification_reward'
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_wallet RECORD;
    v_new_balance NUMERIC;
BEGIN
    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        INSERT INTO public.wallets (user_id, balance, monthly_allowance)
        VALUES (p_user_id, 100, 100)
        RETURNING * INTO v_wallet;
    END IF;

    IF p_source = 'purchase_pack' THEN
        UPDATE public.wallets
        SET 
            balance = balance + p_amount,
            purchased_credits = purchased_credits + p_amount,
            updated_at = NOW()
        WHERE user_id = p_user_id
        RETURNING balance INTO v_new_balance;
    ELSIF p_source = 'gamification_reward' THEN
        UPDATE public.wallets
        SET 
            balance = balance + p_amount,
            bonus_credits = bonus_credits + p_amount,
            updated_at = NOW()
        WHERE user_id = p_user_id
        RETURNING balance INTO v_new_balance;
    ELSE
        UPDATE public.wallets
        SET 
            balance = balance + p_amount,
            updated_at = NOW()
        WHERE user_id = p_user_id
        RETURNING balance INTO v_new_balance;
    END IF;

    -- Record in Ledger
    INSERT INTO public.credit_transactions (
        user_id, amount, balance_after, action_type, feature_category, status, metadata
    ) VALUES (
        p_user_id,
        p_amount,
        v_new_balance,
        p_source,
        'billing',
        'completed',
        p_details
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'added_amount', p_amount,
        'current_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procedure 6: Claim Gamification Rewards
CREATE OR REPLACE FUNCTION public.claim_gamification_reward(
    p_user_id UUID,
    p_reward_type TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_reward_amount NUMERIC := 0;
    v_reward_key TEXT;
    v_result JSONB;
BEGIN
    -- Determine reward key and amount
    IF p_reward_type = 'daily_login' THEN
        v_reward_amount := 2;
        v_reward_key := 'daily_login_' || TO_CHAR(NOW(), 'YYYY-MM-DD');
    ELSIF p_reward_type = 'weekly_streak' THEN
        v_reward_amount := 10;
        v_reward_key := 'weekly_streak_' || TO_CHAR(NOW(), 'IYYY-IW');
    ELSIF p_reward_type = 'monthly_streak' THEN
        v_reward_amount := 50;
        v_reward_key := 'monthly_streak_' || TO_CHAR(NOW(), 'YYYY-MM');
    ELSIF p_reward_type = 'profile_completion' THEN
        v_reward_amount := 20;
        v_reward_key := 'profile_completion';
    ELSIF p_reward_type = 'social_connect' THEN
        v_reward_amount := 25;
        v_reward_key := 'social_connect';
    ELSIF p_reward_type = 'onboarding_complete' THEN
        v_reward_amount := 50;
        v_reward_key := 'onboarding_complete';
    ELSIF p_reward_type = 'referral' THEN
        v_reward_amount := 100;
        v_reward_key := 'referral_' || gen_random_uuid()::text;
    ELSE
        RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_REWARD_TYPE');
    END IF;

    -- Check if already claimed
    IF EXISTS (SELECT 1 FROM public.gamification_rewards_log WHERE user_id = p_user_id AND reward_key = v_reward_key) THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'ALREADY_CLAIMED',
            'message', 'You have already claimed this reward for this period.'
        );
    END IF;

    -- Insert log
    INSERT INTO public.gamification_rewards_log (user_id, reward_type, credits_awarded, reward_key)
    VALUES (p_user_id, p_reward_type, v_reward_amount, v_reward_key);

    -- Add credits
    v_result := public.add_credits_to_wallet(
        p_user_id,
        v_reward_amount,
        'gamification_reward',
        jsonb_build_object('reward_type', p_reward_type, 'reward_key', v_reward_key)
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'reward_type', p_reward_type,
        'credits_awarded', v_reward_amount,
        'current_balance', v_result->>'current_balance'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
