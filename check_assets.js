const { createClient } = require('@supabase/supabase-js');
const config = require('./config.js');
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('video_factory_assets').select('*').order('created_at', { ascending: false }).limit(3);
  console.log("Assets:", JSON.stringify(data, null, 2));
}
run();
