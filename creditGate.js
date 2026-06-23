const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY);

/**
 * Middleware to enforce Growth Credit billing for AI actions.
 * @param {Number|Function} actionCostCalculator - The fixed cost, or a function that returns the cost based on the request.
 */
function requireCredits(actionCostCalculator) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized: User ID missing for credit check' });
      }

      // Calculate dynamic cost
      const cost = typeof actionCostCalculator === 'function' ? actionCostCalculator(req) : actionCostCalculator;
      
      if (cost <= 0) {
        return next(); // Free action, proceed
      }

      // Minimal details for the ledger
      const details = {
        action: req.body.taskType || req.path,
        appId: req.body.appId || 'global'
      };

      // Atomic spending via Supabase RPC
      const { data, error } = await supabase.rpc('spend_credits', {
        p_user_id: req.user.id,
        p_amount: cost,
        p_details: details
      });

      if (error) {
        console.error('[CreditGate] Database error:', error);
        return res.status(500).json({ error: 'Internal error processing billing.' });
      }

      if (data === false) {
        return res.status(402).json({ 
          error: 'Insufficient Growth Credits',
          code: 'OUT_OF_CREDITS',
          required: cost
        });
      }

      // Payment successful, proceed
      next();
    } catch (err) {
      console.error('[CreditGate] Middleware error:', err);
      return res.status(500).json({ error: 'Failed to verify Growth Credits.' });
    }
  };
}

module.exports = { requireCredits };
