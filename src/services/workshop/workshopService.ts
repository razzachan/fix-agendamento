import { supabase } from '@/integrations/supabase/client';

export interface Workshop {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
}

/**
 * Service para gerenciar oficinas
 */
export const workshopService = {
  /**
   * Busca todas as oficinas disponíveis
   */
  async getAllWorkshops(): Promise<Workshop[]> {
    try {
      console.log('🎯 [workshopService] Buscando todas as oficinas');

      const { data: workshops, error } = await supabase
        .from('users')
        .select('id, name, email, phone, address, city, state')
        .eq('role', 'workshop')
        .order('name');

      if (error) {
        console.error('❌ Erro ao buscar oficinas:', error);
        throw error;
      }

      console.log(`✅ [workshopService] ${workshops?.length || 0} oficinas encontradas`);
      return workshops || [];

    } catch (error) {
      console.error('❌ Erro ao buscar oficinas:', error);
      return [];
    }
  },

  /**
   * Busca uma oficina específica por ID
   */
  async getWorkshopById(workshopId: string): Promise<Workshop | null> {
    try {
      console.log('🎯 [workshopService] Buscando oficina:', workshopId);

      const { data: workshop, error } = await supabase
        .from('users')
        .select('id, name, email, phone, address, city, state')
        .eq('id', workshopId)
        .eq('role', 'workshop')
        .single();

      if (error) {
        console.error('❌ Erro ao buscar oficina:', error);
        return null;
      }

      console.log('✅ [workshopService] Oficina encontrada:', workshop.name);
      return workshop;

    } catch (error) {
      console.error('❌ Erro ao buscar oficina:', error);
      return null;
    }
  },

  /**
   * Associa uma ordem de serviço a uma oficina específica
   */
  async assignOrderToWorkshop(serviceOrderId: string, workshopId: string): Promise<boolean> {
    try {
      console.log('🎯 [workshopService] Associando ordem à oficina:', {
        serviceOrderId,
        workshopId
      });

      // 1. Buscar informações da oficina
      const workshop = await this.getWorkshopById(workshopId);
      if (!workshop) {
        throw new Error('Oficina não encontrada');
      }

      // 2. Atualizar a ordem de serviço
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({
          workshop_id: workshopId,
          workshop_name: workshop.name
        })
        .eq('id', serviceOrderId);

      if (updateError) {
        console.error('❌ Erro ao associar ordem à oficina:', updateError);
        throw updateError;
      }

      // 3. Criar evento no histórico
      const { error: eventError } = await supabase
        .from('service_events')
        .insert({
          service_order_id: serviceOrderId,
          type: 'note',
          description: `Equipamento associado à oficina: ${workshop.name}`,
          created_by: 'Sistema'
        });

      if (eventError) {
        console.error('❌ Erro ao criar evento:', eventError);
        // Não falha aqui, pois a associação já foi feita
      }

      console.log('✅ [workshopService] Ordem associada à oficina com sucesso');
      return true;

    } catch (error) {
      console.error('❌ Erro ao associar ordem à oficina:', error);
      return false;
    }
  },

  /**
   * Remove a associação de uma ordem de serviço com uma oficina
   */
  async unassignOrderFromWorkshop(serviceOrderId: string): Promise<boolean> {
    try {
      console.log('🎯 [workshopService] Removendo associação da ordem:', serviceOrderId);

      const { error: updateError } = await supabase
        .from('service_orders')
        .update({
          workshop_id: null,
          workshop_name: null
        })
        .eq('id', serviceOrderId);

      if (updateError) {
        console.error('❌ Erro ao remover associação:', updateError);
        throw updateError;
      }

      // Criar evento no histórico
      const { error: eventError } = await supabase
        .from('service_events')
        .insert({
          service_order_id: serviceOrderId,
          type: 'note',
          description: 'Associação com oficina removida',
          created_by: 'Sistema'
        });

      if (eventError) {
        console.error('❌ Erro ao criar evento:', eventError);
        // Não falha aqui, pois a remoção já foi feita
      }

      console.log('✅ [workshopService] Associação removida com sucesso');
      return true;

    } catch (error) {
      console.error('❌ Erro ao remover associação:', error);
      return false;
    }
  },

  /**
   * Busca ordens de serviço de uma oficina específica
   */
  async getOrdersByWorkshop(workshopId: string): Promise<any[]> {
    try {
      console.log('🎯 [workshopService] Buscando ordens da oficina:', workshopId);

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
          description,
          workshop_name
        `)
        .eq('workshop_id', workshopId)
        .eq('current_location', 'workshop')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar ordens da oficina:', error);
        throw error;
      }

      console.log(`✅ [workshopService] ${orders?.length || 0} ordens encontradas para a oficina`);
      return orders || [];

    } catch (error) {
      console.error('❌ Erro ao buscar ordens da oficina:', error);
      return [];
    }
  }
};
