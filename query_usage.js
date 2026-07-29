const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://loeoprxsabbqlhouhrgm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZW9wcnhzYWJicWxob3VocmdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjI5MTk3MiwiZXhwIjoyMDk3ODY3OTcyfQ.e9yBCAbuip_IHgob6mnwywUI1obiHUqZDHwV8wsMwoY'
);

async function main() {
  const email = 'xuananh0190@gmail.com';
  
  // 1. Get user ID
  let userId;
  
  // check profiles table
  const { data: profile } = await supabase.from('profiles').select('id, email').eq('email', email).single();
  if (profile) {
     userId = profile.id;
  } else {
     // try listing profiles manually
     const { data: profiles } = await supabase.from('profiles').select('id, email');
     const p = profiles.find(x => x.email === email);
     if (p) userId = p.id;
  }
  
  if (!userId) {
     // Check auth.users using admin api
     const { data: users, error: err } = await supabase.auth.admin.listUsers();
     if (!err && users && users.users) {
        const u = users.users.find(x => x.email === email);
        if (u) userId = u.id;
     }
  }

  if (!userId) {
     console.log(`Could not find user ID for ${email}`);
     return;
  }
  
  console.log(`Found user ID for ${email}: ${userId}`);

  // We want usage for date 29/07/2026 local time (Vietnam is UTC+7).
  // So start is 2026-07-28T17:00:00.000Z and end is 2026-07-29T17:00:00.000Z
  const startUtc = '2026-07-28T17:00:00.000Z';
  const endUtc = '2026-07-29T17:00:00.000Z';
  
  console.log(`Querying billing_audit_logs between ${startUtc} and ${endUtc}`);
  
  const { data: logs, error } = await supabase
    .from('billing_audit_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'COMPLETED')
    .gte('created_at', startUtc)
    .lt('created_at', endUtc);
    
  if (error) {
     console.error('Error fetching logs:', error);
     return;
  }
  
  console.log(`Found ${logs.length} completed transactions.`);
  
  let totalCredits = 0;
  let totalApiCostUsd = 0;
  const breakdown = {};
  
  for (const log of logs) {
     totalCredits += (log.used_credits || 0);
     totalApiCostUsd += (log.api_cost || 0);
     
     if (!breakdown[log.feature]) {
        breakdown[log.feature] = { count: 0, credits: 0, costUsd: 0 };
     }
     breakdown[log.feature].count++;
     breakdown[log.feature].credits += (log.used_credits || 0);
     breakdown[log.feature].costUsd += (log.api_cost || 0);
  }
  
  console.log('--- Breakdown by Feature ---');
  console.table(breakdown);
  console.log(`Total Credits Used: ${totalCredits}`);
  console.log(`Total API Cost: $${totalApiCostUsd.toFixed(5)}`);
  
  // What is the conversion rate of credits to VND?
  // Let's check wallet config or just print it out so I can reason about it
}

main();
