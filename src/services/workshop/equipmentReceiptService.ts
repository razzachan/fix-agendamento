import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notificationTriggers } from '@/services/notifications/notificationTriggers';
import { mapServiceOrder } from '@/services/serviceOrder/queries/mapServiceOrder';

/**
 * Service para gerenciar recebimento de equipamentos na oficina
 */
export const equipmentReceiptService = {
  /**
   * Confirma o recebimento de um equipamento na oficina
   * Atualiza status de 'at_workshop' para 'received_at_workshop'
   * e associa o equipamento à oficina responsável
   */
  async confirmReceipt(
    serviceOrderId: string,
    workshopUserId: string,
    notes?: string
  ): Promise<boolean> {
    try {
      console.log('🎯 [equipmentReceiptService] Confirmando recebimento:', {
        serviceOrderId,
        workshopUserId,
        notes
      });

      // 1. Buscar informações da oficina
      const { data: workshopUser, error: workshopError } = await supabase
        .from('users')
        .select('name')
        .eq('id', workshopUserId)
        .eq('role', 'workshop')
        .single();

      if (workshopError) {
        console.error('❌ Erro ao buscar dados da oficina:', workshopError);
        throw workshopError;
      }

      // 2. Atualizar status da ordem de serviço e associar à oficina
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({
          status: 'received_at_workshop',
          workshop_id: workshopUserId,
          workshop_name: workshopUser.name
        })
        .eq('id', serviceOrderId);

      if (updateError) {
        console.error('❌ Erro ao atualizar status da ordem:', updateError);
        throw updateError;
      }

      // 2. Criar evento de recebimento no histórico
      const eventDescription = notes 
        ? `Equipamento recebido na oficina. Observações: ${notes}`
        : 'Equipamento recebido na oficina';

      const { error: eventError } = await supabase
        .rpc('insert_service_event', {
          p_service_order_id: serviceOrderId,
          p_type: 'status_change',
          p_created_by: workshopUserId,
          p_description: eventDescription
        });

      if (eventError) {
        console.error('❌ Erro ao criar evento de recebimento:', eventError);
        // Não falha aqui, pois o status já foi atualizado
      }

      // 4. Buscar dados atualizados da ordem para notificações
      const { data: updatedOrder, error: fetchUpdatedError } = await supabase
        .from('service_orders')
        .select('*')
        .eq('id', serviceOrderId)
        .single();

      if (!fetchUpdatedError && updatedOrder) {
        // Mapear para ServiceOrder e disparar notificações
        const serviceOrder = mapServiceOrder(updatedOrder);

        // Disparar notificações de associação à oficina
        await notificationTriggers.onWorkshopAssigned(serviceOrder, workshopUser.name);

        // Disparar notificações de mudança de status
        await notificationTriggers.onStatusChanged(
          serviceOrder,
          'at_workshop',
          'received_at_workshop',
          { workshopName: workshopUser.name }
        );
      }

      console.log('✅ [equipmentReceiptService] Recebimento confirmado com sucesso');
      return true;

    } catch (error) {
      console.error('❌ Erro ao confirmar recebimento:', error);
      toast.error('Erro ao confirmar recebimento do equipamento.');
      return false;
    }
  },

  /**
   * Busca equipamentos pendentes de recebimento para uma oficina específica
   * Status 'at_workshop' = enviado para oficina mas ainda não confirmado recebimento
   */
  async getPendingEquipments(workshopUserId: string): Promise<any[]> {
    try {
      console.log('🎯 [equipmentReceiptService] Buscando equipamentos pendentes para oficina:', workshopUserId);

      // Por enquanto, buscar todas as ordens com status 'at_workshop'
      // TODO: Implementar associação específica de oficinas quando o sistema estiver mais maduro
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
          scheduled_date,
          description
        `)
        .eq('status', 'at_workshop')
        .eq('current_location', 'workshop');

      if (error) {
        console.error('❌ Erro ao buscar equipamentos pendentes:', error);
        throw error;
      }

      console.log(`✅ [equipmentReceiptService] ${orders?.length || 0} equipamentos pendentes encontrados`);
      return orders || [];

    } catch (error) {
      console.error('❌ Erro ao buscar equipamentos pendentes:', error);
      return [];
    }
  },

  /**
   * Busca equipamentos já recebidos na oficina
   * Status 'received_at_workshop' = confirmado recebimento, aguardando diagnóstico/reparo
   */
  async getReceivedEquipments(workshopUserId: string): Promise<any[]> {
    try {
      console.log('🎯 [equipmentReceiptService] Buscando equipamentos recebidos para oficina:', workshopUserId);

      // Por enquanto, buscar todas as ordens com status 'received_at_workshop'
      // TODO: Implementar associação específica de oficinas quando o sistema estiver mais maduro
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
          scheduled_date,
          description
        `)
        .eq('status', 'received_at_workshop')
        .eq('current_location', 'workshop');

      if (error) {
        console.error('❌ Erro ao buscar equipamentos recebidos:', error);
        throw error;
      }

      console.log(`✅ [equipmentReceiptService] ${orders?.length || 0} equipamentos recebidos encontrados`);
      return orders || [];

    } catch (error) {
      console.error('❌ Erro ao buscar equipamentos recebidos:', error);
      return [];
    }
  }
};
