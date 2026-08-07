import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: project, error } = await supabase.from('projects').insert({ 
    title: 'Test Project 2',
    topic: 'phân tích tình hình kinh tế toàn cầu từ đây đến năm 2027', 
    language: 'Vietnamese', 
    target_duration: 120, 
    user_id: '1d159c39-8939-4668-b019-e9d8778c05a7' 
  }).select().single();
  
  if (error) {
    console.error("Error creating project:", error);
    return;
  }
  
  console.log(project.id);
}

run();
