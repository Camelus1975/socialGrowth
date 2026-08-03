const fs = require('fs');

// 1. Fix aiOrchestrator argument mismatch
let orchestratorCode = fs.readFileSync('aiOrchestrator.js', 'utf8');
if (orchestratorCode.includes('async function runMarketingOrchestration(appId, goal, authHeader')) {
  orchestratorCode = orchestratorCode.replace(
    /async function runMarketingOrchestration\(appId, goal, authHeader, language = 'en', businessType = 'saas', campaignType = 'both', userId = null\) \{/,
    `async function runMarketingOrchestration(jobId, appId, goal, authHeader, language = 'en', businessType = 'saas', campaignType = 'both', userId = null) {`
  );
  fs.writeFileSync('aiOrchestrator.js', orchestratorCode);
  console.log('Fixed aiOrchestrator.js signature');
}

// 2. Fix workers.js to catch all Worker errors
let workersCode = fs.readFileSync('workers.js', 'utf8');

// Add error handlers to all workers
const workerNames = ['publishingWorker', 'analyticsWorker', 'reviewsWorker', 'agentWorker', 'videoRenderingWorker'];
workerNames.forEach(worker => {
  if (!workersCode.includes(`${worker}.on('error'`)) {
    // We add the error handler immediately after we check if it exists
    workersCode = workersCode + `\nif (${worker}) { ${worker}.on('error', err => console.warn('[Worker Error]', err.message)); }`;
  }
});
fs.writeFileSync('workers.js', workersCode);
console.log('Fixed workers.js worker error handlers');

// 3. Fix server.js inline fallback signature
let serverCode = fs.readFileSync('server.js', 'utf8');
// It already correctly passes jobId as first argument in my inline fallback:
// runMarketingOrchestration(data.jobId, data.appId, data.goal, data.authHeader, data.language, data.businessType, data.campaignType, data.userId)
// So nothing to change in server.js for that.
