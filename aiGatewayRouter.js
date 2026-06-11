const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

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

// Helper: Execute OpenAI call based on the Tier
async function callLLM(tier, prompt, contextData, tone) {
  let modelToUse = 'gpt-4o-mini'; // Default to cheap model for Tier 1 & 2
  let systemMessage = `You are an expert social media manager. Tone: ${tone || 'professional'}. Generate highly engaging content based on the user's prompt. Keep it concise, natively formatted for social platforms, and include relevant emojis and a CTA.`;

  if (tier === 'TIER_3' || tier === 'TIER_4') {
    modelToUse = 'gpt-4o'; // Use premium model for advanced reasoning
    systemMessage = `You are a strategic Founder Growth Copilot. Analyze the summarized context provided and deliver actionable insights. Never hallucinate data. Respond directly and clearly.`;
  }

  // Construct context string if data is provided (e.g., from pgvector or materialized views)
  let userMessage = prompt;
  if (contextData && (Array.isArray(contextData) ? contextData.length > 0 : Object.keys(contextData).length > 0)) {
     userMessage += `\n\nContext Data:\n${JSON.stringify(contextData)}`;
  }

  const response = await openai.chat.completions.create({
    model: modelToUse,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage }
    ],
    temperature: 0.7,
    max_tokens: 400, // Keep costs strictly capped
  });

  return {
    content: response.choices[0].message.content,
    modelUsed: modelToUse
  };
}

// Main Gateway Endpoint
router.post('/generate', async (req, res) => {
  const { prompt, taskType, contextData, tone, enable_ab } = req.body;
  
  if (!prompt || !taskType) {
    return res.status(400).json({ error: 'Missing prompt or taskType parameters.' });
  }

  // 1. Cache Check: Prevent duplicate exact requests
  const cacheKey = `${taskType}_${prompt}_${tone}_${enable_ab}`;
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
    const response = await callLLM(tier, prompt, contextData, tone);
    
    // Format response specifically for A/B variants if requested by our studio
    let formattedResult = {
      variant_a: response.content,
      variant_b: enable_ab ? `[Alternative Generation Required via API] ${response.content}` : null 
    };

    if (enable_ab) {
       // In a full implementation, we could ask the LLM for 2 variants in JSON. For now, we do a second fast pass.
       const responseB = await callLLM(tier, prompt + " (Provide an entirely different creative angle)", contextData, tone);
       formattedResult.variant_b = responseB.content;
    }

    // 4. Cache the successful result
    aiResponseCache.set(cacheKey, formattedResult);
    
    // 5. Return payload
    res.json({
      copy: formattedResult,
      meta: { cached: false, tier: tier, model: response.modelUsed }
    });
    
  } catch (err) {
    console.error("[AI Gateway] LLM Execution Error:", err);
    res.status(500).json({ error: 'AI Gateway failed to process request. Ensure OpenAI keys are valid.' });
  }
});

// Endpoint: Generate and Store Embedding
router.post('/embed', async (req, res) => {
  const { text, appId, contentType } = req.body;
  if (!text || !appId || !contentType) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  try {
    // 1. Generate Embedding via OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });
    
    const vector = embeddingResponse.data[0].embedding;

    // 2. Initialize scoped Supabase client with user's JWT for RLS
    const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.authorization } }
    });

    // 3. Store in Vector Database
    const { error } = await supabase
      .from('ai_content_embeddings')
      .insert({
        user_id: req.user.id,
        app_id: appId,
        content_type: contentType,
        content_text: text,
        embedding: vector
      });

    if (error) throw error;
    res.json({ success: true, message: 'Content vectorized and stored successfully.' });
    
  } catch (err) {
    console.error("[AI Gateway] Embedding Error:", err);
    res.status(500).json({ error: 'Failed to generate embedding.' });
  }
});

// Endpoint: Search Similar Content via pgvector
router.post('/search-similar', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Missing search query.' });

  try {
    // 1. Generate query embedding
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
      encoding_format: 'float',
    });
    
    const queryVector = embeddingResponse.data[0].embedding;

    // 2. Initialize scoped client
    const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.authorization } }
    });

    // 3. Perform Vector Similarity Search (via our RPC)
    const { data, error } = await supabase.rpc('match_content_embeddings', {
      query_embedding: queryVector,
      match_threshold: 0.3, // Return results with >30% similarity
      match_count: 3,       // Top 3 results
      search_user_id: req.user.id // Enforce user bounds (cross-brand enabled)
    });

    if (error) throw error;
    
    // We just return the actual text content of the winning posts
    res.json({ results: data.map(d => d.content_text) });
    
  } catch (err) {
    console.error("[AI Gateway] Vector Search Error:", err);
    res.status(500).json({ error: 'Failed to perform vector search.' });
  }
});

module.exports = router;
