import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_*_KEY in environment');
  process.exit(2);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

(async () => {
  console.log('🔍 Verificando ordens de serviço no banco...\n');
  
  const { data: orders, error } = await supabase
    .from('service_orders')
    .select('id, client_name, status, initial_cost, final_cost, payment_status, archived, created_at')
    .eq('archived', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erro ao buscar ordens:', error.message);
    process.exit(1);
  }

  console.log(`📊 Total de ordens não arquivadas: ${orders.length}\n`);

  if (orders.length === 0) {
    console.log('⚠️  Nenhuma ordem de serviço encontrada!');
    process.exit(0);
  }

  // Contadores por status
  const statusCounts = {};
  const paymentCounts = {};
  let totalInitialCost = 0;
  let totalFinalCost = 0;

  console.log('📋 Detalhes das ordens:');
  console.log('─'.repeat(120));
  console.log('ID (8 chars) | Cliente              | Status           | Inicial  | Final    | Pagamento    | Criado');
  console.log('─'.repeat(120));

  orders.forEach(order => {
    // Contadores
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    paymentCounts[order.payment_status || 'null'] = (paymentCounts[order.payment_status || 'null'] || 0) + 1;
    
    // Somas
    totalInitialCost += parseFloat(order.initial_cost || 0);
    totalFinalCost += parseFloat(order.final_cost || 0);

    // Formatação para exibição
    const id = order.id.substring(0, 8);
    const cliente = (order.client_name || 'Sem nome').padEnd(20).substring(0, 20);
    const status = (order.status || 'null').padEnd(16).substring(0, 16);
    const inicial = `R$ ${(parseFloat(order.initial_cost || 0)).toFixed(2)}`.padStart(8);
    const final = `R$ ${(parseFloat(order.final_cost || 0)).toFixed(2)}`.padStart(8);
    const pagamento = (order.payment_status || 'null').padEnd(12).substring(0, 12);
    const criado = new Date(order.created_at).toLocaleDateString('pt-BR');

    console.log(`${id} | ${cliente} | ${status} | ${inicial} | ${final} | ${pagamento} | ${criado}`);
  });

  console.log('─'.repeat(120));
  console.log('\n📈 Resumo por Status:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  console.log('\n💰 Resumo por Pagamento:');
  Object.entries(paymentCounts).forEach(([payment, count]) => {
    console.log(`  ${payment}: ${count}`);
  });

  console.log('\n💵 Totais Financeiros:');
  console.log(`  Inicial: R$ ${totalInitialCost.toFixed(2)}`);
  console.log(`  Final: R$ ${totalFinalCost.toFixed(2)}`);

  console.log('\n🎯 Contagens esperadas no Dashboard:');
  
  // Pendentes: pending, scheduled, scheduled_collection
  const pendentes = (statusCounts['pending'] || 0) + (statusCounts['scheduled'] || 0) + (statusCounts['scheduled_collection'] || 0);
  console.log(`  Pendentes: ${pendentes} (pending + scheduled + scheduled_collection)`);
  
  // Em Andamento: in_progress, collected, collected_for_diagnosis, at_workshop, received_at_workshop, diagnosis_completed, awaiting_quote_approval, quote_approved, ready_for_delivery, delivery_scheduled, collected_for_delivery, on_the_way_to_deliver, payment_pending
  const emAndamento = (statusCounts['in_progress'] || 0) + (statusCounts['collected'] || 0) + (statusCounts['collected_for_diagnosis'] || 0) + (statusCounts['at_workshop'] || 0) + (statusCounts['received_at_workshop'] || 0) + (statusCounts['diagnosis_completed'] || 0) + (statusCounts['awaiting_quote_approval'] || 0) + (statusCounts['quote_approved'] || 0) + (statusCounts['ready_for_delivery'] || 0) + (statusCounts['delivery_scheduled'] || 0) + (statusCounts['collected_for_delivery'] || 0) + (statusCounts['on_the_way_to_deliver'] || 0) + (statusCounts['payment_pending'] || 0);
  console.log(`  Em Andamento: ${emAndamento} (todos os status intermediários)`);
  
  // Concluídas: completed
  const concluidas = statusCounts['completed'] || 0;
  console.log(`  Concluídas: ${concluidas} (completed)`);
  
  // Agendados: scheduled, scheduled_collection
  const agendados = (statusCounts['scheduled'] || 0) + (statusCounts['scheduled_collection'] || 0);
  console.log(`  Agendados: ${agendados} (scheduled + scheduled_collection)`);

  process.exit(0);
})();
