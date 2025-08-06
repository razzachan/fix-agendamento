import { supabase } from '@/integrations/supabase/client';
import { ServiceOrder } from '@/types';

export interface OrderRelationship {
  parentOrderId: string;
  childOrderId: string;
  relationshipType: 'diagnosis_to_repair' | 'repair_continuation';
  createdAt: string;
  status: 'pending' | 'linked' | 'completed';
}

export class OrderRelationshipService {
  /**
   * Cria relacionamento pai-filho entre ordens
   */
  static async createRelationship(
    parentOrderId: string,
    childOrderId: string,
    relationshipType: 'diagnosis_to_repair' | 'repair_continuation' = 'diagnosis_to_repair'
  ): Promise<boolean> {
    try {
      // Atualizar ordem pai
      const { error: parentError } = await supabase
        .from('service_orders')
        .update({
          order_type: 'parent',
          relationship_status: 'linked',
          child_order_ids: [childOrderId], // Simplificado para um filho
          updated_at: new Date().toISOString()
        })
        .eq('id', parentOrderId);

      if (parentError) {
        console.error('Erro ao atualizar ordem pai:', parentError);
        return false;
      }

      // Atualizar ordem filha
      const { error: childError } = await supabase
        .from('service_orders')
        .update({
          parent_order_id: parentOrderId,
          order_type: 'child',
          relationship_status: 'linked',
          updated_at: new Date().toISOString()
        })
        .eq('id', childOrderId);

      if (childError) {
        console.error('Erro ao atualizar ordem filha:', childError);
        return false;
      }

      console.log(`✅ Relacionamento criado: ${parentOrderId} → ${childOrderId}`);
      return true;

    } catch (error) {
      console.error('Erro ao criar relacionamento:', error);
      return false;
    }
  }

  /**
   * Busca ordem pai baseada em critérios
   */
  static async findParentOrder(
    clientPhone: string,
    equipmentType: string,
    serviceType: 'coleta_diagnostico' | 'coleta_conserto'
  ): Promise<ServiceOrder | null> {
    try {
      // Buscar ordem de diagnóstico recente do mesmo cliente e equipamento
      const { data, error } = await supabase
        .from('service_orders')
        .select('*')
        .eq('client_phone', clientPhone)
        .eq('equipment_type', equipmentType)
        .eq('service_attendance_type', 'coleta_diagnostico')
        .in('status', ['at_workshop', 'budget_approved', 'payment_pending'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Erro ao buscar ordem pai:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] as ServiceOrder : null;

    } catch (error) {
      console.error('Erro ao buscar ordem pai:', error);
      return null;
    }
  }

  /**
   * Busca ordens filhas de uma ordem pai
   */
  static async findChildOrders(parentOrderId: string): Promise<ServiceOrder[]> {
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select('*')
        .eq('parent_order_id', parentOrderId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar ordens filhas:', error);
        return [];
      }

      return (data || []) as ServiceOrder[];

    } catch (error) {
      console.error('Erro ao buscar ordens filhas:', error);
      return [];
    }
  }

  /**
   * Verifica se uma ordem pode ter filhas
   */
  static canHaveChildOrders(order: ServiceOrder): boolean {
    return (
      order.serviceAttendanceType === 'coleta_diagnostico' &&
      ['at_workshop', 'budget_approved', 'payment_pending'].includes(order.status)
    );
  }

  /**
   * Verifica se uma ordem pode ser filha
   */
  static canBeChildOrder(order: ServiceOrder): boolean {
    return (
      order.serviceAttendanceType === 'coleta_conserto' &&
      !order.parentOrderId
    );
  }

  /**
   * Vincula automaticamente ordem filha à pai
   */
  static async autoLinkChildOrder(
    childOrder: ServiceOrder
  ): Promise<{ linked: boolean; parentOrder?: ServiceOrder }> {
    try {
      // Só tenta vincular se for coleta conserto
      if (!this.canBeChildOrder(childOrder)) {
        return { linked: false };
      }

      // Buscar ordem pai potencial
      const parentOrder = await this.findParentOrder(
        childOrder.clientPhone,
        childOrder.equipmentType,
        'coleta_diagnostico'
      );

      if (!parentOrder || !this.canHaveChildOrders(parentOrder)) {
        return { linked: false };
      }

      // Criar relacionamento
      const success = await this.createRelationship(
        parentOrder.id,
        childOrder.id,
        'diagnosis_to_repair'
      );

      return {
        linked: success,
        parentOrder: success ? parentOrder : undefined
      };

    } catch (error) {
      console.error('Erro no auto-link:', error);
      return { linked: false };
    }
  }

  /**
   * Obtém histórico completo de uma ordem (pai + filhas)
   */
  static async getOrderHistory(orderId: string): Promise<{
    parentOrder?: ServiceOrder;
    currentOrder: ServiceOrder;
    childOrders: ServiceOrder[];
  } | null> {
    try {
      // Buscar ordem atual
      const { data: currentData, error: currentError } = await supabase
        .from('service_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (currentError || !currentData) {
        console.error('Ordem não encontrada:', currentError);
        return null;
      }

      const currentOrder = currentData as ServiceOrder;
      let parentOrder: ServiceOrder | undefined;
      let childOrders: ServiceOrder[] = [];

      // Se tem pai, buscar ordem pai
      if (currentOrder.parentOrderId) {
        const { data: parentData } = await supabase
          .from('service_orders')
          .select('*')
          .eq('id', currentOrder.parentOrderId)
          .single();

        if (parentData) {
          parentOrder = parentData as ServiceOrder;
        }
      }

      // Se é pai ou tem pai, buscar filhas
      const searchParentId = currentOrder.orderType === 'parent' 
        ? currentOrder.id 
        : currentOrder.parentOrderId;

      if (searchParentId) {
        childOrders = await this.findChildOrders(searchParentId);
      }

      return {
        parentOrder,
        currentOrder,
        childOrders
      };

    } catch (error) {
      console.error('Erro ao obter histórico:', error);
      return null;
    }
  }

  /**
   * Calcula valor total de uma família de ordens
   */
  static calculateFamilyTotal(
    parentOrder?: ServiceOrder,
    childOrders: ServiceOrder[] = []
  ): {
    totalInitial: number;
    totalFinal: number;
    totalPaid: number;
  } {
    const allOrders = [
      ...(parentOrder ? [parentOrder] : []),
      ...childOrders
    ];

    return {
      totalInitial: allOrders.reduce((sum, order) => sum + (order.initialCost || 0), 0),
      totalFinal: allOrders.reduce((sum, order) => sum + (order.finalCost || 0), 0),
      totalPaid: allOrders
        .filter(order => order.status === 'completed')
        .reduce((sum, order) => sum + (order.finalCost || 0), 0)
    };
  }

  /**
   * Marca relacionamento como completo
   */
  static async completeRelationship(parentOrderId: string): Promise<boolean> {
    try {
      // Atualizar status do relacionamento
      const { error } = await supabase
        .from('service_orders')
        .update({
          relationship_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', parentOrderId);

      if (error) {
        console.error('Erro ao completar relacionamento:', error);
        return false;
      }

      // Atualizar ordens filhas também
      await supabase
        .from('service_orders')
        .update({
          relationship_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('parent_order_id', parentOrderId);

      return true;

    } catch (error) {
      console.error('Erro ao completar relacionamento:', error);
      return false;
    }
  }
}
