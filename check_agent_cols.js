const { createClient } = require('@supabase/supabase-js');
const config = require('./config.js');

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('agent_operations')
    .select('*')
    .limit(1);
    
  if (data && data.length > 0) {
    console.log("Columns:", Object.keys(data[0]));
  } else {
    console.log("Table is empty, trying an invalid insert to get schema error...");
    const { error: err2 } = await supabase.from('agent_operations').insert([{ invalid_col: 1 }]);
    console.log("Error:", err2);
  }
}

check();
