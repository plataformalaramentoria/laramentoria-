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
  console.log('Testing Supabase connection...');
  try {
    const { data: cols, error: errCols } = await supabase.from('dashboard_tasks').select('*').limit(1);
    console.log('Tasks error:', errCols ? errCols.message : 'None');
    console.log('Tasks cols:', cols ? Object.keys(cols[0] || {}) : 'None');
  } catch (err) {
    console.error('Fatal:', err);
  }
}

test();
