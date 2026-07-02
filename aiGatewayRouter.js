const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const Replicate = require('replicate');
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');
const { searchGrowthMemory } = require('./memoryEngine'); // Import new memory engine
const { requireCredits } = require('./creditGate'); // Import Credit Gate
const { activeQueues } = require('./workers'); // Import BullMQ queues

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

const replicate = new Replicate({
  auth: config.REPLICATE_API_TOKEN,
});

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY);

/**
 * AI Gateway Router
 * This router intercepts all AI requests from the frontend, classifies the task,
 * and routes it to the cheapest capable tier, enforcing our strict AI Optimization strategy.
 */

// Simple local cache with TTL and max size to prevent memory leaks
const AI_CACHE_MAX_SIZE = 500;
const AI_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const aiResponseCache = new Map();

function getCachedResponse(key) {
  const entry = aiResponseCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > AI_CACHE_TTL_MS) {
    aiResponseCache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCachedResponse(key, value) {
  // Evict oldest entries if cache is too large
  if (aiResponseCache.size >= AI_CACHE_MAX_SIZE) {
    const firstKey = aiResponseCache.keys().next().value;
    aiResponseCache.delete(firstKey);
  }
  aiResponseCache.set(key, { value, ts: Date.now() });
}

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
async function callLLM(tier, prompt, contextData, memoryData, tone) {
  let modelToUse = 'gpt-4o-mini'; // Default to cheap model for Tier 1 & 2
  let systemMessage = `You are an expert business growth manager. Tone: ${tone || 'professional'}. Generate highly engaging content and strategies based on the user's prompt. Focus on lead generation, conversion rates, and scaling ROI.`;

  if (tier === 'TIER_3' || tier === 'TIER_4') {
    modelToUse = 'gpt-4o'; // Use premium model for advanced reasoning
    systemMessage = `You are a strategic Business Growth Copilot. Analyze the summarized context provided and deliver actionable insights. Never hallucinate data. Respond directly and clearly.`;
  }

  // Construct context string if data is provided (e.g., from pgvector or materialized views)
  let userMessage = prompt;
  if (contextData && (Array.isArray(contextData) ? contextData.length > 0 : Object.keys(contextData).length > 0)) {
     userMessage += `\n\nContext Data:\n${JSON.stringify(contextData)}`;
  }
  
  // Inject the dynamically retrieved memory data to augment the prompt (RAG)
  if (memoryData && memoryData.length > 0) {
    userMessage += `\n\n[Memory Engine Consultation - Historical Growth Events]:\n`;
    memoryData.forEach(m => {
      userMessage += `- ${m.metadata.appId} (${m.metadata.category}): Value ${m.metadata.value}. Context: ${m.content_text}\n`;
    });
    userMessage += `\nPlease consider these past memories and cross-pollinated insights when answering.`;
  }

  const response = await openai.chat.completions.create({
    model: modelToUse,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage }
    ],
    temperature: 0.7,
    max_tokens: 500, // Keep costs strictly capped
  });

  return {
    content: response.choices[0].message.content,
    modelUsed: modelToUse
  };
}

// Helper: Calculate text generation cost
function calculateGenerationCost(req) {
  const taskType = req.body.taskType || '';
  if (taskType === 'post') return 1;
  if (taskType === 'thread') return 2;
  if (taskType === 'email') return 3;
  if (taskType === 'analysis' || taskType === 'competitor_analysis') return 5;
  if (taskType === 'growth_audit') return 10;
  if (taskType === 'strategy') return 10;
  if (taskType === 'deep_market_analysis') return 20;
  if (taskType === 'copilot' || taskType === 'growth_report') return 25;
  if (taskType === 'executive_review') return 30;
  return 1; // Default
}

