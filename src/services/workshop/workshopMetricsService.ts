import { supabase } from '@/integrations/supabase/client';

export interface WorkshopMetrics {
  // Métricas de Equipamentos
  totalEquipments: number;
  pendingDiagnosis: number;
  awaitingApproval: number;
  inProgress: number;
  readyForDelivery: number;
  
  // Métricas de Tempo
  averageRepairTime: number; // em horas
  averageDiagnosisTime: number; // em horas
  averageApprovalTime: number; // em horas
  
  // Métricas de Produtividade
  equipmentsCompletedToday: number;
  equipmentsCompletedWeek: number;
  equipmentsCompletedMonth: number;
  
  // Métricas de Eficiência
  onTimeCompletionRate: number; // %
  diagnosisAccuracyRate: number; // %
  quoteApprovalRate: number; // %
  
  // Métricas Financeiras
  averageRepairValue: number;
  totalRevenueMonth: number;
  averageQuoteValue: number;
  
  // Métricas por Tipo de Equipamento
  equipmentTypeDistribution: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  
  // Métricas por Tipo de Serviço
  serviceTypeDistribution: Array<{
    type: 'coleta_diagnostico' | 'coleta_conserto';
    count: number;
    percentage: number;
    averageTime: number;
  }>;

  // Produtividade Diária da Semana (dados reais)
  weeklyProductivity: Array<{
    day: string;
    dayName: string;
    completed: number;
    date: string;
  }>;
}

export interface WorkshopTimeMetrics {
  equipmentId: string;
  clientName: string;
  equipmentType: string;
  serviceType: string;
  receivedAt: string;
  diagnosisCompletedAt?: string;
  repairStartedAt?: string;
  repairCompletedAt?: string;
  totalTime?: number; // em horas
  diagnosisTime?: number; // em horas
  repairTime?: number; // em horas
  status: string;
}

/**
 * Serviço para calcular métricas específicas da oficina
 */
