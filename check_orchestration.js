const { createClient } = require('@supabase/supabase-js');
const config = require('./config');
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('orchestration_jobs').select('*').limit(1);
  console.log('Select check:', { data, error });
  
  // Let's also check the schema definition
  const { data: schemaData, error: schemaErr } = await supabase.rpc('get_schema_info'); // if we have one
}
check();
