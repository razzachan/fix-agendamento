
// Centraliza configuração do Supabase no frontend usando a anon key
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_KEY as string; // anon key

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Variáveis VITE_SUPABASE_URL/VITE_SUPABASE_KEY ausentes. Configure seu .env');
}

export const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!);
