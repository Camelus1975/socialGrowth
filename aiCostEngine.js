/**
 * UNIVERSAL AI COST ENGINE (aiCostEngine.js)
 * 
 * Central singleton orchestrating:
 * - Dynamic pricing rule lookups and quality tier multipliers
 * - Pre-flight credit calculations
 * - Atomic credit reservations before long-running AI execution
 * - Success commits to the double-entry transaction ledger
 * - Instant automatic refunds on provider failure/timeout
 * - Smart optimization & AI cost control
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY
);

// Fallback pricing rules if database connection is cold
const FALLBACK_PRICING_RULES = {
  caption: { base: 1, fast: 0.75, standard: 1.0, premium: 2.0, category: 'text' },
  post: { base: 2, fast: 0.75, standard: 1.0, premium: 2.0, category: 'text' },
  hashtags: { base: 1, fast: 0.75, standard: 1.0, premium: 1.5, category: 'text' },
  copilot_query: { base: 3, fast: 0.75, standard: 1.0, premium: 2.0, category: 'text' },
  strategy: { base: 5, fast: 0.8, standard: 1.0, premium: 2.0, category: 'analytics' },
  competitor_analysis: { base: 8, fast: 0.8, standard: 1.0, premium: 2.0, category: 'analytics' },
  seo_audit: { base: 10, fast: 0.8, standard: 1.0, premium: 2.0, category: 'seo' },
  business_report: { base: 12, fast: 0.8, standard: 1.0, premium: 2.0, category: 'analytics' },
  image_generation: { base: 15, fast: 0.75, standard: 1.0, premium: 2.0, category: 'image' },
  image_upscale: { base: 8, fast: 0.8, standard: 1.0, premium: 2.0, category: 'image' },
  video_5s: { base: 30, fast: 0.8, standard: 1.0, premium: 2.0, category: 'video' },
  video_10s: { base: 60, fast: 0.8, standard: 1.0, premium: 2.0, category: 'video' },
  video_premium: { base: 120, fast: 0.8, standard: 1.0, premium: 2.0, category: 'video' },
  voice_over: { base: 10, fast: 0.8, standard: 1.0, premium: 2.0, category: 'voice' },
  agent_workflow: { base: 20, fast: 0.8, standard: 1.0, premium: 2.0, category: 'agent' },
  campaign_orchestration: { base: 50, fast: 0.8, standard: 1.0, premium: 2.0, category: 'automation' }
};

// In-memory cache for pricing rules (refreshed every 10 mins)
let cachedPricingRules = null;
let rulesCacheTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;

class AICostEngine {
  /**
   * Load active pricing rules from Supabase or fallback
   */
  async getPricingRules() {
    const now = Date.now();
    if (cachedPricingRules && (now - rulesCacheTimestamp < CACHE_TTL_MS)) {
      return cachedPricingRules;
    }

    try {
      const { data, error } = await supabase
        .from('credit_pricing_rules')
        .select('*')
        .eq('is_active', true);

      if (!error && data && data.length > 0) {
        const rulesMap = {};
        data.forEach(r => {
          rulesMap[r.action_code] = {
            base: Number(r.base_credits),
            fast: Number(r.fast_multiplier),
            standard: Number(r.standard_multiplier),
            premium: Number(r.premium_multiplier),
            category: r.category,
            displayName: r.display_name
          };
        });
        cachedPricingRules = rulesMap;
        rulesCacheTimestamp = now;
        return rulesMap;
      }
    } catch (err) {
      console.warn('[AICostEngine] Error fetching rules from DB, using fallback:', err.message);
    }

    cachedPricingRules = FALLBACK_PRICING_RULES;
    rulesCacheTimestamp = now;
    return FALLBACK_PRICING_RULES;
  }

  /**
   * Calculate required credits for an action & quality tier
   */
  async calculateCost(actionCode, qualityTier = 'standard', quantity = 1) {
    const rules = await this.getPricingRules();
    const rule = rules[actionCode] || { base: 2, fast: 0.75, standard: 1.0, premium: 2.0 };
    
    let multiplier = rule.standard;
    if (qualityTier === 'fast') multiplier = rule.fast;
    if (qualityTier === 'premium') multiplier = rule.premium;

    const unitCost = Math.ceil(rule.base * multiplier);
    return unitCost * Math.max(1, quantity);
  }

  /**
   * Pre-flight estimation for complex multi-step workflows (e.g. 7-Day Campaign Hub)
   */
  async estimateCampaign(strategyCount = 1, imageCount = 3, videoCount = 1, qualityTier = 'standard') {
    const strategyCost = await this.calculateCost('strategy', qualityTier, strategyCount);
    const imageCost = await this.calculateCost('image_generation', qualityTier, imageCount);
    const videoCost = await this.calculateCost('video_5s', qualityTier, videoCount);
    const publishingCost = await this.calculateCost('post', qualityTier, imageCount + videoCount);

    const total = strategyCost + imageCost + videoCost + publishingCost;
    return {
      total,
      breakdown: {
        strategy: { count: strategyCount, credits: strategyCost },
        images: { count: imageCount, credits: imageCost },
        video: { count: videoCount, credits: videoCost },
        publishing: { count: imageCount + videoCount, credits: publishingCost }
      },
      qualityTier
    };
  }

  /**
   * Check if user has sufficient credits before attempting execution
   */
  async checkBalance(userId, requiredCredits) {
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('balance, reserved_credits, subscription_tier')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !wallet) {
      return { hasBalance: false, balance: 0, required: requiredCredits };
    }

    const available = Number(wallet.balance);
    return {
      hasBalance: available >= requiredCredits,
      balance: available,
      required: requiredCredits,
      tier: wallet.subscription_tier
    };
  }

  /**
   * Atomically reserve credits before starting long-running AI task
   */
  async reserveCredits(userId, actionCode, qualityTier = 'standard', idempotencyKey = null, customAmount = null) {
    try {
      const { data, error } = await supabase.rpc('reserve_credits', {
        p_user_id: userId,
        p_action_code: actionCode,
        p_quality_tier: qualityTier,
        p_idempotency_key: idempotencyKey,
        p_custom_amount: customAmount
      });

      if (error) {
        console.error('[AICostEngine] reserveCredits DB Error:', error);
        return { success: false, error: 'DATABASE_ERROR', message: error.message };
      }

      return data;
    } catch (err) {
      console.error('[AICostEngine] reserveCredits Exception:', err);
      return { success: false, error: 'ENGINE_EXCEPTION', message: err.message };
    }
  }

  /**
   * Finalize and commit reserved credits after successful AI execution
   */
  async commitReservation(reservationId, executionMeta = {}) {
    if (!reservationId) return { success: false, error: 'MISSING_RESERVATION_ID' };

    try {
      const { data, error } = await supabase.rpc('commit_reserved_credits', {
        p_reservation_id: reservationId,
        p_provider: executionMeta.provider || 'unknown',
        p_model: executionMeta.model || 'unknown',
        p_cost_usd: executionMeta.costUsd || 0,
        p_latency_ms: executionMeta.latencyMs || null,
        p_metadata: executionMeta.metadata || {}
      });

      if (error) {
        console.error('[AICostEngine] commitReservation DB Error:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (err) {
      console.error('[AICostEngine] commitReservation Exception:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Automatically refund reserved credits when an AI provider fails, cancels, or times out
   */
  async refundReservation(reservationId, errorReason = 'AI_PROVIDER_ERROR') {
    if (!reservationId) return { success: false, error: 'MISSING_RESERVATION_ID' };

    console.warn(`[AICostEngine] Refunding reservation ${reservationId} due to: ${errorReason}`);
    try {
      const { data, error } = await supabase.rpc('refund_reserved_credits', {
        p_reservation_id: reservationId,
        p_error_reason: errorReason
      });

      if (error) {
        console.error('[AICostEngine] refundReservation DB Error:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (err) {
      console.error('[AICostEngine] refundReservation Exception:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Deduct credits directly for instant, synchronous tasks
   */
  async deductDirect(userId, actionCode, qualityTier = 'standard', metadata = {}, idempotencyKey = null) {
    try {
      const { data, error } = await supabase.rpc('deduct_credits_direct', {
        p_user_id: userId,
        p_action_code: actionCode,
        p_quality_tier: qualityTier,
        p_metadata: metadata,
        p_idempotency_key: idempotencyKey
      });

      if (error) {
        console.error('[AICostEngine] deductDirect DB Error:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (err) {
      console.error('[AICostEngine] deductDirect Exception:', err);
      return { success: false, error: err.message };
    }
  }
}

const aiCostEngine = new AICostEngine();
module.exports = { aiCostEngine, AICostEngine };
