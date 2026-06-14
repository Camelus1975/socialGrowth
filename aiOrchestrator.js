const { OpenAI } = require('openai');
const config = require('./config');
const { createClient } = require('@supabase/supabase-js');
const { searchGrowthMemory } = require('./memoryEngine');
const { createPendingCampaign, predictCampaignOutcomes } = require('./advertisingEngine');

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

// The AI Agent Prompts
const AGENT_PROMPTS = {
  CMO: `You are the Chief Marketing Officer (CMO) Agent. 
Role: Marketing strategist.
Goal: Take the Founder's command and generate a high-level strategic plan. Break down the plan into specific tasks for your sub-agents: Growth Analyst, Content Strategist, Content Writer, Creative Director, ASO Agent, Campaign Manager, Video Marketing Agent, Publishing Agent, Revenue Intelligence Agent, Ad Strategist, Audience Intelligence Agent, and Media Buyer.
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
Output JSON format: { "aso_recommendations": "...", "keywords": ["..."] }`,

  VideoMarketingAgent: `You are the Video Marketing Agent.
Role: Plan and storyboard video marketing assets (TikToks, Reels, Ads).
Input: A strategy from the CMO.
Output JSON format: { "video_concept": "...", "target_audience": "...", "storyboard": [ { "scene_number": 1, "visual_direction": "...", "duration": 3 } ] }`,

  PublishingAgent: `You are the Publishing Agent.
Role: Channel selection, format adaptation, and scheduling intelligence.
Goal: Predict success and distribute content optimally.
Input: A campaign from the Campaign Manager.
Output JSON format: { "channels": ["linkedin", "twitter"], "predicted_success": 85, "schedule": [ { "platform": "linkedin", "time": "10:00 AM", "content_type": "carousel" } ] }`,

  RevenueIntelligenceAgent: `You are the Revenue Intelligence Agent.
Role: ROI analysis and attribution engine.
Goal: Connect marketing activities to business outcomes (MRR, Installs, CAC).
Input: Post-publishing campaign data.
Output JSON format: { "roi_analysis": "...", "mrr_impact_score": 8.5, "recommendation": "Expand budget" }`,

  AdStrategist: `You are the Ad Strategist Agent.
Role: Media buying strategist.
Goal: Plan paid acquisition campaigns, calculate budgets, and set CPA objectives.
Input: A strategy from the CMO.
Output JSON format: { "campaign_blueprint": "...", "channels": ["meta", "google"], "budget_allocation": { "meta": 500, "google": 500 }, "target_cpa": 10 }`,

  AudienceIntelligenceAgent: `You are the Audience Intelligence Agent.
Role: Audience generation and targeting intelligence.
Goal: Create detailed targeting criteria (interests, demographics, lookalikes).
Input: A strategy from the Ad Strategist.
Output JSON format: { "audiences": [ { "name": "...", "platform": "meta", "interests": ["..."], "demographics": { "age": [18, 35] } } ] }`,

  MediaBuyer: `You are the Media Buyer Agent.
Role: Launch campaigns, run multivariate tests, and monitor budget optimization.
Goal: Minimize CPA and Maximize ROAS autonomously.
Input: Audiences and Creatives.
Output JSON format: { "simulation_report": { "expected_reach": 10000, "expected_cpa": 8.5 }, "action": "request_approval" }`
};

/**
 * Multi-Agent Orchestration Engine
 * @param {string} appId - The target app ID
 * @param {string} goal - The Founder's command (e.g. "Grow BusinessPilot")
 * @param {string} authHeader - JWT token for Supabase RLS
 * @param {string} language - User's language preference
 * @param {string} businessType - The category of business
 * @param {string} campaignType - User preference (organic, paid, or both)
 */
async function runMarketingOrchestration(appId, goal, authHeader, language = 'en', businessType = 'saas', campaignType = 'both') {
  const steps = [];
  
  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });

  try {
    // 1. RAG Memory Retrieval Phase
    steps.push({ agent: "System", log: `Searching Growth Memory Engine for past insights on: "${appId}"...` });
    const relevantMemories = await searchGrowthMemory(goal, appId, supabase, 5);
    let memoryContext = "";
    if (relevantMemories.length > 0) {
      memoryContext = "Historical Growth Memories & Lessons Learned:\n";
      relevantMemories.forEach((mem, idx) => {
        memoryContext += `${idx + 1}. ${mem.content_text}\n`;
      });
      steps.push({ agent: "System", log: `Found ${relevantMemories.length} relevant historical memories. Injecting into CMO context.` });
    } else {
      steps.push({ agent: "System", log: "No relevant historical memories found. Relying on baseline intelligence." });
    }

    // 2. CMO Strategy Phase
    steps.push({ agent: "CMO Agent", log: `Drafting strategy for goal: "${goal}"` });
    
    const langDirective = language === 'ar' 
      ? "CRITICAL: The user's language is Arabic. ALL generated output, text, copy, strategies, and plans MUST be written strictly in Arabic. Do not use English."
      : "";

    let typeDirective = "";
    if (campaignType === 'organic') {
      typeDirective = "CRITICAL: The user has requested ORGANIC POSTS ONLY. Do NOT delegate any tasks to the AdStrategist. Focus exclusively on organic content creation (ContentWriter).";
    } else if (campaignType === 'paid') {
      typeDirective = "CRITICAL: The user has requested PAID ADS ONLY. Focus entirely on paid advertising strategy and delegate only to the AdStrategist. Do NOT delegate to the ContentWriter for organic posts.";
    }

    const cmoResponse = await openai.chat.completions.create({
      model: "gpt-4o", // Strategy requires deep reasoning
      messages: [
        { role: "system", content: AGENT_PROMPTS.CMO + "\n" + langDirective + "\n" + typeDirective },
        { role: "user", content: `Business Type: ${businessType}\nApp/Business ID: ${appId}\nGoal: ${goal}\n\n${memoryContext}` }
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
          { role: "system", content: AGENT_PROMPTS[agentKey] + "\n" + langDirective },
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
    
    // Check if Advertising Strategy was generated
    const adStrategy = agentResults.find(r => r.agent === 'AdStrategist' || r.agent === 'Ad Strategist');
    let campaignId = null;
    if (adStrategy) {
      steps.push({ agent: "Media Buyer", log: "Simulating ad campaign performance and CPA predictions." });
      try {
        const campaign = await createPendingCampaign(appId, adStrategy.result, authHeader);
        campaignId = campaign.id;
        
        // Predict outcomes based on strategy budget
        const budget = adStrategy.result.budget_allocation ? Object.values(adStrategy.result.budget_allocation)[0] || 500 : 500;
        const predictions = predictCampaignOutcomes(budget, 'installs', 'meta');
        
        steps.push({ agent: "Media Buyer", log: `Campaign "${campaign.name}" created. Pending Approval. Expected CPA: $${predictions.expected_case.cpa}, Expected Reach: ${predictions.expected_case.reach}` });
      } catch (err) {
        console.error("Failed to create pending campaign", err);
      }
    }

    // In a fully autonomous mode, this would pass to the PublishingAgent.
    // For safety, we pause here and present the plan to the Founder (CEO).
    steps.push({ agent: "System", log: "Awaiting CEO Approval before execution." });

    return {
      success: true,
      orchestrationId: crypto.randomUUID(),
      campaignId: campaignId,
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
