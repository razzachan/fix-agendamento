/**
 * 🛡️ PREVENÇÃO DE DUPLICATAS NO CALENDÁRIO
 * 
 * Utilitários para prevenir e resolver duplicatas no calendário,
 * garantindo que apenas o evento com maior prioridade no lifecycle seja mantido
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Obtém a prioridade de um status no lifecycle do calendário
 * Menor número = maior prioridade (mais avançado no lifecycle)
 */
export function getCalendarStatusPriority(status: string): number {
  const priorityMap: Record<string, number> = {
    // Status mais avançados no lifecycle (maior prioridade)
    'completed': 1,           // Concluído - maior prioridade
    'ready_delivery': 2,      // Pronto para entrega
    'in_repair': 3,           // Em reparo
    'awaiting_approval': 4,   // Aguardando aprovação (inclui quote_sent)
    'diagnosis': 5,           // Em diagnóstico
    'at_workshop': 6,         // Na oficina (inclui collected_for_diagnosis, needs_workshop)
    'in_progress': 7,         // Em progresso
    'on_the_way': 8,          // À caminho (inclui on_the_way_to_deliver)
    'confirmed': 9,           // Confirmado
    'scheduled': 10,          // Agendado (inclui scheduled_collection) - menor prioridade
    'cancelled': 99           // Cancelado (inclui ready_for_return) - sempre menor prioridade
  };

  return priorityMap[status] || 50; // Status desconhecido fica no meio
}

/**
 * Verifica se há duplicatas para um cliente/service_order_id específico
 */
export async function checkForDuplicates(clientName: string, serviceOrderId?: string) {
  if (!serviceOrderId) return { hasDuplicates: false, events: [] };

  const { data: events, error } = await supabase
    .from('calendar_events')
    .select('id, status, created_at, event_type')
    .eq('client_name', clientName)
    .eq('service_order_id', serviceOrderId);

  if (error) {
    console.error('❌ Erro ao verificar duplicatas:', error);
    return { hasDuplicates: false, events: [] };
  }

  return {
    hasDuplicates: (events?.length || 0) > 1,
    events: events || []
  };
}

/**
 * Remove duplicatas mantendo apenas o evento com maior prioridade no lifecycle
 */
export async function removeDuplicates(clientName: string, serviceOrderId: string) {
  const { hasDuplicates, events } = await checkForDuplicates(clientName, serviceOrderId);
  
  if (!hasDuplicates) {
    return { success: true, removed: 0, kept: null };
  }

  // Ordenar por prioridade no lifecycle (menor número = maior prioridade)
  const sortedEvents = events.sort((a, b) => {
    const priorityA = getCalendarStatusPriority(a.status);
    const priorityB = getCalendarStatusPriority(b.status);
    
    // Se têm prioridades diferentes, usar a prioridade
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Se têm a mesma prioridade, usar o mais recente
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Manter o primeiro (maior prioridade), remover os outros
  const toKeep = sortedEvents[0];
  const toRemove = sortedEvents.slice(1);

  if (toRemove.length === 0) {
    return { success: true, removed: 0, kept: toKeep };
  }

  console.log(`🔄 Removendo duplicatas para ${clientName}:`);
  console.log(`  ✅ Mantendo: ${toKeep.status} (prioridade: ${getCalendarStatusPriority(toKeep.status)})`);
  
  const idsToRemove = toRemove.map(event => {
    console.log(`  ❌ Removendo: ${event.status} (prioridade: ${getCalendarStatusPriority(event.status)})`);
    return event.id;
  });

  // Remover eventos duplicados
  const { error: deleteError } = await supabase
    .from('calendar_events')
    .delete()
    .in('id', idsToRemove);

  if (deleteError) {
    console.error('❌ Erro ao remover duplicatas:', deleteError);
    return { success: false, removed: 0, kept: null, error: deleteError };
  }

  console.log(`✅ ${toRemove.length} duplicatas removidas para ${clientName}`);
  
  return { 
    success: true, 
    removed: toRemove.length, 
    kept: toKeep 
  };
}

/**
 * Hook para prevenir duplicatas antes de criar um novo evento
 */
export async function preventDuplicateBeforeCreate(eventData: {
  client_name: string;
  service_order_id?: string;
  status: string;
}) {
  if (!eventData.service_order_id) {
    return { shouldCreate: true, reason: 'No service_order_id' };
  }

  const { hasDuplicates, events } = await checkForDuplicates(
    eventData.client_name, 
    eventData.service_order_id
  );

  if (!hasDuplicates) {
    return { shouldCreate: true, reason: 'No duplicates found' };
  }

  // Verificar se o novo evento tem prioridade maior que os existentes
  const newEventPriority = getCalendarStatusPriority(eventData.status);
  const existingPriorities = events.map(e => getCalendarStatusPriority(e.status));
  const highestExistingPriority = Math.min(...existingPriorities);

  if (newEventPriority < highestExistingPriority) {
    // Novo evento tem prioridade maior, remover os existentes
    await removeDuplicates(eventData.client_name, eventData.service_order_id);
    return { 
      shouldCreate: true, 
      reason: `New event has higher priority (${newEventPriority} vs ${highestExistingPriority})` 
    };
  } else {
    // Evento existente tem prioridade maior ou igual, não criar
    return { 
      shouldCreate: false, 
      reason: `Existing event has higher or equal priority (${highestExistingPriority} vs ${newEventPriority})` 
    };
  }
}

/**
 * Utilitário para debug - listar todos os eventos duplicados
 */
export async function listAllDuplicates() {
  const { data: allEvents, error } = await supabase
    .from('calendar_events')
    .select('client_name, service_order_id, status, created_at')
    .not('service_order_id', 'is', null);

  if (error) {
    console.error('❌ Erro ao buscar eventos:', error);
    return [];
  }

  // Agrupar por cliente + service_order_id
  const groups: { [key: string]: any[] } = {};
  allEvents?.forEach(event => {
    const key = `${event.client_name}-${event.service_order_id}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
  });

  // Filtrar apenas grupos com duplicatas
  const duplicates = Object.entries(groups)
    .filter(([_, events]) => events.length > 1)
    .map(([key, events]) => ({
      key,
      client_name: events[0].client_name,
      service_order_id: events[0].service_order_id,
      count: events.length,
      events: events.sort((a, b) => getCalendarStatusPriority(a.status) - getCalendarStatusPriority(b.status))
    }));

  console.log(`🔍 Encontrados ${duplicates.length} grupos com duplicatas:`);
  duplicates.forEach(group => {
    console.log(`  - ${group.client_name}: ${group.count} eventos`);
    group.events.forEach((event: any) => {
      console.log(`    * ${event.status} (prioridade: ${getCalendarStatusPriority(event.status)})`);
    });
  });

  return duplicates;
}
