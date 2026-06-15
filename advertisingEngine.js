// App Founder Growth Suite - Advertising Engine Backend
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

/**
 * Transforms AI-generated strategy into a pending Ad Campaign
 */
async function createPendingCampaign(appId, strategyData, authHeader) {
  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });

  // Extract budget and objective from strategy
  const budget = strategyData.budget_allocation ? Object.values(strategyData.budget_allocation).reduce((a, b) => a + b, 0) : 500;
  const objective = strategyData.objective || 'installs';
  
  const { data, error } = await supabase
    .from('ad_campaigns')
    .insert([{
      app_id: appId,
      name: strategyData.campaign_name || 'AI Generated Campaign',
      objective: objective,
      total_budget: budget,
      daily_budget: budget / 7, // Default to 7 days
      status: 'pending_approval',
      strategy_context: strategyData
    }])
    .select();

  if (error) {
    console.error("Error creating campaign:", error);
    throw error;
  }
  return data[0];
}

/**
 * Simulates campaign prediction (CPA, Reach, ROAS) before launch
 */
function predictCampaignOutcomes(budget, objective, platform) {
  let expectedCPA, expectedReach, roas;
  
  if (platform === 'linkedin') {
    expectedCPA = (Math.random() * 20 + 15).toFixed(2); // $15-$35 CPA
    expectedReach = Math.floor(budget / 0.05);
    roas = (Math.random() * 1.5 + 0.5).toFixed(2); // 0.5x - 2.0x
  } else if (platform === 'google') {
    expectedCPA = (Math.random() * 10 + 5).toFixed(2); // $5-$15 CPA
    expectedReach = Math.floor(budget / 0.03);
    roas = (Math.random() * 2.5 + 1.0).toFixed(2); // 1.0x - 3.5x
  } else { // Meta
    expectedCPA = (Math.random() * 8 + 3).toFixed(2); // $3-$11 CPA
    expectedReach = Math.floor(budget / 0.02);
    roas = (Math.random() * 3.0 + 1.2).toFixed(2); // 1.2x - 4.2x
  }

  return {
    best_case: {
      cpa: (parseFloat(expectedCPA) * 0.7).toFixed(2),
      roas: (parseFloat(roas) * 1.3).toFixed(2),
      reach: expectedReach * 1.2
    },
    expected_case: {
      cpa: expectedCPA,
      roas: roas,
      reach: expectedReach
    },
    worst_case: {
      cpa: (parseFloat(expectedCPA) * 1.5).toFixed(2),
      roas: (parseFloat(roas) * 0.6).toFixed(2),
      reach: expectedReach * 0.8
    }
  };
}

/**
 * Approve Campaign and switch to Active
 */
async function approveCampaign(campaignId, authHeader) {
  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data, error } = await supabase
    .from('ad_campaigns')
    .update({ status: 'active', start_date: new Date().toISOString() })
    .eq('id', campaignId)
    .select();

  if (error) {
    console.error("Error approving campaign:", error);
    throw error;
  }
  return data[0];
}

/**
 * Record daily performance data.
 * NOTE: Previously this generated random fake data. Now it's a no-op placeholder
 * until real Ad API integration (Meta Ads, Google Ads) provides real attribution data.
 */
async function recordDailyPerformance(campaignId, performanceData, authHeader) {
  if (!performanceData) {
    console.warn(`[Ad Engine] No real performance data available for campaign ${campaignId}. Skipping.`);
    return { success: true, message: 'No real ad API data to record yet.' };
  }

  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data, error } = await supabase
    .from('ad_performance_daily')
    .insert([{
      campaign_id: campaignId,
      date: new Date().toISOString().split('T')[0],
      ...performanceData
    }]);

  if (error) {
    console.error("Error recording daily performance:", error);
    throw error;
  }
  return { success: true };
}

module.exports = {
  createPendingCampaign,
  predictCampaignOutcomes,
  approveCampaign,
  recordDailyPerformance
};
