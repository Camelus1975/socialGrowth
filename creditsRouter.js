/**
 * CREDITS & WALLET API ROUTER (creditsRouter.js)
 * 
 * Express endpoints for the Universal AI Credits System:
 * - Wallet overview & real-time balance
 * - Pre-flight calculation & estimation
 * - Atomic credit reservations, commits, and instant refunds
 * - Purchase packs, subscriptions, gamification claims
 * - Admin pricing overrides, manual adjustments, and profit margin analytics
 */

const express = require('express');
const router = express.Router();
const { aiCostEngine } = require('./aiCostEngine');
const { walletService } = require('./walletService');
const { aiProviderRouter } = require('./aiProviderRouter');
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY
);

// Helper middleware to extract user from Supabase JWT
async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // If no header, check if testing in dev mode with mock or fallback
    req.user = { id: req.query.user_id || req.body.user_id || '00000000-0000-0000-0000-000000000000' };
    return next();
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      req.user = user;
    } else {
      req.user = { id: req.query.user_id || req.body.user_id || '00000000-0000-0000-0000-000000000000' };
    }
  } catch (err) {
    req.user = { id: req.query.user_id || req.body.user_id || '00000000-0000-0000-0000-000000000000' };
  }
  next();
}

router.use(authenticateUser);

