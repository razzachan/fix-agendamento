import { supabase } from '@/integrations/supabase/client';
import { ServiceOrder, ServiceOrderStatus } from '@/types';
import { RecycleType, RecycleOptions } from '@/components/ServiceOrders/RecycleOrderDialog';

export interface RecycleHistory {
  id: string;
  order_id: string;
  recycle_type: RecycleType;
  previous_status: ServiceOrderStatus;
  new_status: ServiceOrderStatus;
  reason: string;
  notes?: string;
  recycled_by: string;
  recycled_at: string;
  previous_technician_id?: string;
  new_technician_id?: string;
  previous_service_type?: string;
  new_service_type?: string;
  previous_scheduled_date?: string;
  new_scheduled_date?: string;
}

class RecycleOrderService {
  /**
   * Recicla uma ordem cancelada
   */
  async recycleOrder(
    orderId: string,
    recycleType: RecycleType,
    options: RecycleOptions,
    userId: string
  ): Promise<any> {
    try {
      // 1. Buscar a ordem atual
      const { data: currentOrder, error: fetchError } = await supabase
        .from('service_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError || !currentOrder) {
        throw new Error('Ordem não encontrada');
      }

      if (currentOrder.status !== 'cancelled') {
        throw new Error('Apenas ordens canceladas podem ser recicladas');
      }

      let result;

      // 2. Processar baseado no tipo de reciclagem
      switch (recycleType) {
        case 'reschedule':
          // Para reagendamento, criar novo pré-agendamento
          result = await this.createPreScheduling(currentOrder, options, userId);
          break;

        case 'reassign':
          // Para reatribuição, apenas mudar técnico na ordem atual
          result = await this.reassignOrder(currentOrder, options, userId);
          break;

        case 'reactivate':
          // Para reativação, criar novo pré-agendamento
          result = await this.createPreScheduling(currentOrder, options, userId);
          break;

        case 'convert_type':
          // Para conversão de tipo, criar novo pré-agendamento com novo tipo
          result = await this.createPreScheduling(currentOrder, options, userId);
          break;

        default:
          throw new Error('Tipo de reciclagem não suportado');
      }

      // 3. Registrar histórico de reciclagem
      await this.createRecycleHistory({
        order_id: orderId,
        recycle_type: recycleType,
        previous_status: currentOrder.status,
        new_status: recycleType === 'reassign' ? 'scheduled' : 'pending',
        reason: options.reason,
        notes: options.notes,
        recycled_by: userId,
        recycled_at: new Date().toISOString(),
        previous_technician_id: currentOrder.technician_id,
        new_technician_id: options.newTechnicianId,
        previous_service_type: currentOrder.service_type,
        new_service_type: options.newServiceType,
      });

      // 4. Criar notificação
      await this.createRecycleNotification(orderId, recycleType, userId);

      return result;
    } catch (error) {
      console.error('Erro ao reciclar ordem:', error);
      throw error;
    }
  }

  /**
   * Cria um novo pré-agendamento na tabela agendamentos_ai
   */
  private async createPreScheduling(
    originalOrder: ServiceOrder,
    options: RecycleOptions,
    userId: string
  ): Promise<any> {
    try {
      // Preparar dados para o pré-agendamento
      const recycleInfo = `RECICLAGEM: ${options.reason}${options.notes ? ` | Obs: ${options.notes}` : ''}`;
      const preSchedulingData = {
        nome: originalOrder.client_name || 'Cliente não informado',
        endereco: originalOrder.address || originalOrder.clientFullAddress || 'Endereço não informado',
        equipamento: originalOrder.equipment_type || originalOrder.equipmentType || 'Equipamento não informado',
        problema: `${originalOrder.description || originalOrder.clientDescription || 'Problema não informado'} | ${recycleInfo}`,
        telefone: originalOrder.client_phone || originalOrder.clientPhone || '',
        email: originalOrder.client_email || originalOrder.clientEmail || '',
        cpf: originalOrder.client_cpf || originalOrder.clientCpfCnpj || '',
        urgente: false,
        status: 'pendente',
        tecnico: null,
        created_at: new Date().toISOString()
      };

      // Inserir na tabela agendamentos_ai
      const { data: newPreScheduling, error: insertError } = await supabase
        .from('agendamentos_ai')
        .insert([preSchedulingData])
        .select()
        .single();

      if (insertError) {
        throw new Error(`Erro ao criar pré-agendamento: ${insertError.message}`);
      }

      // Nota: Não alteramos o status da ordem original
      // O histórico de reciclagem é suficiente para rastrear que foi reciclada

      return newPreScheduling;
    } catch (error) {
      console.error('Erro ao criar pré-agendamento:', error);
      throw error;
    }
  }

