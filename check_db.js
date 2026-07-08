const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProviders() {
  const { data, error } = await supabase.from('providers').select('*');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Providers in DB:', data.length);
    data.forEach(p => console.log(`- ${p.provider_name} (${p.provider_key})`));
  }
}

checkProviders();
