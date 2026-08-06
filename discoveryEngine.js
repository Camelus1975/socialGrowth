/**
 * Extract Social Links & Subpages from raw HTML
 */
function extractLinksAndSocials(html, baseUrl) {
  const socialLinks = { instagram: null, linkedin: null, facebook: null, twitter: null, tiktok: null };
  const subpages = new Set();
  
  if (!html) return { socialLinks, subpages: [] };

  const hrefMatches = html.match(/href=["'](https?:\/\/[^"']+)["']/gi) || [];
  for (const match of hrefMatches) {
    const link = match.replace(/href=["']/i, '').replace(/["']$/, '');
    if (!socialLinks.instagram && link.includes('instagram.com/')) socialLinks.instagram = link;
    if (!socialLinks.linkedin && link.includes('linkedin.com/')) socialLinks.linkedin = link;
    if (!socialLinks.facebook && link.includes('facebook.com/')) socialLinks.facebook = link;
    if (!socialLinks.twitter && (link.includes('twitter.com/') || link.includes('x.com/'))) socialLinks.twitter = link;
    if (!socialLinks.tiktok && link.includes('tiktok.com/')) socialLinks.tiktok = link;

    if (baseUrl) {
      try {
        const parsedBase = new URL(baseUrl);
        const parsedLink = new URL(link, baseUrl);
        if (parsedLink.hostname === parsedBase.hostname) {
          const path = parsedLink.pathname.toLowerCase();
          if (path.match(/\/(about|services|products|pricing|features|about-us|contact|our-story)/i) && path !== parsedBase.pathname.toLowerCase()) {
            subpages.add(parsedLink.href);
          }
        }
      } catch (e) {}
    }
  }

  return { socialLinks, subpages: Array.from(subpages).slice(0, 3) };
}

/**
 * Fetch real content from a URL using Node.js built-in fetch.
 * Extracts metadata, og tags, json-ld schema, and main page body text.
 */
async function scrapeWebContent(url, isMainPage = true) {
  if (!url || url === 'Not provided' || url === 'N/A') return { text: '', socialLinks: {}, subpages: [] };
  try {
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    clearTimeout(timeout);
    
    if (!response.ok) return { text: `[Could not fetch ${targetUrl}: HTTP ${response.status}]`, socialLinks: {}, subpages: [] };
    
    const html = await response.text();
    
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) || 
                        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i) ||
                        html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : '';

    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    const ogTitle = ogTitleMatch ? ogTitleMatch[1].trim() : '';

    let jsonLdSummary = '';
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const jMatch of jsonLdMatches.slice(0, 2)) {
      const jsonText = jMatch.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
      if (jsonText.length > 20 && jsonText.length < 1500) {
        jsonLdSummary += `[SCHEMA JSON-LD]: ${jsonText.substring(0, 800)}\n`;
      }
    }

    const { socialLinks, subpages } = isMainPage ? extractLinksAndSocials(html, targetUrl) : { socialLinks: {}, subpages: [] };

    let metaInfo = `[URL]: ${targetUrl}\n[TITLE]: ${ogTitle || title}\n[META DESCRIPTION]: ${metaDesc}\n${jsonLdSummary}\n`;

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
    
    if (text.length > 5000) {
      text = text.substring(0, 5000) + '... [truncated]';
    }
    
    return { text, socialLinks, subpages };
  } catch (err) {
    console.warn(`[Discovery Engine] Failed to scrape ${url}: ${err.message}`);
    return { text: `[Could not fetch ${url}: ${err.message}]`, socialLinks: {}, subpages: [] };
  }
}

/**
 * Process a business discovery job.
 * 1. Scrapes homepage + subpages + social media profiles
 * 2. Sends comprehensive scraped text to GPT-4o-mini for deep brand strategy analysis
 * 3. Saves the rich brand intelligence profile to the database (matching id AND business_id)
 */
