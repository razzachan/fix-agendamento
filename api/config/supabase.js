import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error('[api/config/supabase] SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no backend.');
}

export const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

export const testSupabaseConnection = async () => {
  try {
    const { error } = await supabase.from('service_orders').select('id').limit(1);
    if (error) throw error;
    return { success: true, message: 'Conexão com Supabase estabelecida com sucesso' };
  } catch (error) {
    console.error('Erro ao conectar com Supabase:', error);
    return { success: false, message: 'Falha na conexão com Supabase', error };
  }
};

export default supabase;
