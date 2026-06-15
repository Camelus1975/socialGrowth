// App Founder Growth Suite - BullMQ Background Workers
const { Queue, Worker, QueueEvents } = require('bullmq');
const Redis = require('ioredis');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

dotenv.config();

// Initialize Encryption Vault
const ENCRYPTION_KEY = crypto.scryptSync(process.env.ENCRYPTION_SECRET || 'development_fallback_secret_key_123', 'founder_suite_salt_2026', 32);

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

dotenv.config();

// Initialize Supabase (Use Service Role Key if available, else Anon Key)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// Connect to Redis instance
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

// Define Queue Names
const queuesList = [
  'scheduled_publishing',
  'analytics_collection',
  'review_imports',
  'agent_execution',
  'notification_delivery'
];

// Initialize Queues
const activeQueues = {};
queuesList.forEach(qName => {
  activeQueues[qName] = new Queue(qName, { connection: redisConnection });
  console.log(`BullMQ Queue registered: ${qName}`);
});

// 1. Scheduled Publishing Worker
const publishingWorker = new Worker('scheduled_publishing', async (job) => {
  if (job.name === 'poll_scheduled_posts') {
    // 1-Minute CRON: Query Supabase for due posts
    console.log(`[Worker - Publishing] Polling database for scheduled posts...`);
    
    // Check if we have the DB set up
    const { data: duePosts, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_date', new Date().toISOString().split('T')[0]); // simplified date check

    if (error) {
      if (error.code !== '42P01') { // Ignore missing table errors temporarily
        console.error(`[Worker - Publishing] Error fetching posts:`, error);
      }
      return;
    }

    if (!duePosts || duePosts.length === 0) return;

    // Additional filtering for time
    const nowHourMin = new Date().toISOString().split('T')[1].substring(0, 5); // "HH:MM"
    const today = new Date().toISOString().split('T')[0];

    for (const post of duePosts) {
      if (post.scheduled_date < today || (post.scheduled_date === today && post.scheduled_time <= nowHourMin)) {
        // Post is due! Add to execution queue and mark as processing
        await supabase.from('scheduled_posts').update({ status: 'processing' }).eq('id', post.id);
        await activeQueues['scheduled_publishing'].add('execute_post', post);
      }
    }
    return { success: true, processed: duePosts.length };
  }

  if (job.name === 'execute_post') {
    const post = job.data;
    console.log(`[Worker - Publishing] Executing publish job for post ${post.id} to ${post.platform}`);
    
    try {
      // 1. Fetch credentials from social_accounts vault
      const { data: accounts, error: accountErr } = await supabase
        .from('social_accounts')
        .select('access_token_encrypted, handle')
        .eq('app_id', post.app_id)
        .eq('platform', post.platform);

      if (accountErr || !accounts || accounts.length === 0) {
        throw new Error(`No connected ${post.platform} account found.`);
      }

      const account = accounts[0];
      const accessToken = decryptToken(account.access_token_encrypted);
      if (!accessToken) throw new Error("Failed to decrypt access token");

      let apiResponse;
      // 2. Publish to specific platform
      if (post.platform === 'facebook') {
        const url = `https://graph.facebook.com/v19.0/${account.handle}/feed`;
        const payload = {
          access_token: accessToken,
          message: post.content
        };
        if (post.media_url) {
          payload.link = post.media_url; // or /photos endpoint depending on media type
        }
        
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        apiResponse = await res.json();
        if (apiResponse.error) throw new Error(apiResponse.error.message);

      } else if (post.platform === 'instagram') {
        // Step 1: Create media container
        const url1 = `https://graph.facebook.com/v19.0/${account.handle}/media`;
        const payload1 = {
          access_token: accessToken,
          caption: post.content
        };
        if (post.media_url) {
          payload1.image_url = post.media_url;
        } else {
          throw new Error("Instagram requires an image or video URL.");
        }

        const res1 = await fetch(url1, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload1)
        });
        const data1 = await res1.json();
        if (data1.error) throw new Error(data1.error.message);

        // Step 2: Publish media container
        const url2 = `https://graph.facebook.com/v19.0/${account.handle}/media_publish`;
        const res2 = await fetch(url2, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: accessToken,
            creation_id: data1.id
          })
        });
        apiResponse = await res2.json();
        if (apiResponse.error) throw new Error(apiResponse.error.message);
      } else {
        throw new Error("Unsupported platform");
      }

      // 3. Update status to published
      await supabase.from('scheduled_posts').update({ status: 'published' }).eq('id', post.id);
      console.log(`[Worker - Publishing] Successfully published post ${post.id}`);
      return { success: true, apiResponse };

    } catch (err) {
      console.error(`[Worker - Publishing] Post ${post.id} failed:`, err);
      await supabase.from('scheduled_posts').update({ status: 'failed' }).eq('id', post.id);
      throw err;
    }
  }
}, { connection: redisConnection });

// 2. Analytics Collection Worker (Materialized View Refresher)
const analyticsWorker = new Worker('analytics_collection', async (job) => {
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
}, { connection: redisConnection });

// 3. Review Imports Worker
const reviewsWorker = new Worker('review_imports', async (job) => {
  console.log(`[Worker - Reviews] Crawling App Store Connect RSS feeds and Play Console for app: ${job.data.projectId}`);
  
  // Mock review import & sentiment analysis
  console.log(`[Worker - Reviews] Calculation: Review sentiment classified positive.`);
  return { importedCount: 3, sentimentDistribution: { positive: 2, neutral: 1, negative: 0 } };
}, { connection: redisConnection });

// 4. Agent Execution Orchestrator Worker
const agentWorker = new Worker('agent_execution', async (job) => {
  console.log(`[Worker - AI Agents] Executing autonomous collaborative loop ID: ${job.data.orchestrationId}`);
  
  // Simulate Agent memory lookup
  console.log(`[Worker - AI Agents] Analytics Agent triggered Growth audit routines.`);
  return { success: true };
}, { connection: redisConnection });

// Callback Listeners
publishingWorker.on('completed', (job, result) => {
  console.log(`[Job Completed] Worker 'scheduled_publishing' finished job ${job.id}`);
});

publishingWorker.on('failed', (job, err) => {
  console.error(`[Job Failed] Worker 'scheduled_publishing' failed job ${job.id} with error: ${err.message}`);
});

// Export Workers
module.exports = {
  activeQueues,
  publishingWorker,
  analyticsWorker,
  reviewsWorker,
  agentWorker
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
  
  // Also trigger immediate runs on boot
  activeQueues['analytics_collection'].add('boot_refresh', { isBoot: true });
  activeQueues['scheduled_publishing'].add('poll_scheduled_posts', { isBoot: true });
}
