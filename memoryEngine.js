const { OpenAI } = require('openai');
const config = require('./config');
const { createClient } = require('@supabase/supabase-js');

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

/**
 * Parses generic webhook JSON payloads to identify the growth event, 
 * calculates ROI/Lessons Learned, and embeds it into the Growth Memory Engine.
 */
async function handleUniversalWebhook(payload, authHeader) {
  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });

  try {
    // 1. Analyze the generic payload using Growth Analyst Agent
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: `You are the Growth Analyst Agent. Your job is to parse incoming webhook JSON payloads (e.g., from Stripe, RevenueCat, or custom sources) and identify the growth event.
          Categorize the event as 'revenue', 'install', 'churn', or 'other'.
          Extract the exact value, currency, and the likely associated app or campaign.
          Return a strict JSON format: {"category": "...", "value": 0, "appId": "...", "inferred_campaign": "..."}` 
        },
        { role: "user", content: `Payload: ${JSON.stringify(payload)}` }
      ],
      response_format: { type: "json_object" }
    });

    const eventData = JSON.parse(analysisResponse.choices[0].message.content);
    
    // 2. Embed the event into the vector memory layer
    const memoryText = `Growth Event: ${eventData.category} of ${eventData.value} recorded for app ${eventData.appId}. Associated Campaign: ${eventData.inferred_campaign || 'Organic'}.`;
    
    await embedAndStoreMemory(memoryText, {
      type: 'webhook_event',
      appId: eventData.appId,
      category: eventData.category,
      value: eventData.value
    }, supabase);

    return { success: true, event: eventData };
  } catch (error) {
    console.error("[MemoryEngine] Webhook ingestion failed:", error);
    return { success: false, error: "Failed to parse webhook" };
  }
}

/**
 * Creates an OpenAI embedding for a memory string and stores it in the vector DB.
 */
async function embedAndStoreMemory(text, metadata, supabaseClient) {
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });

    const embedding = embeddingResponse.data[0].embedding;

    // We store this in our existing ai_content_embeddings table, tagged as 'memory'
    const { error } = await supabaseClient
      .from('ai_content_embeddings')
      .insert({
        content_type: 'memory',
        content_text: text,
        embedding: embedding,
        metadata: metadata
      });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[MemoryEngine] Failed to embed memory:", err);
    return false;
  }
}

/**
 * Cross-Project Pollination Search
 * Searches for relevant memories across the workspace. Weights exact app matches higher.
 */
async function searchGrowthMemory(query, appId, supabaseClient, matchCount = 5) {
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
      encoding_format: "float",
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Call the pgvector match_embeddings RPC
    const { data, error } = await supabaseClient.rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: 0.3,
      match_count: matchCount * 2 // Over-fetch to allow weighting
    });

    if (error) throw error;
    if (!data) return [];

    // Filter to memory type and apply "Weighted Memory Matrix"
    // Memories belonging to the exact app get priority. 
    // Memories from other apps get secondary priority (Cross-Pollination).
    const memories = data.filter(d => d.metadata?.type === 'webhook_event' || d.metadata?.type === 'campaign_lesson');
    
    const exactMatches = memories.filter(m => m.metadata?.appId === appId);
    const crossPollinated = memories.filter(m => m.metadata?.appId !== appId);

    // Combine and slice to required count
    return [...exactMatches, ...crossPollinated].slice(0, matchCount);

  } catch (err) {
    console.error("[MemoryEngine] Search failed:", err);
    return [];
  }
}

module.exports = {
  handleUniversalWebhook,
  embedAndStoreMemory,
  searchGrowthMemory
};
