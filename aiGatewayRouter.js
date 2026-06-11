const express = require('express');
const router = express.Router();

/**
 * AI Gateway Router
 * This router intercepts all AI requests from the frontend, classifies the task,
 * and routes it to the cheapest capable tier, enforcing our strict AI Optimization strategy.
 */

// Simple local cache to prevent duplicate expensive LLM calls
const aiResponseCache = new Map();

// Helper: Determine the appropriate AI tier based on the requested task type
function determineModelTier(taskType) {
  const ultraLowCost = ['hashtag', 'sentiment', 'classify', 'spam', 'category'];
  const standard = ['post', 'draft', 'rewrite', 'cta', 'thread'];
  const advanced = ['analysis', 'summary', 'growth_report', 'optimization'];
  // Anything else like 'copilot' or 'strategy' defaults to Premium
  
  if (ultraLowCost.includes(taskType)) return 'TIER_1';
  if (standard.includes(taskType)) return 'TIER_2';
  if (advanced.includes(taskType)) return 'TIER_3';
  return 'TIER_4';
}

// Helper: Simulate the LLM API call based on the Tier
async function callLLM(tier, prompt, contextData) {
  // In a real implementation, this is where we'd use the OpenAI or Google SDKs
  // e.g. if (tier === 'TIER_1') return openai.createChatCompletion({ model: 'gpt-4o-mini', ... })
  
  // Simulated delay for realism
  await new Promise(r => setTimeout(r, tier === 'TIER_4' ? 1500 : 500));
  
  let modelUsed = '';
  let content = '';

  switch (tier) {
    case 'TIER_1':
      modelUsed = 'GPT-4o-Mini (Ultra Low Cost)';
      content = `#growth #${prompt.replace(/\s+/g, '')} #startup`;
      break;
    case 'TIER_2':
      modelUsed = 'GPT-4o-Mini (Standard Creation)';
      content = `🚀 Say goodbye to manual work! Check out our new update regarding: ${prompt}`;
      break;
    case 'TIER_3':
      modelUsed = 'GPT-4o (Advanced Analysis)';
      content = `Based on the ${contextData?.length || 0} summarized data points provided, here is your growth analysis on ${prompt}: Engagement is trending up.`;
      break;
    case 'TIER_4':
      modelUsed = 'GPT-4o / Claude 3.5 Sonnet (Premium Reasoning)';
      content = `Founder Copilot Strategy: To grow BusinessPilot, I recommend focusing on the key segments identified in your database metrics. Never send raw datasets, rely on our embedded insights.`;
      break;
  }
  
  return { content, modelUsed };
}

// Main Gateway Endpoint
router.post('/generate', async (req, res) => {
  const { prompt, taskType, contextData } = req.body;
  
  if (!prompt || !taskType) {
    return res.status(400).json({ error: 'Missing prompt or taskType parameters.' });
  }

  // 1. Cache Check: Prevent duplicate exact requests
  const cacheKey = `${taskType}_${prompt}`;
  if (aiResponseCache.has(cacheKey)) {
    console.log(`[AI Gateway] CACHE HIT for ${taskType}`);
    return res.json({ 
      copy: aiResponseCache.get(cacheKey),
      meta: { cached: true, tier: 'CACHE' }
    });
  }

  // 2. Gateway Routing: Determine the cheapest tier
  const tier = determineModelTier(taskType);
  console.log(`[AI Gateway] Routing task '${taskType}' to ${tier}`);

  try {
    // 3. Execution
    const response = await callLLM(tier, prompt, contextData);
    
    // Format response specifically for A/B variants if requested by our studio
    let formattedResult = {
      variant_a: response.content,
      variant_b: `[Alternative] ${response.content}`
    };

    // 4. Cache the successful result (expires naturally in this simple Map, or use Redis TTL)
    aiResponseCache.set(cacheKey, formattedResult);
    
    // 5. Return payload
    res.json({
      copy: formattedResult,
      meta: { cached: false, tier: tier, model: response.modelUsed }
    });
    
  } catch (err) {
    console.error("[AI Gateway] LLM Execution Error:", err);
    res.status(500).json({ error: 'AI Gateway failed to process request.' });
  }
});

module.exports = router;
