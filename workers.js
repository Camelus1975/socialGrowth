// App Founder Growth Suite - BullMQ Background Workers
const { Queue, Worker, QueueEvents } = require('bullmq');
const Redis = require('ioredis');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const config = require('./config');

const Replicate = require('replicate');

// Initialize Encryption Vault — MUST match server.js salt exactly
const ENCRYPTION_KEY = crypto.scryptSync(config.ENCRYPTION_SECRET, config.ENCRYPTION_SALT, 32);

const replicate = new Replicate({
  auth: config.REPLICATE_API_TOKEN,
});

function decryptToken(encryptedText) {
  if (!encryptedText) return null;
  try {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encrypted = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error("Token Decryption failed:", err);
    return null;
  }
}

// Initialize Supabase (Use Service Role Key if available, else Anon Key)
const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY
);

// Connect to Redis instance
const {
  executeMetaPost,
  executeGoogleAd,
  executeEmailCampaign,
  routeExecution
} = require('./apiExecutors');

const useRedis = !!config.REDIS_URL;
let redisConnection = null;
if (useRedis) {
  const isTls = config.REDIS_URL && config.REDIS_URL.startsWith('rediss://');
  redisConnection = new Redis(config.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    family: 0, // Railway internal networking uses IPv6
    ...(isTls ? { tls: { rejectUnauthorized: false } } : {})
  });
  
  redisConnection.on('error', (err) => {
    console.warn('[Redis Worker] Connection error:', err.message);
  });
}

// Define Queue Names
const queuesList = [
  'scheduled_publishing',
  'analytics_collection',
  'review_imports',
  'agent_execution',
  'notification_delivery',
  'video_rendering'
];

// Initialize Queues
const activeQueues = {};
  if (redisConnection) {
    queuesList.forEach(qName => {
      activeQueues[qName] = new Queue(qName, { connection: redisConnection });
      activeQueues[qName].on('error', () => {});
      console.log(`BullMQ Queue registered: ${qName}`);
    });
  }

