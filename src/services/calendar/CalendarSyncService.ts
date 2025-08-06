/**
 * 🔄 SERVIÇO DE SINCRONIZAÇÃO ENTRE SERVICE_ORDERS E CALENDAR_EVENTS
 * 
 * Garante que os eventos do calendário sempre reflitam o status atual das ordens de serviço
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  'delivery_scheduled': 'ready_delivery', // ✅ Status que estava faltando!
  'collected_for_delivery': 'ready_delivery', // ✅ CORRIGIDO: Coletado da oficina = Pronto para entrega
  'on_the_way_to_deliver': 'on_the_way',
  'payment_pending': 'ready_delivery',
  'completed': 'completed',
  'cancelled': 'cancelled'
} as const;

export class CalendarSyncService {
  
  /**
   * Sincronizar um evento específico com sua ordem de serviço
   */
  static async syncEventWithServiceOrder(serviceOrderId: string): Promise<boolean> {
    try {
      console.log(`🔄 [CalendarSync] Sincronizando eventos para ordem ${serviceOrderId}`);

      // 1. Buscar status atual da ordem de serviço
      const { data: serviceOrder, error: orderError } = await supabase
        .from('service_orders')
        .select('id, status, client_name')
        .eq('id', serviceOrderId)
        .single();

      if (orderError || !serviceOrder) {
        console.error('❌ [CalendarSync] Ordem de serviço não encontrada:', orderError);
        return false;
      }

      // 2. Buscar eventos do calendário relacionados
      const { data: calendarEvents, error: eventsError } = await supabase
        .from('calendar_events')
        .select('id, status, event_type, client_name')
        .eq('service_order_id', serviceOrderId);

      if (eventsError) {
        console.error('❌ [CalendarSync] Erro ao buscar eventos:', eventsError);
        return false;
      }

      if (!calendarEvents || calendarEvents.length === 0) {
        console.log(`ℹ️ [CalendarSync] Nenhum evento encontrado para ordem ${serviceOrderId}`);
        return true;
      }

      // 3. Determinar status correto para cada tipo de evento
      const newCalendarStatus = SERVICE_ORDER_TO_CALENDAR_STATUS[serviceOrder.status as keyof typeof SERVICE_ORDER_TO_CALENDAR_STATUS] || 'scheduled';

      console.log(`📊 [CalendarSync] Ordem ${serviceOrder.client_name}: ${serviceOrder.status} → ${newCalendarStatus}`);

      // 4. Atualizar eventos que precisam de sincronização
      let updatedCount = 0;
      
      for (const event of calendarEvents) {
        let targetStatus = newCalendarStatus;

        // Lógica especial para diferentes tipos de evento
        if (event.event_type === 'service' && serviceOrder.status === 'delivery_scheduled') {
          // Se a entrega está agendada, o serviço deve estar concluído
          targetStatus = 'completed';
        } else if (event.event_type === 'delivery' && serviceOrder.status === 'delivery_scheduled') {
          // Se a entrega está agendada, o evento de entrega deve estar pronto
          targetStatus = 'ready_delivery';
        }

        if (event.status !== targetStatus) {
          console.log(`🔄 [CalendarSync] Atualizando evento ${event.id}: ${event.status} → ${targetStatus}`);

          const { error: updateError } = await supabase
            .from('calendar_events')
            .update({
              status: targetStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', event.id);

          if (updateError) {
            console.error(`❌ [CalendarSync] Erro ao atualizar evento ${event.id}:`, updateError);
          } else {
            updatedCount++;
            console.log(`✅ [CalendarSync] Evento ${event.id} atualizado com sucesso`);
          }
        }
      }

      if (updatedCount > 0) {
        console.log(`✅ [CalendarSync] ${updatedCount} eventos sincronizados para ${serviceOrder.client_name}`);
        return true;
      } else {
        console.log(`ℹ️ [CalendarSync] Eventos já estão sincronizados para ${serviceOrder.client_name}`);
        return true;
      }

    } catch (error) {
      console.error('❌ [CalendarSync] Erro na sincronização:', error);
      return false;
    }
  }

  /**
   * Sincronizar todos os eventos desatualizados
   */
  static async syncAllEvents(): Promise<{ synced: number; errors: number }> {
    try {
      console.log('🔄 [CalendarSync] Iniciando sincronização geral...');

      // Buscar todas as ordens de serviço ativas
      const { data: serviceOrders, error: ordersError } = await supabase
        .from('service_orders')
        .select('id, status, client_name')
        .neq('status', 'cancelled')
        .neq('status', 'completed');

      if (ordersError) {
        console.error('❌ [CalendarSync] Erro ao buscar ordens:', ordersError);
        return { synced: 0, errors: 1 };
      }

      let syncedCount = 0;
      let errorCount = 0;

      for (const order of serviceOrders || []) {
        const success = await this.syncEventWithServiceOrder(order.id);
        if (success) {
          syncedCount++;
        } else {
          errorCount++;
        }
      }

      console.log(`✅ [CalendarSync] Sincronização concluída: ${syncedCount} sucessos, ${errorCount} erros`);
      
      if (syncedCount > 0) {
        toast.success(`${syncedCount} eventos sincronizados com sucesso!`);
      }

      return { synced: syncedCount, errors: errorCount };

    } catch (error) {
      console.error('❌ [CalendarSync] Erro na sincronização geral:', error);
      return { synced: 0, errors: 1 };
    }
  }

  /**
   * Verificar e corrigir inconsistências específicas
   */
  static async fixInconsistencies(): Promise<boolean> {
    try {
      console.log('🔍 [CalendarSync] Verificando inconsistências...');

      // Query para encontrar eventos desatualizados
      const { data: inconsistencies, error } = await supabase
        .from('calendar_events')
        .select(`
          id,
          status as event_status,
          event_type,
          client_name,
          service_order_id,
          service_orders!inner(
            id,
            status as order_status,
            client_name
          )
        `)
        .neq('service_orders.status', 'cancelled');

      if (error) {
        console.error('❌ [CalendarSync] Erro ao verificar inconsistências:', error);
        return false;
      }

      let fixedCount = 0;

      for (const item of inconsistencies || []) {
        const orderStatus = (item as any).service_orders.status;
        const expectedEventStatus = SERVICE_ORDER_TO_CALENDAR_STATUS[orderStatus as keyof typeof SERVICE_ORDER_TO_CALENDAR_STATUS] || 'scheduled';

        // Lógica especial para eventos de entrega
        let targetStatus = expectedEventStatus;
        if (item.event_type === 'delivery' && orderStatus === 'delivery_scheduled') {
          targetStatus = 'ready_delivery';
        } else if (item.event_type === 'service' && orderStatus === 'delivery_scheduled') {
          targetStatus = 'completed';
        }

        if (item.event_status !== targetStatus) {
          console.log(`🔧 [CalendarSync] Corrigindo inconsistência: ${item.client_name} (${item.event_type}) ${item.event_status} → ${targetStatus}`);

          const { error: updateError } = await supabase
            .from('calendar_events')
            .update({
              status: targetStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);

          if (!updateError) {
            fixedCount++;
          }
        }
      }

      if (fixedCount > 0) {
        console.log(`✅ [CalendarSync] ${fixedCount} inconsistências corrigidas`);
        toast.success(`${fixedCount} inconsistências corrigidas!`);
      } else {
        console.log('ℹ️ [CalendarSync] Nenhuma inconsistência encontrada');
      }

      return true;

    } catch (error) {
      console.error('❌ [CalendarSync] Erro ao corrigir inconsistências:', error);
      return false;
    }
  }
}

export default CalendarSyncService;
