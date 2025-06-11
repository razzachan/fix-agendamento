import { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

export interface BadgeFilter {
  isActive: boolean;
  label: string;
  description: string;
  count: number;
  filterKey: string;
}

/**
 * Hook para gerenciar filtros automáticos baseados em badges
 * Quando usuário clica em um badge, a página de destino mostra apenas os itens relevantes
 */
export function useBadgeFilters() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState<BadgeFilter | null>(null);

  // Detectar se chegou via badge (parâmetro badge_filter na URL)
  useEffect(() => {
    const badgeFilter = searchParams.get('badge_filter');
    
    if (badgeFilter) {
      const filter = getBadgeFilterConfig(location.pathname, badgeFilter);
      setActiveFilter(filter);
    } else {
      setActiveFilter(null);
    }
  }, [location.pathname, searchParams]);

  /**
   * Configurações de filtros por rota e tipo de badge
   */
  const getBadgeFilterConfig = (pathname: string, filterType: string): BadgeFilter => {
    const configs: Record<string, Record<string, BadgeFilter>> = {
      '/orders': {
        urgent: {
          isActive: true,
          label: 'Ordens Urgentes',
          description: 'Ordens pendentes há +24h, agendadas para hoje/atrasadas, em andamento há +3 dias ou na oficina há +7 dias',
          count: 0,
          filterKey: 'urgent_orders'
        }
      },
      '/repairs': {
        attention: {
          isActive: true,
          label: 'Reparos & Entregas Ativos',
          description: 'Reparos em andamento, equipamentos prontos para entrega, entregas agendadas ou atrasadas',
          count: 0,
          filterKey: 'repairs_and_deliveries'
        }
      },
      '/deliveries': {
        attention: {
          isActive: true,
          label: 'Reparos & Entregas Ativos',
          description: 'Reparos em andamento, equipamentos prontos para entrega, entregas agendadas ou atrasadas',
          count: 0,
          filterKey: 'repairs_and_deliveries'
        }
      },
      '/quotes': {
        pending: {
          isActive: true,
          label: 'Orçamentos Pendentes',
          description: 'Diagnósticos aguardando orçamento, orçamentos enviados há +2 dias ou aprovados aguardando reparo',
          count: 0,
          filterKey: 'pending_quotes'
        }
      },
      '/finance': {
        problems: {
          isActive: true,
          label: 'Problemas Financeiros',
          description: 'Pagamentos em atraso, valores altos pendentes ou pagamentos parciais',
          count: 0,
          filterKey: 'financial_problems'
        }
      },
      '/workshops': {
        bottlenecks: {
          isActive: true,
          label: 'Gargalos na Oficina',
          description: 'Equipamentos na oficina há mais de 7 dias ou diagnósticos pendentes há mais de 3 dias',
          count: 0,
          filterKey: 'workshop_bottlenecks'
        }
      },
      '/tracking': {
        sla_violations: {
          isActive: true,
          label: 'Violações de SLA',
          description: 'Ordens em aberto há mais de 24h, agendamentos atrasados ou reparos parados',
          count: 0,
          filterKey: 'sla_violations'
        }
      }
    };

    return configs[pathname]?.[filterType] || {
      isActive: false,
      label: 'Filtro Desconhecido',
      description: '',
      count: 0,
      filterKey: ''
    };
  };

  /**
   * Gera filtros SQL baseados no tipo de badge
   */
  const getBadgeFilterSQL = (filterKey: string): string => {
    const today = new Date().toISOString().split('T')[0];
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const filters: Record<string, string> = {
      urgent_orders: `status.eq.pending,and(status.eq.scheduled,scheduled_date.lte.${today})`,
      
      delayed_repairs: `and(status.eq.in_progress,updated_at.lte.${fiveDaysAgo.toISOString()}),and(status.eq.at_workshop,updated_at.lte.${sevenDaysAgo.toISOString()}),status.eq.quote_approved`,
      
      pending_quotes: `and(status.eq.quote_sent,created_at.lte.${twoDaysAgo.toISOString()}),status.eq.diagnosis_completed`,
      
      urgent_deliveries: `and(status.eq.ready_for_pickup,updated_at.lte.${twoDaysAgo.toISOString()}),and(status.eq.scheduled_delivery,scheduled_date.lte.${today})`,
      
      financial_problems: `and(status.in.(completed,ready_for_pickup,delivered),payment_status.is.null,updated_at.lte.${threeDaysAgo.toISOString()}),and(status.in.(completed,ready_for_pickup),final_cost.gte.500,payment_status.is.null),payment_status.eq.partial`,
      
      workshop_bottlenecks: `and(status.eq.at_workshop,updated_at.lte.${sevenDaysAgo.toISOString()}),and(status.eq.diagnosis_pending,updated_at.lte.${threeDaysAgo.toISOString()})`,
      
      sla_violations: `and(status.eq.pending,created_at.lte.${oneDayAgo.toISOString()}),and(status.eq.scheduled,scheduled_date.lt.${today}),and(status.in.(in_progress,at_workshop),updated_at.lte.${sevenDaysAgo.toISOString()}),and(status.eq.ready_for_pickup,updated_at.lte.${fiveDaysAgo.toISOString()})`
    };

    return filters[filterKey] || '';
  };

  /**
   * Remove o filtro de badge e mostra todos os itens
   */
  const clearBadgeFilter = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('badge_filter');
    setSearchParams(newSearchParams);
    setActiveFilter(null);
  };

  /**
   * Aplica um filtro de badge específico
   */
  const applyBadgeFilter = (filterType: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('badge_filter', filterType);
    setSearchParams(newSearchParams);
  };

  return {
    activeFilter,
    clearBadgeFilter,
    applyBadgeFilter,
    getBadgeFilterSQL,
    isFilterActive: !!activeFilter
  };
}