// Main Gateway Endpoint
router.post('/generate', requireCredits(calculateGenerationCost), async (req, res) => {
  const { prompt, taskType, contextData, tone, enable_ab, appId } = req.body;
  
  if (!prompt || !taskType) {
    return res.status(400).json({ error: 'Missing prompt or taskType parameters.' });
  }

  // 1. Cache Check: Prevent duplicate exact requests
  const cacheKey = `${taskType}_${prompt}_${tone}_${enable_ab}_${appId || 'global'}`;
  const cachedResult = getCachedResponse(cacheKey);
  if (cachedResult) {
    console.log(`[AI Gateway] CACHE HIT for ${taskType}`);
    return res.json({ 
      copy: cachedResult,
      meta: { cached: true, tier: 'CACHE' }
    });
  }

  // 2. Gateway Routing: Determine the cheapest tier
  const tier = determineModelTier(taskType);
  console.log(`[AI Gateway] Routing task '${taskType}' to ${tier}`);

  try {
    // 3. Autonomous Memory Consultation (RAG)
    // Only query memory for complex tasks to save vector DB load
    let memoryData = [];
    if (['copilot', 'strategy', 'growth_report', 'analysis'].includes(taskType) && req.headers.authorization) {
      console.log(`[AI Gateway] Consulting Growth Memory Engine...`);
      const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: req.headers.authorization } }
      });
      // Retrieve top 3 relevant historical lessons for cross-pollination
      memoryData = await searchGrowthMemory(prompt, appId || 'global', supabase, 3);
    }

    // 4. Execution
    const response = await callLLM(tier, prompt, contextData, memoryData, tone);
    
    // Format response specifically for A/B variants if requested by our studio
    let formattedResult = {
      variant_a: response.content,
      variant_b: enable_ab ? `[Alternative Generation Required via API] ${response.content}` : null 
    };

    if (enable_ab) {
       const responseB = await callLLM(tier, prompt + " (Provide an entirely different creative angle)", contextData, memoryData, tone);
       formattedResult.variant_b = responseB.content;
    }

    // 5. Cache the successful result
    setCachedResponse(cacheKey, formattedResult);
    
    // 6. Return payload
    res.json({
      copy: formattedResult,
      meta: { cached: false, tier: tier, model: response.modelUsed, memoryRetrieved: memoryData.length }
    });
    
  } catch (err) {
    console.error("[AI Gateway] LLM Execution Error:", err);
    res.status(500).json({ error: `AI Gateway failed: ${err.message || err.toString()}` });
  }
});

// ==========================================
// IMAGE MODEL ROUTER (3-TIER GENERATION)
// ==========================================
router.post('/generate-image', requireCredits(10), async (req, res) => {
  const { prompt, mode, appId } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  try {
    let imageUrl = '';
    let generationMode = mode || 'auto';
    let costEstimated = 0;

    // AI Creative Director: Auto-Route based on prompt
    if (generationMode === 'auto') {
      if (prompt.toLowerCase().includes('hero') || prompt.toLowerCase().includes('ad creative') || prompt.toLowerCase().includes('launch')) {
        generationMode = 'premium';
      } else if (prompt.toLowerCase().includes('testimonial') || prompt.toLowerCase().includes('milestone')) {
        generationMode = 'template';
      } else {
        generationMode = 'assisted';
      }
    }

    if (generationMode === 'template') {
      // MODE 1: Template Graphics Engine
      // Frontend html2canvas will handle actual rendering. We just return the template data instructions.
      console.log(`[Image Router] Routed to Mode 1 (Template)`);
      return res.json({ 
        url: 'template_mode', // Signals frontend to trigger HTML renderer
        mode: 'template',
        cost: 0 
      });
      
    } else if (generationMode === 'assisted') {
      // MODE 2: FLUX Dev/Schnell via Replicate
      console.log(`[Image Router] Routed to Mode 2 (FLUX via Replicate)`);
      const output = await replicate.run(
        "black-forest-labs/flux-schnell",
        {
          input: {
            prompt: prompt,
            go_fast: true,
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "webp",
            output_quality: 80
          }
        }
      );
      // Replicate returns an array of streams/URLs
      imageUrl = Array.isArray(output) ? output[0] : output;
      costEstimated = 0.003; // Approx Replicate FLUX Schnell cost
      
    } else {
      // MODE 3: Premium OpenAI DALL-E 3
      console.log(`[Image Router] Routed to Mode 3 (DALL-E 3)`);
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
      });
      imageUrl = response.data[0].url;
      costEstimated = 0.040;
    }

    res.json({
      url: imageUrl,
      mode: generationMode,
      cost: costEstimated
    });

  } catch (err) {
    console.error("[Image Router] Generation Error:", err);
    res.status(500).json({ error: 'Image generation failed.' });
  }
});