  /**
   * Reatribui uma ordem para outro técnico
   */
  private async reassignOrder(
    currentOrder: ServiceOrder,
    options: RecycleOptions,
    userId: string
  ): Promise<ServiceOrder> {
    try {
      if (!options.newTechnicianId) {
        throw new Error('ID do novo técnico é obrigatório para reatribuição');
      }

      const { data: updatedOrder, error: updateError } = await supabase
        .from('service_orders')
        .update({
          technician_id: options.newTechnicianId,
          status: 'scheduled'
        })
        .eq('id', currentOrder.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Erro ao reatribuir ordem: ${updateError.message}`);
      }

      return updatedOrder;
    } catch (error) {
      console.error('Erro ao reatribuir ordem:', error);
      throw error;
    }
  }

  /**
   * Determina o novo status baseado no tipo de reciclagem
   */
  private getNewStatusForRecycleType(
    recycleType: RecycleType,
    currentOrder: ServiceOrder
  ): ServiceOrderStatus {
    switch (recycleType) {
      case 'reschedule':
        // Reagendamento volta para pending para novo processo de agendamento
        return 'pending';

      case 'reassign':
        // Reatribuição mantém agendamento mas muda técnico
        return 'scheduled';

      case 'reactivate':
        // Reativação volta ao status anterior ao cancelamento
        // Por simplicidade, vamos para 'pending' para reprocessamento
        return 'pending';

      case 'convert_type':
        // Conversão de tipo volta para pending para novo agendamento
        return 'pending';

      default:
        return 'pending';
    }
  }

  /**
   * Cria registro no histórico de reciclagem
   */
  private async createRecycleHistory(historyData: Omit<RecycleHistory, 'id'>): Promise<void> {
    const { error } = await supabase
      .from('recycle_history')
      .insert([historyData]);

    if (error) {
      console.error('Erro ao criar histórico de reciclagem:', error);
      // Não falha a operação principal se o histórico falhar
    }
  }

  /**
   * Cria notificação de reciclagem
   */
  private async createRecycleNotification(
    orderId: string, 
    recycleType: RecycleType, 
    userId: string
  ): Promise<void> {
    const messages = {
      reschedule: 'Ordem reagendada com sucesso',
      reassign: 'Ordem reatribuída para novo técnico',
      reactivate: 'Ordem reativada com sucesso',
      convert_type: 'Tipo de atendimento convertido'
    };

    // Implementar sistema de notificações se existir
    console.log(`Notificação: ${messages[recycleType]} - OS #${orderId}`);
  }

  /**
   * Busca histórico de reciclagem de uma ordem
   */
  async getRecycleHistory(orderId: string): Promise<RecycleHistory[]> {
    try {
      const { data, error } = await supabase
        .from('recycle_history')
        .select('*')
        .eq('order_id', orderId)
        .order('recycled_at', { ascending: false });

      if (error) {
        throw new Error(`Erro ao buscar histórico: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar histórico de reciclagem:', error);
      return [];
    }
  }

  /**
   * Busca estatísticas de reciclagem
   */
  async getRecycleStats(period: 'week' | 'month' | 'year' = 'month'): Promise<{
    totalRecycled: number;
    byType: Record<RecycleType, number>;
    successRate: number;
  }> {
    try {
      // Calcular data de início baseada no período
      const now = new Date();
      const startDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      const { data, error } = await supabase
        .from('recycle_history')
        .select('recycle_type')
        .gte('recycled_at', startDate.toISOString());

      if (error) {
        throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
      }

      const totalRecycled = data?.length || 0;
      const byType: Record<RecycleType, number> = {
        reschedule: 0,
        reassign: 0,
        reactivate: 0,
        convert_type: 0
      };

      data?.forEach(item => {
        if (item.recycle_type in byType) {
          byType[item.recycle_type as RecycleType]++;
        }
      });

      // Calcular taxa de sucesso (simplificado)
      const successRate = totalRecycled > 0 ? 85 : 0; // Placeholder

      return {
        totalRecycled,
        byType,
        successRate
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas de reciclagem:', error);
      return {
        totalRecycled: 0,
        byType: {
          reschedule: 0,
          reassign: 0,
          reactivate: 0,
          convert_type: 0
        },
        successRate: 0
      };
    }
  }

  /**
   * Verifica se uma ordem pode ser reciclada
   */
  canRecycleOrder(order: ServiceOrder): boolean {
    return order.status === 'cancelled';
  }

  /**
   * Busca ordens elegíveis para reciclagem
   */
  async getRecyclableOrders(limit: number = 50): Promise<ServiceOrder[]> {
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select('*')
        .eq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Erro ao buscar ordens recicláveis: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar ordens recicláveis:', error);
      return [];
    }
  }

  /**
   * Verifica se uma ordem foi reciclada
   */
  async isOrderRecycled(orderId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('recycle_history')
        .select('id')
        .eq('order_id', orderId)
        .limit(1);

      if (error) {
        console.error('Erro ao verificar reciclagem:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Erro ao verificar reciclagem:', error);
      return false;
    }
  }

  /**
   * Obtém ordens canceladas que não foram recicladas
   */
  async getNonRecycledCancelledOrders(technicianId: string): Promise<ServiceOrder[]> {
    try {
      // Buscar todas as ordens canceladas do técnico
      const { data: cancelledOrders, error: ordersError } = await supabase
        .from('service_orders')
        .select('*')
        .eq('technician_id', technicianId)
        .eq('status', 'cancelled');

      if (ordersError) {
        throw new Error(`Erro ao buscar ordens canceladas: ${ordersError.message}`);
      }

      if (!cancelledOrders || cancelledOrders.length === 0) {
        return [];
      }

      // Buscar IDs das ordens que foram recicladas
      const orderIds = cancelledOrders.map(order => order.id);
      const { data: recycledIds, error: recycleError } = await supabase
        .from('recycle_history')
        .select('order_id')
        .in('order_id', orderIds);

      if (recycleError) {
        console.error('Erro ao buscar histórico de reciclagem:', recycleError);
        // Em caso de erro, retorna todas as ordens canceladas
        return cancelledOrders;
      }

      // Filtrar ordens que não foram recicladas
      const recycledOrderIds = new Set(recycledIds?.map(r => r.order_id) || []);
      const nonRecycledOrders = cancelledOrders.filter(order => !recycledOrderIds.has(order.id));

      return nonRecycledOrders;
    } catch (error) {
      console.error('Erro ao obter ordens não recicladas:', error);
      return [];
    }
  }
}

export const recycleOrderService = new RecycleOrderService();
