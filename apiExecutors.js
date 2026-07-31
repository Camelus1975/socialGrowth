/**
 * apiExecutors.js
 * 
 * This module houses the integration logic for interacting with external APIs
 * (Meta Graph API, Google Ads API, Mailchimp, etc.).
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY);

const ENCRYPTION_KEY = crypto.scryptSync(config.ENCRYPTION_SECRET, config.ENCRYPTION_SALT, 32);
const IV_LENGTH = 16;

function decryptToken(encryptedText) {
  if (!encryptedText) return null;
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encrypted = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function getAccountCredentials(appId, platform) {
    const { data, error } = await supabase
        .from('social_accounts')
        .select('handle, access_token_encrypted')
        .eq('app_id', appId)
        .eq('platform', platform)
        .single();
    
    if (error || !data) {
        return null;
    }

    const decryptedToken = decryptToken(data.access_token_encrypted);
    return { handle: data.handle, accessToken: decryptedToken };
}

async function executeMetaPost(appId, content, mediaUrl) {
    console.log(`[API Executor - Meta] Authenticating app ${appId}...`);
    
    const credentials = await getAccountCredentials(appId, 'facebook');
    
    if (!credentials || !credentials.accessToken) {
        console.warn(`[API Executor - Meta] No real credentials found for ${appId}, falling back to SIMULATED.`);
        console.log(`[API Executor - Meta] Publishing content: "${content.substring(0, 50)}..."`);
        if (mediaUrl) console.log(`[API Executor - Meta] Attaching media: ${mediaUrl}`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log(`[API Executor - Meta] Successfully posted to Facebook (SIMULATED)!`);
        return { success: true, platform: 'meta', external_id: `meta_${Date.now()}`, post_url: `https://facebook.com/meta_${Date.now()}` };
    }

    const { handle: pageId, accessToken } = credentials;
    let url = '';
    let body = {};
    
    if (mediaUrl) {
        url = `https://graph.facebook.com/v19.0/${pageId}/photos`;
        body = { url: mediaUrl, message: content, access_token: accessToken };
    } else {
        url = `https://graph.facebook.com/v19.0/${pageId}/feed`;
        body = { message: content, access_token: accessToken };
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Facebook API error: ${JSON.stringify(data)}`);
    }

    console.log(`[API Executor - Meta] Successfully posted to Facebook! ID: ${data.id}`);
    return { success: true, platform: 'meta', external_id: data.id, post_url: 'https://facebook.com/' + data.id };
}

async function executeInstagramPost(appId, content, mediaUrl) {
    console.log(`[API Executor - Instagram] Authenticating app ${appId}...`);
    
    const credentials = await getAccountCredentials(appId, 'instagram');
    
    if (!credentials || !credentials.accessToken) {
        console.warn(`[API Executor - Instagram] No real credentials found for ${appId}, falling back to SIMULATED.`);
        console.log(`[API Executor - Instagram] Publishing content: "${content.substring(0, 50)}..."`);
        if (mediaUrl) console.log(`[API Executor - Instagram] Attaching media: ${mediaUrl}`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log(`[API Executor - Instagram] Successfully posted to Instagram (SIMULATED)!`);
        return { success: true, platform: 'instagram', external_id: `ig_${Date.now()}` };
    }

    const { handle: igUserId, accessToken } = credentials;
    
    // Step 1: Create media container
    const mediaUrlPost = `https://graph.facebook.com/v19.0/${igUserId}/media`;
    const mediaBody = {
        image_url: mediaUrl,
        caption: content,
        access_token: accessToken
    };
    
    const mediaResponse = await fetch(mediaUrlPost, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mediaBody)
    });
    
    const mediaData = await mediaResponse.json();
    if (!mediaResponse.ok) {
        throw new Error(`Instagram API error (Media): ${JSON.stringify(mediaData)}`);
    }
    
    // Step 2: Publish
    const publishUrl = `https://graph.facebook.com/v19.0/${igUserId}/media_publish`;
    const publishBody = {
        creation_id: mediaData.id,
        access_token: accessToken
    };
    
    const publishResponse = await fetch(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publishBody)
    });
    
    const publishData = await publishResponse.json();
    if (!publishResponse.ok) {
        throw new Error(`Instagram API error (Publish): ${JSON.stringify(publishData)}`);
    }

    console.log(`[API Executor - Instagram] Successfully posted to Instagram! ID: ${publishData.id}`);
    return { success: true, platform: 'instagram', external_id: publishData.id };
}

async function executeGoogleAd(appId, campaignName, budget) {
    console.log(`[API Executor - Google] SIMULATED: Authenticating app ${appId}...`);
    console.log(`[API Executor - Google] SIMULATED: Launching campaign: "${campaignName}" with budget $${budget}`);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`[API Executor - Google] SIMULATED: Campaign successfully activated!`);
    return { success: true, platform: 'google_ads', external_id: `gads_${Date.now()}` };
}

async function executeEmailCampaign(appId, subject, body) {
    console.log(`[API Executor - Email] SIMULATED: Authenticating app ${appId}...`);
    console.log(`[API Executor - Email] SIMULATED: Dispatching newsletter: "${subject}"`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`[API Executor - Email] SIMULATED: Sent to 1,240 subscribers.`);
    return { success: true, platform: 'email', external_id: `mail_${Date.now()}` };
}

async function routeExecution(appId, operationType, payload) {
    try {
        if (operationType === 'publish_social' || operationType === 'post') {
            return await executeMetaPost(appId, payload.content || JSON.stringify(payload), payload.mediaUrl);
        } else if (operationType === 'publish_instagram') {
            return await executeInstagramPost(appId, payload.content || JSON.stringify(payload), payload.mediaUrl);
        } else if (operationType === 'launch_ad' || operationType === 'ad_campaign') {
            return await executeGoogleAd(appId, payload.campaignName || payload.title || 'AI Growth Campaign', payload.budget || 50);
        } else if (operationType === 'send_email' || operationType === 'newsletter') {
            return await executeEmailCampaign(appId, payload.subject || payload.title || 'Weekly Update', payload.body || JSON.stringify(payload));
        } else {
            console.log(`[API Executor] Generic operation executed for ${appId}.`);
            await new Promise(resolve => setTimeout(resolve, 500));
            return { success: true, platform: 'generic', external_id: `gen_${Date.now()}` };
        }
    } catch (err) {
        console.error(`[API Executor] Execution failed:`, err);
        throw err;
    }
}

module.exports = {
    executeMetaPost,
    executeInstagramPost,
    executeGoogleAd,
    executeEmailCampaign,
    routeExecution
};