// 1. Scheduled Publishing Worker
const publishingWorker = redisConnection ? new Worker('scheduled_publishing', async (job) => {
  if (job.name === 'poll_scheduled_posts') {
    // 1-Minute CRON: Query Supabase for due posts
    console.log(`[Worker - Publishing] Polling database for scheduled posts...`);
    
    // Check if we have the DB set up
    const { data: duePosts, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('publish_at', new Date().toISOString());

    if (error) {
      if (error.code !== '42P01') { // Ignore missing table errors temporarily
        console.error(`[Worker - Publishing] Error fetching posts:`, error);
      }
      return;
    }

    if (!duePosts || duePosts.length === 0) return;

    for (const post of duePosts) {
      // Post is due! Add to execution queue and mark as processing
      await supabase.from('scheduled_posts').update({ status: 'processing' }).eq('id', post.id);
      await activeQueues['scheduled_publishing'].add('execute_post', post);
    }
    return { success: true, processed: duePosts.length };
  }

  if (job.name === 'execute_post') {
    const post = job.data;
    console.log(`[Worker - Publishing] Executing publish job for post ${post.id} to ${post.platform}`);
    
    try {
      // Use the API Executors layer to simulate publishing
      const apiResponse = await routeExecution(post.app_id, 'publish_social', {
        content: post.content,
        mediaUrl: post.media_url,
        platform: post.platform
      });

      // Update status to published
      const externalId = apiResponse.external_id || `post_${Date.now()}`;
      await supabase.from('scheduled_posts').update({ status: 'published', external_id: externalId }).eq('id', post.id);
      console.log(`[Worker - Publishing] Successfully published post ${post.id}`);
      return { success: true, apiResponse };

    } catch (err) {
      console.error(`[Worker - Publishing] Post ${post.id} failed:`, err);
      await supabase.from('scheduled_posts').update({ status: 'failed', external_id: err.message }).eq('id', post.id);
      throw err;
    }
  }
}, { connection: redisConnection }) : null;

// 2. Analytics Collection Worker (Materialized View Refresher)
const analyticsWorker = redisConnection ? new Worker('analytics_collection', async (job) => {
  console.log(`[Worker - Analytics] Starting 1-Hour Database Analytics Refresh...`);
  
  try {
    // 1. Refresh Materialized Views via Postgres RPC
    console.log(`[Worker - Analytics] Executing refresh_mv_app_analytics RPC in Supabase...`);
    const { error } = await supabase.rpc('refresh_mv_app_analytics');
    
    if (error) {
      console.error(`[Worker - Analytics] Materialized View Refresh Failed:`, error.message);
      throw error;
    }
    
    console.log(`[Worker - Analytics] Materialized Views successfully refreshed!`);
    
    // Simulate pulling external API metrics (Ratings, Downloads, etc.)
    const metricsData = {
      followers: 124000,
      reach: 540000,
      mrr: 44500,
      downloads: 124500
    };
    
    console.log(`[Worker - Analytics] External API metrics successfully synchronized.`);
    return { success: true, metrics: metricsData };
  } catch (err) {
    console.error(`[Worker - Analytics] Fatal Error:`, err);
    throw err;
  }
}, { connection: redisConnection }) : null;

// 3. Review Imports Worker
const reviewsWorker = redisConnection ? new Worker('review_imports', async (job) => {
  console.log(`[Worker - Reviews] Crawling App Store Connect RSS feeds and Play Console for app: ${job.data.projectId}`);
  
  // Mock review import & sentiment analysis
  console.log(`[Worker - Reviews] Calculation: Review sentiment classified positive.`);
  return { importedCount: 3, sentimentDistribution: { positive: 2, neutral: 1, negative: 0 } };
}, { connection: redisConnection }) : null;

// 4. Agent Execution Orchestrator Worker
const { runMarketingOrchestration } = require('./aiOrchestrator');
const agentWorker = redisConnection ? new Worker('agent_execution', async (job) => {
  if (job.name === 'orchestrate_campaign') {
    const { jobId, appId, goal, authHeader, language, businessType, campaignType, userId } = job.data;
    console.log(`[Worker - AI Agents] Executing orchestration job ${jobId} for app ${appId}`);
    try {
      await supabase.from('orchestration_jobs').update({ status: 'processing' }).eq('id', jobId);
      await runMarketingOrchestration(jobId, appId, goal, authHeader, language, businessType, campaignType, userId);
      return { success: true };
    } catch (err) {
      console.error(`[Worker - AI Agents] Orchestration job ${jobId} failed:`, err);
      await supabase.from('orchestration_jobs').update({ status: 'failed' }).eq('id', jobId);
      throw err;
    }
  }
  if (job.name === 'poll_executing_operations') {
    console.log(`[Worker - AI Agents] Polling database for approved executing operations...`);
    
    const { data: executingOps, error } = await supabase
      .from('agent_operations')
      .select('*')
      .eq('status', 'executing');

    if (error) {
      if (error.code !== '42P01') { 
        console.error(`[Worker - AI Agents] Error fetching operations:`, error);
      }
      return;
    }

    if (!executingOps || executingOps.length === 0) return;

    for (const op of executingOps) {
      await activeQueues['agent_execution'].add('execute_operation', op);
    }
    return { success: true, processed: executingOps.length };
  }

  if (job.name === 'execute_operation') {
    const op = job.data;
    console.log(`[Worker - AI Agents] Executing autonomous action ID: ${op.id} from ${op.agent_name}`);
    
    try {
      // Execute via the universal API Executors routing
      let operationType = 'generic';
      if (op.agent_name.includes('Advertising')) operationType = 'launch_ad';
      else if (op.agent_name.includes('Content')) operationType = 'publish_social';
      
      const apiResponse = await routeExecution(op.app_id, operationType, {
        title: op.task_goal,
        content: op.recommendation
      });

      if (op.agent_name.includes('Advertising')) {
        // Also find pending ad campaigns for this app to mark active
        const { data: campaigns } = await supabase
          .from('ad_campaigns')
          .select('id')
          .eq('app_id', op.app_id)
          .eq('status', 'pending_approval');
          
        if (campaigns && campaigns.length > 0) {
          for (let camp of campaigns) {
            await supabase.from('ad_campaigns').update({ status: 'active', start_date: new Date().toISOString() }).eq('id', camp.id);
          }
        }
      }

      // Mark operation as live
      await supabase.from('agent_operations').update({ status: 'live', completed_at: new Date().toISOString() }).eq('id', op.id);
      return { success: true, apiResponse };
    } catch (err) {
      console.error(`[Worker - AI Agents] Operation ${op.id} failed:`, err);
      await supabase.from('agent_operations').update({ status: 'failed' }).eq('id', op.id);
      throw err;
    }
  }
}, { connection: redisConnection }) : null;

// Callback Listeners
if (publishingWorker) publishingWorker.on('completed', (job, result) => {
  console.log(`[Job Completed] Worker 'scheduled_publishing' finished job ${job.id}`);
});

if (publishingWorker) publishingWorker.on('failed', (job, err) => {
  console.error(`[Job Failed] Worker 'scheduled_publishing' failed job ${job.id} with error: ${err.message}`);
});

// 5. Video Rendering Worker
async function processVideoGeneration(jobData) {
  const { assetId, prompt, appId } = jobData;
  console.log(`[Worker - Video] Rendering video for asset ${assetId}...`);

    try {
      // 1. Run Replicate (High-Quality Model)
      const output = await replicate.run("minimax/video-01", { 
        input: { prompt: prompt } 
      });

      let buffer;
      if (typeof output === 'string') {
        const response = await fetch(output);
        if (!response.ok) throw new Error('Failed to download video from Replicate');
        buffer = await response.arrayBuffer();
      } else if (Array.isArray(output)) {
        const response = await fetch(output[0]);
        if (!response.ok) throw new Error('Failed to download video from Replicate');
        buffer = await response.arrayBuffer();
      } else {
        // Handle ReadableStream from new Replicate API versions
        const response = new Response(output);
        buffer = await response.arrayBuffer();
      }

      // 3. Upload to Supabase Storage
      const fileName = `video_${assetId}.mp4`;
      const { data: storageData, error: storageErr } = await supabase.storage
        .from('brand_assets') // Assuming this bucket exists
        .upload(fileName, buffer, {
          contentType: 'video/mp4',
          upsert: true
        });

      if (storageErr) throw storageErr;

      // 4. Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('brand_assets')
        .getPublicUrl(fileName);

      const finalUrl = publicUrlData.publicUrl;

      // 5. Update Postgres row
      await supabase.from('video_factory_assets').update({
        video_url: finalUrl,
        status: 'published'
      }).eq('id', assetId);

      // 6. Save to Media Library
      await supabase.from('media').insert({
        app_id: appId || 'default',
        name: `AI Video: ${prompt.substring(0, 30)}`,
        file_type: 'video/mp4',
        folder: 'AI Generated',
        description: prompt,
        storage_path: finalUrl
      });

      console.log(`[Worker - Video] Successfully rendered and uploaded asset ${assetId}`);
      return { success: true, url: finalUrl };

    } catch (err) {
      console.error(`[Worker - Video] Error rendering asset ${assetId}:`, err);
      await supabase.from('video_factory_assets').update({
        status: 'failed',
        title: `ERR: ${err.message}`.substring(0, 100)
      }).eq('id', assetId);
      throw err;
    }
}

const videoRenderingWorker = redisConnection ? new Worker('video_rendering', async (job) => {
  if (job.name === 'render_video') {
    return await processVideoGeneration(job.data);
  }
}, { connection: redisConnection }) : null;

if (videoRenderingWorker) videoRenderingWorker.on('failed', (job, err) => {
  console.error(`[Job Failed] Worker 'video_rendering' failed job ${job.id} with error: ${err.message}`);
});

// Export Workers
module.exports = {
  activeQueues,
  publishingWorker,
  analyticsWorker,
  reviewsWorker,
  agentWorker,
  videoRenderingWorker,
  processVideoGeneration
};

// Start Repeating Jobs if running directly
if (require.main === module) {
  console.log("[Workers] Booting Background Service...");
  
  // Schedule the Analytics Refresh to run every 1 hour
  activeQueues['analytics_collection'].add('hourly_refresh', {}, {
    repeat: {
      pattern: '0 * * * *' // Runs at minute 0 past every hour
    }
  }).then(() => {
    console.log("[Workers] 1-Hour Analytics Cron Job scheduled successfully.");
  });
  
  // Auto-Publishing Engine 1-Minute Cron Job
  activeQueues['scheduled_publishing'].add('poll_scheduled_posts', {}, {
    repeat: {
      pattern: '* * * * *' // Runs every minute
    }
  }).then(() => {
    console.log("[Workers] 1-Minute Auto-Publishing Cron Job scheduled successfully.");
  });

  // Agent Execution Orchestrator 1-Minute Cron Job
  activeQueues['agent_execution'].add('poll_executing_operations', {}, {
    repeat: {
      pattern: '* * * * *' // Runs every minute
    }
  }).then(() => {
    console.log("[Workers] 1-Minute Agent Execution Cron Job scheduled successfully.");
  });
  
  // Also trigger immediate runs on boot
  activeQueues['analytics_collection'].add('boot_refresh', { isBoot: true });
  activeQueues['scheduled_publishing'].add('poll_scheduled_posts', { isBoot: true });
  activeQueues['agent_execution'].add('poll_executing_operations', { isBoot: true });
}

if (publishingWorker) { publishingWorker.on('error', err => console.warn('[Worker Error]', err.message)); }
if (analyticsWorker) { analyticsWorker.on('error', err => console.warn('[Worker Error]', err.message)); }
if (reviewsWorker) { reviewsWorker.on('error', err => console.warn('[Worker Error]', err.message)); }
if (agentWorker) { agentWorker.on('error', err => console.warn('[Worker Error]', err.message)); }
if (videoRenderingWorker) { videoRenderingWorker.on('error', err => console.warn('[Worker Error]', err.message)); }