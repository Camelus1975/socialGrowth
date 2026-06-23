-- ==========================================
-- PHASE 8: BILLING, SUBSCRIPTIONS & GROWTH CREDITS
-- ==========================================

-- 1. USER SUBSCRIPTIONS
-- Tracks the user's active plan, Stripe mapping, and current available Growth Credits.
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE, -- 1:1 mapping with auth.uid()
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan_id TEXT NOT NULL DEFAULT 'free', -- 'free', 'starter', 'growth', 'pro', 'agency', 'enterprise'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'past_due', 'canceled', 'trialing'
    credit_balance INTEGER NOT NULL DEFAULT 20, -- Free tier gets 20 credits/mo
    billing_period_start TIMESTAMPTZ DEFAULT NOW(),
    billing_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CREDIT LEDGER
-- Immutable log of every credit added (purchase/reset) or spent (AI generation).
CREATE TABLE IF NOT EXISTS public.credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_subscriptions(user_id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- positive for add, negative for spend
    transaction_type TEXT NOT NULL, -- 'monthly_reset', 'purchase', 'usage', 'admin_adjustment'
    details JSONB DEFAULT '{}'::jsonb, -- e.g. { feature: 'video_generation', cost: 50, prompt: '...' }
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer_id ON public.user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_id ON public.credit_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_type ON public.credit_ledger(transaction_type);

-- 3. RPC: ATOMIC CREDIT SPENDING
-- Safely spends credits to prevent race conditions when generating rapidly.
CREATE OR REPLACE FUNCTION public.spend_credits(
    p_user_id UUID,
    p_amount INTEGER, -- MUST be a positive number representing the cost
    p_details JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance INTEGER;
BEGIN
    -- Get current balance with a row lock to prevent race conditions
    SELECT credit_balance INTO v_current_balance
    FROM public.user_subscriptions
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- Check if user exists and has enough credits
    IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
        RETURN FALSE; -- Insufficient funds
    END IF;

    -- Deduct balance
    UPDATE public.user_subscriptions
    SET credit_balance = credit_balance - p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Insert into immutable ledger
    INSERT INTO public.credit_ledger (user_id, amount, transaction_type, details)
    VALUES (p_user_id, -p_amount, 'usage', p_details);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. RPC: ATOMIC CREDIT ADDITION (Purchases / Resets)
CREATE OR REPLACE FUNCTION public.add_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_transaction_type TEXT,
    p_details JSONB,
    p_reset_balance BOOLEAN DEFAULT false
) RETURNS VOID AS $$
BEGIN
    -- Ensure user subscription record exists
    IF NOT EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id = p_user_id) THEN
        INSERT INTO public.user_subscriptions (user_id, credit_balance) VALUES (p_user_id, 0);
    END IF;

    -- Reset or Add
    IF p_reset_balance THEN
        -- Use-it-or-lose-it: overwrite existing balance
        UPDATE public.user_subscriptions
        SET credit_balance = p_amount, updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSE
        -- Top-up pack: add to existing
        UPDATE public.user_subscriptions
        SET credit_balance = credit_balance + p_amount, updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;

    -- Insert into immutable ledger
    INSERT INTO public.credit_ledger (user_id, amount, transaction_type, details)
    VALUES (p_user_id, p_amount, p_transaction_type, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. TRIGGER: AUTO-CREATE SUBSCRIPTION FOR NEW USERS
-- Whenever a user signs up, automatically grant them the Free plan
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, plan_id, credit_balance)
  VALUES (new.id, 'free', 20); -- 20 free credits
  
  INSERT INTO public.credit_ledger (user_id, amount, transaction_type, details)
  VALUES (new.id, 20, 'monthly_reset', '{"note": "Initial free tier allocation"}');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: In a real system, you would attach this trigger to auth.users.
-- Since auth.users is in a different schema, we'll run this manually on the backend
-- on user creation if the trigger fails to attach due to permissions.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();


-- 6. RLS POLICIES
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
DROP POLICY IF EXISTS "Users can view their subscription" ON public.user_subscriptions;
CREATE POLICY "Users can view their subscription" ON public.user_subscriptions
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Users can read their own ledger
DROP POLICY IF EXISTS "Users can view their credit ledger" ON public.credit_ledger;
CREATE POLICY "Users can view their credit ledger" ON public.credit_ledger
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Note: All inserts/updates are handled via SECURITY DEFINER RPCs or Backend Service Keys
-- so we DO NOT grant INSERT/UPDATE policies to the public to prevent credit manipulation.
