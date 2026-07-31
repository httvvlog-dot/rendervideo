const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase.rpc('query_db_direct', { 
    sql_query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'credit_packages';"
  });
  
  if (error) {
    console.error("RPC failed, trying raw insert to see error");
    const { error: err2 } = await supabase.from('credit_packages').insert({ name: 'test' });
    console.error(err2);
  } else {
    console.log(data);
  }
}

main();
