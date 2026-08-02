// AI Business Discovery & Brand Intelligence Engine
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

// Sleep helper
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
 * Fetch real content from a URL using Node.js built-in fetch.
 * Extracts text from HTML by stripping tags, scripts, styles.
 */
async function scrapeWebContent(url) {
  if (!url || url === 'Not provided') return '';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GrowthSuiteBot/1.0; +https://socialgrowth.app)',
        'Accept': 'text/html,application/xhtml+xml',
      }
    });
    clearTimeout(timeout);
    
    if (!response.ok) return `[Could not fetch: HTTP ${response.status}]`;
    
    const html = await response.text();
    
    // Extract title and meta description before stripping tags
    let titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    let title = titleMatch ? titleMatch[1].trim() : '';

    let metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) || 
                        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i) ||
                        html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    let metaDesc = metaDescMatch ? metaDescMatch[1].trim() : '';

    let metaInfo = `[META TITLE]: ${title}\n[META DESCRIPTION]: ${metaDesc}\n\n`;

    // Strip scripts, styles, and HTML tags to get clean text
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#?\w+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    text = metaInfo + text;
    
    // Limit to ~4000 chars to stay within context limits
    if (text.length > 4000) {
      text = text.substring(0, 4000) + '... [truncated]';
    }
    
    return text;
  } catch (err) {
    console.warn(`[Discovery Engine] Failed to scrape ${url}: ${err.message}`);
    return `[Could not fetch: ${err.message}]`;
  }
}

/**
 * Process a business discovery job.
 * 1. Scrapes real content from the provided URLs
 * 2. Sends the actual website text to GPT for analysis
 * 3. Saves the brand intelligence profile to the business record
 */
async function processDiscoveryJob(jobId, appId, urls, appName, providedSupabase = null) {
  let supabase = providedSupabase;
  try {
    if (!supabase) {
      supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY);
    }
    
    await updateJobStatus(supabase, jobId, 'scanning', 10, 'Initializing web scrapers...');
    
    // Step 1: Scrape real website content
    await updateJobStatus(supabase, jobId, 'scanning', 20, `Fetching website content from: ${urls.website || 'N/A'}`);
    const websiteContent = await scrapeWebContent(urls.website);
    
    // Step 2: Scrape social media pages
    await updateJobStatus(supabase, jobId, 'scanning', 40, 'Fetching social media profiles...');
    const instagramContent = await scrapeWebContent(urls.instagram);
    const linkedinContent = await scrapeWebContent(urls.linkedin);
    const googleBusinessContent = await scrapeWebContent(urls.google_business);
    
    const scrapedDataSummary = `
=== REAL WEBSITE CONTENT (scraped from ${urls.website || 'N/A'}) ===
${websiteContent || 'No website content available'}

=== INSTAGRAM PAGE CONTENT (scraped from ${urls.instagram || 'N/A'}) ===
${instagramContent || 'No Instagram content available'}

=== LINKEDIN PAGE CONTENT (scraped from ${urls.linkedin || 'N/A'}) ===
${linkedinContent || 'No LinkedIn content available'}

=== GOOGLE BUSINESS PROFILE CONTENT (scraped from ${urls.google_business || 'N/A'}) ===
${googleBusinessContent || 'No Google Business Profile content available'}
    `.trim();
    
    const hasRealContent = websiteContent.length > 50 || instagramContent.length > 50 || linkedinContent.length > 50;
    
    await updateJobStatus(supabase, jobId, 'analyzing', 60, 
      hasRealContent 
        ? `Successfully scraped ${websiteContent.length + instagramContent.length + linkedinContent.length} characters of real content. Running AI analysis...`
        : 'Limited web content found. Running AI analysis with available data...');
    
    // Step 3: AI Analysis with real scraped content
    const systemPrompt = `
    You are an AI brand strategist and marketing expert.
    You have been given REAL SCRAPED CONTENT from the brand's website and social media pages.
    Analyze this REAL content carefully to understand:
    - What the business actually does (products/services)
    - Their target audience
    - Their brand voice and tone
    - Their visual identity cues
    - Their competitive positioning
    - For Google Business Profile, specifically look for star ratings, number of reviews, and local address in the META DESCRIPTION.
    
    Business/App Name: ${appName || 'Not provided'}
    Website URL: ${urls.website || 'Not provided'}
    Instagram URL: ${urls.instagram || 'Not provided'}
    LinkedIn URL: ${urls.linkedin || 'Not provided'}
    Google Business Profile URL: ${urls.google_business || 'Not provided'}
    
    REAL SCRAPED CONTENT:
    ${scrapedDataSummary}
    
    Based on this REAL content, generate an accurate brand intelligence profile.
    Return ONLY valid JSON with this structure:
    {
      "businessProfile": {
        "name": "Brand Name",
        "industry": "Industry",
        "summary": "2-3 sentence summary of what this business actually does, based on the scraped content",
        "valueProposition": "Their main value proposition as found in the content",
        "targetAudience": "Who their customers/users are based on the content",
        "products": ["Product/Service 1", "Product/Service 2"],
        "keyMessages": ["Key message 1 found on their site", "Key message 2"],
        "localPresence": {
          "rating": "Extract rating (e.g. 4.8) or null",
          "reviews": "Extract review count (e.g. 120) or null",
          "address": "Extract address if available or null"
        }
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
        "keywords": ["keyword1", "keyword2", "keyword3"],
        "samplePhrases": ["A phrase they use", "Another common phrase"]
      },
      "personas": [
        { "name": "Persona 1", "description": "Who they are", "painPoints": ["..."], "goals": ["..."] }
      ],
      "contentStrategy": {
        "recommendedTopics": ["Topic 1", "Topic 2", "Topic 3"],
        "contentPillars": ["Pillar 1", "Pillar 2", "Pillar 3"],
        "bestPlatforms": ["platform1", "platform2"],
        "postingFrequency": "e.g. 3-5 times per week"
      },
      "audits": {
        "websiteScore": 85,
        "socialScore": 72,
        "marketingReadinessScore": 78,
        "growthOpportunities": ["Opportunity 1", "Opportunity 2"]
      }
    }
    `;

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("OpenAI API Timeout")), 90000)
    );

    const response = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0.5,
        response_format: { type: "json_object" }
      }),
      timeoutPromise
    ]);

    const discoveryData = JSON.parse(response.choices[0].message.content);
    
    // Add a generated logo placeholder
    const appNameEncoded = encodeURIComponent(discoveryData?.businessProfile?.name || appName || 'App');
    const primaryColor = (discoveryData?.brandKit?.colors?.primary || '#8B5CF6').replace('#', '');
    discoveryData.brandKit = discoveryData.brandKit || { colors: { primary: '#8B5CF6' } };
    discoveryData.brandKit.logoUrl = `https://ui-avatars.com/api/?name=${appNameEncoded}&background=${primaryColor}&color=fff&size=512`;
    
    // Save URLs into the discovery profile
    discoveryData.urls = urls;

    await updateJobStatus(supabase, jobId, 'analyzing', 85, 'Saving brand intelligence profile to database...');

    // Save to the businesses table
    await supabase
      .from('businesses')
      .update({ discovery_profile: discoveryData })
      .eq('id', appId);

    // Complete Job
    await updateJobStatus(supabase, jobId, 'complete', 100, 'Brand Intelligence Profile generated from real website content.');
    
  } catch (err) {
    console.error(`[Discovery Engine] Job ${jobId} failed:`, err);
    await updateJobStatus(supabase, jobId, 'failed', 0, `Error: ${err.message}`);
  }
}

