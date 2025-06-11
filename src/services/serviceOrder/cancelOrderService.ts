import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Service para cancelamento de ordens de serviço
 */
export const cancelOrderService = {
  /**
   * Cancela uma ordem de serviço com motivo
   */
  async cancelOrder(serviceOrderId: string, cancellationReason: string, cancelledBy: string = 'Sistema'): Promise<boolean> {
    try {
      console.log('🎯 [cancelOrderService] Cancelando ordem:', {
        serviceOrderId,
        cancellationReason,
        cancelledBy
      });

      // 1. Atualizar status da ordem para 'cancelled'
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({ 
          status: 'cancelled',
          completed_date: new Date().toISOString()
        })
        .eq('id', serviceOrderId);

      if (updateError) {
        console.error('❌ Erro ao atualizar status da ordem:', updateError);
        throw updateError;
      }

      // 2. Registrar evento de cancelamento no histórico
      const eventDescription = `Ordem cancelada. Motivo: ${cancellationReason}`;
      
      const { error: eventError } = await supabase
        .rpc('insert_service_event', {
          p_service_order_id: serviceOrderId,
          p_type: 'note',
          p_created_by: cancelledBy,
          p_description: eventDescription
        });

      if (eventError) {
        console.error('❌ Erro ao criar evento de cancelamento:', eventError);
        // Não falha aqui, pois o status já foi atualizado
      }

      // 3. Atualizar serviços agendados relacionados
      try {
        const { error: scheduledError } = await supabase
          .from('scheduled_services')
          .update({ status: 'cancelled' })
          .eq('service_order_id', serviceOrderId);

        if (scheduledError) {
          console.error('❌ Erro ao atualizar serviços agendados:', scheduledError);
          // Não falha aqui, pois o principal já foi feito
        }
      } catch (scheduledUpdateError) {
        console.error('❌ Erro ao sincronizar cancelamento com agendamentos:', scheduledUpdateError);
        // Não falha aqui
      }

      console.log('✅ [cancelOrderService] Ordem cancelada com sucesso');
      return true;

    } catch (error) {
      console.error('❌ Erro ao cancelar ordem:', error);
      toast.error('Erro ao cancelar ordem de serviço.');
      return false;
    }
  },

  /**
   * Busca o motivo de cancelamento de uma ordem
   */
  async getCancellationReason(serviceOrderId: string): Promise<string | null> {
    try {
      console.log('🎯 [cancelOrderService] Buscando motivo de cancelamento:', serviceOrderId);

      const { data, error } = await supabase
        .from('service_events')
        .select('description')
        .eq('service_order_id', serviceOrderId)
        .eq('type', 'note')
        .ilike('description', '%Ordem cancelada%')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('❌ Erro ao buscar motivo de cancelamento:', error);
        return null;
      }

      if (data && data.length > 0) {
        // Extrair motivo da descrição
        const description = data[0].description;
        const reasonMatch = description.match(/Motivo:\s*(.+)/);
        return reasonMatch ? reasonMatch[1] : description;
      }

      return null;

    } catch (error) {
      console.error('❌ Erro ao buscar motivo de cancelamento:', error);
      return null;
    }
  },

  /**
   * Verifica se uma ordem pode ser cancelada
   */
  canCancelOrder(status: string): boolean {
    const nonCancellableStatuses = ['completed', 'cancelled'];
    return !nonCancellableStatuses.includes(status);
  },

  /**
   * Obtém estatísticas de cancelamentos
   */
  async getCancellationStats(technicianId?: string): Promise<{
    totalCancelled: number;
    thisMonth: number;
    topReasons: Array<{ reason: string; count: number }>;
  }> {
    try {
      console.log('🎯 [cancelOrderService] Buscando estatísticas de cancelamento');

      let query = supabase
        .from('service_orders')
        .select('id, created_at')
        .eq('status', 'cancelled');

      if (technicianId) {
        query = query.eq('technician_id', technicianId);
      }

      const { data: cancelledOrders, error } = await query;

      if (error) {
        console.error('❌ Erro ao buscar ordens canceladas:', error);
        return { totalCancelled: 0, thisMonth: 0, topReasons: [] };
      }

      const totalCancelled = cancelledOrders?.length || 0;
      
      // Calcular cancelamentos deste mês
      const thisMonth = cancelledOrders?.filter(order => {
        const orderDate = new Date(order.created_at);
        const now = new Date();
        return orderDate.getMonth() === now.getMonth() && 
               orderDate.getFullYear() === now.getFullYear();
      }).length || 0;

      // TODO: Implementar análise de motivos mais comuns
      const topReasons: Array<{ reason: string; count: number }> = [];

      return {
        totalCancelled,
        thisMonth,
        topReasons
      };

    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas de cancelamento:', error);
      return { totalCancelled: 0, thisMonth: 0, topReasons: [] };
    }
  }
};
