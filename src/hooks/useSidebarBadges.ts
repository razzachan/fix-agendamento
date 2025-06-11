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
    tracking: 0
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

      // Contadores específicos por role
      if (user.role === 'admin') {
        // Admin vê tudo
        await Promise.all([
          fetchOrdersBadge(newBadges),
          fetchSchedulesBadge(newBadges),
          fetchClientsBadge(newBadges),
          fetchTechniciansBadge(newBadges),
          fetchFinanceBadge(newBadges),
          fetchQuotesBadge(newBadges),
          fetchRepairsBadge(newBadges),
          fetchDeliveriesBadge(newBadges),
          fetchWorkshopsBadge(newBadges),
          fetchSLAViolationsBadge(newBadges)
        ]);
      } else if (user.role === 'technician') {
        // Técnico vê apenas suas ordens e calendário
        await Promise.all([
          fetchTechnicianOrdersBadge(newBadges, user.id),
          fetchTechnicianSchedulesBadge(newBadges, user.id)
        ]);
      } else if (user.role === 'workshop') {
        // Oficina vê ordens na oficina e calendário
        await Promise.all([
          fetchWorkshopOrdersBadge(newBadges, user.id),
          fetchWorkshopSchedulesBadge(newBadges, user.id)
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
      .lte('updated_at', threeDaysAgo.toISOString());

    // 4. Ordens na oficina há mais de 7 dias (atraso significativo)
    const { count: stuckAtWorkshopCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'at_workshop')
      .lte('updated_at', sevenDaysAgo.toISOString());

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
    const { count } = await supabase
      .from('pre_schedules')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    badges.schedules = count || 0;
  };

  /**
   * Busca novos clientes (últimos 7 dias)
   */
  const fetchClientsBadge = async (badges: SidebarBadgeData) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());
    
    badges.clients = count || 0;
  };

  /**
   * Busca técnicos com atualizações pendentes
   */
  const fetchTechniciansBadge = async (badges: SidebarBadgeData) => {
    // Técnicos com status "ocupado" ou com ordens atrasadas
    const { count } = await supabase
      .from('technicians')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'busy');
    
    badges.technicians = count || 0;
  };

  /**
   * Busca questões financeiras que precisam de atenção
   * - Pagamentos em atraso (concluído há mais de 3 dias sem pagamento)
   * - Ordens com valor alto (>R$ 500) aguardando pagamento
   * - Pagamentos parciais pendentes
   */
  const fetchFinanceBadge = async (badges: SidebarBadgeData) => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { count } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .or(`and(status.in.(completed,ready_for_pickup,delivered),payment_status.is.null,updated_at.lte.${threeDaysAgo.toISOString()}),and(status.in.(completed,ready_for_pickup),final_cost.gte.500,payment_status.is.null),payment_status.eq.partial`);

    badges.finance = count || 0;
  };

  /**
   * Busca orçamentos que precisam de ação urgente
   * - Diagnósticos concluídos aguardando criação de orçamento
   * - Orçamentos enviados aguardando aprovação há mais de 2 dias
   * - Orçamentos aprovados aguardando início do reparo
   */
  const fetchQuotesBadge = async (badges: SidebarBadgeData) => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // 1. Diagnósticos concluídos que precisam de orçamento (URGENTE)
    const { count: diagnosisCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'diagnosis_completed');

    // 2. Orçamentos enviados há mais de 2 dias sem resposta (follow-up)
    const { count: pendingQuotesCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'quote_sent')
      .lte('updated_at', twoDaysAgo.toISOString());

    // 3. Orçamentos aprovados aguardando início do reparo (ação necessária)
    const { count: approvedQuotesCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'quote_approved');

    const totalQuotesCount = (diagnosisCount || 0) +
                            (pendingQuotesCount || 0) +
                            (approvedQuotesCount || 0);

    badges.quotes = totalQuotesCount;
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
      .lte('updated_at', fiveDaysAgo.toISOString());

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
      .lte('updated_at', twoDaysAgo.toISOString());

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
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { count } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .or(`and(status.eq.at_workshop,updated_at.lte.${sevenDaysAgo.toISOString()}),and(status.eq.diagnosis_pending,updated_at.lte.${threeDaysAgo.toISOString()})`);

    badges.workshops = count || 0;
  };

  /**
   * Busca violações críticas de SLA
   * - Ordens em aberto há mais de 24h sem agendamento
   * - Agendamentos atrasados (passaram da data)
   * - Reparos parados há mais de 7 dias
   * - Equipamentos prontos há mais de 5 dias
   */
  const fetchSLAViolationsBadge = async (badges: SidebarBadgeData) => {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const today = new Date().toISOString().split('T')[0];

    const { count } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .or(`and(status.eq.pending,created_at.lte.${oneDayAgo.toISOString()}),and(status.eq.scheduled,scheduled_date.lt.${today}),and(status.in.(in_progress,at_workshop),updated_at.lte.${sevenDaysAgo.toISOString()}),and(status.eq.ready_for_pickup,updated_at.lte.${fiveDaysAgo.toISOString()})`);

    badges.sla_violations = count || 0;
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
          table: 'pre_schedules'
        },
        () => {
          console.log('🔔 [SidebarBadges] Mudança detectada em pre_schedules');
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

    // Polling backup a cada 15 segundos (mais frequente)
    const interval = setInterval(fetchBadgeCounts, 15000);

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
