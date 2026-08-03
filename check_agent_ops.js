const { createClient } = require('@supabase/supabase-js');
const config = require('./config.js');

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('agent_operations')
    .select('*')
    .limit(1);
    
  console.log("Data:", data);
  console.log("Error:", error);
}

check();
