import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

// Preferir chaves server-side; fallback para anon apenas para permitir o processo subir e servir /health.
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const ANON_FALLBACK = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;
const SUPABASE_KEY = SERVICE_ROLE || ANON_FALLBACK;

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
export const supabaseUsingServiceRole = Boolean(SUPABASE_URL && SERVICE_ROLE);

if (!supabaseConfigured) {
  // Não derrubar o processo: Railway healthcheck (/health) precisa responder 200.
  // Os endpoints que dependem do Supabase retornarão erro (ver middleware/handlers).
  console.error(`
[api/config/supabase] Supabase não configurado.
Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (preferível) ou ao menos VITE_SUPABASE_URL/VITE_SUPABASE_KEY para subir.
- SUPABASE_URL: ${process.env.SUPABASE_URL ? 'set' : 'missing'} (fallback VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? 'set' : 'missing'})
- SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing'} (fallback VITE_SUPABASE_KEY: ${process.env.VITE_SUPABASE_KEY ? 'set' : 'missing'})
`);
}

export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  : null;

export const testSupabaseConnection = async () => {
  try {
    if (!supabase) {
      return { success: false, message: 'Supabase não configurado', error: 'missing_env' };
    }
    const { error } = await supabase.from('service_orders').select('id').limit(1);
    if (error) throw error;
    return { success: true, message: 'Conexão com Supabase estabelecida com sucesso' };
  } catch (error) {
    console.error('Erro ao conectar com Supabase:', error);
    return { success: false, message: 'Falha na conexão com Supabase', error };
  }
};

export default supabase;
