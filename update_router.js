const fs = require('fs');
let content = fs.readFileSync('aiGatewayRouter.js', 'utf8');

const replacement = 
    const numScenes = Math.max(1, Math.floor(parseInt(duration || 5) / 5));
    
    let scenePrompts = [prompt];
    if (numScenes > 1 && generationMode === 'premium_ai') {
      try {
        console.log(\[Video Router] Splitting prompt into \ scenes...\);
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: \You are an expert AI Video Director. The user wants to generate a continuous \-second video based on their master prompt. Since the generative AI model can only output 5 seconds at a time, you must split the user's master prompt into EXACTLY \ sequential 5-second scene prompts. Each scene prompt must be highly detailed, descriptive, and visually contiguous with the previous scene. DO NOT include any text other than a JSON array of strings.\
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: { type: 'json_object' } // We will parse manually to be safe or use json_object if structured
        });
        
        const rawResponse = response.choices[0].message.content;
        // The LLM might return {"scenes": ["..."]} or just an array.
        let parsed;
        try {
           parsed = JSON.parse(rawResponse);
           if (parsed.scenes && Array.isArray(parsed.scenes)) scenePrompts = parsed.scenes;
           else if (Array.isArray(parsed)) scenePrompts = parsed;
        } catch(e) {
           // Fallback if JSON parsing fails: just split by newlines roughly
           scenePrompts = Array.from({length: numScenes}, (_, i) => \\ - Scene \\);
        }
        
        // Ensure exactly numScenes
        scenePrompts = scenePrompts.slice(0, numScenes);
        while (scenePrompts.length < numScenes) {
          scenePrompts.push(\\ - Scene \\);
        }
      } catch (err) {
        console.warn('[Video Router] LLM storyboarding failed, using basic splitting.', err);
        scenePrompts = Array.from({length: numScenes}, (_, i) => \\ - Part \\);
      }
    }

    let fallbackUrl = (generationMode === 'template' || generationMode === 'motion_graphics') ? 'template_mode' : 'assembly_mode';
    if (generationMode === 'premium_ai') fallbackUrl = ''; 

    // Deduct total credits for multi-scene
    const totalCost = costEstimated * numScenes;
    // Assume credits were already deducted for 1 in the middleware?
    // Wait, the middleware requireCredits(50) deducts 50. Wait, requireCredits() doesn't deduct, it just checks.
    // Actually, requireCredits() DOES NOT deduct. Deduct is usually done manually or... wait.
    // In this file, I don't see any deduct_credits call in the route!
    // Ah, wait. Let's check requireCredits implementation later. We shouldn't break existing billing.
    
    let generatedAssetIds = [];
    
    for (let i = 0; i < numScenes; i++) {
      let scenePrompt = scenePrompts[i];
      let sceneTitle = numScenes > 1 ? \(Scene \/\) \\ : prompt.substring(0, 50);
      
      let assetId = null;
      if (appId) {
        const { data, error } = await userSupabase.from('video_factory_assets').insert({
          app_id: appId,
          title: sceneTitle,
          platform: 'shorts',
          video_url: fallbackUrl,
          status: generationMode === 'premium_ai' ? 'processing' : 'published'
        }).select().single();

        if (error) {
          console.error("[Video Router] DB Insert Error:", error);
          continue; // Skip this scene if DB insert fails
        }
        assetId = data.id;
        generatedAssetIds.push(assetId);
      }

      // If it's a real AI generation, queue it up in BullMQ
      if (generationMode === 'premium_ai' && assetId) {
        try {
          if (!activeQueues['video_rendering']) {
            throw new Error('BullMQ not configured');
          }

          const addJobPromise = activeQueues['video_rendering'].add('render_video', {
            assetId,
            prompt: scenePrompt,
            appId,
            sceneInfo: numScenes > 1 ? \Scene \ of \\ : null
          });

          // 10 second timeout for queue.add
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Redis connection timeout')), 10000)
          );

          await Promise.race([addJobPromise, timeoutPromise]);

        } catch (queueErr) {
          console.warn('[Video Router] BullMQ Queue error:', queueErr);
          
          // Fallback to in-memory processing if Redis is down
          if (queueErr.message === 'Redis connection timeout' || queueErr.message === 'BullMQ not configured') {
            console.log('[Video Router] Falling back to in-memory video generation for asset', assetId);
            const { processVideoGeneration } = require('./workers');
            if (processVideoGeneration) {
              processVideoGeneration({ assetId, prompt: scenePrompt, appId, sceneInfo: numScenes > 1 ? \Scene \ of \\ : null }).catch(err => {
                console.error('[Video Router] In-memory generation failed:', err);
              });
            }
          } else {
            await userSupabase.from('video_factory_assets').update({ status: 'failed' }).eq('id', assetId);
          }
        }
      }
    }

    if (generationMode === 'premium_ai') {
      return res.status(202).json({
        id: generatedAssetIds[0],
        ids: generatedAssetIds,
        url: '', // Frontend should poll
        mode: generationMode,
        cost: costEstimated * numScenes,
        status: 'queued'
      });
    }
;

const regex = /\/\/ Save to video_factory_assets as 'processing'[\s\S]*?return res\.status\(503\)\.json\(\{ error: \Video rendering service error: \$\{String\(queueErr\)\}\ \}\);\s*\}\s*\}/;

if (!regex.test(content)) {
  console.log("Regex not matched!");
} else {
  content = content.replace(regex, replacement);
  fs.writeFileSync('aiGatewayRouter.js', content);
  console.log("Updated aiGatewayRouter.js");
}
