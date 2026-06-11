const { runMarketingOrchestration } = require('./aiOrchestrator');
const config = require('./config');

async function testAudit() {
  console.log("Starting Multi-Agent Orchestration Test...");
  const result = await runMarketingOrchestration("Run a full marketing audit and growth strategy for BusinessPilot", "dummy_auth_token", "app_business_pilot");
  
  if (result.success) {
    console.log("\n=== CMO STRATEGY ===");
    console.log(JSON.stringify(result.cmoStrategy, null, 2));
    
    console.log("\n=== AGENT LOGS ===");
    result.steps.forEach(s => console.log(`[${s.agent}] ${s.log}`));
    
    console.log("\n=== AGENT RESULTS (JSON payloads) ===");
    result.agentResults.forEach(r => {
      console.log(`\n--- ${r.agent} Output ---`);
      console.log(JSON.stringify(r.result, null, 2));
    });
  } else {
    console.error("Pipeline failed:", result.error);
  }
}

testAudit();
