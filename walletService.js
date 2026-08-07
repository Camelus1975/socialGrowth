/**
 * WALLET SERVICE (walletService.js)
 * 
 * Handles business logic for:
 * - Fetching user wallet balance, tier, and cycle details
 * - Double-entry transaction ledger queries with pagination
 * - Purchase packs and subscription plans
 * - Gamification reward claims (daily login, onboarding, streaks)
 * - Admin balance adjustments, pricing overrides, and profit margin analytics
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY
);

// Subscription plan defaults
const SUBSCRIPTION_PLANS = [
  { id: 'free', name: 'Free Tier', monthlyCredits: 100, priceUsd: 0, badge: 'Standard' },
  { id: 'starter', name: 'Starter Creator', monthlyCredits: 500, priceUsd: 29, badge: 'Popular' },
  { id: 'pro', name: 'Pro Growth', monthlyCredits: 2000, priceUsd: 89, badge: 'Recommended 🔥' },
  { id: 'business', name: 'Business Scale', monthlyCredits: 10000, priceUsd: 299, badge: 'Best Value' },
  { id: 'enterprise', name: 'Enterprise Custom', monthlyCredits: 50000, priceUsd: 999, badge: 'Unlimited Tier' }
];

class WalletService {
  /**
   * Fetch user wallet, initializing if not present
   */
  async getWallet(userId) {
    if (!userId) throw new Error('User ID is required');

    let { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!wallet || error) {
      // Auto-provision initial wallet with 100 credits for free tier
      const { data: newWallet, error: insertError } = await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          balance: 100,
          monthly_allowance: 100,
          subscription_tier: 'free'
        })
        .select()
        .single();

      if (insertError) {
        console.warn('[WalletService] Auto-provision fallback for wallet:', insertError.message);
        wallet = {
          user_id: userId,
          balance: 100,
          monthly_allowance: 100,
          purchased_credits: 0,
          bonus_credits: 0,
          reserved_credits: 0,
          lifetime_used: 0,
          subscription_tier: 'free'
        };
      } else {
        wallet = newWallet;
      }
    }

    const totalAllowance = Math.max(1, Number(wallet.monthly_allowance || 100) + Number(wallet.purchased_credits || 0));
    const currentBalance = Number(wallet.balance || 0);
    const percentRemaining = Math.min(100, Math.round((currentBalance / totalAllowance) * 100));

    return {
      id: wallet.id,
      userId: wallet.user_id,
      balance: currentBalance,
      monthlyAllowance: Number(wallet.monthly_allowance || 100),
      purchasedCredits: Number(wallet.purchased_credits || 0),
      bonusCredits: Number(wallet.bonus_credits || 0),
      reservedCredits: Number(wallet.reserved_credits || 0),
      lifetimeUsed: Number(wallet.lifetime_used || 0),
      refundedCredits: Number(wallet.refunded_credits || 0),
      subscriptionTier: wallet.subscription_tier || 'free',
      billingCycleStart: wallet.billing_cycle_start,
      billingCycleEnd: wallet.billing_cycle_end,
      percentRemaining,
      isLowCredits: currentBalance <= (totalAllowance * 0.2) || currentBalance < 20,
      isCriticalCredits: currentBalance <= (totalAllowance * 0.1) || currentBalance < 10
    };
  }

  /**
   * Get transaction history with pagination and action filters
   */
  async getTransactions(userId, limit = 20, offset = 0, actionFilter = null) {
    let query = supabase
      .from('credit_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (actionFilter) {
      query = query.eq('action_type', actionFilter);
    }

    const { data, count, error } = await query;
    if (error) {
      console.error('[WalletService] getTransactions error:', error);
      return { transactions: [], total: 0 };
    }

    return {
      transactions: data || [],
      total: count || 0,
      limit,
      offset
    };
  }

  /**
   * Get all active credit purchase packs
   */
  async getPurchasePacks() {
    const { data, error } = await supabase
      .from('credit_purchase_packs')
      .select('*')
      .eq('is_active', true)
      .order('price_usd', { ascending: true });

    if (error || !data || data.length === 0) {
      // Fallback default packs
      return [
        { pack_code: 'pack_100', credits: 100, price_usd: 9.99, discount_percent: 0, badge_label: 'Starter' },
        { pack_code: 'pack_250', credits: 250, price_usd: 19.99, discount_percent: 20, badge_label: 'Popular Choice', is_popular: true },
        { pack_code: 'pack_500', credits: 500, price_usd: 34.99, discount_percent: 30, badge_label: 'Creator Growth' },
        { pack_code: 'pack_1000', credits: 1000, price_usd: 59.99, discount_percent: 40, badge_label: 'Best Value 🔥' },
        { pack_code: 'pack_2500', credits: 2500, price_usd: 129.99, discount_percent: 48, badge_label: 'Pro Scale' },
        { pack_code: 'pack_5000', credits: 5000, price_usd: 219.99, discount_percent: 56, badge_label: 'Agency Mega Pack' }
      ];
    }

    return data;
  }

  /**
   * Get subscription plans
   */
  getSubscriptionPlans() {
    return SUBSCRIPTION_PLANS;
  }

  /**
   * Claim daily or onboarding gamification rewards
   */
  async claimReward(userId, rewardType) {
    const { data, error } = await supabase.rpc('claim_gamification_reward', {
      p_user_id: userId,
      p_reward_type: rewardType
    });

    if (error) {
      console.error('[WalletService] claimReward error:', error);
      return { success: false, error: error.message };
    }

    return data;
  }

  /**
   * Admin adjust user balance with audit log
   */
  async adminAdjustBalance(adminUserId, targetUserId, amount, reason = 'Admin Adjustment') {
    const { data, error } = await supabase.rpc('add_credits_to_wallet', {
      p_user_id: targetUserId,
      p_amount: amount,
      p_source: 'admin_adjustment',
      p_details: {
        adminUserId,
        reason,
        timestamp: new Date().toISOString()
      }
    });

    if (error) {
      console.error('[WalletService] adminAdjustBalance error:', error);
      return { success: false, error: error.message };
    }

    return data;
  }

  /**
   * Admin analytics: total burn rate, revenue, provider cost distribution, profit margins
   */
  async getAdminAnalytics() {
    try {
      const { data: transactions, error } = await supabase
        .from('credit_transactions')
        .select('amount, cost_usd, feature_category, provider, status, created_at')
        .order('created_at', { ascending: false })
        .limit(2000);

      if (error || !transactions) {
        return {
          totalCreditsBurned: 0,
          totalProviderCostUsd: 0,
          estimatedRevenueUsd: 0,
          estimatedProfitMarginPercent: 85,
          categoryBreakdown: {},
          providerBreakdown: {}
        };
      }

      let totalBurned = 0;
      let totalCostUsd = 0;
      const categoryMap = {};
      const providerMap = {};

      transactions.forEach(t => {
        const amt = Number(t.amount || 0);
        if (amt < 0) {
          const positiveAmt = Math.abs(amt);
          totalBurned += positiveAmt;
          categoryMap[t.feature_category || 'other'] = (categoryMap[t.feature_category || 'other'] || 0) + positiveAmt;
          providerMap[t.provider || 'internal'] = (providerMap[t.provider || 'internal'] || 0) + (Number(t.cost_usd || 0));
          totalCostUsd += Number(t.cost_usd || 0);
        }
      });

      // Average revenue estimation per credit = ~$0.08
      const estimatedRevenueUsd = totalBurned * 0.08;
      const profitUsd = Math.max(0, estimatedRevenueUsd - totalCostUsd);
      const marginPercent = estimatedRevenueUsd > 0 ? Math.round((profitUsd / estimatedRevenueUsd) * 100) : 85;

      return {
        totalCreditsBurned: totalBurned,
        totalProviderCostUsd: Number(totalCostUsd.toFixed(4)),
        estimatedRevenueUsd: Number(estimatedRevenueUsd.toFixed(2)),
        estimatedProfitMarginPercent: marginPercent,
        categoryBreakdown: categoryMap,
        providerBreakdown: providerMap
      };
    } catch (err) {
      console.error('[WalletService] getAdminAnalytics error:', err);
      return { error: err.message };
    }
  }
}

const walletService = new WalletService();
module.exports = { walletService, WalletService };
