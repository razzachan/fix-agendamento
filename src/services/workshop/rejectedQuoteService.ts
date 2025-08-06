import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notificationTriggers } from '@/services/notifications/notificationTriggers';

/**
 * Serviço para gerenciar orçamentos rejeitados e fechamento de equipamentos
 */
export const rejectedQuoteService = {
  /**
   * Fecha um equipamento após rejeição do orçamento
   */
  async closeRejectedEquipment(
    serviceOrderId: string,
    userId: string,
    notes: string
  ): Promise<boolean> {
    try {
      console.log('🔧 [rejectedQuoteService] Fechando equipamento rejeitado:', {
        serviceOrderId,
        userId,
        notes
      });

      // 1. Criar evento de fechamento
      const closureData = {
        closed_by: userId,
        closure_date: new Date().toISOString(),
        closure_reason: 'Cliente rejeitou orçamento',
        closure_notes: notes,
        closure_method: 'workshop_portal'
      };

      const { error: eventError } = await supabase
        .rpc('insert_service_event', {
          p_service_order_id: serviceOrderId,
          p_type: 'equipment_closed',
          p_created_by: userId,
          p_description: JSON.stringify(closureData)
        });

      if (eventError) {
        console.error('❌ Erro ao criar evento de fechamento:', eventError);
        throw eventError;
      }

      // 2. Atualizar status da ordem para 'ready_for_delivery'
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({ 
          status: 'ready_for_delivery',
          completion_notes: notes || 'Equipamento fechado - orçamento rejeitado pelo cliente'
        })
        .eq('id', serviceOrderId);

      if (updateError) {
        console.error('❌ Erro ao atualizar status da ordem:', updateError);
        throw updateError;
      }

      console.log('✅ [rejectedQuoteService] Equipamento fechado com sucesso');

      // 3. Disparar notificação para admin agendar entrega
      try {
        // Buscar dados atualizados da ordem
        const { data: updatedOrder } = await supabase
          .from('service_orders')
          .select('*')
          .eq('id', serviceOrderId)
          .single();

        if (updatedOrder) {
          await notificationTriggers.onStatusChanged(updatedOrder, 'quote_rejected', 'ready_for_delivery');
        }
      } catch (notificationError) {
        console.error('⚠️ Erro ao disparar notificação de equipamento fechado:', notificationError);
        // Não falhar o processo por causa de notificação
      }

      return true;

    } catch (error) {
      console.error('❌ Erro ao fechar equipamento:', error);
      toast.error('Erro ao fechar equipamento. Tente novamente.');
      return false;
    }
  },

  /**
   * Busca ordens com orçamento rejeitado que precisam ser fechadas
   */
  async getRejectedQuotes(): Promise<any[]> {
    try {
      console.log('🔍 [rejectedQuoteService] Buscando orçamentos rejeitados');

      const { data: orders, error } = await supabase
        .from('service_orders')
        .select(`
          id,
          client_name,
          equipment_type,
          equipment_model,
          service_attendance_type,
          status,
          created_at,
          description,
          final_cost
        `)
        .eq('status', 'quote_rejected')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar orçamentos rejeitados:', error);
        throw error;
      }

      console.log(`✅ [rejectedQuoteService] ${orders?.length || 0} orçamentos rejeitados encontrados`);
      return orders || [];

    } catch (error) {
      console.error('❌ Erro ao buscar orçamentos rejeitados:', error);
      toast.error('Erro ao carregar orçamentos rejeitados.');
      return [];
    }
  }
};
