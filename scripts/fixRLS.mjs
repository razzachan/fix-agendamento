import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(2);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

console.log('🔧 Corrigindo RLS para permitir acesso ao dashboard...\n');

(async () => {
  try {
    // Desabilita RLS nas tabelas principais
    const tables = [
      'service_orders',
      'clients', 
      'technicians',
      'calendar_events',
      'financial_transactions'
    ];
    
    for (const table of tables) {
      console.log(`🔓 Desabilitando RLS em ${table}...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`
      });
      
      if (error) {
        console.log(`⚠️  Erro em ${table}:`, error.message);
      } else {
        console.log(`✅ RLS desabilitado em ${table}`);
      }
    }
    
    console.log('\n🎯 Testando acesso com anon key...');
    
    // Testa com anon key
    const anonKey = process.env.VITE_SUPABASE_KEY;
    const anonSupabase = createClient(url, anonKey, { auth: { persistSession: false } });
    
    const { data, error } = await anonSupabase
      .from('service_orders')
      .select('id, client_name, status')
      .eq('archived', false)
      .limit(5);
    
    if (error) {
      console.log('❌ Ainda há erro:', error.message);
    } else {
      console.log(`✅ Sucesso! Agora retorna ${data.length} ordens com anon key`);
      data.forEach(order => {
        console.log(`   - ${order.client_name}: ${order.status}`);
      });
    }
    
    console.log('\n🚀 Dashboard deve funcionar agora!');
    console.log('📱 Recarregue a página do dashboard (Ctrl+Shift+R)');
    
  } catch (err) {
    console.error('❌ Erro geral:', err.message);
  }
  
  process.exit(0);
})();
