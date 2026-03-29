import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.warn('Missing VITE_SUPABASE_SERVICE_ROLE_KEY in .env.local');
}

// Cliente administrativo com service_role key - NUNCA expor publicamente
// Apenas utilizado em funções administrativas autorizadas
export const supabaseAdmin = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseServiceRoleKey ?? 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      storageKey: 'supabase.admin.auth.token' // Isolate the admin storage to prevent deadlocks
    },
  }
);