// Endpoint: AI Video Marketing Router
router.post('/generate-video', requireCredits(50), async (req, res) => {
  const { prompt, type, appId } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const token = req.headers.authorization?.split(' ')[1];
  let userSupabase = supabase;
  if (token && token !== 'mock-supabase-jwt-token') {
    userSupabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
  }

  let generationMode = 'template';
  let costEstimated = 0;

  try {
    const textLower = prompt.toLowerCase();
    
    if (textLower.includes('hero') || textLower.includes('ad') || textLower.includes('premium')) {
      generationMode = 'premium_ai';
    } else if (textLower.includes('campaign')) {
      generationMode = 'assembly';
    } else if (textLower.includes('case study') || textLower.includes('stats') || textLower.includes('report')) {
      generationMode = 'motion_graphics';
    } else {
      generationMode = 'template';
    }

    if (generationMode === 'template' || generationMode === 'motion_graphics') {
      console.log(`[Video Router] Routed to Mode 1/2 (${generationMode})`);
      costEstimated = 0;
    } else if (generationMode === 'assembly') {
      console.log(`[Video Router] Routed to Mode 3 (Assembly)`);
      costEstimated = 0.005;
    } else {
      console.log(`[Video Router] Routed to Mode 4 (Premium AI - Hotshot-XL via Replicate)`);
      costEstimated = 0.080;
    }
    
    // Save to video_factory_assets as 'processing'
    let assetId = null;
    let fallbackUrl = (generationMode === 'template' || generationMode === 'motion_graphics') ? 'template_mode' : 'assembly_mode';
    if (generationMode === 'premium_ai') fallbackUrl = ''; // It will be generated

    if (appId) {
      const { data, error } = await userSupabase.from('video_factory_assets').insert({
        app_id: appId,
        title: prompt.substring(0, 50),
        platform: 'shorts',
        video_url: fallbackUrl,
        status: generationMode === 'premium_ai' ? 'processing' : 'published'
      }).select().single();

      if (error) throw error;
      assetId = data.id;
    }

    // If it's a real AI generation, queue it up in BullMQ
    if (generationMode === 'premium_ai' && assetId) {
      if (!activeQueues['video_rendering']) {
        console.warn('[Video Router] BullMQ not configured. Cannot render video asynchronously.');
        // Fallback: update status to failed so the UI doesn't hang
        await userSupabase.from('video_factory_assets').update({ status: 'failed' }).eq('id', assetId);
        return res.status(503).json({ error: 'Video rendering service is temporarily unavailable.' });
      }

      await activeQueues['video_rendering'].add('render_video', {
        assetId,
        prompt,
        appId
      });

      return res.status(202).json({
        id: assetId,
        url: '', // Frontend should poll
        mode: generationMode,
        cost: costEstimated,
        status: 'queued'
      });
    }

    // For mock modes, return immediately
    res.json({
      id: assetId,
      url: fallbackUrl,
      mode: generationMode,
      cost: costEstimated,
      status: 'completed'
    });

  } catch (err) {
    console.error("[Video Router] Generation Error:", err);
    res.status(500).json({ error: 'Video generation failed.' });
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
