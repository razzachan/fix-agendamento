/**
 * 🧹 SCRIPT DE LIMPEZA DE DUPLICATAS
 *
 * Remove eventos duplicados do calendar_events mantendo apenas o de maior prioridade no lifecycle
 */

import { supabase } from '@/integrations/supabase/client';

interface DuplicateGroup {
  client_name: string;
  service_order_id: string;
  events: Array<{
    id: string;
    created_at: string;
    status: string;
    event_type: string;
  }>;
}

/**
 * Obtém a prioridade de um status no lifecycle do calendário
 * Menor número = maior prioridade (mais avançado no lifecycle)
 */
function getCalendarStatusPriority(status: string): number {
  const priorityMap: Record<string, number> = {
    // Status mais avançados no lifecycle (maior prioridade)
    'completed': 1,           // Concluído - maior prioridade
    'ready_delivery': 2,      // Pronto para entrega
    'in_repair': 3,           // Em reparo
    'awaiting_approval': 4,   // Aguardando aprovação
    'diagnosis': 5,           // Em diagnóstico
    'at_workshop': 6,         // Na oficina
    'in_progress': 7,         // Em progresso
    'on_the_way': 8,          // À caminho
    'confirmed': 9,           // Confirmado
    'scheduled': 10,          // Agendado - menor prioridade
    'cancelled': 99           // Cancelado - sempre menor prioridade
  };

  return priorityMap[status] || 50; // Status desconhecido fica no meio
}

export async function cleanDuplicateEvents() {
  try {
    console.log('🧹 Iniciando limpeza de eventos duplicados...');

    // 1. Buscar todos os eventos
    const { data: allEvents, error: fetchError } = await supabase
      .from('calendar_events')
      .select('id, client_name, service_order_id, created_at, status, event_type')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('❌ Erro ao buscar eventos:', fetchError);
      return { success: false, error: fetchError };
    }

    console.log(`📋 Encontrados ${allEvents?.length || 0} eventos totais`);

    if (!allEvents || allEvents.length === 0) {
      return { success: true, removed: 0, message: 'Nenhum evento encontrado' };
    }

    // 2. Agrupar eventos por cliente e service_order_id
    const groups: { [key: string]: DuplicateGroup } = {};

    allEvents.forEach(event => {
      const key = `${event.client_name}-${event.service_order_id || 'no-order'}`;
      
      if (!groups[key]) {
        groups[key] = {
          client_name: event.client_name,
          service_order_id: event.service_order_id,
          events: []
        };
      }
      
      groups[key].events.push({
        id: event.id,
        created_at: event.created_at,
        status: event.status,
        event_type: event.event_type
      });
    });

    // 3. Identificar grupos com duplicatas
    const duplicateGroups = Object.values(groups).filter(group => group.events.length > 1);
    
    console.log(`🔍 Encontrados ${duplicateGroups.length} grupos com duplicatas:`);
    duplicateGroups.forEach(group => {
      console.log(`  - ${group.client_name}: ${group.events.length} eventos`);
      group.events.forEach(event => {
        console.log(`    * ${event.status} (${event.event_type}) - ${event.created_at}`);
      });
    });

    // 4. Para cada grupo, manter apenas o de maior prioridade no lifecycle
    let removedCount = 0;
    const idsToRemove: string[] = [];

    for (const group of duplicateGroups) {
      // Ordenar por prioridade no lifecycle (menor número = maior prioridade)
      const sortedEvents = group.events.sort((a, b) => {
        const priorityA = getCalendarStatusPriority(a.status);
        const priorityB = getCalendarStatusPriority(b.status);

        // Se têm prioridades diferentes, usar a prioridade
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // Se têm a mesma prioridade, usar o mais recente
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      // Manter o primeiro (maior prioridade no lifecycle), remover os outros
      const toKeep = sortedEvents[0];
      const toRemove = sortedEvents.slice(1);

      console.log(`🔄 ${group.client_name}:`);
      console.log(`  ✅ Mantendo: ${toKeep.status} (prioridade: ${getCalendarStatusPriority(toKeep.status)}) - ${toKeep.created_at}`);

      toRemove.forEach(event => {
        console.log(`  ❌ Removendo: ${event.status} (prioridade: ${getCalendarStatusPriority(event.status)}) - ${event.created_at}`);
        idsToRemove.push(event.id);
      });

      removedCount += toRemove.length;
    }

    // 5. Remover eventos duplicados
    if (idsToRemove.length > 0) {
      console.log(`🗑️ Removendo ${idsToRemove.length} eventos duplicados...`);

      const { error: deleteError } = await supabase
        .from('calendar_events')
        .delete()
        .in('id', idsToRemove);

      if (deleteError) {
        console.error('❌ Erro ao remover duplicatas:', deleteError);
        return { success: false, error: deleteError };
      }

      console.log(`✅ ${removedCount} eventos duplicados removidos com sucesso!`);
    } else {
      console.log('ℹ️ Nenhuma duplicata encontrada para remover');
    }

    return { 
      success: true, 
      removed: removedCount,
      groups: duplicateGroups.length,
      message: `${removedCount} duplicatas removidas de ${duplicateGroups.length} grupos`
    };

  } catch (error) {
    console.error('❌ Erro na limpeza de duplicatas:', error);
    return { success: false, error };
  }
}

// Disponibilizar globalmente
if (typeof window !== 'undefined') {
  (window as any).cleanDuplicateEvents = cleanDuplicateEvents;
  console.log('🧹 Script de limpeza carregado. Execute: cleanDuplicateEvents()');
}
