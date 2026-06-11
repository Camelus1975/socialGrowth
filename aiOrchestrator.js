const { OpenAI } = require('openai');
const config = require('./config');
const { createClient } = require('@supabase/supabase-js');

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

// The AI Agent Prompts
const AGENT_PROMPTS = {
  CMO: `You are the Chief Marketing Officer (CMO) Agent. 
Role: Marketing strategist.
Goal: Take the Founder's command and generate a high-level strategic plan. Break down the plan into specific tasks for your sub-agents: Growth Analyst, Content Strategist, Content Writer, Creative Director, ASO Agent, and Campaign Manager.
Output MUST be valid JSON with the format: 
{ 
  "strategy_summary": "...", 
  "delegated_tasks": [
    { "agent": "Growth Analyst", "task": "..." },
    { "agent": "Content Writer", "task": "..." }
  ]
}`,

  GrowthAnalyst: `You are the Growth Analyst Agent. 
Role: Analyze growth metrics and funnels.
Input: A task from the CMO.
Output JSON format: { "analysis_report": "...", "identified_bottlenecks": ["..."] }`,

  ContentStrategist: `You are the Content Strategist Agent.
Role: Content planning and topic discovery.
Input: A strategy from the CMO.
Output JSON format: { "content_roadmap": "...", "recommended_themes": ["..."] }`,

  CreativeDirector: `You are the Creative Director Agent.
Role: Visual concepts and campaign creative direction.
Input: A strategy from the CMO.
Output JSON format: { "creative_brief": "...", "image_prompts": ["..."] }`,
  
  ContentWriter: `You are the Content Writer Agent.
Role: Generate specific social media copy variations based on strategy.
Input: A strategy from the CMO.
Output JSON format: { "copy_variants": [{ "platform": "twitter", "text": "..." }] }`,

  ASOAgent: `You are the App Store Optimization Agent.
Role: Keyword optimization and App Store metadata ranking improvements.
Input: A strategy from the CMO.
Output JSON format: { "aso_recommendations": "...", "keywords": ["..."] }`
};

/**
 * Multi-Agent Orchestration Engine
 * @param {string} goal - The Founder's command (e.g. "Grow BusinessPilot")
 * @param {string} authHeader - JWT token for Supabase RLS
 * @param {string} appId - The target app ID
 */
async function runMarketingOrchestration(goal, authHeader, appId) {
  const steps = [];
  
  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });

  try {
    // 1. CMO Strategy Phase
    steps.push({ agent: "CMO Agent", log: `Drafting strategy for goal: "${goal}"` });
    
    const cmoResponse = await openai.chat.completions.create({
      model: "gpt-4o", // Strategy requires deep reasoning
      messages: [
        { role: "system", content: AGENT_PROMPTS.CMO },
        { role: "user", content: `App: ${appId}. Goal: ${goal}` }
      ],
      response_format: { type: "json_object" }
    });

    const cmoData = JSON.parse(cmoResponse.choices[0].message.content);
    steps.push({ agent: "CMO Agent", log: "Strategy finalized. Delegating tasks to Marketing Team." });
    
    // 2. Parallel Agent Execution Phase
    // For cost/speed in this V1 pipeline, we execute a subset of the agents based on the CMO's delegated tasks.
    const agentPromises = cmoData.delegated_tasks.map(async (delegation) => {
      const agentKey = delegation.agent.replace(/\s/g, ''); // e.g. "GrowthAnalyst"
      if (!AGENT_PROMPTS[agentKey]) return null;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Lower cost model for execution agents
        messages: [
          { role: "system", content: AGENT_PROMPTS[agentKey] },
          { role: "user", content: `CMO Strategy: ${cmoData.strategy_summary}\nYour Task: ${delegation.task}` }
        ],
        response_format: { type: "json_object" }
      });
      
      return {
        agent: delegation.agent,
        log: `Completed task: ${delegation.task}`,
        result: JSON.parse(completion.choices[0].message.content)
      };
    });

    const agentResults = (await Promise.all(agentPromises)).filter(Boolean);
    
    // Append agent logs to the sequence
    agentResults.forEach(res => {
      steps.push({ agent: res.agent, log: res.log });
    });

    // 3. Campaign Manager Phase
    steps.push({ agent: "Campaign Manager", log: "Aggregating agent outputs into Draft Campaign Portfolio." });
    
    // In a fully autonomous mode, this would pass to the PublishingAgent.
    // For safety, we pause here and present the plan to the Founder (CEO).
    steps.push({ agent: "System", log: "Awaiting CEO Approval before execution." });

    return {
      success: true,
      orchestrationId: crypto.randomUUID(),
      cmoStrategy: cmoData,
      agentResults,
      steps
    };

  } catch (error) {
    console.error("[Orchestrator] Error running pipeline:", error);
    return { success: false, error: "Multi-Agent Pipeline Failed." };
  }
}

module.exports = {
  runMarketingOrchestration
};