async function processDiscoveryJob(jobId, appId, urls = {}, appName = '', providedSupabase = null) {
  let supabase = providedSupabase;
  try {
    if (!supabase) {
      supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY);
    }
    
    const inputUrls = typeof urls === 'string' ? { website: urls } : (urls || {});
    await updateJobStatus(supabase, jobId, 'scanning', 10, 'Initializing deep multi-source web scrapers...');
    
    // Step 1: Scrape main website content
    await updateJobStatus(supabase, jobId, 'scanning', 20, `Fetching website content from: ${inputUrls.website || 'N/A'}`);
    const mainPageResult = await scrapeWebContent(inputUrls.website, true);
    
    // Step 2: Scrape subpages found on the site
    let subpagesText = '';
    if (mainPageResult.subpages && mainPageResult.subpages.length > 0) {
      await updateJobStatus(supabase, jobId, 'scanning', 35, `Crawling ${mainPageResult.subpages.length} subpages (/about, /services, /products)...`);
      const subpageResults = await Promise.all(
        mainPageResult.subpages.map(subUrl => scrapeWebContent(subUrl, false))
      );
      subpagesText = subpageResults.map(r => r.text).filter(Boolean).join('\n\n--- SUBPAGE ---\n\n');
    }

    // Step 3: Auto-detect social links if not explicitly provided
    const instagramUrl = inputUrls.instagram || mainPageResult.socialLinks?.instagram;
    const linkedinUrl = inputUrls.linkedin || mainPageResult.socialLinks?.linkedin;
    const facebookUrl = inputUrls.facebook || mainPageResult.socialLinks?.facebook;

    // Step 4: Scrape social media pages if available
    await updateJobStatus(supabase, jobId, 'scanning', 50, 'Fetching social media profiles & metadata...');
    const instagramRes = await scrapeWebContent(instagramUrl, false);
    const linkedinRes = await scrapeWebContent(linkedinUrl, false);
    const googleBusinessRes = await scrapeWebContent(inputUrls.google_business, false);
    
    const scrapedDataSummary = `
=== MAIN WEBSITE HOMEPAGE (${inputUrls.website || 'N/A'}) ===
${mainPageResult.text || 'No website content available'}

=== KEY SUBPAGES (/about, /services, /products) ===
${subpagesText || 'No subpages crawled'}

=== INSTAGRAM PROFILE (${instagramUrl || 'N/A'}) ===
${instagramRes.text || 'No Instagram profile content available'}

=== LINKEDIN PROFILE (${linkedinUrl || 'N/A'}) ===
${linkedinRes.text || 'No LinkedIn profile content available'}

=== GOOGLE BUSINESS PROFILE (${inputUrls.google_business || 'N/A'}) ===
${googleBusinessRes.text || 'No Google Business Profile content available'}
    `.trim();
    
    const totalChars = (mainPageResult.text || '').length + subpagesText.length + (instagramRes.text || '').length;
    const hasRealContent = totalChars > 50;
    
    await updateJobStatus(supabase, jobId, 'analyzing', 65, 
      hasRealContent 
        ? `Successfully scraped ${totalChars} characters of deep content across website & social channels. Running AI analysis...`
        : 'Limited web content found. Running AI brand analysis with available signals...');
    
    // Step 5: Deep AI Analysis
    const systemPrompt = `
    You are a Lead Brand Strategist & CMO.
    Analyze the following REAL SCRAPED CONTENT from a business website and its social channels.
    Extract an extremely accurate, detailed Brand Intelligence Profile that can be used by AI copywriters and visual creators to generate highly targeted social media posts and videos.

    Analyze:
    1. Exact Business Profile: What does this business actually sell/offer? What is their unique value proposition?
    2. Target Audience & Customer Pain Points: Who buys from them and why?
    3. Brand Voice & Tone: Tone of voice, slogans, key phrases, keywords, personality.
    4. Content Pillars & Key Messages: Core themes to promote this specific business.

    Business Name: ${appName || 'Not provided'}
    Website URL: ${inputUrls.website || 'Not provided'}
    Instagram URL: ${instagramUrl || 'Not provided'}

    REAL SCRAPED CONTENT:
    ${scrapedDataSummary}

    Return ONLY valid JSON matching this exact structure:
    {
      "businessProfile": {
        "name": "Exact Brand Name",
        "industry": "Specific Industry/Niche (e.g., Artisan Coffee Roaster, B2B SaaS, Fitness Studio)",
        "summary": "Detailed 2-3 sentence summary of what this business actually offers and why customers choose them",
        "valueProposition": "Main value proposition found in content",
        "targetAudience": "Specific customer persona & demographic",
        "products": ["Product/Service 1", "Product/Service 2", "Product/Service 3"],
        "keyMessages": ["Key brand message 1", "Key brand message 2"],
        "localPresence": {
          "rating": "Extract rating or null",
          "reviews": "Extract review count or null",
          "address": "Extract address if available or null"
        }
      },
      "brandKit": {
        "colors": {
          "primary": "#6366F1",
          "secondary": "#4F46E5",
          "accent": "#EC4899",
          "background": "#0F172A"
        },
        "typography": {
          "headings": "Inter",
          "body": "Inter"
        }
      },
      "brandVoice": {
        "tone": "Specific tone (e.g. Energetic & Educational, Authoritative & Professional)",
        "personality": "Brand personality archetype",
        "keywords": ["keyword1", "keyword2", "keyword3"],
        "samplePhrases": ["Exact phrase or slogan from site", "Another brand phrase"]
      },
      "personas": [
        { "name": "Primary Customer", "description": "Description", "painPoints": ["Pain point 1"], "goals": ["Goal 1"] }
      ],
      "contentStrategy": {
        "recommendedTopics": ["Topic 1", "Topic 2", "Topic 3"],
        "contentPillars": ["Product Showcases", "Customer Success Stories", "Industry Insights"],
        "bestPlatforms": ["instagram", "linkedin", "tiktok"],
        "postingFrequency": "4-5 times per week"
      },
      "audits": {
        "websiteScore": 88,
        "socialScore": 75,
        "marketingReadinessScore": 82,
        "growthOpportunities": ["Highlight customer reviews on social", "Launch video product walkthroughs"]
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
        temperature: 0.4,
        response_format: { type: "json_object" }
      }),
      timeoutPromise
    ]);

    const discoveryData = JSON.parse(response.choices[0].message.content);
    
    // Add generated logo placeholder
    const finalBrandName = discoveryData?.businessProfile?.name || appName || 'App';
    const appNameEncoded = encodeURIComponent(finalBrandName);
    const primaryColor = (discoveryData?.brandKit?.colors?.primary || '#8B5CF6').replace('#', '');
    discoveryData.brandKit = discoveryData.brandKit || { colors: { primary: '#8B5CF6' } };
    discoveryData.brandKit.logoUrl = `https://ui-avatars.com/api/?name=${appNameEncoded}&background=${primaryColor}&color=fff&size=512`;
    
    discoveryData.urls = { ...inputUrls, instagram: instagramUrl, linkedin: linkedinUrl, facebook: facebookUrl };

    await updateJobStatus(supabase, jobId, 'analyzing', 85, 'Saving deep brand intelligence profile to database...');

    // Save to the businesses table by BOTH id AND business_id to guarantee match
    const updatePayload = { 
      discovery_profile: discoveryData,
      name: finalBrandName,
      category: discoveryData?.businessProfile?.industry || undefined,
      business_type: discoveryData?.businessProfile?.industry ? 'custom' : undefined,
      tagline: discoveryData?.businessProfile?.valueProposition || undefined
    };

    if (appId) {
      await supabase.from('businesses').update(updatePayload).eq('business_id', appId);
      await supabase.from('businesses').update(updatePayload).eq('id', appId);
    }

    // Complete Job
    await updateJobStatus(supabase, jobId, 'complete', 100, 'Deep Brand Intelligence Profile successfully generated & active.');
    
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
    let websiteContent = await scrapeWebContent(websiteUrl);
    
    if (!websiteContent || websiteContent.length < 50) {
      console.log(`[Competitor Engine] Failed to scrape meaningful content from ${websiteUrl}. Proceeding with fallback.`);
      websiteContent = `[Website scraping failed. Please generate a generic logical competitor profile based on the URL or name alone]`;
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
        { role: "user", content: `Competitor URL: ${websiteUrl}\n\nWebsite Content:\n${websiteContent.substring(0, 8000)}` }
      ],
      response_format: { type: "json_object" }
    });

    const analysisData = JSON.parse(completion.choices[0].message.content);
    
    // Save to database
    // We store the whole analysis inside current_pricing for now as a workaround for not altering schema dynamically
    const { error: updateErr } = await supabase
      .from('competitors')
      .update({ 
        market_position: analysisData.market_position,
        current_pricing: analysisData,
        last_scanned_at: new Date().toISOString()
      })
      .eq('id', competitorId);
    if (updateErr) console.error("[Competitor Engine] Update competitor error:", updateErr);
      
    console.log(`[Competitor Engine] Analysis saved for competitor ${competitorId}.`);
    
    // Send a message to the user's Inbox
    const threadId = `sys_competitor_${appId}`;
    
    // Upsert thread
    const { error: upsertErr } = await supabase.from('inbox_threads').upsert({
      id: threadId,
      app_id: appId,
      sender: 'Competitor Intelligence Agent',
      platform: 'system',
      last_text: 'New competitor intelligence report available.',
      last_date: new Date().toISOString(),
      read: false
    });
    if (upsertErr) console.error("[Competitor Engine] Upsert thread error:", upsertErr);
    
    // Insert message
    const marketPos = analysisData.market_position || 'Unknown';
    const pricingStart = analysisData.pricing?.starting_price || 'Unknown';
    const pricingModel = analysisData.pricing?.model || 'Unknown';
    const strengths = analysisData.analysis_profile?.strengths || ['None identified'];
    const weaknesses = analysisData.analysis_profile?.weaknesses || ['None identified'];
    
    const msgText = `I have finished analyzing your competitor at ${websiteUrl}.\n\n**Market Position:** ${marketPos}\n**Pricing:** ${pricingStart} (${pricingModel})\n\n**Strengths:**\n- ${strengths.join('\n- ')}\n\n**Weaknesses (Opportunities for you):**\n- ${weaknesses.join('\n- ')}`;
    
    const { error: insertErr } = await supabase.from('inbox_messages').insert({
      thread_id: threadId,
      sender_role: 'bot',
      text: msgText
    });
    if (insertErr) console.error("[Competitor Engine] Insert message error:", insertErr);
    
    console.log(`[Competitor Engine] Inbox notification sent to user.`);
    
  } catch (err) {
    console.error(`[Competitor Engine] Competitor ${competitorId} failed:`, err);
  }
}

module.exports = {
  processDiscoveryJob,
  processCompetitorJob,
  initCompetitorCron
};

function initCompetitorCron(supabaseClient) {
  // Check every 24 hours (86400000 ms)
  setInterval(async () => {
    try {
      console.log("[Cron] Running 30-day competitor rescrape check...");
      
      // We look for competitors where last_scanned_at is older than 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: competitors, error } = await supabaseClient
        .from('competitors')
        .select('*')
        .lt('last_scanned_at', thirtyDaysAgo);
        
      if (error) throw error;
      
      if (competitors && competitors.length > 0) {
        console.log(`[Cron] Found ${competitors.length} competitors needing a rescan.`);
        for (const comp of competitors) {
          // Fire and forget background job
          // Note: Here we pass the service client to bypass RLS, because it's an automated background cron
          processCompetitorJob(comp.id, comp.website_url, comp.app_id, supabaseClient).catch(console.error);
        }
      } else {
        console.log("[Cron] No competitors need rescanning.");
      }
    } catch (err) {
      console.error("[Cron] Competitor rescrape check failed:", err);
    }
  }, 24 * 60 * 60 * 1000);
}
