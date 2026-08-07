import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function getRpc() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data, error } = await supabase.rpc('save_script_with_sections', {
    p_project_id: '11111111-1111-1111-1111-111111111111',
    p_content: '',
    p_word_count: 0,
    p_provider: '',
    p_model: null,
    p_prompt: '',
    p_tokens_input: 0,
    p_tokens_output: 0,
    p_cost: 0,
    p_latency_ms: 0,
    p_sections: []
  });
  console.log(error);
}

getRpc().catch(console.error);
