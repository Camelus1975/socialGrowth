const { createClient } = require('@supabase/supabase-js');
const config = require('./config.js');

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('businesses')
    .select('user_id')
    .limit(1);
    
  if (data && data.length > 0) {
    const userId = data[0].user_id;
    console.log("User ID:", userId);
    
    // Now create a subscription for them
    // We must bypass RLS though! Wait, anon key can't insert into user_subscriptions if RLS is strict.
    // Let's check RLS for user_subscriptions.
  }
}

check();
