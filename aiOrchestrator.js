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
Input: A strategy from the CMO and business context.
CRITICAL: You MUST generate "image_prompts" — a list of detailed DALL-E image generation prompts. Generate one image prompt per content piece (match the number of posts the Content Writer will create, typically 4-6).
Each image prompt should be a rich visual description (50-150 words) describing colors, composition, style, mood, and elements specific to the business.
Do NOT use generic stock-photo descriptions. Reference the business's actual products/services.
Output JSON format: { "creative_brief": "...", "image_prompts": ["Detailed DALL-E prompt 1...", "Detailed DALL-E prompt 2...", "..."] }`,
  
  ContentWriter: `You are the Content Writer Agent.
Role: Generate specific social media copy variations based on strategy.
Input: A strategy from the CMO and business intelligence context.
IMPORTANT: Follow the CMO's strategy regarding which platforms to target. If the user's goal specifies a platform (e.g. "instagram", "tiktok", "linkedin"), generate posts ONLY for that platform.
If no specific platform is mentioned, generate for multiple platforms.
Platform formatting rules:
- twitter/x: Max 280 chars, punchy, hashtags, emojis
- linkedin: Professional tone, 500-1500 chars, thought leadership  
- instagram: Visual-first caption, emojis, 20-30 hashtags, lifestyle tone
- tiktok: Short, trendy, hook in first line
Generate 4-6 post variants for the target platform(s).
Output JSON format: { "copy_variants": [{ "platform": "instagram", "text": "..." }] }`,

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
 * @param {string} userId - The user ID to assign generated posts to
 */
async function runMarketingOrchestration(jobId, appId, goal, authHeader, language = 'en', businessType = 'saas', campaignType = 'both', userId = null) {
  const steps = [];
  
  const pushLog = async (agent, logText) => {
    console.log(`[${agent}] ${logText}`);
    steps.push({ agent, log: logText, timestamp: new Date().toISOString() });
  };
  
  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });

  try {
    // 0. Fetch Business Context (discovery_profile with real scraped data)
    let businessContext = "";
    let appName = "";
    try {
      console.log(`[Orchestrator] Looking up business with business_id="${appId}"...`);
      const { data: bizData, error: bizErr } = await supabase
        .from('businesses')
        .select('name, category, business_type, discovery_profile')
        .eq('business_id', appId)
        .single();
      
      if (bizErr) {
        console.error(`[Orchestrator] Business lookup FAILED:`, bizErr.message, bizErr.code);
        await pushLog("System", `Business lookup error: ${bizErr.message}. Using basic context.`);
      } else if (!bizData) {
        console.log(`[Orchestrator] No business found for business_id="${appId}"`);
        await pushLog("System", "No business found in database. Run Business Discovery first.");
      } else {
        console.log(`[Orchestrator] Found business: name="${bizData.name}", has_profile=${!!bizData.discovery_profile}`);
        appName = bizData.name || '';
      }

      if (bizData?.discovery_profile) {
        const dp = bizData.discovery_profile;
        const profile = dp.businessProfile || {};
        const voice = dp.brandVoice || {};
        const strategy = dp.contentStrategy || {};
        appName = profile.name || bizData.name || '';
        businessContext = `
