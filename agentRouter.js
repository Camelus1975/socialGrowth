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
      description: "Creates a new business workspace. ALWAYS ask for both the business name AND website URL before calling this. The URL is needed to auto-study the business.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "The name of the business or brand" },
          url: { type: "string", description: "The website URL of the business — REQUIRED for auto-discovery" },
          niche: { type: "string", description: "A short description of what the business does (e.g., 'a social media app', 'a coffee shop')" }
        },
        required: ["name", "url"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "run_business_discovery",
      description: "Scrapes a website and social media channels to build a deep business intelligence profile (brand voice, target audience, content strategy, products). Use this when the user wants you to 'learn', 'study', or 'read' a website or Instagram page.",
      parameters: {
        type: "object",
        properties: {
          appId: { type: "string", description: "The UUID or slug of the business (fetch from context)" },
          url: { type: "string", description: "The website URL to scrape" },
          instagramUrl: { type: "string", description: "Optional Instagram profile URL" },
          linkedinUrl: { type: "string", description: "Optional LinkedIn profile URL" }
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
      name: "find_and_track_competitors",
      description: "Use this tool to automatically search, brainstorm, and identify competitors for the user's business based on their niche, and then track them in the background.",
      parameters: {
        type: "object",
        properties: {},
        required: []
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

router.post('/debug-competitor', async (req, res) => {
  const { appId, competitorUrl } = req.body;
  const authHeader = req.headers.authorization;
  const userSupabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });
  
  try {
    const { data, error } = await userSupabase.from('competitors').insert({
      app_id: appId,
      name: "Debug Test",
      website_url: competitorUrl || null,
      current_pricing: {}
    }).select().single();
    
    if (error) {
      return res.json({ success: false, error: "Insert competitor failed", details: error });
    }
    
    // Run synchronously to catch error
    await processCompetitorJob(data.id, competitorUrl, appId, userSupabase);
    
    return res.json({ success: true, message: "Job finished" });
  } catch (err) {
    return res.json({ success: false, error: "Crash", details: err.message });
  }
});

// Original intent endpoint starts here
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

    // ── Fetch live business context for the system prompt ──────────────────
    let businessContextBlock = '';
    if (activeWorkspaceId) {
      try {
        // Step 1: try matching business_id (slug like "mybrand_abc1")
        let { data: bizData } = await userSupabase
          .from('businesses')
          .select('name, category, business_type, tagline, discovery_profile')
          .eq('business_id', activeWorkspaceId)
          .maybeSingle();

        // Step 2: fall back to UUID id column if not found
        if (!bizData) {
          const fallback = await userSupabase
            .from('businesses')
            .select('name, category, business_type, tagline, discovery_profile')
            .eq('id', activeWorkspaceId)
            .maybeSingle();
          bizData = fallback.data;
        }

        console.log(`[Copilot] Business lookup for "${activeWorkspaceId}": found=${!!bizData}, name=${bizData?.name}`);

        if (bizData) {
          const dp = bizData.discovery_profile;
          const profile = dp?.businessProfile || {};
          const voice   = dp?.brandVoice     || {};
          const strat   = dp?.contentStrategy || {};

          businessContextBlock = `
\n=== ACTIVE BUSINESS PROFILE ===
Business Name   : ${profile.name || bizData.name}
Tagline         : ${bizData.tagline || profile.summary || '—'}
Industry        : ${profile.industry || bizData.category || '—'}
What they do    : ${profile.summary || '—'}
Value Prop      : ${profile.valueProposition || '—'}
Target Audience : ${profile.targetAudience || '—'}
Products/Services: ${(profile.products || []).join(', ') || '—'}
Brand Tone      : ${voice.tone || '—'} / ${voice.personality || '—'}
Brand Keywords  : ${(voice.keywords || []).join(', ') || '—'}
Content Pillars : ${(strat.contentPillars || []).join(', ') || '—'}
Best Platforms  : ${(strat.bestPlatforms || []).join(', ') || '—'}
=== END BUSINESS PROFILE ===\n
IMPORTANT: Every action you take MUST be tailored specifically to this exact business. Do NOT generate generic content. Reference the business name, industry, and target audience in every response.`;
        } else {
          console.warn(`[Copilot] No business found for workspace ID: "${activeWorkspaceId}"`);
          businessContextBlock = `\nNote: No business profile found. The user may need to run Business Discovery first.`;
        }
      } catch (e) {
        console.warn('[Copilot] Could not fetch business profile for system prompt:', e.message);
      }
    }
    // ───────────────────────────────────────────────────────────────────────



    const messages = [
      { 
        role: "system", 
        content: `You are the Social Growth Copilot, an expert AI Chief of Staff for this business.
Active Workspace ID   : ${activeWorkspaceId}
Active Workspace Name : ${activeWorkspace}
${businessContextBlock}

RULES:
- When the user wants to add a business, FIRST ask for both the business name AND its website URL if not provided. The URL is critical for auto-studying the business.
- Once you have both name and URL, call create_business immediately. The system will auto-scrape and study the website.
- If the user asks for a marketing plan, content, posts, or any content generation, immediately call trigger_orchestration and use their EXACT words as the goal.
- If the user asks you to read or scrape a website manually, call run_business_discovery.
- If the user specifically asks you to search for, brainstorm, or find competitors, immediately call find_and_track_competitors.
- If the user explicitly mentions a competitor name to track, call track_competitor.
- If the user provides content and asks to recycle or repurpose it, immediately call recycle_content.
- ALWAYS ground your responses in the business profile above. Never make up generic advice.
Speak conversationally and concisely.` 
      }
    ];

    // Append conversation history, then the current user message last
    if (history && Array.isArray(history) && history.length > 0) {
      // history already contains the current user message (pushed before fetch in frontend)
      history.forEach(msg => messages.push({ role: msg.role, content: msg.content }));
    } else {
      messages.push({ role: 'user', content: message });
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
        if (!userId) {
          return res.json({ message: `I could not create the workspace because I couldn't authenticate you.` });
        }

        const businessSlug = args.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Math.random().toString(36).substring(2, 6);
        const resInsert = await userSupabase.from('businesses').insert({
          business_id: businessSlug,
          user_id: userId,
          name: args.name,
          tagline: args.niche || null,
          business_type: 'custom',
          category: 'brand'
        }).select().single();

        if (resInsert.error) {
          console.error("DB Error creating business:", resInsert.error);
          return res.json({ message: `I tried to add **${args.name}**, but encountered a database error: \`${resInsert.error.message}\`` });
        }

        const newBiz = resInsert.data;
        let discoveryMsg = '';

        // Auto-trigger discovery if a URL was provided
        if (args.url && newBiz) {
          try {
            const urlsObj = { website: args.url, instagram: args.instagramUrl, linkedin: args.linkedinUrl };
            let jobId = `job_${Date.now()}`;
            
            const { data: jobData } = await userSupabase
              .from('discovery_jobs')
              .insert({
                business_id: newBiz.id,
                urls_to_scan: urlsObj,
                status: 'pending',
                progress_percent: 0
              })
              .select()
              .single();
              
            if (jobData) jobId = jobData.id;

            processDiscoveryJob(
              jobId,
              businessSlug,
              urlsObj,
              args.name,
              userSupabase,
              req.headers.authorization
            ).catch(console.error);

            discoveryMsg = ` I've also launched the **Business Intelligence Engine** to study \`${args.url}\` — it will scrape the website, subpages, social channels, and store the full profile in the background. This takes about 30–60 seconds.`;
          } catch (discoveryErr) {
            console.error('[Copilot] Auto-discovery failed to start:', discoveryErr);
          }
        } else {
          discoveryMsg = ` No website URL was provided, so please share the URL later and I will study the business for you.`;
        }

        return res.json({
          message: `✅ Workspace for **${args.name}** has been created! You can now select it from the workspace dropdown.${discoveryMsg}`,
          refreshWorkspaces: true
        });
      }

      if (toolCall.function.name === "run_business_discovery") {
        if (!args.appId) return res.json({ message: "I need to be inside a specific workspace to run discovery. Please select a workspace first!" });
        
        // Fetch business UUID if available
        let bizUuid = null;
        try {
          const { data: bizRows } = await userSupabase
            .from('businesses')
            .select('id, name')
            .or(`business_id.eq.${args.appId},id.eq.${args.appId}`)
            .limit(1);
          if (bizRows && bizRows.length > 0) bizUuid = bizRows[0].id;
        } catch (e) {}

        const urlsObj = { website: args.url, instagram: args.instagramUrl, linkedin: args.linkedinUrl };
        let jobId = `job_${Date.now()}`;

        // Attempt insert into discovery_jobs using correct column name (business_id)
        try {
          const { data: jobData, error: jobErr } = await userSupabase.from('discovery_jobs').insert({
            business_id: bizUuid || args.appId,
            urls_to_scan: urlsObj,
            status: 'pending',
            progress_percent: 0
          }).select().single();
          
          if (jobData) jobId = jobData.id;
          if (jobErr) console.warn('[Copilot] Note on discovery_jobs insert:', jobErr.message);
        } catch (jEx) {
          console.warn('[Copilot] discovery_jobs insert exception:', jEx.message);
        }

        // Fire and forget background discovery (ALWAYS runs regardless of job insert status!)
        processDiscoveryJob(
          jobId,
          args.appId,
          urlsObj,
          activeWorkspace || 'Business',
          userSupabase,
          req.headers.authorization
        ).catch(console.error);
        
        return res.json({ message: `I have dispatched the **Business Intelligence Engine** to deeply analyze \`${args.url}\`${args.instagramUrl ? ` and Instagram (\`${args.instagramUrl}\`)` : ''}. It is crawling the website, subpages, metadata, and brand assets in the background to build your custom strategy profile!` });
      }

      if (toolCall.function.name === "trigger_orchestration") {
        if (!args.appId) return res.json({ message: "Please select a workspace before I can trigger the orchestration team." });
        
        // Pass the user's raw message as the orchestration goal so it follows their exact instructions
        const orchestrationGoal = args.goal || message;
        runMarketingOrchestration("copilot-trigger", args.appId, orchestrationGoal, req.headers.authorization, 'en', 'custom', 'both', userId).catch(console.error);
        
        return res.json({ message: `I've triggered the **AI Orchestrator** for your goal: *"${orchestrationGoal}"*. The CMO, Content Writer, and Creative Director are spinning up right now to generate your campaign! Check the Calendar tab in about 60 seconds.` });
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
      
      if (toolCall.function.name === "find_and_track_competitors") {
        if (!args.appId) return res.json({ message: "Please select a workspace before I can find competitors for it." });
        
        // Fetch user's business profile
        const { data: businessData, error: bizError } = await userSupabase.from('businesses')
          .select('name, tagline, category, discovery_profile')
          .eq('business_id', args.appId)
          .single();
          
        if (bizError || !businessData) {
          return res.json({ message: "I couldn't load your business profile to find competitors." });
        }
        
        const bizContext = `Name: ${businessData.name}\nTagline: ${businessData.tagline || ''}\nCategory: ${businessData.category || ''}\nProfile: ${JSON.stringify(businessData.discovery_profile || {})}`;
        
        // Brainstorm competitors using OpenAI
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a competitive intelligence expert. Identify 3 real-world direct competitors for the provided business based on their niche. Use the user's specific request and the business context. Return strictly a JSON object matching this schema: { \"competitors\": [ { \"name\": \"...\", \"website_url\": \"https://...\" } ] }" },
            { role: "user", content: `User's Request: "${message}"\n\nBusiness Context:\n${bizContext}\n\nFind 3 competitors.` }
          ],
          response_format: { type: "json_object" }
        });
        
        try {
          const parsed = JSON.parse(completion.choices[0].message.content);
          const competitors = parsed.competitors || [];
          
          if (competitors.length === 0) {
            return res.json({ message: "I couldn't identify any clear competitors for your niche right now." });
          }
          
          let responseMessage = `I've analyzed your business profile and identified these competitors:\n`;
          
          // Insert each into DB and dispatch jobs
          for (const comp of competitors) {
            responseMessage += `- **${comp.name}** (${comp.website_url})\n`;
            
            const { data, error } = await userSupabase.from('competitors').insert({
              app_id: args.appId,
              name: comp.name,
              website_url: comp.website_url || null,
              current_pricing: {}
            }).select().single();
            
            if (!error && data) {
              // Dispatch background job for each
              processCompetitorJob(data.id, comp.website_url, args.appId, userSupabase).catch(console.error);
            }
          }
          
          responseMessage += `\nI have dispatched the background scraping bots to analyze all of their websites! I will notify your Inbox when their intelligence profiles are ready.`;
          return res.json({ message: responseMessage });
          
        } catch (err) {
          console.error("Failed to parse auto-competitors:", err);
          return res.json({ message: "I encountered an error while trying to brainstorm competitors." });
        }
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

      if (toolCall.function.name === "schedule_social_post") {
        if (!args.appId) return res.json({ message: "Please select a workspace before scheduling posts." });
        
        // Ensure date is valid or use default
        let publishAt = args.publish_at;
        if (!publishAt || isNaN(Date.parse(publishAt))) {
          // Default to tomorrow 10am if invalid
          const tmrw = new Date();
          tmrw.setDate(tmrw.getDate() + 1);
          tmrw.setHours(10, 0, 0, 0);
          publishAt = tmrw.toISOString();
        }

        const { error } = await userSupabase.from('scheduled_posts').insert({
          user_id: userId,
          app_id: args.appId,
          platform: args.platform.toLowerCase(),
          content: args.content,
          media_url: args.media_url || null,
          publish_at: publishAt,
          status: 'scheduled'
        });

        if (error) {
          console.error("Schedule post error:", error);
          return res.json({ message: "I encountered an error trying to save your post to the database." });
        }

        return res.json({ message: `I have successfully scheduled your **${args.platform}** post for ${new Date(publishAt).toLocaleString()}! You can view and manage it in the Calendar tab.` });
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