/**
 * Process a competitor discovery job.
 * Scrapes competitor website and generates an analysis profile.
 */
async function processCompetitorJob(competitorId, websiteUrl, appId, providedSupabase = null) {
  let supabase = providedSupabase;
  try {
    if (!supabase) {
      supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY);
    }
    
    if (!websiteUrl) {
      console.log(`[Competitor Engine] No URL provided for competitor ${competitorId}. Skipping scrape.`);
      return;
    }
    
    console.log(`[Competitor Engine] Scraping competitor URL: ${websiteUrl}`);
    const websiteContent = await scrapeWebContent(websiteUrl);
    
    if (!websiteContent || websiteContent.length < 50) {
      console.log(`[Competitor Engine] Failed to scrape meaningful content from ${websiteUrl}`);
      return;
    }

    const systemPrompt = `You are a world-class Competitor Intelligence Analyst.
Analyze the following scraped website content for a competitor.
Extract their market position, pricing model, key features, strengths, and weaknesses.
Return the result strictly as a JSON object matching this schema:
{
  "market_position": "Summary of how they position themselves (e.g. premium, budget, enterprise)",
  "pricing": {
    "model": "Subscription, Freemium, One-time, etc.",
    "starting_price": "$X/mo",
    "details": "..."
  },
  "analysis_profile": {
    "target_audience": "Who they are targeting",
    "key_features": ["feature 1", "feature 2"],
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["weakness 1", "weakness 2"]
  }
}`;

    console.log(`[Competitor Engine] Analyzing scraped data for ${competitorId}...`);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Website Content:\n${websiteContent.substring(0, 8000)}` }
      ],
      response_format: { type: "json_object" }
    });

    const analysisData = JSON.parse(completion.choices[0].message.content);
    
    // Save to database
    // We store the whole analysis inside current_pricing for now as a workaround for not altering schema dynamically
    await supabase
      .from('competitors')
      .update({ 
        market_position: analysisData.market_position,
        current_pricing: analysisData, // Store the entire JSON block here
        last_scanned_at: new Date().toISOString()
      })
      .eq('id', competitorId);
      
    console.log(`[Competitor Engine] Analysis saved for competitor ${competitorId}.`);
    
    // Send a message to the user's Inbox
    const threadId = `sys_competitor_${appId}`;
    
    // Upsert thread
    await supabase.from('inbox_threads').upsert({
      id: threadId,
      app_id: appId,
      sender: 'Competitor Intelligence Agent',
      platform: 'system',
      last_text: 'New competitor intelligence report available.',
      last_date: new Date().toISOString(),
      read: false
    });
    
    // Insert message
    const msgText = `I have finished analyzing your competitor at ${websiteUrl}.\n\n**Market Position:** ${analysisData.market_position}\n**Pricing:** ${analysisData.pricing.starting_price} (${analysisData.pricing.model})\n\n**Strengths:**\n- ${analysisData.analysis_profile.strengths.join('\n- ')}\n\n**Weaknesses (Opportunities for you):**\n- ${analysisData.analysis_profile.weaknesses.join('\n- ')}`;
    
    await supabase.from('inbox_messages').insert({
      thread_id: threadId,
      sender_role: 'bot',
      text: msgText
    });
    
    console.log(`[Competitor Engine] Inbox notification sent to user.`);
    
  } catch (err) {
    console.error(`[Competitor Engine] Competitor ${competitorId} failed:`, err);
  }
}

module.exports = {
  processDiscoveryJob,
  processCompetitorJob
};
