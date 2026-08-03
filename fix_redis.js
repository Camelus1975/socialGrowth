const fs = require('fs');

// Fix server.js
let serverCode = fs.readFileSync('server.js', 'utf8');

serverCode = serverCode.replace(
  /const redisConnection = new Redis\(process\.env\.REDIS_URL \|\| 'redis:\/\/localhost:6379', \{ maxRetriesPerRequest: null \}\);\nconst agentExecutionQueue = new Queue\('agent_execution', \{ connection: redisConnection \}\);/,
  `const useRedis = !!process.env.REDIS_URL || !IS_PRODUCTION;
let agentExecutionQueue;
if (useRedis) {
  try {
    const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null, retryStrategy: () => null });
    redisConnection.on('error', (err) => console.warn('[Redis] Connection failed. BullMQ queues will be offline.'));
    agentExecutionQueue = new Queue('agent_execution', { connection: redisConnection });
  } catch (e) { console.warn('[Redis] Initialization error:', e.message); }
}

if (!agentExecutionQueue) {
  agentExecutionQueue = {
    add: async (name, data) => {
      console.log(\`[Fallback Queue] Executing \${name} inline because Redis is unavailable.\`);
      const { runMarketingOrchestration } = require('./aiOrchestrator');
      setTimeout(() => {
        runMarketingOrchestration(data.jobId, data.appId, data.goal, data.authHeader, data.language, data.businessType, data.campaignType, data.userId).catch(console.error);
      }, 0);
    }
  };
}`
);

fs.writeFileSync('server.js', serverCode);
console.log('Fixed server.js Redis init');

// Fix workers.js
let workersCode = fs.readFileSync('workers.js', 'utf8');

workersCode = workersCode.replace(
  /const redisConnection = new Redis\(config\.REDIS_URL \|\| 'redis:\/\/localhost:6379', \{\n\s*maxRetriesPerRequest: null\n\s*\}\);/,
  `const useRedis = !!config.REDIS_URL || process.env.NODE_ENV !== 'production';
let redisConnection = null;
if (useRedis) {
  redisConnection = new Redis(config.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    retryStrategy: () => null // Do not retry if it fails immediately to prevent crash loops
  });
  redisConnection.on('error', (err) => {
    console.warn('[Redis Worker] Connection failed. Workers are offline.');
  });
}`
);

// We must also wrap the Queue and Worker initializations in workers.js if redisConnection is null.
workersCode = workersCode.replace(
  /const activeQueues = \{\};\n\s*queuesList\.forEach\(qName => \{\n\s*activeQueues\[qName\] = new Queue\(qName, \{ connection: redisConnection \}\);\n\s*console\.log\(`BullMQ Queue registered: \$\{qName\}`\);\n\s*\}\);/,
  `const activeQueues = {};
  if (redisConnection) {
    queuesList.forEach(qName => {
      activeQueues[qName] = new Queue(qName, { connection: redisConnection });
      console.log(\`BullMQ Queue registered: \${qName}\`);
    });
  }`
);

// For the workers themselves:
workersCode = workersCode.replace(
  /const publishingWorker = new Worker\('scheduled_publishing', async \(job\) => \{/g,
  `const publishingWorker = redisConnection ? new Worker('scheduled_publishing', async (job) => {`
);
workersCode = workersCode.replace(
  /\}, \{ connection: redisConnection \}\);/g,
  `}, { connection: redisConnection }) : null;`
);

// And replace other worker init:
workersCode = workersCode.replace(
  /const analyticsWorker = new Worker\('analytics_collection', async \(job\) => \{/g,
  `const analyticsWorker = redisConnection ? new Worker('analytics_collection', async (job) => {`
);
workersCode = workersCode.replace(
  /const reviewsWorker = new Worker\('review_imports', async \(job\) => \{/g,
  `const reviewsWorker = redisConnection ? new Worker('review_imports', async (job) => {`
);
workersCode = workersCode.replace(
  /const agentWorker = new Worker\('agent_execution', async \(job\) => \{/g,
  `const agentWorker = redisConnection ? new Worker('agent_execution', async (job) => {`
);
workersCode = workersCode.replace(
  /const notifWorker = new Worker\('notification_delivery', async \(job\) => \{/g,
  `const notifWorker = redisConnection ? new Worker('notification_delivery', async (job) => {`
);
workersCode = workersCode.replace(
  /const videoRenderingWorker = new Worker\('video_rendering', async \(job\) => \{/g,
  `const videoRenderingWorker = redisConnection ? new Worker('video_rendering', async (job) => {`
);

// Event listeners wrapper
workersCode = workersCode.replace(
  /publishingWorker\.on/g,
  `if (publishingWorker) publishingWorker.on`
);
workersCode = workersCode.replace(
  /analyticsWorker\.on/g,
  `if (analyticsWorker) analyticsWorker.on`
);
workersCode = workersCode.replace(
  /reviewsWorker\.on/g,
  `if (reviewsWorker) reviewsWorker.on`
);
workersCode = workersCode.replace(
  /agentWorker\.on/g,
  `if (agentWorker) agentWorker.on`
);
workersCode = workersCode.replace(
  /notifWorker\.on/g,
  `if (notifWorker) notifWorker.on`
);
workersCode = workersCode.replace(
  /videoRenderingWorker\.on/g,
  `if (videoRenderingWorker) videoRenderingWorker.on`
);

fs.writeFileSync('workers.js', workersCode);
console.log('Fixed workers.js Redis init');