export const workshopMetricsService = {
  /**
   * Busca métricas gerais da oficina
   */
  async getWorkshopMetrics(workshopId?: string): Promise<WorkshopMetrics> {
    try {
      console.log('📊 [WorkshopMetrics] Calculando métricas da oficina...');

      // 1. Buscar ordens da oficina dos últimos 60 dias (dados relevantes)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data: orders, error: ordersError } = await supabase
        .from('service_orders')
        .select(`
          id,
          client_name,
          equipment_type,
          service_attendance_type,
          status,
          created_at,
          completed_date,
          final_cost,
          workshop_id,
          workshop_name
        `)
        .eq('current_location', 'workshop')
        .not('status', 'eq', 'cancelled')
        .gte('created_at', sixtyDaysAgo.toISOString());

      console.log('📊 [WorkshopMetrics] Ordens encontradas (últimos 60 dias):', orders?.length || 0);

      if (ordersError) {
        console.error('❌ Erro ao buscar ordens da oficina:', ordersError);
        throw ordersError;
      }

      // 2. Buscar eventos de diagnóstico e reparo
      const orderIds = orders?.map(o => o.id) || [];
      const { data: events, error: eventsError } = await supabase
        .from('service_events')
        .select('*')
        .in('service_order_id', orderIds)
        .in('type', ['diagnosis', 'repair']);

      if (eventsError) {
        console.error('❌ Erro ao buscar eventos:', eventsError);
        throw eventsError;
      }

      console.log('📊 [WorkshopMetrics] Eventos encontrados:', events?.length || 0);

      // 3. Calcular métricas
      const metrics = await this.calculateMetrics(orders || [], events || []);
      
      console.log('✅ [WorkshopMetrics] Métricas calculadas:', metrics);
      return metrics;

    } catch (error) {
      console.error('❌ Erro ao calcular métricas da oficina:', error);
      throw error;
    }
  },

  /**
   * Calcula métricas baseadas nos dados das ordens e eventos
   */
  async calculateMetrics(orders: any[], events: any[]): Promise<WorkshopMetrics> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Agrupar eventos por ordem
    const eventsByOrder = events.reduce((acc, event) => {
      if (!acc[event.service_order_id]) {
        acc[event.service_order_id] = [];
      }
      acc[event.service_order_id].push(event);
      return acc;
    }, {} as Record<string, any[]>);

    // Métricas de status
    const statusCounts = {
      pendingDiagnosis: 0,
      awaitingApproval: 0,
      inProgress: 0,
      readyForDelivery: 0
    };

    // Métricas de tempo
    const timingData: number[] = [];
    const diagnosisTimingData: number[] = [];
    const approvalTimingData: number[] = [];

    // Métricas de produtividade
    let equipmentsCompletedToday = 0;
    let equipmentsCompletedWeek = 0;
    let equipmentsCompletedMonth = 0;

    // Métricas financeiras
    const repairValues: number[] = [];
    let totalRevenueMonth = 0;

    // Distribuição por tipo
    const equipmentTypes: Record<string, number> = {};
    const serviceTypes: Record<string, { count: number; times: number[] }> = {};

    orders.forEach(order => {
      // Contagem por status
      this.categorizeOrderByStatus(order, statusCounts, eventsByOrder);

      // Análise de tempo
      this.analyzeOrderTiming(order, eventsByOrder, timingData, diagnosisTimingData, approvalTimingData);

      // Produtividade
      if (order.completed_date) {
        const completedDate = new Date(order.completed_date);
        if (completedDate >= today) equipmentsCompletedToday++;
        if (completedDate >= weekStart) equipmentsCompletedWeek++;
        if (completedDate >= monthStart) equipmentsCompletedMonth++;
      }

      // Financeiro
      if (order.final_cost) {
        repairValues.push(order.final_cost);
        if (order.completed_date && new Date(order.completed_date) >= monthStart) {
          totalRevenueMonth += order.final_cost;
        }
      }

      // Distribuição por tipo
      equipmentTypes[order.equipment_type] = (equipmentTypes[order.equipment_type] || 0) + 1;
      
      if (!serviceTypes[order.service_attendance_type]) {
        serviceTypes[order.service_attendance_type] = { count: 0, times: [] };
      }
      serviceTypes[order.service_attendance_type].count++;
    });

    // Calcular distribuições
    const totalOrders = orders.length;
    const equipmentTypeDistribution = Object.entries(equipmentTypes).map(([type, count]) => ({
      type,
      count,
      percentage: (count / totalOrders) * 100
    }));

    const serviceTypeDistribution = Object.entries(serviceTypes).map(([type, data]) => ({
      type: type as 'coleta_diagnostico' | 'coleta_conserto',
      count: data.count,
      percentage: (data.count / totalOrders) * 100,
      averageTime: data.times.length > 0 ? data.times.reduce((a, b) => a + b, 0) / data.times.length : 0
    }));

    // Log dos dados filtrados
    console.log(`📊 [DEBUG] Dados após filtros - Diagnósticos: ${diagnosisTimingData.length}, Reparos: ${timingData.length}`);
    console.log(`📊 [DEBUG] Tempos de diagnóstico válidos:`, diagnosisTimingData.map(t => t.toFixed(2) + 'h'));
    console.log(`📊 [DEBUG] Tempos de reparo válidos:`, timingData.map(t => t.toFixed(2) + 'h'));

    return {
      totalEquipments: orders.length,
      pendingDiagnosis: statusCounts.pendingDiagnosis,
      awaitingApproval: statusCounts.awaitingApproval,
      inProgress: statusCounts.inProgress,
      readyForDelivery: statusCounts.readyForDelivery,

      averageRepairTime: timingData.length > 0 ? timingData.reduce((a, b) => a + b, 0) / timingData.length : 0,
      averageDiagnosisTime: diagnosisTimingData.length > 0 ? diagnosisTimingData.reduce((a, b) => a + b, 0) / diagnosisTimingData.length : 0,
      averageApprovalTime: approvalTimingData.length > 0 ? approvalTimingData.reduce((a, b) => a + b, 0) / approvalTimingData.length : 0,

      equipmentsCompletedToday,
      equipmentsCompletedWeek,
      equipmentsCompletedMonth,

      onTimeCompletionRate: this.calculateOnTimeRate(orders, eventsByOrder),
      diagnosisAccuracyRate: this.calculateDiagnosisAccuracy(orders, eventsByOrder),
      quoteApprovalRate: this.calculateQuoteApprovalRate(orders, eventsByOrder),

      averageRepairValue: repairValues.length > 0 ? repairValues.reduce((a, b) => a + b, 0) / repairValues.length : 0,
      totalRevenueMonth,
      averageQuoteValue: repairValues.length > 0 ? repairValues.reduce((a, b) => a + b, 0) / repairValues.length : 0,

      equipmentTypeDistribution,
      serviceTypeDistribution,
      weeklyProductivity: this.calculateWeeklyProductivity(orders)
    };
  },

  /**
   * Calcula produtividade diária da semana baseada em dados reais
   */
  calculateWeeklyProductivity(orders: any[]): Array<{day: string; dayName: string; completed: number; date: string}> {
    const now = new Date();
    const weekStart = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000));

    // Criar array dos últimos 7 dias
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart.getTime() + (i * 24 * 60 * 60 * 1000));
      weekDays.push({
        day: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()],
        dayName: date.toLocaleDateString('pt-BR', { weekday: 'long' }),
        date: date.toISOString().split('T')[0],
        completed: 0
      });
    }

    // Contar equipamentos concluídos por dia
    orders.forEach(order => {
      if (order.completed_date) {
        const completedDate = new Date(order.completed_date);
        const completedDateStr = completedDate.toISOString().split('T')[0];

        const dayIndex = weekDays.findIndex(day => day.date === completedDateStr);
        if (dayIndex !== -1) {
          weekDays[dayIndex].completed++;
        }
      }
    });

    return weekDays;
  },

  /**
   * Categoriza ordem por status para métricas
   */
  categorizeOrderByStatus(order: any, statusCounts: any, eventsByOrder: Record<string, any[]>) {
    const orderEvents = eventsByOrder[order.id] || [];
    const hasDiagnosis = orderEvents.some(e => e.type === 'diagnosis');

    switch (order.status) {
      case 'received_at_workshop':
      case 'collected':
        if (order.service_attendance_type === 'coleta_diagnostico' && !hasDiagnosis) {
          statusCounts.pendingDiagnosis++;
        } else if (order.service_attendance_type === 'coleta_conserto') {
          statusCounts.inProgress++;
        }
        break;
      case 'diagnosis_completed':
      case 'quote_sent':
        statusCounts.awaitingApproval++;
        break;
      case 'quote_approved':
      case 'in_progress':
        statusCounts.inProgress++;
        break;
      case 'ready_for_delivery':
      case 'collected_for_delivery':
      case 'payment_pending':
        statusCounts.readyForDelivery++;
        break;
    }
  },

  /**
   * Analisa timing das ordens
   */
  analyzeOrderTiming(order: any, eventsByOrder: Record<string, any[]>, timingData: number[], diagnosisTimingData: number[], approvalTimingData: number[]) {
    const orderEvents = eventsByOrder[order.id] || [];
    const receivedAt = new Date(order.created_at);

    // Tempo de diagnóstico (usar apenas o mais recente se houver múltiplos)
    const diagnosisEvents = orderEvents.filter(e => e.type === 'diagnosis');
    if (diagnosisEvents.length > 0) {
      // Pegar o diagnóstico mais recente
      const latestDiagnosis = diagnosisEvents.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      const diagnosisTime = (new Date(latestDiagnosis.created_at).getTime() - receivedAt.getTime()) / (1000 * 60 * 60);
      // Filtrar tempos anômalos (mais de 7 dias = 168 horas para diagnóstico)
      if (diagnosisTime > 0 && diagnosisTime <= 168) {
        diagnosisTimingData.push(diagnosisTime);
      } else {
        console.warn(`⚠️ [WorkshopMetrics] Tempo de diagnóstico anômalo ignorado: ${diagnosisTime.toFixed(2)}h (Ordem: ${order.id})`);
      }
    }

    // Tempo total de reparo
    if (order.completed_date) {
      const totalTime = (new Date(order.completed_date).getTime() - receivedAt.getTime()) / (1000 * 60 * 60);
      // Filtrar tempos anômalos (mais de 30 dias = 720 horas para reparo total)
      if (totalTime > 0 && totalTime <= 720) {
        timingData.push(totalTime);
      } else {
        console.warn(`⚠️ [WorkshopMetrics] Tempo de reparo anômalo ignorado: ${totalTime.toFixed(2)}h`);
      }
    }
  },

  /**
   * Calcula taxa de conclusão no prazo
   */
  calculateOnTimeRate(orders: any[], eventsByOrder: Record<string, any[]>): number {
    const completedOrders = orders.filter(o => o.completed_date);
    if (completedOrders.length === 0) return 0;

    // Assumir prazo padrão de 72h para diagnóstico e 7 dias para reparo
    const onTimeOrders = completedOrders.filter(order => {
      const orderEvents = eventsByOrder[order.id] || [];
      const diagnosisEvent = orderEvents.find(e => e.type === 'diagnosis');

      if (order.service_attendance_type === 'coleta_diagnostico' && diagnosisEvent) {
        const diagnosisTime = (new Date(diagnosisEvent.created_at).getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60);
        return diagnosisTime <= 72; // 72 horas para diagnóstico
      }

      const totalTime = (new Date(order.completed_date).getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60);
      return totalTime <= 168; // 7 dias para reparo completo
    });

    return (onTimeOrders.length / completedOrders.length) * 100;
  },

  /**
   * Calcula precisão do diagnóstico
   */
  calculateDiagnosisAccuracy(orders: any[], eventsByOrder: Record<string, any[]>): number {
    const diagnosisOrders = orders.filter(o =>
      o.service_attendance_type === 'coleta_diagnostico' &&
      eventsByOrder[o.id]?.some(e => e.type === 'diagnosis')
    );

    if (diagnosisOrders.length === 0) return 0;

    // Assumir que diagnósticos que resultaram em aprovação são precisos
    const accurateOrders = diagnosisOrders.filter(o =>
      o.status === 'quote_approved' || o.status === 'in_progress' || o.status === 'ready_for_delivery' || o.status === 'completed'
    );

    return (accurateOrders.length / diagnosisOrders.length) * 100;
  },

  /**
   * Calcula taxa de aprovação de orçamentos
   */
  calculateQuoteApprovalRate(orders: any[], eventsByOrder: Record<string, any[]>): number {
    const quoteSentOrders = orders.filter(o =>
      o.service_attendance_type === 'coleta_diagnostico' &&
      (o.status === 'quote_sent' || o.status === 'quote_approved' || o.status === 'in_progress' || o.status === 'completed')
    );

    if (quoteSentOrders.length === 0) return 0;

    const approvedOrders = quoteSentOrders.filter(o =>
      o.status === 'quote_approved' || o.status === 'in_progress' || o.status === 'completed'
    );

    return (approvedOrders.length / quoteSentOrders.length) * 100;
  },

  /**
   * Busca métricas detalhadas de tempo por equipamento
   */
  async getDetailedTimeMetrics(workshopId?: string): Promise<WorkshopTimeMetrics[]> {
    try {
      console.log('📊 [WorkshopMetrics] Buscando métricas detalhadas de tempo...');

      const { data: orders, error: ordersError } = await supabase
        .from('service_orders')
        .select(`
          id,
          client_name,
          equipment_type,
          service_attendance_type,
          status,
          created_at,
          completed_date
        `)
        .eq('current_location', 'workshop')
        .not('status', 'eq', 'cancelled');

      if (ordersError) throw ordersError;

      const orderIds = orders?.map(o => o.id) || [];
      const { data: events, error: eventsError } = await supabase
        .from('service_events')
        .select('*')
        .in('service_order_id', orderIds)
        .in('type', ['diagnosis', 'repair']);

      if (eventsError) throw eventsError;

      // Processar métricas de tempo para cada equipamento
      const timeMetrics: WorkshopTimeMetrics[] = (orders || []).map(order => {
        const orderEvents = events?.filter(e => e.service_order_id === order.id) || [];
        const diagnosisEvent = orderEvents.find(e => e.type === 'diagnosis');
        const repairEvents = orderEvents.filter(e => e.type === 'repair');

        const receivedAt = new Date(order.created_at);
        const diagnosisCompletedAt = diagnosisEvent ? new Date(diagnosisEvent.created_at) : undefined;
        const repairStartedAt = repairEvents.length > 0 ? new Date(repairEvents[0].created_at) : undefined;
        const repairCompletedAt = order.completed_date ? new Date(order.completed_date) : undefined;

        const diagnosisTime = diagnosisCompletedAt ?
          (diagnosisCompletedAt.getTime() - receivedAt.getTime()) / (1000 * 60 * 60) : undefined;

        const repairTime = repairStartedAt && repairCompletedAt ?
          (repairCompletedAt.getTime() - repairStartedAt.getTime()) / (1000 * 60 * 60) : undefined;

        const totalTime = repairCompletedAt ?
          (repairCompletedAt.getTime() - receivedAt.getTime()) / (1000 * 60 * 60) : undefined;

        return {
          equipmentId: order.id,
          clientName: order.client_name,
          equipmentType: order.equipment_type,
          serviceType: order.service_attendance_type,
          receivedAt: order.created_at,
          diagnosisCompletedAt: diagnosisEvent?.created_at,
          repairStartedAt: repairEvents[0]?.created_at,
          repairCompletedAt: order.completed_date,
          totalTime,
          diagnosisTime,
          repairTime,
          status: order.status
        };
      });

      console.log('✅ [WorkshopMetrics] Métricas detalhadas calculadas');
      return timeMetrics;

    } catch (error) {
      console.error('❌ Erro ao buscar métricas detalhadas:', error);
      throw error;
    }
  }
};
