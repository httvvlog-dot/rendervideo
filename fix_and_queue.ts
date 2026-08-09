import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envFile = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.trim().match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  await supabase.from('render_jobs').update({ status: 'failed' }).eq('project_id', 'a7369e89-c4f1-4a09-b4cb-713e860c8e0d');
  
  const { data: job } = await supabase
    .from('render_jobs')
    .select('*')
    .eq('id', '51c8f373-7ce9-4760-b7ef-acfadc00df44')
    .single();
    
  const { id, worker_id, created_at, finished_at, status, progress, error_message, progress_message, updated_at, ...rest } = job;
  
  const newJob = {
    ...rest,
    status: 'queued',
    progress: 0
  };
  
  const { data: inserted, error: insertError } = await supabase.from('render_jobs').insert(newJob).select().single();
  
  if (insertError) {
      console.error('Insert error:', insertError);
  } else {
      console.log('Inserted fresh job:', inserted.id);
  }
}
check();
