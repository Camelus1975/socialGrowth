const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const { processDiscoveryJob, processCompetitorJob } = require('./discoveryEngine');
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
      description: "Add a competitor to the intelligence tracking system. It will immediately trigger a background job to scrape their website and generate an analysis profile. Do not use this tool if the user is just asking a question about a competitor.",
      parameters: {
        type: "object",
        properties: {
          competitorName: { type: "string", description: "The name of the competitor" },
          competitorUrl: { type: "string", description: "The URL of the competitor's website" }
        },
        required: ["competitorName"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_competitor",
      description: "Use this tool to read the latest intelligence report for a tracked competitor from the database. Use this when the user asks questions about a competitor's pricing, market position, or weaknesses.",
      parameters: {
        type: "object",
        properties: {
          competitorName: { type: "string", description: "The name of the competitor to analyze" }
        },
        required: ["competitorName"]
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
      const toolCall = response.choices[0].message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);
      args.appId = activeWorkspaceId; // Automatically inject current workspace
      
      console.log(`[Copilot] Executing tool: ${toolCall.function.name}`, args);
      
      if (toolCall.function.name === "create_business") {
        let dbError = null;
        if (userId) {
          const businessSlug = args.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Math.random().toString(36).substring(2, 6);
          const resInsert = await userSupabase.from('businesses').insert({
            business_id: businessSlug,
            user_id: userId,
            name: args.name,
            business_type: 'custom',
            category: 'brand'
          }).select();
          
          dbError = resInsert.error;
          
          if (dbError) {
            console.error("DB Error creating business:", dbError);
            return res.json({ message: `I tried to add **${args.name}**, but I encountered a database error: \`${dbError.message || JSON.stringify(dbError)}\`` });
          }
          
          return res.json({ message: `Awesome! I've successfully set up the workspace for **${args.name}**${args.url ? ` (${args.url})` : ''}. You can now select it from the workspace dropdown in the top left!`, refreshWorkspaces: true });
        } else {
          return res.json({ message: `I could not create the workspace because I couldn't authenticate you.` });
        }
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
        
        const { data, error } = await userSupabase.from('competitors').insert({
          app_id: args.appId,
          name: args.competitorName,
          website_url: args.competitorUrl || null,
          current_pricing: {}
        }).select().single();
        
        if (error) {
          console.error("Failed to add competitor:", error);
          return res.json({ message: "Failed to add competitor to the database." });
        }
        
        // Dispatch background job to discoveryEngine
        processCompetitorJob(data.id, args.competitorUrl, args.appId, userSupabase).catch(console.error);
        
        return res.json({ message: `I have successfully logged **${args.competitorName}** into the Competitor Intelligence Center. I am dispatching a background job to scrape their website and analyze their strategy right now!` });
      }

      if (toolCall.function.name === "analyze_competitor") {
        if (!args.appId) return res.json({ message: "Please select a workspace first." });
        
        const { data, error } = await userSupabase.from('competitors')
          .select('*')
          .eq('app_id', args.appId)
          .ilike('name', `%${args.competitorName}%`)
          .limit(1)
          .single();
          
        if (error || !data) {
          return res.json({ message: `I couldn't find any intelligence reports for **${args.competitorName}**. Have you tracked them using the Competitor Intelligence Center?` });
        }
        
        if (!data.current_pricing || Object.keys(data.current_pricing).length === 0) {
          return res.json({ message: `I am tracking **${data.name}**, but the background discovery engine hasn't finished analyzing their website yet. Please check back in a minute!` });
        }
        
        // Pass the raw data back to the LLM to format a response
        // We will call OpenAI again to format the answer nicely based on the DB JSON
        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a competitive intelligence strategist. Summarize the provided competitor data to answer the user's implicit question. Use markdown, keep it concise and punchy." },
            { role: "user", content: `Here is the intelligence data for ${data.name}:\n\n${JSON.stringify(data.current_pricing, null, 2)}` }
          ]
        });
        
        return res.json({ message: aiResponse.choices[0].message.content });
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
