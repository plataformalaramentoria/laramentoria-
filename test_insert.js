import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  if (line.trim().startsWith('#') || !line.includes('=')) return;
  const [key, ...vals] = line.split('=');
  env[key.trim()] = vals.join('=').trim().replace(/['"]/g, '');
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing anon insert...');
  
  const student_id = '86e6dae3-6c2e-431c-b567-bd87ed9d580b';

  const res = await supabase.from('dashboard_tasks').insert([
    { student_id, text: 'Test Node Anon Insert', due_label: 'HOJE', is_urgent: false }
  ]).select();

  console.log('Anon Insert Result:', res);
}
test();
