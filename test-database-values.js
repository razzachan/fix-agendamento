/**
 * Script para testar se há valores no banco de dados
 * Execute este script para verificar se existem service_orders com final_cost
 */

// Simular consulta no banco
console.log('🔍 Testando dados do banco...');

// 1. Verificar se há service_orders com final_cost
console.log('\n1. 📊 Service Orders com valores:');
const mockServiceOrders = [
  { id: 'os-1', client_name: 'João Silva', final_cost: 150.00, created_at: '2025-01-19' },
  { id: 'os-2', client_name: 'Maria Santos', final_cost: 200.50, created_at: '2025-01-19' },
  { id: 'os-3', client_name: 'Pedro Costa', final_cost: null, created_at: '2025-01-19' },
  { id: 'os-4', client_name: 'Ana Lima', final_cost: 0, created_at: '2025-01-19' },
  { id: 'os-5', client_name: 'Carlos Souza', final_cost: 300.75, created_at: '2025-01-19' }
];

mockServiceOrders.forEach(order => {
  const hasValue = order.final_cost && order.final_cost > 0;
  console.log(`- ${order.client_name}: ${hasValue ? `R$ ${order.final_cost.toFixed(2)}` : 'Sem valor'} ${hasValue ? '✅' : '❌'}`);
});

// 2. Verificar scheduled_services
console.log('\n2. 📅 Scheduled Services:');
const mockScheduledServices = [
  { id: 'svc-1', client_name: 'João Silva', service_order_id: 'os-1' },
  { id: 'svc-2', client_name: 'Maria Santos', service_order_id: 'os-2' },
  { id: 'svc-3', client_name: 'Pedro Costa', service_order_id: 'os-3' },
  { id: 'svc-4', client_name: 'Ana Lima', service_order_id: null },
  { id: 'svc-5', client_name: 'Carlos Souza', service_order_id: 'os-5' }
];

mockScheduledServices.forEach(service => {
  const relatedOrder = mockServiceOrders.find(order => order.id === service.service_order_id);
  const hasValue = relatedOrder?.final_cost && relatedOrder.final_cost > 0;
  console.log(`- ${service.client_name}: ${service.service_order_id ? 'Tem OS' : 'Sem OS'} | ${hasValue ? `R$ ${relatedOrder.final_cost.toFixed(2)}` : 'Sem valor'} ${hasValue ? '✅' : '❌'}`);
});

// 3. Simular JOIN
console.log('\n3. 🔗 Simulação do JOIN:');
const joinResult = mockScheduledServices.map(service => {
  const relatedOrder = mockServiceOrders.find(order => order.id === service.service_order_id);
  return {
    ...service,
    service_orders: relatedOrder ? { final_cost: relatedOrder.final_cost } : null
  };
});

joinResult.forEach(item => {
  const finalCost = item.service_orders?.final_cost;
  const hasValue = finalCost && finalCost > 0;
  console.log(`- ${item.client_name}: ${hasValue ? `R$ ${finalCost.toFixed(2)}` : 'Sem valor'} ${hasValue ? '✅' : '❌'}`);
});

// 4. Estatísticas
console.log('\n4. 📈 Estatísticas:');
const totalOrders = mockServiceOrders.length;
const ordersWithValue = mockServiceOrders.filter(order => order.final_cost && order.final_cost > 0).length;
const totalServices = mockScheduledServices.length;
const servicesWithValue = joinResult.filter(item => item.service_orders?.final_cost && item.service_orders.final_cost > 0).length;

console.log(`- Total de Service Orders: ${totalOrders}`);
console.log(`- Orders com valor: ${ordersWithValue} (${((ordersWithValue/totalOrders)*100).toFixed(1)}%)`);
console.log(`- Total de Scheduled Services: ${totalServices}`);
console.log(`- Services com valor: ${servicesWithValue} (${((servicesWithValue/totalServices)*100).toFixed(1)}%)`);

// 5. Possíveis problemas
console.log('\n5. ⚠️ Possíveis problemas:');
if (ordersWithValue === 0) {
  console.log('❌ Nenhuma service_order tem final_cost > 0');
  console.log('   Solução: Criar/atualizar ordens com valores');
}

if (servicesWithValue === 0) {
  console.log('❌ Nenhum scheduled_service está vinculado a uma OS com valor');
  console.log('   Solução: Verificar se service_order_id está correto');
}

const servicesWithoutOrderId = mockScheduledServices.filter(s => !s.service_order_id).length;
if (servicesWithoutOrderId > 0) {
  console.log(`⚠️ ${servicesWithoutOrderId} scheduled_services sem service_order_id`);
  console.log('   Isso é normal para alguns casos, mas pode afetar a exibição de valores');
}

console.log('\n✅ Teste concluído!');
console.log('\n🎯 Para resolver:');
console.log('1. Verificar se há service_orders com final_cost no banco real');
console.log('2. Verificar se scheduled_services têm service_order_id correto');
console.log('3. Testar a consulta JOIN no Supabase');
console.log('4. Verificar logs do browser no calendário real');
