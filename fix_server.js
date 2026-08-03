const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Replace the supabase.from('orchestration_jobs') logic
let newCode = code.replace(
  /const \{ data: jobData, error: jobErr \} = await supabase\s*\n\s*\.from\('orchestration_jobs'\)\s*\n\s*\.insert\(\[\{\s*\n\s*app_id: appId,/,
  `
  let userSupabase = supabase;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token !== 'mock-supabase-jwt-token') {
      userSupabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: \`Bearer \${token}\` } }
      });
    }
  }
  
  const { data: jobData, error: jobErr } = await userSupabase
    .from('orchestration_jobs')
    .insert([{
      app_id: appId,`
);

// Add detailed error logging
newCode = newCode.replace(
  /if \(jobErr\) throw jobErr;/,
  `if (jobErr) { console.error("[Orchestrator] jobErr details:", jobErr); throw jobErr; }`
);

fs.writeFileSync('server.js', newCode);
console.log('Fixed server.js');
