const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const { processDiscoveryJob } = require('./discoveryEngine');
const { runMarketingOrchestration } = require('./aiOrchestrator');
const { searchGrowthMemory } = require('./memoryEngine');

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY);

// Define tools available to the Agent
const tools = [
  {
    type: "function",
    function: {
      name: "create_business",
      description: "Creates a new business workspace for the user in the database.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "The name of the business or brand" },
          url: { type: "string", description: "The website URL of the business" }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "run_business_discovery",
      description: "Scrapes a website to build a deep business intelligence profile (brand voice, target audience, content strategy). Use this when the user wants you to 'learn' or 'read' a website.",
      parameters: {
        type: "object",
        properties: {
          appId: { type: "string", description: "The UUID of the business (fetch from context)" },
          url: { type: "string", description: "The website URL to scrape" }
        },
        required: ["appId", "url"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "trigger_orchestration",
      description: "Triggers the massive multi-agent marketing orchestrator. Use this when the user asks for a comprehensive campaign, a 15-day strategy, or post generation.",
      parameters: {
        type: "object",
        properties: {
          appId: { type: "string", description: "The UUID of the business" },
          goal: { type: "string", description: "The high-level goal, e.g., 'Create a 15-day instagram post and video plan'" }
        },
        required: ["appId", "goal"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "track_competitor",
      description: "Logs a competitor into the Competitor Intelligence Center for continuous tracking.",
      parameters: {
        type: "object",
        properties: {
          appId: { type: "string", description: "The UUID of the user's business" },
          competitorName: { type: "string", description: "Name of the competitor" },
          competitorUrl: { type: "string", description: "Website URL of the competitor" }
        },
        required: ["appId", "competitorName"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "recycle_content",
      description: "Recycles or repurposes a piece of content (like a blog post, caption, or script) into multiple formats (email, Twitter thread, LinkedIn post, short-form video script).",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "The original content to be recycled" },
          platform: { type: "string", description: "The original platform (e.g., blog, social)" }
        },
        required: ["content"]
      }
    }
  }
];

router.post('/', async (req, res) => {
  const { message, context, agentType, history } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  // Get user from JWT
  let userId = null;
  const token = req.headers.authorization?.split(' ')[1];
  let userSupabase = supabase;
  
  if (token && token !== 'mock-supabase-jwt-token') {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      userId = user.id;
      userSupabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
    }
  }

  try {
    const activeWorkspace = context?.activeWorkspace || 'Unknown Workspace';
    const activeWorkspaceId = context?.activeWorkspaceId || null;

    const messages = [
      { 
        role: "system", 
        content: `You are the Social Growth Copilot, an AI Chief of Staff. 
        You manage a team of backend agents and engines.
        Active Workspace ID: ${activeWorkspaceId}
        Active Workspace Name: ${activeWorkspace}
        
        RULES:
        - If the user provides a business name/URL, immediately call create_business. Do not ask for confirmation.
        - If the user asks for a marketing plan or content generation, immediately call trigger_orchestration.
        - If the user asks you to read or scrape a website, immediately call run_business_discovery.
        - If the user mentions a competitor, immediately call track_competitor.
        - If the user provides content and asks to recycle or repurpose it, immediately call recycle_content.
        Speak conversationally and concisely.` 
      }
    ];

    // Append history to give AI context
    if (history && Array.isArray(history)) {
      history.forEach(msg => messages.push({ role: msg.role, content: msg.content }));
    } else {
      messages.push({ role: "user", content: message });
    }

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      tools: tools,
      tool_choice: "auto",
    });

    const responseMessage = response.choices[0].message;

    // Check if the model wanted to call a function
    if (responseMessage.tool_calls) {
      const toolCall = responseMessage.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);
      
      if (toolCall.function.name === "create_business") {
        let dbError = null;
        if (userId) {
          const businessSlug = args.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Math.random().toString(36).substring(2, 6);
          const { error } = await userSupabase.from('businesses').insert({
            business_id: businessSlug,
            user_id: userId,
            name: args.name,
            business_type: 'custom',
            category: 'brand'
          });
          dbError = error;
        }
        
        if (dbError) {
          console.error("DB Error creating business:", dbError);
          return res.json({ message: `I tried to add **${args.name}**, but I encountered a database error: \`${dbError.message || JSON.stringify(dbError)}\`` });
        }
        
        return res.json({ message: `Awesome! I've successfully set up the workspace for **${args.name}**${args.url ? ` (${args.url})` : ''}. You can now select it from the workspace dropdown in the top left!`, refreshWorkspaces: true });
      }

      if (toolCall.function.name === "run_business_discovery") {
        if (!args.appId) return res.json({ message: "I need to be inside a specific workspace to run discovery. Please select a workspace first!" });
        
        // Create job
        const { data, error } = await userSupabase.from('discovery_jobs').insert({
          app_id: args.appId,
          user_id: userId,
          status: 'pending'
        }).select().single();
        
        if (error) return res.json({ message: "Failed to initialize the Discovery Engine." });
        
        // Fire and forget
        processDiscoveryJob(data.id, args.appId, { website: args.url }, activeWorkspace, supabase).catch(console.error);
        
        return res.json({ message: `I have dispatched the **Discovery Engine** to scrape and analyze \`${args.url}\`. It's currently building a deep Business Intelligence Profile in the background!` });
      }

      if (toolCall.function.name === "trigger_orchestration") {
        if (!args.appId) return res.json({ message: "Please select a workspace before I can trigger the orchestration team." });
        
        // Fire and forget orchestration
        // We pass a dummy jobId because we are skipping the job table for now
        runMarketingOrchestration("copilot-trigger", args.appId, args.goal, req.headers.authorization, 'en', 'saas', 'both', userId).catch(console.error);
        
        return res.json({ message: `I've triggered the **AI Orchestrator** for your goal: *"${args.goal}"*. The CMO, Content Writer, and Creative Director are spinning up right now to generate your campaign!` });
      }

      if (toolCall.function.name === "track_competitor") {
        if (!args.appId) return res.json({ message: "Please select a workspace before adding competitors." });
        
        const { error } = await userSupabase.from('competitors').insert({
          app_id: args.appId,
          name: args.competitorName,
          url: args.competitorUrl || null,
          monitoring_status: 'active'
        });
        
        if (error) return res.json({ message: "Failed to add competitor to the database." });
        return res.json({ message: `I have successfully logged **${args.competitorName}** into the Competitor Intelligence Center. We will now monitor them for any feature or pricing changes!` });
      }

      if (toolCall.function.name === "recycle_content") {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a content recycling expert. Take the given post and repurpose it into 6 formats. Return JSON with keys: email (newsletter version), thread (Twitter thread), linkedin (LinkedIn post), shortForm (TikTok/Reels script), facebook (Facebook post), instagram (Instagram caption). Keep the core message but optimize each for its platform.' },
            { role: 'user', content: `Original ${args.platform || 'social'} post: ${args.content}` }
          ],
          response_format: { type: 'json_object' }
        });
        
        const recycled = JSON.parse(completion.choices[0].message.content);
        const formattedResponse = `
Here is your recycled content! ♻️

**📧 Newsletter (Email):**
${recycled.email}

**🧵 Twitter Thread:**
${recycled.thread}

**💼 LinkedIn Post:**
${recycled.linkedin}

**📘 Facebook Post:**
${recycled.facebook}

**📸 Instagram Caption:**
${recycled.instagram}

**📱 Short-Form Video Script (TikTok/Reels):**
${recycled.shortForm}
`;
        return res.json({ message: formattedResponse });
      }
    }

    // If no function was called, just return the text response
    return res.json({ message: responseMessage.content });

  } catch (err) {
    console.error("[Agent Router] Error:", err);
    return res.status(500).json({ message: "I encountered an internal error processing your request." });
  }
});

module.exports = router;
