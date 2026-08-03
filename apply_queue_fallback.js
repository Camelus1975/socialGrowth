const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');

// Replace the buggy redisConnection and Queue initialization in server.js
const regex = /const redisConnection = new Redis\(process\.env\.REDIS_URL \|\| 'redis:\/\/localhost:6379', \{ maxRetriesPerRequest: null \}\);\s*const agentExecutionQueue = new Queue\('agent_execution', \{ connection: redisConnection \}\);\s*agentExecutionQueue\.on\('error', \(\) => \{\}\);/m;

const replacement = `
let agentExecutionQueue;
const useRedis = !!process.env.REDIS_URL;
if (useRedis) {
  try {
    const redisConnection = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null, retryStrategy: () => null });
    redisConnection.on('error', (err) => console.warn('[Redis] Connection failed. BullMQ queues will be offline.'));
    agentExecutionQueue = new Queue('agent_execution', { connection: redisConnection });
    agentExecutionQueue.on('error', () => {});
  } catch (e) {
    console.warn('[Redis] Initialization error:', e.message);
  }
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
}
`;

if (regex.test(serverCode)) {
  serverCode = serverCode.replace(regex, replacement);
  fs.writeFileSync('server.js', serverCode);
  console.log('Successfully replaced redis initialization in server.js');
} else {
  console.error('Regex did not match server.js. The code might look different.');
}
