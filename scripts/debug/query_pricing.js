const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://loeoprxsabbqlhouhrgm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZW9wcnhzYWJicWxob3VocmdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjI5MTk3MiwiZXhwIjoyMDk3ODY3OTcyfQ.e9yBCAbuip_IHgob6mnwywUI1obiHUqZDHwV8wsMwoY'
);

async function main() {
  const { data: packages, error } = await supabase.from('credit_packages').select('*');
  if (error) {
     console.log("No credit_packages table or error", error.message);
  } else {
     console.log("Packages:", packages);
  }
  
  // also check billing settings if any
  const { data: p2, error: e2 } = await supabase.from('pricing_plans').select('*');
  if (!e2) console.log("Pricing plans:", p2);
}

main();
