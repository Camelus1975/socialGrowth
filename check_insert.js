const { createClient } = require('@supabase/supabase-js');
const config = require('./config');
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('orchestration_jobs').insert([{
    app_id: '00000000-0000-0000-0000-000000000000',
    user_id: '00000000-0000-0000-0000-000000000000',
    goal: 'Test',
    status: 'pending'
  }]);
  console.log('Insert check:', { data, error });
}
check();
