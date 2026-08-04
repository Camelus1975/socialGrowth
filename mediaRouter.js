const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const config = require('./config.js');

function getSupabase(req) {
  const authHeader = req.headers.authorization;
  return createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });
}

// GET all media for a workspace
router.get('/:appId', async (req, res) => {
  const { appId } = req.params;
  const supabase = getSupabase(req);

  try {
    const { data: userAuth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !userAuth.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { data, error } = await supabase
      .from('media')
      .select('*')
      .eq('app_id', appId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, media: data });
  } catch (err) {
    console.error('[Media] Error fetching media:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE a media asset
router.delete('/:appId/:mediaId', async (req, res) => {
  const { appId, mediaId } = req.params;
  const supabase = getSupabase(req);

  try {
    const { data: userAuth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !userAuth.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('media')
      .delete()
      .eq('id', mediaId)
      .eq('app_id', appId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[Media] Error deleting media:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
