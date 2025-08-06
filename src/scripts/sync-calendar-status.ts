/**
 * 🔄 SCRIPT DE SINCRONIZAÇÃO DE STATUS
 * 
 * Sincroniza os status dos eventos do calendário com os status das ordens de serviço
 * para garantir que o calendário reflita o estado atual do lifecycle
 */

import { supabase } from '@/integrations/supabase/client';

// Mapeamento de status ServiceOrder → CalendarEvent
const SERVICE_ORDER_TO_CALENDAR_STATUS = {
  'pending': 'scheduled',
  'scheduled': 'scheduled',
  'scheduled_collection': 'scheduled',        // ✅ NOVO: Coleta agendada
  'on_the_way': 'on_the_way',
  'in_progress': 'in_progress',
  'collected': 'at_workshop',
  'collected_for_diagnosis': 'at_workshop',   // ✅ NOVO: Coletado para diagnóstico
  'at_workshop': 'at_workshop',
  'received_at_workshop': 'at_workshop',
  'diagnosis_completed': 'diagnosis',
  'quote_sent': 'awaiting_approval',          // ✅ NOVO: Orçamento enviado
  'awaiting_quote_approval': 'awaiting_approval',
  'quote_approved': 'in_repair',
  'quote_rejected': 'cancelled',
  'ready_for_return': 'cancelled',            // ✅ NOVO: Pronto para devolução (cancelado)
  'needs_workshop': 'at_workshop',            // ✅ NOVO: Necessita oficina
  'in_repair': 'in_repair',
  'ready_for_delivery': 'ready_delivery',
  'delivery_scheduled': 'ready_delivery',
  'collected_for_delivery': 'ready_delivery', // ✅ CORRIGIDO: Coletado da oficina = Pronto para entrega
  'on_the_way_to_deliver': 'on_the_way',
  'payment_pending': 'ready_delivery',
  'completed': 'completed',
  'cancelled': 'cancelled'
} as const;

interface SyncResult {
  success: boolean;
  updated: number;
  errors: string[];
  details: Array<{
    client_name: string;
    old_status: string;
    new_status: string;
    service_order_status: string;
  }>;
}

export async function syncCalendarStatus(): Promise<SyncResult> {
  try {
    console.log('🔄 Iniciando sincronização de status do calendário...');

    // 1. Buscar todos os eventos do calendário com service_order_id
    const { data: calendarEvents, error: calendarError } = await supabase
      .from('calendar_events')
      .select('id, client_name, status, service_order_id')
      .not('service_order_id', 'is', null);

    if (calendarError) {
      console.error('❌ Erro ao buscar eventos do calendário:', calendarError);
      return { success: false, updated: 0, errors: [calendarError.message], details: [] };
    }

    console.log(`📋 Encontrados ${calendarEvents?.length || 0} eventos com service_order_id`);

    if (!calendarEvents || calendarEvents.length === 0) {
      return { success: true, updated: 0, errors: [], details: [] };
    }

    // 2. Buscar os status atuais das ordens de serviço
    const serviceOrderIds = calendarEvents.map(e => e.service_order_id).filter(Boolean);
    
    const { data: serviceOrders, error: serviceOrderError } = await supabase
      .from('service_orders')
      .select('id, status')
      .in('id', serviceOrderIds);

    if (serviceOrderError) {
      console.error('❌ Erro ao buscar ordens de serviço:', serviceOrderError);
      return { success: false, updated: 0, errors: [serviceOrderError.message], details: [] };
    }

    console.log(`📋 Encontradas ${serviceOrders?.length || 0} ordens de serviço`);

    // 3. Criar mapa de status das ordens de serviço
    const serviceOrderStatusMap = new Map<string, string>();
    serviceOrders?.forEach(order => {
      serviceOrderStatusMap.set(order.id, order.status);
    });

    // 4. Identificar eventos que precisam ser atualizados
    const eventsToUpdate: Array<{
      id: string;
      client_name: string;
      old_status: string;
      new_status: string;
      service_order_status: string;
    }> = [];

    calendarEvents.forEach(event => {
      const serviceOrderStatus = serviceOrderStatusMap.get(event.service_order_id);
      if (!serviceOrderStatus) {
        console.warn(`⚠️ Ordem de serviço não encontrada: ${event.service_order_id}`);
        return;
      }

      const expectedCalendarStatus = SERVICE_ORDER_TO_CALENDAR_STATUS[serviceOrderStatus as keyof typeof SERVICE_ORDER_TO_CALENDAR_STATUS];
      if (!expectedCalendarStatus) {
        console.warn(`⚠️ Status não mapeado: ${serviceOrderStatus}`);
        return;
      }

      if (event.status !== expectedCalendarStatus) {
        eventsToUpdate.push({
          id: event.id,
          client_name: event.client_name,
          old_status: event.status,
          new_status: expectedCalendarStatus,
          service_order_status: serviceOrderStatus
        });
      }
    });

    console.log(`🔍 Encontrados ${eventsToUpdate.length} eventos para atualizar:`);
    eventsToUpdate.forEach(update => {
      console.log(`  - ${update.client_name}: ${update.old_status} → ${update.new_status} (OS: ${update.service_order_status})`);
    });

    // 5. Atualizar os eventos
    let updatedCount = 0;
    const errors: string[] = [];

    for (const update of eventsToUpdate) {
      try {
        const { error: updateError } = await supabase
          .from('calendar_events')
          .update({ status: update.new_status })
          .eq('id', update.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar evento ${update.id}:`, updateError);
          errors.push(`${update.client_name}: ${updateError.message}`);
        } else {
          console.log(`✅ ${update.client_name}: ${update.old_status} → ${update.new_status}`);
          updatedCount++;
        }
      } catch (error) {
        console.error(`❌ Erro inesperado ao atualizar evento ${update.id}:`, error);
        errors.push(`${update.client_name}: ${error}`);
      }
    }

    console.log(`✅ Sincronização concluída: ${updatedCount} eventos atualizados`);

    return {
      success: errors.length === 0,
      updated: updatedCount,
      errors,
      details: eventsToUpdate
    };

  } catch (error) {
    console.error('❌ Erro na sincronização de status:', error);
    return { success: false, updated: 0, errors: [String(error)], details: [] };
  }
}

// Disponibilizar globalmente
if (typeof window !== 'undefined') {
  (window as any).syncCalendarStatus = syncCalendarStatus;
  console.log('🔄 Script de sincronização carregado. Execute: syncCalendarStatus()');
}
