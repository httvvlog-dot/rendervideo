const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy";

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Fetching providers...");
  const { data: p, error: pe } = await supabase.from('providers').select('*');
  if (pe) console.error("Providers Error:", pe.message);
  else console.log("Providers count:", p.length);

  console.log("Fetching credentials...");
  const { data: c, error: ce } = await supabase.from('provider_credentials').select('*');
  if (ce) console.error("Credentials Error:", ce.message);
  else console.log("Credentials count:", c.length);
}

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  test();
} else {
  console.log("No Supabase URL found. Cannot test DB directly.");
}
