const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const config = require('./config.js');

// Helper to initialize supabase with the user's JWT
function getSupabase(req) {
  const authHeader = req.headers.authorization;
  return createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });
}

// GET all posts for a workspace
router.get('/:appId', async (req, res) => {
  const { appId } = req.params;
  const supabase = getSupabase(req);

  try {
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('app_id', appId)
      .order('publish_at', { ascending: true });

    if (error) throw error;
    res.json({ success: true, posts: data });
  } catch (err) {
    console.error('[Calendar] Error fetching posts:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST a new scheduled post
router.post('/:appId', async (req, res) => {
  const { appId } = req.params;
  const { platform, content, media_url, publish_at } = req.body;
  const supabase = getSupabase(req);

  try {
    // Basic validation
    if (!platform || !content || !publish_at) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const { data: userAuth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !userAuth.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { data, error } = await supabase
      .from('scheduled_posts')
      .insert({
        user_id: userAuth.user.id,
        app_id: appId,
        platform,
        content,
        media_url: media_url || null,
        publish_at,
        status: 'scheduled'
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, post: data });
  } catch (err) {
    console.error('[Calendar] Error scheduling post:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE a scheduled post
router.delete('/:appId/:postId', async (req, res) => {
  const { appId, postId } = req.params;
  const supabase = getSupabase(req);

  try {
    const { data: userAuth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !userAuth.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // RLS will ensure they can only delete their own posts
    const { error } = await supabase
      .from('scheduled_posts')
      .delete()
      .eq('id', postId)
      .eq('app_id', appId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[Calendar] Error deleting post:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE ALL posts for a workspace
router.delete('/:appId', async (req, res) => {
  const { appId } = req.params;
  const supabase = getSupabase(req);

  try {
    const { data: userAuth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !userAuth.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('scheduled_posts')
      .delete()
      .eq('app_id', appId)
      .eq('user_id', userAuth.user.id);

    if (error) throw error;
    res.json({ success: true, message: 'All posts cleared.' });
  } catch (err) {
    console.error('[Calendar] Error deleting all posts:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