=== BUSINESS INTELLIGENCE (from real website analysis) ===
Business Name: ${profile.name || bizData.name || 'Unknown'}
Industry: ${profile.industry || bizData.category || 'Unknown'}
What they do: ${profile.summary || 'Not available'}
Value Proposition: ${profile.valueProposition || 'Not available'}
Target Audience: ${profile.targetAudience || 'Not available'}
Products/Services: ${(profile.products || []).join(', ') || 'Not specified'}
Key Messages: ${(profile.keyMessages || []).join('; ') || 'Not available'}
Brand Voice: ${voice.tone || 'Professional'} / ${voice.personality || 'Not specified'}
Brand Keywords: ${(voice.keywords || []).join(', ') || 'Not specified'}
Sample Brand Phrases: ${(voice.samplePhrases || []).join('; ') || 'Not available'}
Recommended Topics: ${(strategy.recommendedTopics || []).join(', ') || 'Not specified'}
Content Pillars: ${(strategy.contentPillars || []).join(', ') || 'Not specified'}
Best Platforms: ${(strategy.bestPlatforms || []).join(', ') || 'Not specified'}
===
`;
        await pushLog("System", `Loaded brand intelligence profile for "${profile.name || bizData.name}". AI agents will use real business context.`);
      } else {
        businessContext = `Business Name: ${bizData?.name || appId}\nCategory: ${bizData?.category || businessType}\n`;
        await pushLog("System", "No discovery profile found. Run Business Discovery first for better results.");
      }
    } catch (e) {
      await pushLog("System", "Could not fetch business profile. Using basic context.");
    }

    // 1. RAG Memory Retrieval Phase
    await pushLog("System", `Searching Growth Memory Engine for past insights on: "${appId}"...`);
    const relevantMemories = await searchGrowthMemory(goal, appId, supabase, 5);
    let memoryContext = "";
    if (relevantMemories.length > 0) {
      memoryContext = "Historical Growth Memories & Lessons Learned:\n";
      relevantMemories.forEach((mem, idx) => {
        memoryContext += `${idx + 1}. ${mem.content_text}\n`;
      });
      await pushLog("System", `Found ${relevantMemories.length} relevant historical memories. Injecting into CMO context.`);
    } else {
      await pushLog("System", "No relevant historical memories found. Relying on baseline intelligence.");
    }

    // 2. CMO Strategy Phase
    await pushLog("CMO Agent", `Drafting strategy for goal: "${goal}"`);
    
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
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: AGENT_PROMPTS.CMO + "\n" + langDirective + "\n" + typeDirective },
        { role: "user", content: `${businessContext}\nBusiness Name: ${appName || 'Unknown'}\nBusiness Type: ${businessType}\nFounder's Goal: ${goal}\n\n${memoryContext}` }
      ],
      response_format: { type: "json_object" }
    });

    const cmoData = JSON.parse(cmoResponse.choices[0].message.content);
    await pushLog("CMO Agent", "Strategy finalized. Delegating tasks to Marketing Team.");
    
    // 2. Parallel Agent Execution Phase
    // For cost/speed in this V1 pipeline, we execute a subset of the agents based on the CMO's delegated tasks.
    const agentPromises = cmoData.delegated_tasks.map(async (delegation) => {
      const agentKey = delegation.agent.replace(/\s/g, ''); // e.g. "GrowthAnalyst"
      if (!AGENT_PROMPTS[agentKey]) return null;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Lower cost model for execution agents
        messages: [
          { role: "system", content: AGENT_PROMPTS[agentKey] + "\n" + langDirective + "\n" + businessContext },
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
    for (const res of agentResults) {
      await pushLog(res.agent, res.log);
    }

    // 3. Campaign Manager Phase
    await pushLog("Campaign Manager", "Aggregating agent outputs into Draft Campaign Portfolio.");
    
    // Check if Advertising Strategy was generated
    const adStrategy = agentResults.find(r => r.agent === 'AdStrategist' || r.agent === 'Ad Strategist');
    let campaignId = null;
    if (adStrategy) {
      await pushLog("Media Buyer", "Simulating ad campaign performance and CPA predictions.");
      try {
        const campaign = await createPendingCampaign(appId, adStrategy.result, authHeader);
        campaignId = campaign.id;
        
        // Predict outcomes based on strategy budget
        const budget = adStrategy.result.budget_allocation ? Object.values(adStrategy.result.budget_allocation)[0] || 500 : 500;
        const predictions = predictCampaignOutcomes(budget, 'installs', 'meta');
        
        await pushLog("Media Buyer", `Campaign "${campaign.name}" created. Pending Approval. Expected CPA: $${predictions.expected_case.cpa}, Expected Reach: ${predictions.expected_case.reach}`);
      } catch (err) {
        console.error("Failed to create pending campaign", err);
      }
    }

    // Process Organic Content
    const contentWriter = agentResults.find(r => r.agent === 'ContentWriter' || r.agent === 'Content Writer');
    console.log(`[Orchestrator] ContentWriter found: ${!!contentWriter}, has copy_variants: ${!!(contentWriter?.result?.copy_variants)}, count: ${contentWriter?.result?.copy_variants?.length || 0}`);
    
    if (contentWriter && contentWriter.result && contentWriter.result.copy_variants) {
      await pushLog("Publishing Agent", "Pushing organic draft posts to your Content Calendar.");
      try {
        const uid = userId;
        if (!uid) {
          console.log('[Orchestrator] WARNING: No userId, skipping calendar push');
          await pushLog('Publishing Agent', 'Warning: No user ID available. Skipping calendar push.');
          return;
        }
        
        // Find creative director output to generate images
        const creativeDirector = agentResults.find(r => r.agent === 'CreativeDirector' || r.agent === 'Creative Director');
        let generatedImages = [];
        
        // Get image prompts from CreativeDirector, or generate them from post content
        let imagePrompts = creativeDirector?.result?.image_prompts || [];
        console.log(`[Orchestrator] CreativeDirector found: ${!!creativeDirector}, image_prompts count: ${imagePrompts.length}`);
        
        if (imagePrompts.length === 0) {
          // Fallback: generate image prompts from the actual post content
          await pushLog("Creative Director", "No image prompts from agent. Auto-generating visual concepts from post content...");
          imagePrompts = contentWriter.result.copy_variants.map(v => 
            `A modern, professional social media graphic related to: ${(v.text || '').substring(0, 300)}. Clean design, vibrant colors, no text overlay.`
          );
        }
        
        if (imagePrompts.length > 0) {
          const totalImages = Math.min(imagePrompts.length, contentWriter.result.copy_variants.length);
          await pushLog("Creative Director", `Generating ${totalImages} images via FLUX AI...`);
          
          for (let i = 0; i < totalImages; i++) {
            const promptText = imagePrompts[i];
            const postText = contentWriter.result.copy_variants[i]?.text || '';
            const enhancedPrompt = `A photographic, professional social media visual for "${appName || businessType}" business. Theme: "${postText.substring(0, 150)}". Visual direction: ${promptText.substring(0, 400)}. Style: Clean modern photography or illustration, vibrant colors, high quality. CRITICAL RULE: Do NOT include ANY text, letters, words, numbers, logos, watermarks, typography, or written characters anywhere in the image. The image must be purely visual with ZERO text elements.`;
            
            let imageUrl = null;
            
            // Primary: Replicate FLUX (confirmed working)
            console.log(`[Orchestrator] REPLICATE_API_TOKEN present: ${!!config.REPLICATE_API_TOKEN}`);
            if (config.REPLICATE_API_TOKEN) {
              try {
                console.log(`[Orchestrator] Replicate FLUX generating image ${i+1}/${totalImages}...`);
                const replicateRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${config.REPLICATE_API_TOKEN}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    input: {
                      prompt: enhancedPrompt.substring(0, 1000),
                      num_outputs: 1,
                      aspect_ratio: "1:1",
                      output_format: "webp",
                      output_quality: 90
                    }
                  })
                });
                const prediction = await replicateRes.json();
                
                // Handle sync response
                if (prediction.output) {
                  imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
                  console.log(`[Orchestrator] FLUX success (sync) for image ${i+1}`);
                }
                // Handle async response - poll for result
                else if (prediction.urls?.get) {
                  for (let attempt = 0; attempt < 15; attempt++) {
                    await new Promise(r => setTimeout(r, 2000));
                    const pollRes = await fetch(prediction.urls.get, {
                      headers: { 'Authorization': `Bearer ${config.REPLICATE_API_TOKEN}` }
                    });
                    const pollData = await pollRes.json();
                    if (pollData.status === 'succeeded' && pollData.output) {
                      imageUrl = Array.isArray(pollData.output) ? pollData.output[0] : pollData.output;
                      console.log(`[Orchestrator] FLUX success (async) for image ${i+1}`);
                      break;
                    } else if (pollData.status === 'failed') {
                      console.error(`[Orchestrator] FLUX failed:`, pollData.error);
                      break;
                    }
                  }
                } else if (prediction.error) {
                  console.error(`[Orchestrator] FLUX error:`, prediction.error);
                }
              } catch (repErr) {
                console.error(`[Orchestrator] Replicate FLUX failed for image ${i+1}:`, repErr.message);
              }
            }
            
            // Fallback: DALL-E (if Replicate failed and DALL-E is available)
            if (!imageUrl) {
              try {
                console.log(`[Orchestrator] Trying OpenAI gpt-image-2 fallback for image ${i+1}...`);
                const response = await openai.images.generate({
                  model: "gpt-image-2",
                  prompt: enhancedPrompt,
                  n: 1,
                  size: "1024x1024",
                });
                // gpt-image-2 returns base64 by default
                if (response.data[0].url) {
                  imageUrl = response.data[0].url;
                } else if (response.data[0].b64_json) {
                  // Upload to Supabase Storage to get a persistent URL
                  try {
                    const imgBuffer = Buffer.from(response.data[0].b64_json, 'base64');
                    const fileName = `generated/${Date.now()}_${i}.png`;
                    const { data: uploadData, error: uploadErr } = await supabase.storage
                      .from('media')
                      .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: true });
                    
                    if (!uploadErr && uploadData) {
                      const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);
                      imageUrl = urlData?.publicUrl || null;
                      console.log(`[Orchestrator] Uploaded to Supabase storage: ${imageUrl}`);
                    } else {
                      console.error('[Orchestrator] Storage upload failed:', uploadErr?.message);
                    }
                  } catch (uploadEx) {
                    console.error('[Orchestrator] Storage upload exception:', uploadEx.message);
                  }
                }
                console.log(`[Orchestrator] gpt-image-2 success for image ${i+1}`);
              } catch (oaiErr) {
                console.error(`[Orchestrator] gpt-image-2 also failed for image ${i+1}:`, oaiErr.message);
              }
            }
            
            generatedImages.push(imageUrl);
            if (imageUrl) {
              await pushLog("Creative Director", `Image ${i+1}/${totalImages} generated ✓`);
            } else {
              await pushLog("Creative Director", `Image ${i+1}/${totalImages} could not be generated.`);
            }
            
            // Delay between requests
            if (i < totalImages - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        // Save all generated images to Media Asset Manager
        if (generatedImages.some(url => url)) {
          await pushLog("Creative Director", "Saving generated images to Media Assets Manager...");
          for (let i = 0; i < generatedImages.length; i++) {
            if (!generatedImages[i]) continue;
            try {
              const platform = contentWriter.result.copy_variants[i]?.platform || 'social';
              const postSnippet = (contentWriter.result.copy_variants[i]?.text || '').substring(0, 80);
              await supabase.from('media').insert({
                app_id: appId,
                name: `${appName || 'Campaign'} - ${platform} - Post ${i + 1}`,
                file_type: 'image/webp',
                folder: 'AI Generated',
                tag: 'ai-generated',
                description: `Auto-generated by AI orchestration for ${platform}. Post: "${postSnippet}..."`,
                storage_path: generatedImages[i]
              });
            } catch (mediaErr) {
              console.error(`[Orchestrator] Failed to save image ${i+1} to media:`, mediaErr.message);
            }
          }
          await pushLog("Creative Director", `${generatedImages.filter(u => u).length} images saved to Media Assets ✓`);
        }

        const postsToInsert = contentWriter.result.copy_variants.map((v, i) => {
          const date = new Date();
          date.setDate(date.getDate() + i + 1); // schedule 1 per day starting tomorrow
          const dateString = date.toISOString().split('T')[0];
          
          return {
            user_id: uid,
            app_id: appId,
            platform: v.platform || 'linkedin',
            scheduled_date: dateString,
            scheduled_time: '12:00',
            content: v.text,
            media_url: generatedImages[i] || null,
            status: 'draft' // Draft status, awaiting CEO approval
          };
        });

        await supabase.from('scheduled_posts').insert(postsToInsert);
        await pushLog("Publishing Agent", `${postsToInsert.length} organic posts successfully queued in Draft mode.`);
      } catch (err) {
        console.error("Failed to queue organic posts", err);
      }
    }

    // 4. Create Agent Operations (for Dashboard feed)
    try {
      const operationsToInsert = agentResults.map(res => {
        let recommendation = 'Please review agent output.';
        
        // Extract a meaningful recommendation string from the JSON output if possible
        if (res.result) {
          if (res.result.strategy_summary) recommendation = res.result.strategy_summary.substring(0, 200);
          else if (res.result.content_roadmap) recommendation = res.result.content_roadmap.substring(0, 200);
          else if (res.result.creative_brief) recommendation = res.result.creative_brief.substring(0, 200);
          else if (res.result.aso_recommendations) recommendation = res.result.aso_recommendations.substring(0, 200);
          else if (res.result.video_concept) recommendation = res.result.video_concept.substring(0, 200);
          else if (res.result.simulation_report) recommendation = `Expected CPA: $${res.result.simulation_report.expected_cpa || 'N/A'}`;
          else if (res.result.roi_analysis) recommendation = res.result.roi_analysis.substring(0, 200);
          else if (res.result.campaign_blueprint) recommendation = res.result.campaign_blueprint.substring(0, 200);
          else if (res.result.copy_variants) recommendation = `Drafted ${res.result.copy_variants.length} content variants.`;
        }

        return {
          user_id: userId || null,
          app_id: appId,
          agent_name: res.agent,
          task_goal: goal,
          requires_approval: true,
          approved: false,
          status: 'pending',
          recommendation: recommendation
        };
      });

      if (operationsToInsert.length > 0) {
        await supabase.from('agent_operations').insert(operationsToInsert);
        await pushLog("System", `Created ${operationsToInsert.length} pending agent operations for CEO approval.`);
      }
    } catch (opErr) {
      console.error("Failed to create agent operations", opErr);
    }

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
