import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Usar as mesmas credenciais do frontend ou configurar novas no arquivo .env
const SUPABASE_URL = process.env.SUPABASE_URL || "https://hdyucwabemspehokoiks.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkeXVjd2FiZW1zcGVob2tvaWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwNDA3NjksImV4cCI6MjA1OTYxNjc2OX0.koJXDLh4_rEGGMFB_7JrtXj9S7JTSGxPtrozhjWoS3M";

// Criar e exportar o cliente Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Função para verificar a conexão com o Supabase
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('service_orders').select('count', { count: 'exact' }).limit(1);
    
    if (error) {
      throw error;
    }
    
    return { success: true, message: 'Conexão com Supabase estabelecida com sucesso' };
  } catch (error) {
    console.error('Erro ao conectar com Supabase:', error);
    return { success: false, message: 'Falha na conexão com Supabase', error };
  }
};

export default supabase;
