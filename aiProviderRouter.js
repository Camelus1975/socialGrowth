/**
 * AI PROVIDER ROUTER (aiProviderRouter.js)
 * 
 * Intelligent routing layer that abstracts all AI model vendors:
 * - OpenAI, Anthropic, Gemini, Replicate, FLUX, Kling, Luma, Wan, ElevenLabs.
 * - Resolves (category, qualityTier) -> (provider, model, costPerUnit).
 * - Automatic failover to secondary provider if primary model hits rate limits or error.
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY
);

// Fallback Provider Hierarchy Matrix
const DEFAULT_PROVIDER_ROUTING = {
  text: {
    fast: { provider: 'openai', model: 'gpt-4o-mini', fallback: 'gemini-1.5-flash', costUsd: 0.0003 },
    standard: { provider: 'openai', model: 'gpt-4o', fallback: 'claude-3-5-haiku-20241022', costUsd: 0.003 },
    premium: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', fallback: 'gpt-4o', costUsd: 0.015 }
  },
  image: {
    fast: { provider: 'replicate', model: 'black-forest-labs/flux-schnell', fallback: 'dall-e-2', costUsd: 0.003 },
    standard: { provider: 'replicate', model: 'black-forest-labs/flux-dev', fallback: 'dall-e-3', costUsd: 0.025 },
    premium: { provider: 'openai', model: 'dall-e-3', fallback: 'black-forest-labs/flux-1.1-pro', costUsd: 0.040 }
  },
  video: {
    fast: { provider: 'replicate', model: 'wan-video/wan-2.1-1.3b', fallback: 'luma/ray-1', costUsd: 0.080 },
    standard: { provider: 'replicate', model: 'kling-ai/kling-v1.5', fallback: 'luma/ray-2', costUsd: 0.200 },
    premium: { provider: 'replicate', model: 'luma/ray-2', fallback: 'kling-ai/kling-pro', costUsd: 0.500 }
  },
  voice: {
    fast: { provider: 'openai', model: 'tts-1', fallback: 'elevenlabs/flash', costUsd: 0.015 },
    standard: { provider: 'elevenlabs', model: 'eleven_multilingual_v2', fallback: 'tts-1-hd', costUsd: 0.030 },
    premium: { provider: 'elevenlabs', model: 'eleven_turbo_v2_5', fallback: 'eleven_multilingual_v2', costUsd: 0.050 }
  },
  analytics: {
    fast: { provider: 'openai', model: 'gpt-4o-mini', fallback: 'gemini-1.5-flash', costUsd: 0.0003 },
    standard: { provider: 'openai', model: 'gpt-4o', fallback: 'claude-3-5-haiku-20241022', costUsd: 0.003 },
    premium: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', fallback: 'gpt-4o', costUsd: 0.015 }
  }
};

let cachedRouting = null;
let routingCacheTimestamp = 0;
const ROUTING_CACHE_TTL_MS = 15 * 60 * 1000;

class AIProviderRouter {
  /**
   * Load active provider routing mappings from Supabase
   */
  async getRoutingMatrix() {
    const now = Date.now();
    if (cachedRouting && (now - routingCacheTimestamp < ROUTING_CACHE_TTL_MS)) {
      return cachedRouting;
    }

    try {
      const { data, error } = await supabase
        .from('ai_provider_mappings')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true });

      if (!error && data && data.length > 0) {
        const matrix = JSON.parse(JSON.stringify(DEFAULT_PROVIDER_ROUTING));
        data.forEach(row => {
          if (!matrix[row.category]) matrix[row.category] = {};
          matrix[row.category][row.quality_tier] = {
            provider: row.provider,
            model: row.model_name,
            costUsd: Number(row.estimated_cost_usd || 0.001)
          };
        });
        cachedRouting = matrix;
        routingCacheTimestamp = now;
        return matrix;
      }
    } catch (err) {
      console.warn('[AIProviderRouter] Error querying routing mappings:', err.message);
    }

    cachedRouting = DEFAULT_PROVIDER_ROUTING;
    routingCacheTimestamp = now;
    return DEFAULT_PROVIDER_ROUTING;
  }

  /**
   * Resolve best provider and model for a given category & quality tier
   */
  async resolve(category = 'text', qualityTier = 'standard') {
    const matrix = await this.getRoutingMatrix();
    const categoryRouting = matrix[category] || matrix.text;
    const resolved = categoryRouting[qualityTier] || categoryRouting.standard || categoryRouting.fast;

    return {
      provider: resolved.provider,
      model: resolved.model,
      fallback: resolved.fallback || null,
      costUsd: resolved.costUsd || 0.001,
      category,
      qualityTier
    };
  }

  /**
   * Execute with smart optimization and failover handling
   */
  async executeWithFailover(category, qualityTier, executorFn) {
    const primary = await this.resolve(category, qualityTier);
    const startTime = Date.now();

    try {
      const result = await executorFn(primary.provider, primary.model);
      const latencyMs = Date.now() - startTime;
      return {
        ...result,
        meta: {
          provider: primary.provider,
          model: primary.model,
          latencyMs,
          costUsd: primary.costUsd,
          qualityTier,
          failoverUsed: false
        }
      };
    } catch (primaryErr) {
      console.warn(`[AIProviderRouter] Primary ${primary.provider}/${primary.model} failed: ${primaryErr.message}. Attempting failover...`);

      if (primary.fallback) {
        try {
          const fallbackResult = await executorFn(primary.provider, primary.fallback);
          const latencyMs = Date.now() - startTime;
          return {
            ...fallbackResult,
            meta: {
              provider: primary.provider,
              model: primary.fallback,
              latencyMs,
              costUsd: primary.costUsd,
              qualityTier,
              failoverUsed: true
            }
          };
        } catch (fallbackErr) {
          console.error(`[AIProviderRouter] Fallback model ${primary.fallback} also failed:`, fallbackErr.message);
          throw fallbackErr;
        }
      }

      throw primaryErr;
    }
  }
}

const aiProviderRouter = new AIProviderRouter();
module.exports = { aiProviderRouter, AIProviderRouter };