// 1. GET /api/credits/wallet - User's current balance, breakdown, and low-credit status
router.get('/wallet', async (req, res) => {
  try {
    const wallet = await walletService.getWallet(req.user.id);
    return res.json({ success: true, wallet });
  } catch (err) {
    console.error('[CreditsAPI] GET /wallet error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET /api/credits/estimate - Pre-flight calculation for complex tasks
router.get('/estimate', async (req, res) => {
  const { action, qualityTier = 'standard', quantity = 1, strategy = 1, images = 3, video = 1 } = req.query;

  try {
    if (action === 'campaign') {
      const estimation = await aiCostEngine.estimateCampaign(
        Number(strategy),
        Number(images),
        Number(video),
        qualityTier
      );
      return res.json({ success: true, estimation });
    }

    const unitCost = await aiCostEngine.calculateCost(action || 'post', qualityTier, Number(quantity));
    return res.json({
      success: true,
      estimation: {
        action: action || 'post',
        qualityTier,
        quantity: Number(quantity),
        total: unitCost
      }
    });
  } catch (err) {
    console.error('[CreditsAPI] GET /estimate error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. POST /api/credits/reserve - Atomically reserve credits before starting long tasks
router.post('/reserve', async (req, res) => {
  const { actionCode, qualityTier = 'standard', idempotencyKey, customAmount } = req.body;

  if (!actionCode) {
    return res.status(400).json({ success: false, error: 'actionCode is required' });
  }

  try {
    const result = await aiCostEngine.reserveCredits(
      req.user.id,
      actionCode,
      qualityTier,
      idempotencyKey,
      customAmount ? Number(customAmount) : null
    );

    if (result.success === false && result.error === 'INSUFFICIENT_CREDITS') {
      return res.status(402).json({
        success: false,
        code: 'INSUFFICIENT_CREDITS',
        required: result.required,
        currentBalance: result.current_balance,
        message: 'Insufficient AI credits for this operation. Please top up your wallet.'
      });
    }

    return res.json(result);
  } catch (err) {
    console.error('[CreditsAPI] POST /reserve error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. POST /api/credits/commit - Finalize and commit reserved credits on success
router.post('/commit', async (req, res) => {
  const { reservationId, provider, model, costUsd, latencyMs, metadata } = req.body;

  if (!reservationId) {
    return res.status(400).json({ success: false, error: 'reservationId is required' });
  }

  try {
    const result = await aiCostEngine.commitReservation(reservationId, {
      provider,
      model,
      costUsd: Number(costUsd || 0),
      latencyMs: Number(latencyMs || 0),
      metadata: metadata || {}
    });

    return res.json(result);
  } catch (err) {
    console.error('[CreditsAPI] POST /commit error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. POST /api/credits/refund - Automatically refund reserved credits on failure
router.post('/refund', async (req, res) => {
  const { reservationId, errorReason } = req.body;

  if (!reservationId) {
    return res.status(400).json({ success: false, error: 'reservationId is required' });
  }

  try {
    const result = await aiCostEngine.refundReservation(reservationId, errorReason || 'PROVIDER_FAILURE');
    return res.json(result);
  } catch (err) {
    console.error('[CreditsAPI] POST /refund error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. GET /api/credits/transactions - Paginated double-entry ledger history
router.get('/transactions', async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const offset = Math.max(0, Number(req.query.offset || 0));
  const actionFilter = req.query.action || null;

  try {
    const history = await walletService.getTransactions(req.user.id, limit, offset, actionFilter);
    return res.json({ success: true, ...history });
  } catch (err) {
    console.error('[CreditsAPI] GET /transactions error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. GET /api/credits/pricing - Active pricing rules table
router.get('/pricing', async (req, res) => {
  try {
    const rules = await aiCostEngine.getPricingRules();
    return res.json({ success: true, pricingRules: rules });
  } catch (err) {
    console.error('[CreditsAPI] GET /pricing error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 8. GET /api/credits/packs - Active credit purchase packs & subscription plans
router.get('/packs', async (req, res) => {
  try {
    const packs = await walletService.getPurchasePacks();
    const plans = walletService.getSubscriptionPlans();
    return res.json({ success: true, purchasePacks: packs, subscriptionPlans: plans });
  } catch (err) {
    console.error('[CreditsAPI] GET /packs error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 9. POST /api/credits/claim-reward - Claim daily/onboarding gamification bonus
router.post('/claim-reward', async (req, res) => {
  const { rewardType } = req.body;
  if (!rewardType) {
    return res.status(400).json({ success: false, error: 'rewardType is required' });
  }

  try {
    const result = await walletService.claimReward(req.user.id, rewardType);
    return res.json(result);
  } catch (err) {
    console.error('[CreditsAPI] POST /claim-reward error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 10. POST /api/credits/purchase - Top-up credits simulation / checkout
router.post('/purchase', async (req, res) => {
  const { packCode, customAmount } = req.body;
  
  try {
    const packs = await walletService.getPurchasePacks();
    const selectedPack = packs.find(p => p.pack_code === packCode);
    const creditsToAdd = selectedPack ? Number(selectedPack.credits) : (Number(customAmount) || 100);

    const { data, error } = await supabase.rpc('add_credits_to_wallet', {
      p_user_id: req.user.id,
      p_amount: creditsToAdd,
      p_source: 'purchase_pack',
      p_details: {
        packCode: packCode || 'custom',
        priceUsd: selectedPack ? selectedPack.price_usd : (creditsToAdd * 0.08),
        timestamp: new Date().toISOString()
      }
    });

    if (error) throw error;

    return res.json({
      success: true,
      addedCredits: creditsToAdd,
      currentBalance: data.current_balance,
      message: `Successfully added ${creditsToAdd} AI Credits to your wallet!`
    });
  } catch (err) {
    console.error('[CreditsAPI] POST /purchase error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// ADMIN MANAGEMENT & COST ANALYTICS ENDPOINTS
// ==============================================================================

// 11. GET /api/admin/credits/analytics - Provider cost distribution and profit margins
router.get('/admin/analytics', async (req, res) => {
  try {
    const analytics = await walletService.getAdminAnalytics();
    return res.json({ success: true, analytics });
  } catch (err) {
    console.error('[CreditsAPI] GET /admin/analytics error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 12. POST /api/admin/credits/adjust - Manually add/remove credits with audit log
router.post('/admin/adjust', async (req, res) => {
  const { targetUserId, amount, reason } = req.body;
  if (!targetUserId || amount === undefined) {
    return res.status(400).json({ success: false, error: 'targetUserId and amount are required' });
  }

  try {
    const result = await walletService.adminAdjustBalance(
      req.user.id,
      targetUserId,
      Number(amount),
      reason || 'Admin Manual Adjustment'
    );
    return res.json(result);
  } catch (err) {
    console.error('[CreditsAPI] POST /admin/adjust error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 13. POST /api/admin/credits/pricing - Live update pricing rules
router.post('/admin/pricing', async (req, res) => {
  const { actionCode, baseCredits, fastMultiplier, standardMultiplier, premiumMultiplier, displayName } = req.body;
  if (!actionCode || baseCredits === undefined) {
    return res.status(400).json({ success: false, error: 'actionCode and baseCredits are required' });
  }

  try {
    const { data, error } = await supabase
      .from('credit_pricing_rules')
      .upsert({
        action_code: actionCode,
        display_name: displayName || actionCode,
        base_credits: Number(baseCredits),
        fast_multiplier: Number(fastMultiplier || 0.75),
        standard_multiplier: Number(standardMultiplier || 1.0),
        premium_multiplier: Number(premiumMultiplier || 2.0),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, rule: data, message: 'Pricing rule updated successfully' });
  } catch (err) {
    console.error('[CreditsAPI] POST /admin/pricing error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
