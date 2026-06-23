const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16',
});

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY);

// Map Plan IDs to Stripe Price IDs (these should be set in .env in production)
const STRIPE_PRICES = {
  'starter': process.env.STRIPE_PRICE_STARTER || 'price_starter_placeholder',
  'growth': process.env.STRIPE_PRICE_GROWTH || 'price_growth_placeholder',
  'pro': process.env.STRIPE_PRICE_PRO || 'price_pro_placeholder',
  'agency': process.env.STRIPE_PRICE_AGENCY || 'price_agency_placeholder',
  // Credit Packs
  'pack_starter': process.env.STRIPE_PRICE_PACK_STARTER || 'price_pack_starter_placeholder',
  'pack_growth': process.env.STRIPE_PRICE_PACK_GROWTH || 'price_pack_growth_placeholder',
  'pack_scale': process.env.STRIPE_PRICE_PACK_SCALE || 'price_pack_scale_placeholder',
};

// Credit Allocations per plan
const PLAN_CREDITS = {
  'free': 20,
  'starter': 100,
  'growth': 500,
  'pro': 1500,
  'agency': 5000
};

/**
 * 1. GET CURRENT SUBSCRIPTION
 */
router.get('/status', async (req, res) => {
  if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      // Return default free tier representation if not found in DB yet
      return res.json({ plan_id: 'free', credit_balance: 0, status: 'active' });
    }

    res.json(data);
  } catch (err) {
    console.error('[Billing] Status Error:', err);
    res.status(500).json({ error: 'Failed to fetch billing status' });
  }
});

/**
 * 2. CREATE CHECKOUT SESSION
 * For upgrading subscriptions or buying credit packs
 */
router.post('/checkout', async (req, res) => {
  const { planId, isPack } = req.body;
  if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });

  const priceId = isPack ? STRIPE_PRICES[`pack_${planId}`] : STRIPE_PRICES[planId];
  if (!priceId) return res.status(400).json({ error: 'Invalid plan selected' });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe is not configured yet. Please add STRIPE_SECRET_KEY.' });
  }

  try {
    // Check if user already has a Stripe Customer ID
    const { data: subData } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', req.user.id)
      .single();

    let customerId = subData?.stripe_customer_id;

    // Create a new Stripe Customer if they don't have one
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { supabase_user_id: req.user.id }
      });
      customerId = customer.id;
      
      // Upsert the subscription record
      await supabase.from('user_subscriptions').upsert({
        user_id: req.user.id,
        stripe_customer_id: customerId,
        plan_id: 'free',
        credit_balance: 20
      }, { onConflict: 'user_id' });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: isPack ? 'payment' : 'subscription',
      success_url: `${config.CORS_ORIGIN}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.CORS_ORIGIN}/?billing=canceled`,
      metadata: {
        type: isPack ? 'credit_pack' : 'subscription',
        planId: planId,
        supabase_user_id: req.user.id
      }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[Billing] Checkout Error:', err);
    res.status(500).json({ error: 'Failed to create checkout session.' });
  }
});

/**
 * 3. CUSTOMER PORTAL
 * For managing billing details, downloading invoices, canceling.
 */
router.post('/portal', async (req, res) => {
  if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: 'Stripe not configured.' });

  try {
    const { data: subData } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', req.user.id)
      .single();

    if (!subData?.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing history found.' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subData.stripe_customer_id,
      return_url: `${config.CORS_ORIGIN}/`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[Billing] Portal Error:', err);
    res.status(500).json({ error: 'Failed to create portal session.' });
  }
});

/**
 * 4. STRIPE WEBHOOKS
 * Securely handles Stripe events to issue credits and update plans.
 */
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify Webhook signature using the raw body captured by server.js
    if (!req.rawBody) {
      throw new Error('Raw body not found. Webhook parsing failed.');
    }
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`[Billing Webhook] Signature Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const data = event.data.object;

    switch (event.type) {
      case 'checkout.session.completed':
        // Handle One-off Credit Pack Purchases
        if (data.metadata?.type === 'credit_pack') {
          const userId = data.metadata.supabase_user_id;
          const planId = data.metadata.planId;
          
          let creditsToAdd = 0;
          if (planId === 'starter') creditsToAdd = 200;
          if (planId === 'growth') creditsToAdd = 600;
          if (planId === 'scale') creditsToAdd = 1500;
          if (planId === 'agency') creditsToAdd = 5000;

          if (creditsToAdd > 0 && userId) {
            await supabase.rpc('add_credits', {
              p_user_id: userId,
              p_amount: creditsToAdd,
              p_transaction_type: 'purchase',
              p_details: { intent: data.payment_intent, pack: planId },
              p_reset_balance: false
            });
            console.log(`[Billing Webhook] Added ${creditsToAdd} credits to user ${userId}`);
          }
        }
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        // Handle Subscription Creation / Upgrades
        // In a real system, you'd map the data.items.data[0].price.id back to 'starter', 'growth', etc.
        // For simplicity, we'll assume the metadata or a helper function maps it.
        const customerId = data.customer;
        
        // Find user by customer ID
        const { data: userData } = await supabase
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();
          
        if (userData?.user_id) {
          // Naive mapping logic for example purposes
          let newPlan = 'starter'; // Default assumption, should parse price ID
          if (data.items.data[0].price.id === STRIPE_PRICES['growth']) newPlan = 'growth';
          if (data.items.data[0].price.id === STRIPE_PRICES['pro']) newPlan = 'pro';
          if (data.items.data[0].price.id === STRIPE_PRICES['agency']) newPlan = 'agency';

          const monthlyCredits = PLAN_CREDITS[newPlan] || 20;

          await supabase.from('user_subscriptions').update({
            plan_id: newPlan,
            status: data.status,
            stripe_subscription_id: data.id,
            billing_period_end: new Date(data.current_period_end * 1000).toISOString()
          }).eq('user_id', userData.user_id);

          // If this is a new cycle or upgrade, reset credits to the new monthly limit (Use-it-or-lose-it)
          await supabase.rpc('add_credits', {
            p_user_id: userData.user_id,
            p_amount: monthlyCredits,
            p_transaction_type: 'monthly_reset',
            p_details: { sub_id: data.id, plan: newPlan },
            p_reset_balance: true
          });
          console.log(`[Billing Webhook] Updated user ${userData.user_id} to plan ${newPlan} with ${monthlyCredits} credits.`);
        }
        break;

      case 'customer.subscription.deleted':
        // Handle Cancellations -> Downgrade to Free
        const subId = data.id;
        const { data: cancelData } = await supabase
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subId)
          .single();

        if (cancelData?.user_id) {
          await supabase.from('user_subscriptions').update({
            plan_id: 'free',
            status: 'canceled',
            credit_balance: PLAN_CREDITS['free'] // reset to free tier instantly
          }).eq('user_id', cancelData.user_id);
          
          await supabase.rpc('add_credits', {
            p_user_id: cancelData.user_id,
            p_amount: PLAN_CREDITS['free'],
            p_transaction_type: 'monthly_reset',
            p_details: { note: 'Subscription canceled, downgraded to free.' },
            p_reset_balance: true
          });
        }
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error(`[Billing Webhook] Processing Error: ${err}`);
    res.status(500).json({ error: 'Webhook processing failed.' });
  }
});

module.exports = router;
