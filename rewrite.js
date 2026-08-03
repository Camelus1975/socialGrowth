const fs = require('fs');
let content = fs.readFileSync('workers.js', 'utf8');

// Replace the videoRenderingWorker block
const target = "const videoRenderingWorker = redisConnection ? new Worker('video_rendering', async (job) => {";
const replacement = sync function processVideoGeneration(jobData) {
  const { assetId, prompt, appId } = jobData;
  console.log('[Worker - Video] Rendering video for asset ' + assetId + '...');

  try {
    const output = await replicate.run("ali-vilab/modelscope-text-to-video-synthesis:1e205ea73084bd17a0a3b43396e49ba0d6bc2e754e9283b2df49fad2dcf95755", { 
      input: { prompt: prompt, num_frames: 16 } 
    });

    let buffer;
    if (typeof output === 'string') {
      const response = await fetch(output);
      if (!response.ok) throw new Error('Failed to download video from Replicate');
      buffer = await response.arrayBuffer();
    } else if (Array.isArray(output)) {
      const response = await fetch(output[0]);
      if (!response.ok) throw new Error('Failed to download video from Replicate');
      buffer = await response.arrayBuffer();
    } else {
      const response = new Response(output);
      buffer = await response.arrayBuffer();
    }

    const fileName = 'video_' + assetId + '.mp4';
    const { data: storageData, error: storageErr } = await supabase.storage
      .from('brand_assets')
      .upload(fileName, buffer, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (storageErr) throw storageErr;

    const { data: publicUrlData } = supabase.storage
      .from('brand_assets')
      .getPublicUrl(fileName);

    const finalUrl = publicUrlData.publicUrl;

    await supabase.from('video_factory_assets').update({
      video_url: finalUrl,
      status: 'published'
    }).eq('id', assetId);

    console.log('[Worker - Video] Successfully rendered and uploaded asset ' + assetId);
    return { success: true, url: finalUrl };

  } catch (err) {
    console.error('[Worker - Video] Error rendering asset ' + assetId + ':', err);
    await supabase.from('video_factory_assets').update({
      status: 'failed',
      title: ('ERR: ' + err.message).substring(0, 100)
    }).eq('id', assetId);
    throw err;
  }
}

const videoRenderingWorker = redisConnection ? new Worker('video_rendering', async (job) => {
  if (job.name === 'render_video') {
    return await processVideoGeneration(job.data);
  }
;

// Extract the original try catch block and replace
content = content.replace(/const videoRenderingWorker = redisConnection \? new Worker\('video_rendering', async \(job\) => \{[\s\S]*?\} catch \(err\) \{[\s\S]*?\}\s*\}\s*\}, \{ connection: redisConnection \}\) \: null;/g, replacement + '}, { connection: redisConnection }) : null;');

content = content.replace(/videoRenderingWorker\n\};/g, 'videoRenderingWorker,\n  processVideoGeneration\n};');

fs.writeFileSync('workers.js', content);
console.log("Replaced");
