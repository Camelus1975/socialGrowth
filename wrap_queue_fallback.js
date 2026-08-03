const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');

// Replace the BullMQ add call with a try/catch that falls back to inline execution
const addRegex = /await agentExecutionQueue\.add\('orchestrate_campaign', \{[\s\S]*?userId: userId\s*\}\);/;

const fallbackExecution = `
      try {
        await agentExecutionQueue.add('orchestrate_campaign', {
          jobId: finalJobId,
          appId: appId,
          goal: goal,
          authHeader: req.headers.authorization,
          language: req.headers['x-app-language'] || 'en',
          businessType: 'saas',
          campaignType: 'both',
          userId: userId
        });
      } catch (queueErr) {
        console.warn("[Orchestrator] Redis/BullMQ failed to enqueue. Falling back to inline execution.", queueErr.message || queueErr);
        // Fallback to inline execution
        const { runMarketingOrchestration } = require('./aiOrchestrator');
        setTimeout(() => {
          runMarketingOrchestration(finalJobId, appId, goal, req.headers.authorization, req.headers['x-app-language'] || 'en', 'saas', 'both', userId).catch(console.error);
        }, 0);
      }
`;

if (addRegex.test(serverCode)) {
  serverCode = serverCode.replace(addRegex, fallbackExecution);
  fs.writeFileSync('server.js', serverCode);
  console.log('Successfully wrapped agentExecutionQueue.add with a fallback');
} else {
  console.error('Could not find the agentExecutionQueue.add block to replace.');
}
