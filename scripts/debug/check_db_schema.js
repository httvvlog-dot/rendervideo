const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: cols1, error: err1 } = await supabase.rpc('get_table_schema', { table_name: 'credit_packages' });
  if (err1) {
    console.error("RPC failed, falling back to basic select");
    const { data: d1 } = await supabase.from('credit_packages').select('*').limit(1);
    console.log("credit_packages schema approx:", d1 && d1.length > 0 ? Object.keys(d1[0]) : "Empty or error");
  } else {
    console.log("credit_packages cols:", cols1);
  }
  
  const { data: d2 } = await supabase.from('wallet_transactions').select('*').limit(1);
  console.log("wallet_transactions schema approx:", d2 && d2.length > 0 ? Object.keys(d2[0]) : "Empty");
  
  const { data: d3 } = await supabase.from('projects').select('id, name').limit(1);
  console.log("projects schema approx:", d3 && d3.length > 0 ? Object.keys(d3[0]) : "Empty");
}

main();
