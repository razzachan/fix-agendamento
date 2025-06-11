// Script para atualizar a data da ordem de serviço do João Silva
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hdyucwabemspehokoiks.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkeXVjd2FiZW1zcGVob2tvaWtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDA0MDc2OSwiZXhwIjoyMDU5NjE2NzY5fQ.G_2PF8hXeXIfl59xmywqpGdWiJC6JEVHFwJkoyBSWc0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateJoaoSilvaDate() {
  try {
    console.log('🔍 Buscando ordem de serviço do João Silva...');
    
    // Primeiro, vamos encontrar a ordem do João Silva
    const { data: orders, error: searchError } = await supabase
      .from('service_orders')
      .select('*')
      .ilike('client_name', '%joão silva%');
    
    if (searchError) {
      console.error('❌ Erro ao buscar ordem:', searchError);
      return;
    }
    
    console.log('📋 Ordens encontradas para João Silva:', orders);
    
    if (orders && orders.length > 0) {
      const joaoOrder = orders[0]; // Pegar a primeira ordem encontrada
      console.log('🎯 Ordem selecionada:', joaoOrder);
      
      // Atualizar a data para 13/06/2025 às 08:00
      const { data: updateResult, error: updateError } = await supabase
        .from('service_orders')
        .update({
          scheduled_date: '2025-06-13T08:00:00+00:00'
        })
        .eq('id', joaoOrder.id)
        .select();
      
      if (updateError) {
        console.error('❌ Erro ao atualizar ordem:', updateError);
        return;
      }
      
      console.log('✅ Ordem atualizada com sucesso:', updateResult);
      
      // Verificar se a atualização funcionou
      const { data: verifyOrder, error: verifyError } = await supabase
        .from('service_orders')
        .select('*')
        .eq('id', joaoOrder.id)
        .single();
      
      if (verifyError) {
        console.error('❌ Erro ao verificar atualização:', verifyError);
        return;
      }
      
      console.log('🔍 Ordem após atualização:', verifyOrder);
      
    } else {
      console.log('⚠️ Nenhuma ordem encontrada para João Silva');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar a função
updateJoaoSilvaDate();
