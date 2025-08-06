
import { useState, useEffect, useCallback } from 'react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { scheduledServiceService } from '@/services';
import { supabase } from '@/integrations/supabase/client';
import { ScheduledService, ServiceOrder } from '@/types';

interface UseTechnicianCalendarProps {
  technicianId: string;
  serviceOrders: ServiceOrder[];
}

export const useTechnicianCalendar = ({ technicianId, serviceOrders }: UseTechnicianCalendarProps) => {
  const [date, setDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [scheduledServices, setScheduledServices] = useState<ScheduledService[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Mapear status de ordem de serviço para status de calendário com cores específicas para coleta diagnóstico
  const mapServiceOrderStatusToCalendarStatus = (status: string): string => {
    switch (status) {
      // 🔵 AZUL - Agendado/Confirmado
      case 'pending':
      case 'scheduled':
      case 'scheduled_collection':
        return 'confirmed';

      // 🟣 ROXO - Em trânsito/coleta
      case 'on_the_way':
      case 'collected':
      case 'collected_for_diagnosis':
        return 'in_progress';

      // 🟠 LARANJA - Na oficina (recebido)
      case 'at_workshop':
      case 'received_at_workshop':
        return 'at_workshop';

      // 🔵 CIANO - Em diagnóstico
      case 'in_progress': // Quando é coleta diagnóstico, in_progress = diagnóstico
        return 'diagnosis';

      // 🟡 AMARELO - Aguardando aprovação
      case 'diagnosis_completed':
      case 'awaiting_quote_approval':
        return 'awaiting_approval';

      // 🟡 AMARELO - Aguardando aprovação do cliente
      case 'diagnosis_completed':
      case 'quote_sent':
        return 'awaiting_approval';

      // 🟢 VERDE - Orçamento aprovado / Em reparo
      case 'quote_approved':
      case 'needs_workshop':
      case 'in_repair':
        return 'in_repair';

      // 🔷 AZUL ESCURO - Pronto para entrega
      case 'ready_for_delivery':
      case 'delivery_scheduled':
      case 'collected_for_delivery':
      case 'on_the_way_to_deliver':
      case 'payment_pending':
        return 'ready_delivery';

      // ✅ VERDE ESCURO - Concluído
      case 'completed':
      case 'delivered':
        return 'completed';

      // 🔴 VERMELHO - Cancelado
      case 'cancelled':
      case 'quote_rejected':
      case 'returned':
        return 'cancelled';

      default:
        return 'confirmed';
    }
  };

  // Função para buscar serviços agendados
  const fetchScheduledServices = useCallback(async () => {
    if (!technicianId || isFetching) return;

    setIsFetching(true);
    setIsLoading(true);
    try {
      console.log('🔄 [useTechnicianCalendar] Buscando serviços agendados para técnico:', technicianId);
      const services = await scheduledServiceService.getByTechnicianId(technicianId);
      console.log(`📋 [useTechnicianCalendar] ${services.length} serviços carregados`);
      setScheduledServices(services);
    } catch (error) {
      console.error('Erro ao carregar serviços agendados:', error);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [technicianId, isFetching]);

  // Efeito de inicialização - executa apenas uma vez
  useEffect(() => {
    if (technicianId && !isInitialized) {
      console.log('🔄 [useTechnicianCalendar] Inicializando dados...');
      setIsInitialized(true);
      fetchScheduledServices();
    }
  }, [technicianId, isInitialized, fetchScheduledServices]);

  // Efeito de fallback para garantir que os dados sejam carregados
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (technicianId && scheduledServices.length === 0 && !isLoading && !isFetching) {
        console.log('🔄 [useTechnicianCalendar] Fallback: Forçando carregamento...');
        fetchScheduledServices();
      }
    }, 2000);

    return () => clearTimeout(fallbackTimer);
  }, [technicianId, scheduledServices.length, isLoading, isFetching, fetchScheduledServices]);

  const filteredServices = scheduledServices.filter(service => {
    const serviceDate = new Date(service.scheduledStartTime);
    const isMatchingDate = isSameDay(serviceDate, date);

    // Excluir serviços cancelados para manter o calendário limpo
    const isNotCancelled = service.status !== 'cancelled';

    return isMatchingDate && isNotCancelled;
  });

  const getServiceOrder = (serviceOrderId: string): ServiceOrder | undefined => {
    return serviceOrders.find(order => order.id === serviceOrderId);
  };

  const hasScheduledServices = (day: Date) => {
    return scheduledServices.some(service => {
      const serviceDate = new Date(service.scheduledStartTime);
      return isSameDay(serviceDate, day);
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return format(date, 'HH:mm', { locale: ptBR });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      // 🔵 AZUL - Agendado/Confirmado
      case 'confirmed':
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';

      // 🟣 ROXO - Em trânsito/coleta
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 border-purple-200';

      // 🟠 LARANJA - Na oficina (recebido)
      case 'at_workshop':
        return 'bg-orange-100 text-orange-800 border-orange-200';

      // 🔵 CIANO - Em diagnóstico
      case 'diagnosis':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';

      // 🟡 AMARELO - Aguardando aprovação do cliente
      case 'awaiting_approval':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';

      // 🟢 VERDE - Orçamento aprovado / Em reparo
      case 'in_repair':
        return 'bg-green-100 text-green-800 border-green-200';

      // 🔷 AZUL ESCURO - Pronto para entrega
      case 'ready_delivery':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';

      // ✅ VERDE ESCURO - Concluído
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';

      // 🔴 VERMELHO - Cancelado
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';

      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLabels: Record<string, string> = {
      'scheduled': 'Agendado',
      'in_progress': 'Em andamento',
      'completed': 'Concluído',
      'cancelled': 'Cancelado',
      'pending': 'Em aberto',
      'on_the_way': 'À Caminho',
      'collected': 'Coletado',
      'at_workshop': 'Na Oficina',
      'payment_pending': 'Pagamento Pendente'
    };
    
    const colors: Record<string, string> = {
      // 🔵 AZUL - Agendado/Confirmado
      'scheduled': 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      'confirmed': 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      'pending': 'bg-slate-100 text-slate-800 hover:bg-slate-200',

      // 🟣 ROXO - Em trânsito/coleta
      'in_progress': 'bg-purple-100 text-purple-800 hover:bg-purple-200',
      'on_the_way': 'bg-purple-100 text-purple-800 hover:bg-purple-200',
      'collected': 'bg-purple-100 text-purple-800 hover:bg-purple-200',

      // 🟠 LARANJA - Na oficina (recebido)
      'at_workshop': 'bg-orange-100 text-orange-800 hover:bg-orange-200',

      // 🔵 CIANO - Em diagnóstico
      'diagnosis': 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200',

      // 🟡 AMARELO - Aguardando aprovação do cliente
      'awaiting_approval': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',

      // 🟢 VERDE - Orçamento aprovado / Em reparo
      'in_repair': 'bg-green-100 text-green-800 hover:bg-green-200',

      // 🔷 AZUL ESCURO - Pronto para entrega
      'ready_delivery': 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
      'payment_pending': 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',

      // ✅ VERDE ESCURO - Concluído
      'completed': 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',

      // 🔴 VERMELHO - Cancelado
      'cancelled': 'bg-red-100 text-red-800 hover:bg-red-200'
    };
    
    return {
      label: statusLabels[status] || status,
      className: `${colors[status] || 'bg-gray-100 text-gray-800 hover:bg-gray-200'} border-none`
    };
  };

  // Função de refresh manual
  const refreshServices = useCallback(() => {
    console.log('🔄 [useTechnicianCalendar] Refresh manual solicitado');
    fetchScheduledServices();
  }, [fetchScheduledServices]);

  return {
    date,
    setDate,
    isLoading,
    scheduledServices,
    filteredServices,
    getServiceOrder,
    hasScheduledServices,
    formatTime,
    getStatusColor,
    getStatusBadge,
    refreshServices
  };
};
