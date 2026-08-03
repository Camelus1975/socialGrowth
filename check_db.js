const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY);

(async () => {
  console.log("Checking competitors...");
  const { data: comps } = await supabase.from('competitors').select('id, name, website_url, current_pricing, last_scanned_at');
  console.log(JSON.stringify(comps, null, 2));

  console.log("\nChecking inbox threads...");
  const { data: threads } = await supabase.from('inbox_threads').select('*');
  console.log(JSON.stringify(threads, null, 2));

  console.log("\nChecking inbox messages...");
  const { data: msgs } = await supabase.from('inbox_messages').select('*');
  console.log(JSON.stringify(msgs, null, 2));
})();
