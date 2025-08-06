/**
 * 🔧 SCRIPT DE SINCRONIZAÇÃO DE HORÁRIOS
 * 
 * Sincroniza horários de scheduled_services para calendar_events
 * para corrigir inconsistências de horário entre os calendários
 */

import { supabase } from '@/integrations/supabase/client';

interface SyncResult {
  success: boolean;
  updated: number;
  errors: string[];
}

/**
 * Sincronizar horários de scheduled_services para calendar_events
 */
export async function syncCalendarTimes(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    updated: 0,
    errors: []
  };

  try {
    console.log('🔄 [SYNC] Iniciando sincronização de horários...');

    // 1. Buscar todos os scheduled_services com seus horários
    const { data: scheduledServices, error: scheduledError } = await supabase
      .from('scheduled_services')
      .select(`
        id,
        service_order_id,
        scheduled_start_time,
        scheduled_end_time,
        client_name
      `)
      .not('service_order_id', 'is', null);

    if (scheduledError) {
      result.errors.push(`Erro ao buscar scheduled_services: ${scheduledError.message}`);
      result.success = false;
      return result;
    }

    console.log(`📋 [SYNC] Encontrados ${scheduledServices?.length || 0} scheduled_services`);

    // 2. Para cada scheduled_service, atualizar o calendar_event correspondente
    for (const service of scheduledServices || []) {
      try {
        // Buscar calendar_event correspondente
        const { data: calendarEvents, error: calendarError } = await supabase
          .from('calendar_events')
          .select('id, start_time, end_time, client_name')
          .eq('service_order_id', service.service_order_id);

        if (calendarError) {
          result.errors.push(`Erro ao buscar calendar_event para ${service.client_name}: ${calendarError.message}`);
          continue;
        }

        if (!calendarEvents || calendarEvents.length === 0) {
          console.log(`⚠️ [SYNC] Nenhum calendar_event encontrado para ${service.client_name}`);
          continue;
        }

        // Atualizar cada calendar_event encontrado
        for (const calendarEvent of calendarEvents) {
          const currentStart = new Date(calendarEvent.start_time);
          const correctStart = new Date(service.scheduled_start_time);
          
          // Verificar se há diferença significativa (mais de 1 minuto)
          const timeDiff = Math.abs(currentStart.getTime() - correctStart.getTime());
          
          if (timeDiff > 60000) { // 1 minuto
            console.log(`🔄 [SYNC] Atualizando ${service.client_name}:`);
            console.log(`  De: ${currentStart.toLocaleString('pt-BR')}`);
            console.log(`  Para: ${correctStart.toLocaleString('pt-BR')}`);

            const { error: updateError } = await supabase
              .from('calendar_events')
              .update({
                start_time: service.scheduled_start_time,
                end_time: service.scheduled_end_time,
                updated_at: new Date().toISOString()
              })
              .eq('id', calendarEvent.id);

            if (updateError) {
              result.errors.push(`Erro ao atualizar ${service.client_name}: ${updateError.message}`);
            } else {
              result.updated++;
              console.log(`✅ [SYNC] ${service.client_name} atualizado com sucesso`);
            }
          } else {
            console.log(`ℹ️ [SYNC] ${service.client_name} já está sincronizado`);
          }
        }

      } catch (error) {
        result.errors.push(`Erro ao processar ${service.client_name}: ${error.message}`);
      }
    }

    console.log(`✅ [SYNC] Sincronização concluída: ${result.updated} atualizações`);
    
    if (result.errors.length > 0) {
      console.log(`⚠️ [SYNC] ${result.errors.length} erros encontrados:`);
      result.errors.forEach(error => console.log(`  - ${error}`));
      result.success = false;
    }

    return result;

  } catch (error) {
    console.error('❌ [SYNC] Erro geral na sincronização:', error);
    result.errors.push(`Erro geral: ${error.message}`);
    result.success = false;
    return result;
  }
}

/**
 * Executar sincronização se chamado diretamente
 */
if (typeof window !== 'undefined') {
  // Disponibilizar globalmente para teste no console
  (window as any).syncCalendarTimes = syncCalendarTimes;
  console.log('🔧 Script de sincronização carregado. Execute: syncCalendarTimes()');
}
