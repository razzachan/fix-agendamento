/**
 * 🔍 SCRIPT DE VERIFICAÇÃO DE COBERTURA DE STATUS
 * 
 * Verifica se todos os status das ordens de serviço estão mapeados corretamente no calendário
 */

import { ServiceOrderStatus } from '@/types';

// Lista completa de todos os status possíveis das ordens de serviço
const ALL_SERVICE_ORDER_STATUSES: ServiceOrderStatus[] = [
  'pending',
  'scheduled',
  'scheduled_collection',
  'in_progress',
  'on_the_way',
  'collected',
  'collected_for_diagnosis',
  'at_workshop',
  'received_at_workshop',
  'diagnosis_completed',
  'quote_sent',
  'awaiting_quote_approval',
  'quote_approved',
  'quote_rejected',
  'ready_for_return',
  'needs_workshop',
  'ready_for_delivery',
  'collected_for_delivery',
  'on_the_way_to_deliver',
  'payment_pending',
  'completed',
  'cancelled'
];

// Mapeamento atual (copiado dos scripts de sincronização)
const SERVICE_ORDER_TO_CALENDAR_STATUS = {
  'pending': 'scheduled',
  'scheduled': 'scheduled',
  'scheduled_collection': 'scheduled',
  'on_the_way': 'on_the_way',
  'in_progress': 'in_progress',
  'collected': 'at_workshop',
  'collected_for_diagnosis': 'at_workshop',
  'at_workshop': 'at_workshop',
  'received_at_workshop': 'at_workshop',
  'diagnosis_completed': 'diagnosis',
  'quote_sent': 'awaiting_approval',
  'awaiting_quote_approval': 'awaiting_approval',
  'quote_approved': 'in_repair',
  'quote_rejected': 'cancelled',
  'ready_for_return': 'cancelled',
  'needs_workshop': 'at_workshop',
  'in_repair': 'in_repair',
  'ready_for_delivery': 'ready_delivery',
  'delivery_scheduled': 'ready_delivery',
  'collected_for_delivery': 'ready_delivery',
  'on_the_way_to_deliver': 'on_the_way',
  'payment_pending': 'ready_delivery',
  'completed': 'completed',
  'cancelled': 'cancelled'
} as const;

// Status válidos do calendário
const VALID_CALENDAR_STATUSES = [
  'scheduled',
  'on_the_way',
  'in_progress',
  'at_workshop',
  'diagnosis',
  'awaiting_approval',
  'in_repair',
  'ready_delivery',
  'completed',
  'cancelled'
];

export function verifyStatusCoverage() {
  console.log('🔍 Verificando cobertura de status...');
  
  const results = {
    total: ALL_SERVICE_ORDER_STATUSES.length,
    mapped: 0,
    unmapped: [] as string[],
    invalidMappings: [] as Array<{ status: string; mapping: string }>,
    mappingDetails: {} as Record<string, string>
  };

  // Verificar cada status
  ALL_SERVICE_ORDER_STATUSES.forEach(status => {
    const mapping = SERVICE_ORDER_TO_CALENDAR_STATUS[status as keyof typeof SERVICE_ORDER_TO_CALENDAR_STATUS];
    
    if (mapping) {
      results.mapped++;
      results.mappingDetails[status] = mapping;
      
      // Verificar se o mapeamento é válido
      if (!VALID_CALENDAR_STATUSES.includes(mapping)) {
        results.invalidMappings.push({ status, mapping });
      }
    } else {
      results.unmapped.push(status);
    }
  });

  // Relatório
  console.log(`📊 RELATÓRIO DE COBERTURA:`);
  console.log(`   Total de status: ${results.total}`);
  console.log(`   ✅ Mapeados: ${results.mapped}`);
  console.log(`   ❌ Não mapeados: ${results.unmapped.length}`);
  console.log(`   ⚠️ Mapeamentos inválidos: ${results.invalidMappings.length}`);

  if (results.unmapped.length > 0) {
    console.log(`\n❌ STATUS NÃO MAPEADOS:`);
    results.unmapped.forEach(status => {
      console.log(`   - ${status}`);
    });
  }

  if (results.invalidMappings.length > 0) {
    console.log(`\n⚠️ MAPEAMENTOS INVÁLIDOS:`);
    results.invalidMappings.forEach(({ status, mapping }) => {
      console.log(`   - ${status} → ${mapping} (status de calendário inválido)`);
    });
  }

  if (results.unmapped.length === 0 && results.invalidMappings.length === 0) {
    console.log(`\n🎉 TODOS OS STATUS ESTÃO MAPEADOS CORRETAMENTE!`);
  }

  // Mostrar mapeamentos por categoria
  console.log(`\n📋 MAPEAMENTOS POR CATEGORIA:`);
  
  const categories = {
    'Agendamento': ['pending', 'scheduled', 'scheduled_collection'],
    'Em Trânsito': ['on_the_way', 'collected', 'collected_for_diagnosis', 'on_the_way_to_deliver'],
    'Em Progresso': ['in_progress'],
    'Na Oficina': ['at_workshop', 'received_at_workshop', 'needs_workshop'],
    'Diagnóstico': ['diagnosis_completed'],
    'Orçamento': ['quote_sent', 'awaiting_quote_approval', 'quote_approved', 'quote_rejected'],
    'Reparo': ['in_repair'],
    'Entrega': ['ready_for_delivery', 'collected_for_delivery', 'payment_pending'],
    'Finalização': ['completed'],
    'Cancelamento': ['cancelled', 'ready_for_return']
  };

  Object.entries(categories).forEach(([category, statuses]) => {
    console.log(`\n   ${category}:`);
    statuses.forEach(status => {
      const mapping = results.mappingDetails[status];
      if (mapping) {
        console.log(`     ${status} → ${mapping}`);
      } else {
        console.log(`     ${status} → ❌ NÃO MAPEADO`);
      }
    });
  });

  return results;
}

// Disponibilizar globalmente
if (typeof window !== 'undefined') {
  (window as any).verifyStatusCoverage = verifyStatusCoverage;
  console.log('🔍 Script de verificação carregado. Execute: verifyStatusCoverage()');
}

// Executar automaticamente se chamado diretamente
if (typeof require !== 'undefined' && require.main === module) {
  verifyStatusCoverage();
}
