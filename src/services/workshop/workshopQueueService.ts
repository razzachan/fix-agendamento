import { supabase } from '@/integrations/supabase/client';
import { getOrderPriority, isInProgressOrder } from '@/utils/statusMappingUtils';

export interface QueueItem {
  id: string;
  clientName: string;
  equipmentType: string;
  equipmentModel?: string;
  serviceAttendanceType: 'coleta_diagnostico' | 'coleta_conserto' | 'em_domicilio';
  status: string;
  priority: 'high' | 'medium' | 'low';
  urgente: boolean;
  createdAt: string;
  scheduledDate?: string;
  description?: string;
  estimatedTime: number; // em horas
  timeInWorkshop: number; // em horas
  queuePosition: number;
  category: 'urgent' | 'diagnosis_pending' | 'repair_approved' | 'awaiting_approval' | 'ready_delivery';
  canReorder: boolean;
  slaStatus: 'on_time' | 'warning' | 'overdue';
  slaDeadline: string;
}

export interface QueueMetrics {
  totalItems: number;
  urgentItems: number;
  averageWaitTime: number;
  overdueItems: number;
  estimatedCompletionTime: number;
}

/**
 * Serviço para gerenciar a fila de trabalho inteligente da oficina
 */
export const workshopQueueService = {
  /**
   * Busca e organiza a fila de trabalho da oficina
   */
  async getWorkshopQueue(workshopId?: string): Promise<QueueItem[]> {
    try {
      console.log('🎯 [WorkshopQueue] Carregando fila de trabalho...');

      // Verificar se o Supabase está disponível
      if (!supabase) {
        throw new Error('Supabase não está disponível');
      }

      // Buscar ordens da oficina (últimos 30 dias para performance)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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
          final_cost
        `)
        .eq('current_location', 'workshop')
        .not('status', 'in', '(completed,cancelled,delivered)')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar fila da oficina:', error);
        throw new Error(`Erro na consulta: ${error.message}`);
      }

      console.log(`📊 [WorkshopQueue] ${orders?.length || 0} itens na fila`);

      // Se não há ordens, retornar array vazio
      if (!orders || orders.length === 0) {
        console.log('ℹ️ [WorkshopQueue] Nenhuma ordem encontrada na oficina');
        return [];
      }

      // Processar cada item da fila
      const queueItems: QueueItem[] = [];
      for (let i = 0; i < orders.length; i++) {
        try {
          const queueItem = await this.processQueueItem(orders[i], i);
          queueItems.push(queueItem);
        } catch (itemError) {
          console.error(`❌ Erro ao processar item ${orders[i].id}:`, itemError);
          // Continuar com os outros itens
        }
      }

      // Ordenar por prioridade inteligente
      const sortedQueue = this.sortQueueByPriority(queueItems);

      // Atualizar posições na fila
      return sortedQueue.map((item, index) => ({
        ...item,
        queuePosition: index + 1
      }));

    } catch (error) {
      console.error('❌ Erro ao carregar fila de trabalho:', error);
      throw error;
    }
  },

  /**
   * Processa um item individual da fila
   */
  async processQueueItem(order: any, index: number): Promise<QueueItem> {
    const now = new Date();
    const createdAt = new Date(order.created_at);
    const timeInWorkshop = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60); // horas

    // Determinar categoria
    const category = this.determineCategory(order);

    // Verificar se é urgente (baseado no tempo na oficina e tipo de serviço)
    const isUrgent = timeInWorkshop > 72 || // 3 dias na oficina
                     (order.service_attendance_type === 'coleta_diagnostico' && timeInWorkshop > 24) || // 1 dia para diagnóstico
                     (order.status === 'quote_sent' && timeInWorkshop > 48); // 2 dias aguardando aprovação

    // Estimar tempo de conclusão
    const estimatedTime = this.estimateCompletionTime(order);

    // Calcular SLA
    const slaInfo = this.calculateSLA(order, timeInWorkshop);

    // Verificar se pode ser reordenado
    const canReorder = this.canReorderItem(order);

    return {
      id: order.id,
      clientName: order.client_name,
      equipmentType: order.equipment_type,
      equipmentModel: order.equipment_model,
      serviceAttendanceType: order.service_attendance_type,
      status: order.status,
      priority: isUrgent ? 'high' : 'medium',
      urgente: isUrgent,
      createdAt: order.created_at,
      scheduledDate: order.scheduled_date,
      description: order.description,
      estimatedTime,
      timeInWorkshop,
      queuePosition: index + 1,
      category,
      canReorder,
      slaStatus: slaInfo.status,
      slaDeadline: slaInfo.deadline
    };
  },

  /**
   * Determina a categoria do item na fila
   */
  determineCategory(order: any): QueueItem['category'] {
    const status = order.status;
    const serviceType = order.service_attendance_type;
    const now = new Date();
    const createdAt = new Date(order.created_at);
    const timeInWorkshop = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60); // horas

    // Urgente baseado no tempo e tipo de serviço
    if (timeInWorkshop > 72 || // 3 dias na oficina
        (serviceType === 'coleta_diagnostico' && timeInWorkshop > 24) || // 1 dia para diagnóstico
        (status === 'quote_sent' && timeInWorkshop > 48)) { // 2 dias aguardando aprovação
      return 'urgent';
    }

    // Baseado no status
    switch (status) {
      case 'received_at_workshop':
        return serviceType === 'coleta_diagnostico' ? 'diagnosis_pending' : 'repair_approved';
      case 'diagnosis_completed':
      case 'quote_sent':
        return 'awaiting_approval';
      case 'quote_approved':
        return 'repair_approved';
      case 'ready_for_delivery':
      case 'collected_for_delivery':
        return 'ready_delivery';
      default:
        return 'diagnosis_pending';
    }
  },

  /**
   * Estima tempo de conclusão baseado no tipo de serviço
   */
  estimateCompletionTime(order: any): number {
    const serviceType = order.service_attendance_type;
    const status = order.status;

    // Tempos base em horas
    const baseTimes = {
      'coleta_diagnostico': {
        'received_at_workshop': 4,      // 4h para diagnóstico
        'diagnosis_completed': 24,      // 24h para aprovação
        'quote_approved': 48            // 48h para reparo
      },
      'coleta_conserto': {
        'received_at_workshop': 24,     // 24h para reparo direto
        'quote_approved': 48            // 48h para reparo complexo
      }
    };

    const timeMap = baseTimes[serviceType as keyof typeof baseTimes];
    if (!timeMap) return 24; // Default 24h

    return timeMap[status as keyof typeof timeMap] || 24;
  },

  /**
   * Calcula status do SLA
   */
  calculateSLA(order: any, timeInWorkshop: number): { status: QueueItem['slaStatus']; deadline: string } {
    const estimatedTime = this.estimateCompletionTime(order);
    const deadline = new Date(new Date(order.created_at).getTime() + (estimatedTime * 60 * 60 * 1000));
    
    const remainingTime = (deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60);
    
    let status: QueueItem['slaStatus'];
    if (remainingTime < 0) {
      status = 'overdue';
    } else if (remainingTime < estimatedTime * 0.2) { // 20% do tempo restante
      status = 'warning';
    } else {
      status = 'on_time';
    }

    return {
      status,
      deadline: deadline.toISOString()
    };
  },

  /**
   * Verifica se um item pode ser reordenado
   */
  canReorderItem(order: any): boolean {
    const now = new Date();
    const createdAt = new Date(order.created_at);
    const timeInWorkshop = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60); // horas

    // Não pode reordenar itens urgentes (baseado no tempo)
    if (timeInWorkshop > 72) return false; // 3 dias na oficina

    // Não pode reordenar itens em progresso ativo
    if (isInProgressOrder(order.status)) return false;

    // Não pode reordenar itens prontos para entrega
    if (order.status === 'ready_for_delivery') return false;

    return true;
  },

  /**
   * Ordena a fila por prioridade inteligente
   */
  sortQueueByPriority(items: QueueItem[]): QueueItem[] {
    return [...items].sort((a, b) => {
      // 1. Urgentes primeiro
      if (a.urgente && !b.urgente) return -1;
      if (!a.urgente && b.urgente) return 1;
      
      // 2. Itens atrasados
      if (a.slaStatus === 'overdue' && b.slaStatus !== 'overdue') return -1;
      if (a.slaStatus !== 'overdue' && b.slaStatus === 'overdue') return 1;
      
      // 3. Prioridade por status (usando função existente)
      const statusPriorityDiff = getOrderPriority(a.status) - getOrderPriority(b.status);
      if (statusPriorityDiff !== 0) return statusPriorityDiff;
      
      // 4. Tempo na oficina (mais antigo primeiro)
      return b.timeInWorkshop - a.timeInWorkshop;
    });
  },

  /**
   * Calcula métricas da fila
   */
  calculateQueueMetrics(queueItems: QueueItem[]): QueueMetrics {
    const totalItems = queueItems.length;
    const urgentItems = queueItems.filter(item => item.urgente).length;
    const overdueItems = queueItems.filter(item => item.slaStatus === 'overdue').length;
    
    const averageWaitTime = totalItems > 0 
      ? queueItems.reduce((sum, item) => sum + item.timeInWorkshop, 0) / totalItems 
      : 0;
    
    const estimatedCompletionTime = queueItems.reduce((sum, item) => sum + item.estimatedTime, 0);

    return {
      totalItems,
      urgentItems,
      averageWaitTime,
      overdueItems,
      estimatedCompletionTime
    };
  },

  /**
   * Reordena item na fila (drag & drop)
   */
  async reorderQueueItem(itemId: string, newPosition: number): Promise<boolean> {
    try {
      console.log(`🔄 [WorkshopQueue] Reordenando item ${itemId} para posição ${newPosition}`);
      
      // Por enquanto, apenas log - implementação futura pode salvar ordem customizada
      // TODO: Implementar persistência de ordem customizada se necessário
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao reordenar item:', error);
      return false;
    }
  }
};
