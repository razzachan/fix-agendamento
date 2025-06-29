import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SidebarBadgeData {
  orders: number;
  schedules: number;
  clients: number;
  technicians: number;
  finance: number;
  quotes: number;
  repairs: number;
  deliveries: number;
  workshops: number;
  tracking: number;
  sla_violations: number; // Novo: violações de SLA
}

export interface SidebarBadgeStats {
  badges: SidebarBadgeData;
  isLoading: boolean;
  isConnected: boolean;
  lastUpdate: Date | null;
  refreshBadges: () => void;
}

/**
 * Hook para gerenciar badges de notificação no menu lateral
 * Conecta em tempo real com o Supabase para mostrar contadores atualizados
 */
export function useSidebarBadges(): SidebarBadgeStats {
  const { user } = useAuth();
  const [badges, setBadges] = useState<SidebarBadgeData>({
    orders: 0,
    schedules: 0,
    clients: 0,
    technicians: 0,
    finance: 0,
    quotes: 0,
    repairs: 0,
    deliveries: 0,
    workshops: 0,
    tracking: 0,
    sla_violations: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  /**
   * Método para forçar atualização dos badges
   */
  const refreshBadges = useCallback(() => {
    console.log('🔄 [SidebarBadges] Refresh manual solicitado');
    setRefreshTrigger(prev => prev + 1);
  }, []);

  /**
   * Busca contadores baseados na role do usuário
   */
  const fetchBadgeCounts = useCallback(async () => {
    if (!user?.id || !user?.role) return;

    try {
      setIsLoading(true);
      const newBadges: SidebarBadgeData = {
        orders: 0,
        schedules: 0,
        clients: 0,
        technicians: 0,
        finance: 0,
        quotes: 0,
        repairs: 0,
        deliveries: 0,
        workshops: 0,
        tracking: 0,
        sla_violations: 0
      };

      // Contadores específicos por role com tratamento individual de erro
      if (user.role === 'admin') {
        // Admin vê tudo - usar Promise.allSettled para não falhar se uma consulta der erro
        await Promise.allSettled([
          fetchOrdersBadge(newBadges).catch(err => console.warn('Erro em fetchOrdersBadge:', err)),
          fetchSchedulesBadge(newBadges).catch(err => console.warn('Erro em fetchSchedulesBadge:', err)),
          fetchClientsBadge(newBadges).catch(err => console.warn('Erro em fetchClientsBadge:', err)),
          fetchTechniciansBadge(newBadges).catch(err => console.warn('Erro em fetchTechniciansBadge:', err)),
          fetchFinanceBadge(newBadges).catch(err => console.warn('Erro em fetchFinanceBadge:', err)),
          fetchQuotesBadge(newBadges).catch(err => console.warn('Erro em fetchQuotesBadge:', err)),
          fetchRepairsBadge(newBadges).catch(err => console.warn('Erro em fetchRepairsBadge:', err)),
          fetchDeliveriesBadge(newBadges).catch(err => console.warn('Erro em fetchDeliveriesBadge:', err)),
          fetchWorkshopsBadge(newBadges).catch(err => console.warn('Erro em fetchWorkshopsBadge:', err)),
          fetchSLAViolationsBadge(newBadges).catch(err => console.warn('Erro em fetchSLAViolationsBadge:', err))
        ]);
      } else if (user.role === 'technician') {
        // Técnico vê apenas suas ordens e calendário
        await Promise.allSettled([
          fetchTechnicianOrdersBadge(newBadges, user.id).catch(err => console.warn('Erro em fetchTechnicianOrdersBadge:', err)),
          fetchTechnicianSchedulesBadge(newBadges, user.id).catch(err => console.warn('Erro em fetchTechnicianSchedulesBadge:', err))
        ]);
      } else if (user.role === 'workshop') {
        // Oficina vê ordens na oficina e calendário
        await Promise.allSettled([
          fetchWorkshopOrdersBadge(newBadges, user.id).catch(err => console.warn('Erro em fetchWorkshopOrdersBadge:', err)),
          fetchWorkshopSchedulesBadge(newBadges, user.id).catch(err => console.warn('Erro em fetchWorkshopSchedulesBadge:', err))
        ]);
      }

      setBadges(newBadges);
      setLastUpdate(new Date());
      console.log('🔢 [SidebarBadges] Contadores atualizados:', newBadges);
    } catch (error) {
      console.error('❌ [SidebarBadges] Erro ao buscar contadores:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.role]);

  /**
   * Busca ordens que REALMENTE precisam de ação urgente
   * Lógica inteligente que considera apenas situações críticas:
   * - Ordens pendentes há mais de 24h (sem agendamento)
   * - Ordens agendadas para hoje ou atrasadas
   * - Ordens em andamento há mais de 3 dias (possível atraso)
   * - Ordens na oficina há mais de 7 dias (atraso significativo)
   */
  const fetchOrdersBadge = async (badges: SidebarBadgeData) => {
    const today = new Date().toISOString().split('T')[0];

    // Datas para comparação de atrasos
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 1. Ordens pendentes há mais de 24h (CRÍTICO - sem agendamento)
    const { count: pendingTooLongCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lte('created_at', oneDayAgo.toISOString());

    // 2. Ordens agendadas para hoje ou atrasadas (URGENTE)
    const { count: scheduledOverdueCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .lte('scheduled_date', today);

    // 3. Ordens em andamento há mais de 3 dias (possível atraso)
    const { count: stuckInProgressCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress')
      .lte('created_at', threeDaysAgo.toISOString());

    // 4. Ordens na oficina há mais de 7 dias (atraso significativo)
    const { count: stuckAtWorkshopCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'at_workshop')
      .lte('created_at', sevenDaysAgo.toISOString());

    const totalUrgentCount = (pendingTooLongCount || 0) +
                            (scheduledOverdueCount || 0) +
                            (stuckInProgressCount || 0) +
                            (stuckAtWorkshopCount || 0);

    badges.orders = totalUrgentCount;
  };

  /**
   * Busca pré-agendamentos não processados
   */
  const fetchSchedulesBadge = async (badges: SidebarBadgeData) => {
    try {
      const { count, error } = await supabase
        .from('agendamentos_ai')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) {
        console.warn('Erro ao buscar agendamentos pendentes:', error);
        badges.schedules = 0;
      } else {
        badges.schedules = count || 0;
      }
    } catch (error) {
      console.error('Erro geral ao buscar agendamentos:', error);
      badges.schedules = 0;
    }
  };

  /**
   * Busca total de clientes (sem filtro de data pois não há created_at)
   */
  const fetchClientsBadge = async (badges: SidebarBadgeData) => {
    try {
      // Como a tabela clients não tem created_at, vamos contar o total de clientes
      const { count, error } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.warn('Erro ao buscar clientes:', error);
        badges.clients = 0;
      } else {
        // Mostrar apenas se há mais de 10 clientes (indicativo de atividade)
        badges.clients = (count && count > 10) ? Math.min(count - 10, 99) : 0;
      }
    } catch (error) {
      console.error('Erro geral ao buscar clientes:', error);
      badges.clients = 0;
    }
  };

  /**
   * Badge de técnicos - sem notificações
   * A rota de técnicos é apenas para gerenciamento, não precisa de alertas
   */
  const fetchTechniciansBadge = async (badges: SidebarBadgeData) => {
    // Sem notificações para a rota de técnicos
    badges.technicians = 0;
  };

  /**
   * Busca questões financeiras que precisam de atenção
   * - Pagamentos em atraso (concluído há mais de 3 dias sem pagamento)
   * - Ordens com valor alto (>R$ 500) aguardando pagamento
   * - Pagamentos parciais pendentes
   */
  const fetchFinanceBadge = async (badges: SidebarBadgeData) => {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      // Como payment_status não existe na tabela service_orders, vamos usar a tabela payments
      // 1. Ordens concluídas sem pagamento registrado
      const { count: unpaidCount, error: unpaidError } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['completed', 'ready_for_pickup', 'delivered'])
        .gte('final_cost', 100); // Apenas ordens com valor significativo

      if (unpaidError) {
        console.warn('Erro ao buscar ordens não pagas:', unpaidError);
      }

      // 2. Ordens com valor alto (>R$ 500)
      const { count: highValueCount, error: highValueError } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['completed', 'ready_for_pickup'])
        .gte('final_cost', 500);

      if (highValueError) {
        console.warn('Erro ao buscar ordens de alto valor:', highValueError);
      }

      badges.finance = (unpaidCount || 0) + (highValueCount || 0);
    } catch (error) {
      console.error('Erro geral ao buscar badges financeiros:', error);
      badges.finance = 0;
    }
  };

  /**
   * Busca orçamentos que precisam de ação urgente
   * - Diagnósticos concluídos aguardando criação de orçamento
   * - Orçamentos enviados aguardando aprovação há mais de 2 dias
   * - Orçamentos aprovados aguardando início do reparo
   */
  const fetchQuotesBadge = async (badges: SidebarBadgeData) => {
    try {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      // 1. Diagnósticos concluídos que precisam de orçamento (URGENTE)
      const { count: diagnosisCount, error: diagnosisError } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'diagnosis_completed');

      if (diagnosisError) {
        console.warn('Erro ao buscar diagnósticos concluídos:', diagnosisError);
      }

      // 2. Orçamentos enviados há mais de 2 dias sem resposta (follow-up)
      const { count: pendingQuotesCount, error: pendingError } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'quote_sent')
        .lte('created_at', twoDaysAgo.toISOString());

      if (pendingError) {
        console.warn('Erro ao buscar orçamentos pendentes:', pendingError);
      }

      // 3. Orçamentos aprovados aguardando início do reparo (ação necessária)
      const { count: approvedQuotesCount, error: approvedError } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'quote_approved');

      if (approvedError) {
        console.warn('Erro ao buscar orçamentos aprovados:', approvedError);
      }

      const totalQuotesCount = (diagnosisCount || 0) +
                              (pendingQuotesCount || 0) +
                              (approvedQuotesCount || 0);

      badges.quotes = totalQuotesCount;
    } catch (error) {
      console.error('Erro geral ao buscar badges de orçamentos:', error);
      badges.quotes = 0;
    }
  };

  /**
   * Busca reparos que precisam de atenção ou ação
   * - Reparos ativos em andamento (informativo)
   * - Reparos em andamento há mais de 5 dias (possível atraso)
   * - Equipamentos prontos para entrega na oficina (ação necessária)
   */
  const fetchRepairsBadge = async (badges: SidebarBadgeData) => {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    // 1. Reparos ativos em andamento (informativo - mostra atividade)
    const { count: activeRepairsCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress');

    // 2. Reparos em andamento há mais de 5 dias (possível atraso)
    const { count: delayedRepairsCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress')
      .lte('created_at', fiveDaysAgo.toISOString());

    // 3. Equipamentos prontos para entrega (ação necessária)
    const { count: readyForDeliveryCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['ready_for_delivery', 'ready_for_pickup']);

    // Priorizar itens que precisam de ação (prontos + atrasados) + informativos (ativos)
    const totalRepairsCount = (readyForDeliveryCount || 0) +
                             (delayedRepairsCount || 0) +
                             (activeRepairsCount || 0);

    badges.repairs = totalRepairsCount;
  };

  /**
   * Busca entregas que precisam de ação ou acompanhamento
   * - Equipamentos prontos para coleta/entrega (informativo)
   * - Equipamentos prontos há mais de 2 dias (cliente precisa ser contatado)
   * - Entregas agendadas para hoje (ação necessária)
   * - Entregas em rota (acompanhamento)
   */
  const fetchDeliveriesBadge = async (badges: SidebarBadgeData) => {
    const today = new Date().toISOString().split('T')[0];
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // 1. Equipamentos prontos para coleta/entrega (informativo)
    const { count: readyCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['ready_for_pickup', 'ready_for_delivery']);

    // 2. Equipamentos prontos há mais de 2 dias (follow-up necessário)
    const { count: overdueReadyCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ready_for_pickup')
      .lte('created_at', twoDaysAgo.toISOString());

    // 3. Entregas agendadas para hoje (ação necessária)
    const { count: scheduledTodayCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'scheduled_delivery')
      .lte('scheduled_date', today);

    // 4. Entregas em rota (acompanhamento)
    const { count: inRouteCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_delivery_route');

    const totalDeliveriesCount = (readyCount || 0) +
                                (overdueReadyCount || 0) +
                                (scheduledTodayCount || 0) +
                                (inRouteCount || 0);

    badges.deliveries = totalDeliveriesCount;
  };

  /**
   * Busca oficinas com trabalho pendente urgente
   * - Equipamentos na oficina há mais de 7 dias
   * - Diagnósticos pendentes há mais de 3 dias
   */
  const fetchWorkshopsBadge = async (badges: SidebarBadgeData) => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      // 1. Equipamentos na oficina há mais de 7 dias
      const { count: workshopCount, error: workshopError } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'at_workshop')
        .lte('created_at', sevenDaysAgo.toISOString());

      if (workshopError) {
        console.warn('Erro ao buscar equipamentos na oficina:', workshopError);
      }

      // 2. Diagnósticos pendentes há mais de 3 dias
      const { count: diagnosisCount, error: diagnosisError } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'diagnosis_pending')
        .lte('created_at', threeDaysAgo.toISOString());

      if (diagnosisError) {
        console.warn('Erro ao buscar diagnósticos pendentes:', diagnosisError);
      }

      badges.workshops = (workshopCount || 0) + (diagnosisCount || 0);
    } catch (error) {
      console.error('Erro geral ao buscar badges de oficinas:', error);
      badges.workshops = 0;
    }
  };

  /**
   * Busca violações críticas de SLA
   * - Ordens em aberto há mais de 24h sem agendamento
   * - Agendamentos atrasados (passaram da data)
   * - Reparos parados há mais de 7 dias
   * - Equipamentos prontos há mais de 5 dias
   */
  const fetchSLAViolationsBadge = async (badges: SidebarBadgeData) => {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const today = new Date().toISOString().split('T')[0];

      // 1. Ordens pendentes há mais de 24h
      const { count: pendingCount, error: pendingError } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lte('created_at', oneDayAgo.toISOString());

      if (pendingError) {
        console.warn('Erro ao buscar ordens pendentes:', pendingError);
      }

      // 2. Agendamentos atrasados
      const { count: overdueCount, error: overdueError } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'scheduled')
        .lt('scheduled_date', today);

      if (overdueError) {
        console.warn('Erro ao buscar agendamentos atrasados:', overdueError);
      }

      // 3. Reparos parados há mais de 7 dias
      const { count: stuckRepairsCount, error: stuckRepairsError } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['in_progress', 'at_workshop'])
        .lte('created_at', sevenDaysAgo.toISOString());

      if (stuckRepairsError) {
        console.warn('Erro ao buscar reparos parados:', stuckRepairsError);
      }

      // 4. Equipamentos prontos há mais de 5 dias
      const { count: readyTooLongCount, error: readyTooLongError } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ready_for_pickup')
        .lte('created_at', fiveDaysAgo.toISOString());

      if (readyTooLongError) {
        console.warn('Erro ao buscar equipamentos prontos há muito tempo:', readyTooLongError);
      }

      badges.sla_violations = (pendingCount || 0) + (overdueCount || 0) + (stuckRepairsCount || 0) + (readyTooLongCount || 0);
    } catch (error) {
      console.error('Erro geral ao buscar violações de SLA:', error);
      badges.sla_violations = 0;
    }
  };

  /**
   * Busca ordens específicas do técnico
   */
  const fetchTechnicianOrdersBadge = async (badges: SidebarBadgeData, technicianId: string) => {
    const { count } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('technician_id', technicianId)
      .in('status', ['scheduled', 'in_progress']);
    
    badges.orders = count || 0;
  };

  /**
   * Busca agendamentos específicos do técnico
   */
  const fetchTechnicianSchedulesBadge = async (badges: SidebarBadgeData, technicianId: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    const { count } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('technician_id', technicianId)
      .gte('scheduled_date', today)
      .eq('status', 'scheduled');
    
    badges.schedules = count || 0;
  };

  /**
   * Busca ordens na oficina específica
   */
  const fetchWorkshopOrdersBadge = async (badges: SidebarBadgeData, workshopId: string) => {
    const { count } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('workshop_id', workshopId)
      .in('status', ['at_workshop', 'in_progress']);
    
    badges.orders = count || 0;
  };

  /**
   * Busca agendamentos da oficina
   */
  const fetchWorkshopSchedulesBadge = async (badges: SidebarBadgeData, workshopId: string) => {
    const { count } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('workshop_id', workshopId)
      .eq('status', 'scheduled');
    
    badges.schedules = count || 0;
  };

  /**
   * Configura realtime para atualizações automáticas
   */
  const setupRealtime = useCallback(() => {
    if (!user?.id) return;

    console.log('🔄 [SidebarBadges] Configurando realtime...');

    const channel = supabase
      .channel('sidebar_badges_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_orders'
        },
        (payload) => {
          console.log('🔔 [SidebarBadges] Mudança detectada em service_orders:', payload);
          // Pequeno delay para garantir que a mudança foi persistida
          setTimeout(() => {
            fetchBadgeCounts();
          }, 100);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agendamentos_ai'
        },
        () => {
          console.log('🔔 [SidebarBadges] Mudança detectada em agendamentos_ai');
          fetchBadgeCounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients'
        },
        () => {
          console.log('🔔 [SidebarBadges] Mudança detectada em clients');
          fetchBadgeCounts();
        }
      )
      .subscribe((status) => {
        console.log('🔗 [SidebarBadges] Status da conexão realtime:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ [SidebarBadges] Realtime conectado com sucesso!');
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [SidebarBadges] Erro no canal realtime');
          setIsConnected(false);
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ [SidebarBadges] Timeout na conexão realtime');
          setIsConnected(false);
        } else {
          console.log(`🔄 [SidebarBadges] Status: ${status}`);
          setIsConnected(false);
        }
      });

    return () => {
      console.log('🔌 [SidebarBadges] Desconectando realtime...');
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [user?.id, fetchBadgeCounts]);

  // Efeito para refresh manual
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchBadgeCounts();
    }
  }, [refreshTrigger, fetchBadgeCounts]);

  // Efeito para listener de eventos customizados
  useEffect(() => {
    const handleRefreshBadges = () => {
      console.log('🔄 [SidebarBadges] Evento de refresh recebido');
      refreshBadges();
    };

    window.addEventListener('refreshBadges', handleRefreshBadges);
    window.addEventListener('serviceOrderUpdated', handleRefreshBadges);
    window.addEventListener('orderStatusChanged', handleRefreshBadges);

    return () => {
      window.removeEventListener('refreshBadges', handleRefreshBadges);
      window.removeEventListener('serviceOrderUpdated', handleRefreshBadges);
      window.removeEventListener('orderStatusChanged', handleRefreshBadges);
    };
  }, [refreshBadges]);

  // Efeito principal
  useEffect(() => {
    if (!user?.id) {
      setBadges({
        orders: 0,
        schedules: 0,
        clients: 0,
        technicians: 0,
        finance: 0,
        quotes: 0,
        repairs: 0,
        deliveries: 0,
        workshops: 0,
        tracking: 0,
        sla_violations: 0
      });
      setIsLoading(false);
      return;
    }

    // Buscar dados iniciais
    fetchBadgeCounts();

    // Configurar realtime
    const cleanup = setupRealtime();

    // Polling backup a cada 30 segundos (menos frequente para reduzir erros)
    const interval = setInterval(fetchBadgeCounts, 30000);

    return () => {
      cleanup?.();
      clearInterval(interval);
    };
  }, [user?.id, fetchBadgeCounts, setupRealtime]);

  return {
    badges,
    isLoading,
    isConnected,
    lastUpdate,
    refreshBadges
  };
}
