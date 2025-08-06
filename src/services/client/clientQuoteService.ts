import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ServiceOrderPricingService } from '@/services/serviceOrder/serviceOrderPricingService';
import { notificationTriggers } from '@/services/notifications/notificationTriggers';

/**
 * Serviço para gerenciar aprovação/rejeição de orçamentos pelo cliente
 */
export const clientQuoteService = {
  /**
   * Aprova um orçamento pelo cliente
   */
  async approveQuote(serviceOrderId: string, clientId: string): Promise<boolean> {
    try {
      console.log('🎯 [clientQuoteService] Aprovando orçamento:', {
        serviceOrderId,
        clientId
      });

      // 1. Criar evento de aprovação pelo cliente
      const approvalData = {
        approved_by_client: clientId,
        approval_date: new Date().toISOString(),
        approval_method: 'web_portal'
      };

      const { error: eventError } = await supabase
        .rpc('insert_service_event', {
          p_service_order_id: serviceOrderId,
          p_type: 'quote_approved',
          p_created_by: clientId,
          p_description: JSON.stringify(approvalData)
        });

      if (eventError) {
        console.error('❌ Erro ao criar evento de aprovação:', eventError);
        throw eventError;
      }

      // 2. Buscar dados do diagnóstico para atualizar preços (igual ao admin)
      const { data: diagnosisEvents } = await supabase
        .from('service_events')
        .select('description')
        .eq('service_order_id', serviceOrderId)
        .eq('type', 'diagnosis')
        .order('created_at', { ascending: false })
        .limit(1);

      // 3. Atualizar valores se houver diagnóstico
      if (diagnosisEvents && diagnosisEvents.length > 0) {
        try {
          const diagnosisJson = JSON.parse(diagnosisEvents[0].description);
          const estimatedCost = diagnosisJson.estimated_cost || diagnosisJson.total_cost;

          if (estimatedCost) {
            await ServiceOrderPricingService.updatePricingAfterQuoteApproval(
              serviceOrderId,
              estimatedCost
            );
          }
        } catch (error) {
          console.error('❌ Erro ao parsear dados de diagnóstico:', error);
        }
      }

      // 4. Atualizar status da ordem para 'quote_approved'
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({ status: 'quote_approved' })
        .eq('id', serviceOrderId);

      if (updateError) {
        console.error('❌ Erro ao atualizar status da ordem:', updateError);
        throw updateError;
      }

      console.log('✅ [clientQuoteService] Orçamento aprovado com sucesso');

      // 5. Disparar notificações para oficina
      try {
        // Buscar dados da ordem para notificação
        const { data: orderData } = await supabase
          .from('service_orders')
          .select('*')
          .eq('id', serviceOrderId)
          .single();

        if (orderData) {
          await notificationTriggers.onQuoteApproved(orderData, estimatedCost || orderData.final_cost);
        }
      } catch (notificationError) {
        console.error('⚠️ Erro ao disparar notificações:', notificationError);
        // Não falhar o processo por causa de notificação
      }

      return true;

    } catch (error) {
      console.error('❌ Erro ao aprovar orçamento:', error);
      toast.error('Erro ao aprovar orçamento. Tente novamente.');
      return false;
    }
  },

  /**
   * Rejeita um orçamento pelo cliente
   */
  async rejectQuote(serviceOrderId: string, clientId: string, reason?: string): Promise<boolean> {
    try {
      console.log('🎯 [clientQuoteService] Rejeitando orçamento:', {
        serviceOrderId,
        clientId,
        reason
      });

      // 1. Criar evento de rejeição pelo cliente
      const rejectionData = {
        rejected_by_client: clientId,
        rejection_date: new Date().toISOString(),
        rejection_reason: reason || 'Cliente rejeitou o orçamento',
        rejection_method: 'web_portal'
      };

      const { error: eventError } = await supabase
        .rpc('insert_service_event', {
          p_service_order_id: serviceOrderId,
          p_type: 'quote_rejected',
          p_created_by: clientId,
          p_description: JSON.stringify(rejectionData)
        });

      if (eventError) {
        console.error('❌ Erro ao criar evento de rejeição:', eventError);
        throw eventError;
      }

      // 2. Atualizar status da ordem para 'quote_rejected'
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({ status: 'quote_rejected' })
        .eq('id', serviceOrderId);

      if (updateError) {
        console.error('❌ Erro ao atualizar status da ordem:', updateError);
        throw updateError;
      }

      console.log('✅ [clientQuoteService] Orçamento rejeitado com sucesso');

      // 3. Disparar notificações para oficina
      try {
        // Buscar dados da ordem para notificação
        const { data: orderData } = await supabase
          .from('service_orders')
          .select('*')
          .eq('id', serviceOrderId)
          .single();

        if (orderData) {
          await notificationTriggers.onStatusChanged(orderData, 'awaiting_quote_approval', 'quote_rejected');
        }
      } catch (notificationError) {
        console.error('⚠️ Erro ao disparar notificações:', notificationError);
        // Não falhar o processo por causa de notificação
      }

      return true;

    } catch (error) {
      console.error('❌ Erro ao rejeitar orçamento:', error);
      toast.error('Erro ao rejeitar orçamento. Tente novamente.');
      return false;
    }
  }
};
