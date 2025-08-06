import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://hdyucwabemspehokoiks.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkeXVjd2FiZW1zcGVob2tvaWtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDA0MDc2OSwiZXhwIjoyMDU5NjE2NzY5fQ.G_2PF8hXeXIfl59xmywqpGdWiJC6JEVHFwJkoyBSWc0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateDeniseOrder() {
  try {
    console.log('🔍 Buscando ordem de serviço da Denise...');

    // 1. Buscar a ordem da Denise
    const { data: orders, error: searchError } = await supabase
      .from('service_orders')
      .select('id, client_name, equipment_type, status, service_attendance_type, initial_cost, final_cost')
      .ilike('client_name', '%Denise%')
      .eq('service_attendance_type', 'coleta_diagnostico');

    if (searchError) {
      console.error('❌ Erro ao buscar ordens:', searchError);
      return;
    }

    if (!orders || orders.length === 0) {
      console.log('❌ Nenhuma ordem da Denise encontrada');
      return;
    }

    console.log('✅ Ordens encontradas:', orders);

    // Pegar a primeira ordem (ou você pode escolher uma específica)
    const order = orders[0];
    console.log('🎯 Atualizando ordem:', order.id);

    // 2. Criar/atualizar evento de diagnóstico
    const diagnosisData = {
      diagnosis_details: "Após análise técnica detalhada, identificamos que a mola do mecanismo de abertura/fechamento está danificada e precisa ser substituída. O equipamento apresenta dificuldade para abrir e fechar corretamente devido ao desgaste da mola.",
      recommended_service: "Troca de Mola",
      estimated_cost: 878.00,
      labor_cost: 350.00,
      parts_cost: 528.00,
      total_cost: 878.00,
      estimated_days: 3,
      notes: "Serviço inclui desmontagem, substituição da mola original e teste completo de funcionamento.",
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
      created_by: 'admin'
    };

    // 3. Inserir evento de diagnóstico
    const { error: eventError } = await supabase
      .rpc('insert_service_event', {
        p_service_order_id: order.id,
        p_type: 'diagnosis',
        p_created_by: 'admin',
        p_description: JSON.stringify(diagnosisData)
      });

    if (eventError) {
      console.error('❌ Erro ao criar evento de diagnóstico:', eventError);
      return;
    }

    console.log('✅ Evento de diagnóstico criado com sucesso');

    // 4. Atualizar a ordem de serviço
    const { error: updateError } = await supabase
      .from('service_orders')
      .update({
        status: 'awaiting_quote_approval',
        initial_cost: 350.00, // Valor da coleta diagnóstico
        final_cost: 878.00    // Valor total do orçamento
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('❌ Erro ao atualizar ordem:', updateError);
      return;
    }

    console.log('✅ Ordem de serviço atualizada com sucesso');
    console.log('🎯 Dados atualizados:');
    console.log('   - Status: awaiting_quote_approval');
    console.log('   - Initial Cost: R$ 350,00');
    console.log('   - Final Cost: R$ 878,00');
    console.log('   - Diagnóstico: Troca de Mola');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o script
updateDeniseOrder();