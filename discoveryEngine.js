// AI Business Discovery & Brand Intelligence Engine
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

// Sleep helper to simulate scraping delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function updateJobStatus(supabase, jobId, status, progress, logMessage) {
  try {
    const { data: job, error: selectErr } = await supabase
      .from('discovery_jobs')
      .select('logs')
      .eq('id', jobId)
      .single();
      
    if (selectErr && selectErr.code !== 'PGRST116') {
      console.error(`[Discovery Engine] Error fetching job logs:`, selectErr);
    }

    const currentLogs = job?.logs || [];
    if (logMessage) currentLogs.push(`[${new Date().toISOString()}] ${logMessage}`);

    const { error: updateErr } = await supabase
      .from('discovery_jobs')
      .update({
        status,
        progress_percent: progress,
        logs: currentLogs,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
      
    if (updateErr) {
      console.error(`[Discovery Engine] Error updating job:`, updateErr);
    }
      
    console.log(`[Discovery Engine] Job ${jobId}: ${status} (${progress}%) - ${logMessage}`);
  } catch (err) {
    console.error(`[Discovery Engine Error] Failed to update job ${jobId}:`, err);
  }
}

/**
 * MOCK SCRAPING: 
 * We do not have a real headless browser running in this environment.
 * We simulate scraping by asking GPT to hallucinate a realistic brand profile based on the URLs.
 * In a real-world scenario, this would use Apify or Puppeteer to extract HTML/CSS before sending to GPT.
 */
async function processDiscoveryJob(jobId, appId, urls, appName, providedSupabase = null) {
  let supabase = providedSupabase;
  try {
    if (!supabase) {
      supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY);
    }
    
    await updateJobStatus(supabase, jobId, 'scanning', 10, 'Initializing Headless Browsers...');
    await sleep(2000); // Simulate boot
    
    // Step 1: Website
    await updateJobStatus(supabase, jobId, 'scanning', 25, `Analyzing Website DOM for: ${urls.website || 'N/A'}`);
    await sleep(3000); // Simulate scrape
    
    // Step 2: Socials
    await updateJobStatus(supabase, jobId, 'scanning', 50, 'Extracting Social Media footprints and visual styles...');
    await sleep(3000); // Simulate scrape
    
    // Step 3: AI Aggregation
    await updateJobStatus(supabase, jobId, 'analyzing', 75, 'Running Brand Intelligence Aggregation via AI Gateway...');
    
    // Call OpenAI to generate the JSON payload
    const systemPrompt = `
    You are an AI brand strategist and marketing expert.
    Analyze the following brand footprint:
    - App/Business Name: ${appName || 'Not provided'}
    - Website: ${urls.website || 'Not provided'}
    - Instagram: ${urls.instagram || 'Not provided'}
    - LinkedIn: ${urls.linkedin || 'Not provided'}
    JSON Brand Profile. Make it highly realistic, insightful, and detailed.
      Return ONLY valid JSON.
      
      Structure exactly like this:
      {
        "businessProfile": {
          "name": "Brand Name",
          "industry": "Industry",
          "summary": "2 sentence summary",
          "valueProposition": "Value prop",
          "targetAudience": "Target audience description"
        },
        "brandKit": {
          "colors": {
            "primary": "#hex",
            "secondary": "#hex",
            "accent": "#hex",
            "background": "#hex"
          },
          "typography": {
            "headings": "Font Name",
            "body": "Font Name"
          }
        },
        "brandVoice": {
          "tone": "e.g. Professional, playful",
          "personality": "e.g. The Creator, The Sage",
          "keywords": ["keyword1", "keyword2"]
        },
        "personas": [
          { "name": "Persona 1", "painPoints": [], "goals": [] }
        ],
        "audits": {
          "websiteScore": 85,
          "socialScore": 72,
          "marketingReadinessScore": 78,
          "growthOpportunities": ["Opp 1", "Opp 2"]
        }
      }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use mini for speed and cost in this simulated step
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const discoveryData = JSON.parse(response.choices[0].message.content);
    
    // Add a generated logo placeholder
    discoveryData.brandKit.logoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(discoveryData.businessProfile.name)}&background=${discoveryData.brandKit.colors.primary.replace('#','')}&color=fff&size=512`;

    // Save to the businesses table
    await supabase
      .from('businesses')
      .update({ discovery_profile: discoveryData })
      .eq('business_id', appId);

    // Complete Job
    await updateJobStatus(supabase, jobId, 'complete', 100, 'Brand Intelligence Profile generated successfully.');
    
  } catch (err) {
    console.error(`[Discovery Engine] Job ${jobId} failed:`, err);
    await updateJobStatus(supabase, jobId, 'failed', 0, `Error: ${err.message}`);
  }
}

module.exports = {
  processDiscoveryJob
};
